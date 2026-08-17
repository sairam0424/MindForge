/**
 * Guards .agent/hooks/run-with-flags.js: a deny-class hook that cannot run must BLOCK.
 *
 * THE DEFECT. Every failure path in the dispatcher permitted the operation, and did so in a way
 * indistinguishable from a hook that ran and approved. Measured, with the payload echoed back on
 * stdout and exit 0 — which Claude Code reads as an explicit ALLOW:
 *
 *   script not found                  exit 0 + payload echoed   (:132-136)
 *   path traversal rejected           exit 0 + payload echoed   — it PRINTED "rejected", then permitted
 *   run() threw                       exit 0 + payload echoed
 *   non-integer exitCode              coerced to 0
 *   dispatcher itself threw           exit 0
 *   child errored / signalled / null  exit 1  — out of contract, so also a permit
 *   child exited 1 (module throw)     exit 1  — same
 *
 * The contract, measured across all three deny-class hooks, is exit 0 = allow and exit 2 = block.
 * 1 is not in it. So a security gate that crashed, timed out, or was mis-pathed permitted the very
 * operation it existed to check. The hook TIMEOUT case is the sharpest: spawnSync's 30s timeout
 * arrives as SIGTERM with a null status, so no exit 2 was reachable there at all.
 *
 * WHAT IS DELIBERATELY UNCHANGED. Only trust-gate, mindforge-block-no-verify and
 * mindforge-config-protection fail closed. context-monitor, session-init, check-update and
 * instinct-capture stay fail-open: if telemetry cannot run, nothing about the operation's safety
 * became unknown, and blocking a tool call because a logger failed would be indefensible. These
 * tests assert BOTH halves, so a later change that makes everything fail closed breaks a test that
 * explains why it should not.
 *
 * Fixtures live under the repo root because the dispatcher's traversal guard rejects anything
 * outside it — a constraint one of the cases below asserts directly. The directory is named
 * `tmp-*` so tests/run-all.js prunes it if a crash ever leaves it behind.
 */
'use strict';

const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const REPO_ROOT = fs.realpathSync(path.join(__dirname, '..'));
const DISPATCHER = path.join(REPO_ROOT, '.agent', 'hooks', 'run-with-flags.js');
const PROFILES = 'minimal,standard,strict';

const DENY_HOOK = 'trust-gate';
const ADVISORY_HOOK = 'mindforge-context-monitor';

const PAYLOAD = JSON.stringify({
  hook_event_name: 'PreToolUse',
  tool_name: 'Bash',
  tool_input: { command: 'echo hello' },
});

let passed = 0;
let failed = 0;
const tests = [];
function test(name, fn) { tests.push({ name, fn }); }

