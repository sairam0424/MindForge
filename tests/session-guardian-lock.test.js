'use strict';
/**
 * Tests for bin/autonomous/session-guardian.sh — Gate 2 stale-lock recovery.
 *
 * The cooldown gate uses `mkdir "$LOG.lock"` as a mutex with a
 * `trap 'rm -rf …' EXIT INT TERM` cleanup. SIGKILL (signal 9) cannot be
 * trapped, so a hard-killed holder leaves the lock dir behind forever and
 * every subsequent cycle is skipped ("log locked by concurrent process").
 *
 * These tests drive the real script via spawnSync with the active-hours and
 * idle gates disabled, isolating Gate 2. They assert:
 *   1. A lock older than the staleness threshold is reaped (warning emitted,
 *      cycle proceeds, exit 0).
 *   2. A fresh lock is NOT reaped (cycle skipped, exit 1) — the mutex still
 *      protects against genuinely concurrent runs.
 *
 * Regression anchor: see the "Stale-lock recovery" block in
 * bin/autonomous/session-guardian.sh.
 */
const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const SCRIPT = path.join(__dirname, '..', 'bin', 'autonomous', 'session-guardian.sh');

let passed = 0, failed = 0;
const tests = [];
function test(name, fn) { tests.push({ name, fn }); }

// Run the guardian against an isolated temp project + log, with Gate 1 (active
// hours) and Gate 3 (idle) disabled so only Gate 2's lock logic is exercised.
// Returns { status, stderr } from the child process.
function runGuardian({ projectDir, logPath, interval }) {
  const res = spawnSync('bash', [SCRIPT], {
    encoding: 'utf8',
    timeout: 10000,
    env: Object.assign({}, process.env, {
      OBSERVER_INTERVAL_SECONDS: String(interval),
      OBSERVER_ACTIVE_HOURS_START: '0',
      OBSERVER_ACTIVE_HOURS_END: '0',
      OBSERVER_MAX_IDLE_SECONDS: '0',
      OBSERVER_LAST_RUN_LOG: logPath,
      PROJECT_DIR: projectDir,
    }),
  });
  return { status: res.status, stderr: res.stderr || '' };
}

// Create an isolated sandbox: a temp project dir + a log path inside it.
function makeSandbox() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sg-lock-'));
  return { dir, logPath: path.join(dir, 'observer-last-run.log') };
}

// Backdate a directory's mtime by `ageSeconds` using fs.utimesSync (portable).
function backdate(target, ageSeconds) {
  const when = Math.floor(Date.now() / 1000) - ageSeconds;
  fs.utimesSync(target, when, when);
}

test('reaps a stale lock and proceeds (exit 0)', () => {
  const { dir, logPath } = makeSandbox();
  try {
    const lockDir = `${logPath}.lock`;
    fs.mkdirSync(lockDir);
    // interval=10 -> threshold = max(2*10, 300) = 300s. Age it well past that.
    backdate(lockDir, 1000);

    const { status, stderr } = runGuardian({ projectDir: dir, logPath, interval: 10 });

    assert.ok(
      /removing stale lock/.test(stderr),
      `expected stale-lock warning, got stderr: ${stderr}`
    );
    assert.strictEqual(status, 0, `expected exit 0 after reaping stale lock, got ${status}`);
    // Success path acquires (mkdir) then trap-cleans the lock, so it is gone.
    assert.ok(!fs.existsSync(lockDir), 'lock dir should be cleaned after a successful cycle');
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('does NOT reap a fresh lock; skips the cycle (exit 1)', () => {
  const { dir, logPath } = makeSandbox();
  try {
    const lockDir = `${logPath}.lock`;
    fs.mkdirSync(lockDir); // mtime = now, well under the 300s threshold

    const { status, stderr } = runGuardian({ projectDir: dir, logPath, interval: 10 });

    assert.ok(
      !/removing stale lock/.test(stderr),
      `fresh lock must not be reaped, got stderr: ${stderr}`
    );
    assert.ok(
      /log locked by concurrent process/.test(stderr),
      `expected concurrent-lock skip message, got stderr: ${stderr}`
    );
    assert.strictEqual(status, 1, `expected exit 1 (cycle skipped), got ${status}`);
    assert.ok(fs.existsSync(lockDir), 'fresh lock dir must be left intact');
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('reaps a lock at exactly the threshold boundary (>= is inclusive)', () => {
  const { dir, logPath } = makeSandbox();
  try {
    const lockDir = `${logPath}.lock`;
    fs.mkdirSync(lockDir);
    // interval=100 -> threshold = max(200, 300) = 300s. Age slightly past it
    // to avoid flakiness from the second the child reads `now`.
    backdate(lockDir, 305);

    const { status, stderr } = runGuardian({ projectDir: dir, logPath, interval: 100 });

    assert.ok(/removing stale lock/.test(stderr), `expected reap at boundary, got: ${stderr}`);
    assert.strictEqual(status, 0, `expected exit 0, got ${status}`);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

// ── Runner (matches sibling hand-rolled harness, e.g. trust-gate-hook.test.js) ─
console.log('--- Running session-guardian stale-lock tests ---');
for (const { name, fn } of tests) {
  try {
    fn();
    passed++;
    console.log(`✅ PASSED: ${name}`);
  } catch (err) {
    failed++;
    console.error(`❌ FAILED: ${name}`);
    console.error(err && err.message ? err.message : err);
  }
}
console.log(`\nsession-guardian stale-lock: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
