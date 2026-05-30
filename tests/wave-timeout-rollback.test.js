'use strict';
const assert = require('assert');
let passed = 0, failed = 0; const tests = [];
function test(name, fn){ tests.push({name,fn}); }

test('isTimedOut returns true when now exceeds timeout_at', () => {
  const { isTimedOut } = require('../bin/autonomous/auto-runner');
  assert.strictEqual(isTimedOut('2020-01-01T00:00:00Z', Date.parse('2026-01-01T00:00:00Z')), true);
  assert.strictEqual(isTimedOut('2099-01-01T00:00:00Z', Date.parse('2026-01-01T00:00:00Z')), false);
  assert.strictEqual(isTimedOut(null, Date.parse('2026-01-01T00:00:00Z')), false);
  assert.strictEqual(isTimedOut(undefined, Date.parse('2026-01-01T00:00:00Z')), false);
});

// ── UC-14 review: MALFORMED timeout_at must fail CLOSED (visible, not silent) ──
// A truthy-but-unparseable deadline (Date.parse → NaN) must NOT silently fail
// open (which would let the run proceed UNBOUNDED). It must be treated as
// expired so a broken deadline HALTS the run. Empty string is falsy → no timeout.
test('isTimedOut fails CLOSED on malformed timeout_at, treats empty string as no-timeout', () => {
  const { isTimedOut } = require('../bin/autonomous/auto-runner');
  const now = Date.parse('2026-01-01T00:00:00Z');
  assert.strictEqual(isTimedOut('garbage', now), true, 'malformed deadline → fail closed (true)');
  assert.strictEqual(isTimedOut('', now), false, 'empty string is falsy → no timeout configured (false)');
});

// ── UC-14: rollback decision (pure) — SAFE DEFAULT is record-intent-only ───────

test('decideRollback DEFAULT (flag off) records intent, NEVER mutates git', () => {
  const { decideRollback } = require('../bin/autonomous/auto-runner');
  // No config / flag absent → default false → record only, no git reset.
  const d1 = decideRollback({});
  assert.strictEqual(d1.record, true);
  assert.strictEqual(d1.gitReset, false);
  // Even with empty wave_execution block.
  const d2 = decideRollback({ wave_execution: {} });
  assert.strictEqual(d2.gitReset, false);
});

test('decideRollback flag ON but NO commit tracking still defers git reset (record only)', () => {
  const { decideRollback } = require('../bin/autonomous/auto-runner');
  const d = decideRollback({ wave_execution: { rollback_on_escalate: true } }, /* hasCommitTracking */ false);
  assert.strictEqual(d.record, true);
  assert.strictEqual(d.gitReset, false);
  assert.ok(/deferred/i.test(d.reason), 'reason should explain the git reset is deferred');
});

test('decideRollback flag ON AND commit tracking present permits git reset', () => {
  const { decideRollback } = require('../bin/autonomous/auto-runner');
  const d = decideRollback({ wave_execution: { rollback_on_escalate: true } }, /* hasCommitTracking */ true);
  assert.strictEqual(d.record, true);
  assert.strictEqual(d.gitReset, true);
});

// ── UC-14: wave-boundary timeout integration ───────────────────────────────────