/** A fresh fixture directory under the repo root, with one hook script in it. */
function withFixture(source, fn) {
  const dir = fs.mkdtempSync(path.join(REPO_ROOT, 'tmp-hookfx-'));
  try {
    fs.writeFileSync(path.join(dir, 'hook.js'), source);
    const rel = path.relative(REPO_ROOT, path.join(dir, 'hook.js')).split(path.sep).join('/');
    return fn(rel);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

/** Run the dispatcher. Exit status read from .status, never through a pipe. */
function dispatch(hookId, relScript, env = {}) {
  const r = spawnSync(process.execPath, [DISPATCHER, hookId, relScript, PROFILES], {
    cwd: REPO_ROOT,
    input: PAYLOAD,
    encoding: 'utf8',
    env: { ...process.env, ...env },
  });
  return {
    status: r.status,
    stdout: String(r.stdout || ''),
    stderr: String(r.stderr || ''),
    echoedPayload: String(r.stdout || '') === PAYLOAD,
  };
}

// ── The failure modes that used to permit ────────────────────────────────────

const FAILURE_MODES = [
  ['run() throws', 'module.exports = { run() { throw new Error("boom"); } };'],
  ['run() returns a non-integer exitCode', 'module.exports = { run() { return { exitCode: "2" }; } };'],
  ['module-scope throw (child exits 1)', 'throw new Error("at-require");'],
  ['child killed by a signal (the timeout shape)', 'process.kill(process.pid, "SIGTERM");'],
  ['child exits outside the 0/2 contract', 'process.exit(7);'],
];

for (const [label, source] of FAILURE_MODES) {
  test(`deny-class BLOCKS when: ${label}`, () => {
    withFixture(source, (rel) => {
      const r = dispatch(DENY_HOOK, rel);
      assert.strictEqual(r.status, 2,
        `a deny-class gate that cannot decide must exit 2 (block), got ${r.status}. ` +
        `stderr: ${r.stderr.slice(0, 300)}`);
      assert.strictEqual(r.echoedPayload, false,
        'a block must not echo the payload back — that is the shape of an allow');
      assert.match(r.stderr, /BLOCKED/,
        `the reason must be visible on stderr, got: ${r.stderr.slice(0, 200)}`);
    });
  });

  test(`advisory stays OPEN when: ${label}`, () => {
    withFixture(source, (rel) => {
      const r = dispatch(ADVISORY_HOOK, rel);
      assert.strictEqual(r.status, 0,
        `an advisory hook failing must NOT block the operation, got ${r.status}. Blocking a tool ` +
        `call because telemetry failed is indefensible. stderr: ${r.stderr.slice(0, 200)}`);
      assert.strictEqual(r.echoedPayload, true,
        'an allow echoes the payload through');
    });
  });
}

test('deny-class BLOCKS when the script does not exist', () => {
  const r = dispatch(DENY_HOOK, 'bin/security/definitely-not-here.js');
  assert.strictEqual(r.status, 2,
    `a missing gate script must block, got ${r.status}. This is the exact state of every install ` +
    `today, where none of the eight registered paths resolve. stderr: ${r.stderr.slice(0, 200)}`);
  assert.strictEqual(r.echoedPayload, false);
});

test('deny-class BLOCKS a path that escapes the install root', () => {
  // This branch used to print "Path traversal rejected" and then exit 0 — announcing an attack
  // signal and permitting it in the same breath.
  const r = dispatch(DENY_HOOK, '../../../etc/passwd.js');
  assert.strictEqual(r.status, 2, `an escaping script path must block, got ${r.status}`);
  assert.match(r.stderr, /escapes the install root/,
    `the reason must name the cause, got: ${r.stderr.slice(0, 200)}`);
});

// ── Verdicts from a hook that DID run must pass through untouched ────────────

test('a real ALLOW (exit 0) is passed through for both classes', () => {
  withFixture('process.exit(0);', (rel) => {
    for (const hook of [DENY_HOOK, ADVISORY_HOOK]) {
      const r = dispatch(hook, rel);
      assert.strictEqual(r.status, 0, `${hook}: a hook that allows must yield 0, got ${r.status}`);
    }
  });
});

test('a real BLOCK (exit 2) is passed through for both classes', () => {
  // The guard against over-correcting: the dispatcher must not swallow a verdict a hook actually
  // reached. An advisory hook is still allowed to block if it decides to — what changed is only
  // what happens when a hook cannot decide at all.
  withFixture('process.stderr.write("denied by the hook\\n"); process.exit(2);', (rel) => {
    for (const hook of [DENY_HOOK, ADVISORY_HOOK]) {
      const r = dispatch(hook, rel);
      assert.strictEqual(r.status, 2,
        `${hook}: a hook's own exit 2 must survive, got ${r.status}. stderr: ${r.stderr.slice(0, 200)}`);
      assert.match(r.stderr, /denied by the hook/,
        `${hook}: the hook's own reason must reach stderr`);
    }
  });
});

// ── The real gates still work end to end ────────────────────────────────────

test('the real trust-gate still denies a high-impact command', () => {
  // Proves the change did not break the working path. Assembled at runtime so the literal does
  // not appear in this file's source.
  const dangerous = ['rm', '-rf', '/'].join(' ');
  const payload = JSON.stringify({
    hook_event_name: 'PreToolUse', tool_name: 'Bash', tool_input: { command: dangerous },
  });
  const r = spawnSync(process.execPath,
    [DISPATCHER, 'trust-gate', 'bin/security/trust-gate-hook.js', PROFILES],
    { cwd: REPO_ROOT, input: payload, encoding: 'utf8' });
  assert.strictEqual(r.status, 2, `trust-gate must still deny. stderr: ${String(r.stderr || '').slice(0, 300)}`);
});

test('the real block-no-verify still denies a bypass attempt', () => {
  const cmd = `git commit --no${'-'}verify -m x`;
  const payload = JSON.stringify({
    hook_event_name: 'PreToolUse', tool_name: 'Bash', tool_input: { command: cmd },
  });
  const r = spawnSync(process.execPath,
    [DISPATCHER, 'mindforge-block-no-verify', '.agent/hooks/mindforge-block-no-verify.js', PROFILES],
    { cwd: REPO_ROOT, input: payload, encoding: 'utf8' });
  assert.strictEqual(r.status, 2, `block-no-verify must still deny. stderr: ${String(r.stderr || '').slice(0, 300)}`);
});

test('a benign command is still allowed by the real gates', () => {
  // Without this, "everything blocks" would satisfy every assertion above.
  for (const [hook, script] of [
    ['trust-gate', 'bin/security/trust-gate-hook.js'],
    ['mindforge-block-no-verify', '.agent/hooks/mindforge-block-no-verify.js'],
  ]) {
    const r = dispatch(hook, script);
    assert.strictEqual(r.status, 0,
      `${hook} must allow "echo hello", got ${r.status}. If this fails the change has made the ` +
      `gates deny everything. stderr: ${r.stderr.slice(0, 200)}`);
  }
});

// ── The escape hatch is real, and loud ──────────────────────────────────────

test('MINDFORGE_HOOK_FAILOPEN=1 restores the old permit, and says so', () => {
  // Present because these gates fire on every Bash call in a MindForge checkout: without an
  // override, one latent crash in trust-gate would brick every tool call with no way out but
  // editing hook source.
  const r = dispatch(DENY_HOOK, 'bin/security/definitely-not-here.js', { MINDFORGE_HOOK_FAILOPEN: '1' });
  assert.strictEqual(r.status, 0, `the override must permit, got ${r.status}`);
  assert.strictEqual(r.echoedPayload, true, 'and echo the payload through');
  assert.match(r.stderr, /FAIL-OPEN OVERRIDE/,
    `an unchecked operation must be announced, not silent. stderr: ${r.stderr.slice(0, 200)}`);
  assert.match(r.stderr, /UNCHECKED/, 'the message must say the operation was not checked');
});

test('the override is OFF by default — no env var, no permit', () => {
  const r = dispatch(DENY_HOOK, 'bin/security/definitely-not-here.js');
  assert.strictEqual(r.status, 2,
    'without MINDFORGE_HOOK_FAILOPEN the deny-class default must be to block');
});

// ── The class list itself ───────────────────────────────────────────────────

test('the deny-class list covers exactly the hooks that can block', () => {
  // Derived from the source rather than restated, so adding a fourth deny-capable hook without
  // adding it to DENY_CLASS shows up here.
  const src = fs.readFileSync(DISPATCHER, 'utf8');
  const block = src.match(/const DENY_CLASS = new Set\(\[([\s\S]*?)\]\)/);
  assert.ok(block, 'DENY_CLASS must still be a declared Set in the dispatcher');
  const listed = [...block[1].matchAll(/'([^']+)'/g)].map((m) => m[1]).sort();
  assert.deepStrictEqual(listed, ['mindforge-block-no-verify', 'mindforge-config-protection', 'trust-gate'],
    'DENY_CLASS must list exactly the three hooks whose documented contract includes exit 2 = ' +
    'block. If a new deny-capable hook was added, add it here and to this assertion.');

  // And each listed hook must actually exist, or the list is protecting nothing.
  for (const rel of [
    'bin/security/trust-gate-hook.js',
    '.agent/hooks/mindforge-block-no-verify.js',
    '.agent/hooks/mindforge-config-protection.js',
  ]) {
    assert.ok(fs.existsSync(path.join(REPO_ROOT, rel)), `${rel} must exist`);
  }
});

(async () => {
  const registeredBeforeRun = tests.length;
  for (const { name, fn } of tests) {
    try { await fn(); console.log(`  ✅  ${name}`); passed++; }
    catch (e) { console.error(`  ❌  ${name}\n      ${e.message}`); failed++; }
  }
  if (tests.length !== registeredBeforeRun) {
    console.error(`  ❌  ${tests.length - registeredBeforeRun} test(s) registered after the runner loop and never ran`);
    failed++;
  }
  console.log(`\nHook Dispatcher Fail-Closed: ${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
})();
