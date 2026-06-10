'use strict';

/**
 * MindForge — Autonomous session supervisor (PID-liveness crash recovery).
 *
 * Adapted from ECC's Rust session daemon (ecc2/src/session/daemon.rs). Ports
 * ONLY the two pure, high-value functions — NOT the tokio daemon or ECC's
 * dispatch/merge/rebalance machinery (which overlaps MindForge's existing
 * task-dispatcher / wave-executor / mesh-self-healer):
 *
 *   1. pidIsAlive(pid)        — process.kill(pid, 0): ESRCH=dead, EPERM=alive.
 *   2. resumeCrashedSessions  — sweep sessions left "running" whose pid is dead
 *                               and mark them "failed" (stale-pid recovery).
 *
 * Plus a heartbeat() that stamps auto-state.json so a supervisor can detect a
 * wedged/abandoned session. Layered OVER state-manager.js — it does not replace
 * it. Default-inert: nothing runs unless explicitly invoked.
 */

const SUPERVISOR_STATUSES = ['idle', 'running', 'paused', 'completed', 'escalated', 'timeout', 'failed'];

/**
 * Probe whether a process is alive. Cross-platform via Node's process.kill with
 * signal 0 (no signal delivered — existence check only):
 *   - kill succeeds            -> alive
 *   - throws EPERM             -> alive (exists, owned by another user)
 *   - throws ESRCH (or other)  -> dead
 * A null/0/invalid pid is treated as dead.
 */
function pidIsAlive(pid) {
  const n = Number(pid);
  if (!Number.isInteger(n) || n <= 0) return false;
  try {
    process.kill(n, 0);
    return true;
  } catch (err) {
    return err && err.code === 'EPERM';
  }
}

/**
 * Sweep a sessions list and mark any that are "running" with a dead pid as
 * "failed". Pure over its inputs: takes the sessions array + an isAlive probe
 * (injectable for tests, matching ECC's resume_crashed_sessions_with) and
 * returns { failed: [...ids], sessions: [...updated] } without side effects.
 *
 * @param {Array<{id:string,status:string,pid?:number}>} sessions
 * @param {(pid:number)=>boolean} [isAlive] defaults to pidIsAlive
 */
function resumeCrashedSessions(sessions, isAlive = pidIsAlive) {
  const failed = [];
  const updated = (Array.isArray(sessions) ? sessions : []).map(session => {
    if (session.status !== 'running') return session;
    if (session.pid != null && isAlive(session.pid)) return session;
    failed.push(session.id);
    // Immutable: new object with failed status, pid cleared.
    return Object.assign({}, session, { status: 'failed', pid: null });
  });
  return { failed, sessions: updated };
}

/**
 * Stamp a heartbeat onto auto-state.json via a state manager. A supervisor in a
 * separate process can compare heartbeatAt against now to detect a stalled loop
 * (pairs with bin/autonomous/session-guardian.sh + loop-operator escalation).
 *
 * @param {{updateState:Function}} stateManager  from createStateManager(planningDir)
 * @param {number} [pid] the live worker pid to record (defaults to current pid)
 */
function heartbeat(stateManager, pid = process.pid) {
  return stateManager.updateState({
    pid,
    heartbeatAt: new Date().toISOString(),
  });
}

/**
 * Recover a single state file: if it shows status "running" with a dead pid,
 * transition it to "failed". Returns true if a recovery was applied.
 *
 * @param {{getState:Function,updateState:Function}} stateManager
 * @param {(pid:number)=>boolean} [isAlive]
 */
function recoverState(stateManager, isAlive = pidIsAlive) {
  const state = stateManager.getState();
  if (state.status !== 'running') return false;
  if (state.pid != null && isAlive(state.pid)) return false;
  stateManager.updateState({ status: 'failed', pid: null, failedAt: new Date().toISOString() });
  return true;
}

module.exports = {
  SUPERVISOR_STATUSES,
  pidIsAlive,
  resumeCrashedSessions,
  heartbeat,
  recoverState,
};
