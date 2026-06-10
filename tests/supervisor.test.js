'use strict';

/**
 * Tests for the autonomous session supervisor (bin/autonomous/supervisor.js).
 * Mirrors ECC's daemon crash-recovery tests: a dead running session is marked
 * failed; a live one is left running. Plus pidIsAlive, heartbeat, recoverState.
 */

const assert = require('node:assert');
const { test } = require('node:test');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const supervisor = require('../bin/autonomous/supervisor.js');
const { createStateManager } = require('../bin/autonomous/state-manager.js');

test('pidIsAlive: current process is alive, pid 0/negative/garbage is dead', () => {
  assert.strictEqual(supervisor.pidIsAlive(process.pid), true);
  assert.strictEqual(supervisor.pidIsAlive(0), false);
  assert.strictEqual(supervisor.pidIsAlive(-1), false);
  assert.strictEqual(supervisor.pidIsAlive(null), false);
  assert.strictEqual(supervisor.pidIsAlive('nope'), false);
});

test('resumeCrashedSessions marks a dead running session failed (ECC parity)', () => {
  const sessions = [{ id: 'deadbeef', status: 'running', pid: 4242 }];
  const { failed, sessions: updated } = supervisor.resumeCrashedSessions(sessions, () => false);
  assert.deepStrictEqual(failed, ['deadbeef']);
  assert.strictEqual(updated[0].status, 'failed');
  assert.strictEqual(updated[0].pid, null);
});

test('resumeCrashedSessions keeps a live running session running (ECC parity)', () => {
  const sessions = [{ id: 'alive123', status: 'running', pid: 7777 }];
  const { failed, sessions: updated } = supervisor.resumeCrashedSessions(sessions, () => true);
  assert.deepStrictEqual(failed, []);
  assert.strictEqual(updated[0].status, 'running');
  assert.strictEqual(updated[0].pid, 7777);
});

test('resumeCrashedSessions ignores non-running sessions and is immutable', () => {
  const sessions = [
    { id: 'a', status: 'completed', pid: 1 },
    { id: 'b', status: 'idle' },
  ];
  const { failed, sessions: updated } = supervisor.resumeCrashedSessions(sessions, () => false);
  assert.deepStrictEqual(failed, []);
  // original objects untouched (immutability)
  assert.strictEqual(sessions[0].status, 'completed');
  assert.strictEqual(updated[0], sessions[0]); // unchanged entries returned as-is
});

test('heartbeat + recoverState round-trip through auto-state.json', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'mf-sup-'));
  try {
    const sm = createStateManager(dir);
    // Simulate a running session owned by a dead pid.
    sm.updateState({ status: 'running', pid: 999999 });
    // recoverState with an always-dead probe should flip it to failed.
    const recovered = supervisor.recoverState(sm, () => false);
    assert.strictEqual(recovered, true);
    assert.strictEqual(sm.getState().status, 'failed');

    // heartbeat stamps pid + heartbeatAt.
    supervisor.heartbeat(sm, 12345);
    const st = sm.getState();
    assert.strictEqual(st.pid, 12345);
    assert.ok(typeof st.heartbeatAt === 'string' && st.heartbeatAt.length > 0);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('recoverState is a no-op for a live running session', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'mf-sup-'));
  try {
    const sm = createStateManager(dir);
    sm.updateState({ status: 'running', pid: 1 });
    const recovered = supervisor.recoverState(sm, () => true);
    assert.strictEqual(recovered, false);
    assert.strictEqual(sm.getState().status, 'running');
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