test('_enforceWaveTimeout stops cleanly: status=timeout, resumable state, audit event', () => {
  const fs = require('fs');
  const os = require('os');
  const path = require('path');
  const AutoRunner = require('../bin/autonomous/auto-runner');

  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'mf-uc14-'));
  const planningDir = path.join(tmp, '.planning');
  fs.mkdirSync(planningDir, { recursive: true });
  // auto-state with a PAST timeout_at → should trip the boundary check.
  fs.writeFileSync(
    path.join(planningDir, 'auto-state.json'),
    JSON.stringify({ status: 'running', timeout_at: '2020-01-01T00:00:00Z' })
  );

  const prevCwd = process.cwd();
  try {
    process.chdir(tmp);
    const runner = new AutoRunner({ phase: 1 });
    runner.waves = [{ wave: 0, tasks: [{ id: 'A' }] }, { wave: 1, tasks: [{ id: 'B' }] }];
    runner.currentWaveIndex = 0;
    runner.completedTasks = new Set(['done-1']);

    const tripped = runner._enforceWaveTimeout();
    assert.strictEqual(tripped, true, 'expected timeout to be tripped');

    const state = JSON.parse(fs.readFileSync(path.join(planningDir, 'auto-state.json'), 'utf8'));
    assert.strictEqual(state.status, 'timeout', 'status must be set to timeout');
    assert.strictEqual(state.currentWaveIndex, 0, 'resumable currentWaveIndex must be persisted');
    assert.deepStrictEqual(state.completedTasks, ['done-1'], 'resumable completedTasks must be persisted');

    const audit = fs.readFileSync(path.join(planningDir, 'AUDIT.jsonl'), 'utf8').trim().split('\n')
      .map(l => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean);
    assert.ok(audit.some(e => e.event === 'auto_mode_timeout'), 'an auto_mode_timeout audit event must be written');
  } finally {
    process.chdir(prevCwd);
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

test('_enforceWaveTimeout FAILS CLOSED on a malformed timeout_at (status=timeout, not unbounded)', () => {
  const fs = require('fs');
  const os = require('os');
  const path = require('path');
  const AutoRunner = require('../bin/autonomous/auto-runner');

  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'mf-uc14-malformed-'));
  const planningDir = path.join(tmp, '.planning');
  fs.mkdirSync(planningDir, { recursive: true });
  // auto-state with a MALFORMED timeout_at → must fail closed (trip the boundary).
  fs.writeFileSync(
    path.join(planningDir, 'auto-state.json'),
    JSON.stringify({ status: 'running', timeout_at: 'not-a-real-date' })
  );

  const prevCwd = process.cwd();
  try {
    process.chdir(tmp);
    const runner = new AutoRunner({ phase: 1 });
    runner.waves = [{ wave: 0, tasks: [{ id: 'A' }] }];
    runner.currentWaveIndex = 0;
    runner.completedTasks = new Set();

    const tripped = runner._enforceWaveTimeout();
    assert.strictEqual(tripped, true, 'malformed deadline must fail closed and stop the run');

    const state = JSON.parse(fs.readFileSync(path.join(planningDir, 'auto-state.json'), 'utf8'));
    assert.strictEqual(state.status, 'timeout', 'malformed deadline must flip status to timeout');
  } finally {
    process.chdir(prevCwd);
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

test('_enforceWaveTimeout is a no-op when no timeout_at is set', () => {
  const fs = require('fs');
  const os = require('os');
  const path = require('path');
  const AutoRunner = require('../bin/autonomous/auto-runner');

  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'mf-uc14-noop-'));
  const planningDir = path.join(tmp, '.planning');
  fs.mkdirSync(planningDir, { recursive: true });
  fs.writeFileSync(path.join(planningDir, 'auto-state.json'), JSON.stringify({ status: 'running' }));

  const prevCwd = process.cwd();
  try {
    process.chdir(tmp);
    const runner = new AutoRunner({ phase: 1 });
    runner.waves = [{ wave: 0, tasks: [{ id: 'A' }] }];
    runner.currentWaveIndex = 0;
    assert.strictEqual(runner._enforceWaveTimeout(), false, 'no timeout_at → must not trip');
    const state = JSON.parse(fs.readFileSync(path.join(planningDir, 'auto-state.json'), 'utf8'));
    assert.strictEqual(state.status, 'running', 'status must remain unchanged when not timed out');
  } finally {
    process.chdir(prevCwd);
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

(async () => {
  for (const {name,fn} of tests){ try{ await fn(); console.log(`  ✅  ${name}`); passed++; }catch(e){ console.error(`  ❌  ${name}\n      ${e.message}`); failed++; } }
  console.log(`\nWave Timeout/Rollback: ${passed} passed, ${failed} failed`);
  if (failed>0) process.exit(1);
})();
