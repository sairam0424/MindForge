'use strict';

/**
 * MindForge — Fail-closed advisory file lock (LOCK-01).
 *
 * Promoted from bin/learning/instinct-cli.js:78-100 (`withStoreLock`), preserving its
 * semantics: an O_CREAT|O_EXCL lockfile beside the target, a bounded retry spin, a
 * stale-reclaim by mtime for locks orphaned by a killed process, and unlink in finally.
 *
 * FAIL-CLOSED: when the lock cannot be taken this THROWS. It NEVER writes anyway.
 * Deliberately NOT modelled on .agent/bin/lib/state.cjs:784-789, which unlinks the other
 * holder's lock and writes regardless on its last retry — that converts a detectable
 * contention error into silent data loss.
 *
 * `fn` MUST be SYNCHRONOUS. The re-entrancy depth counter below is only sound because
 * nothing else in this process can interleave between acquire and release.
 */

const fs = require('fs');
const path = require('path');

const MAX_TRIES = 50;      // 50 x 20-40ms => ~1-2s ceiling before failing closed
const WAIT_MS = 20;
const STALE_MS = 10000;    // reclaim a lockfile whose mtime is older than this

// Re-entrancy depth per lockfile. Required: knowledge-graph applyDecay() holds this
// lock and calls deprecateEdge(), which takes the SAME lock. Without re-entrancy that
// self-deadlocks and then fails closed, so a decay pass could never prune an edge.
const _held = new Map(); // lockPath -> depth

const _sleepView = new Int32Array(new SharedArrayBuffer(4));

/** Blocking sleep that does not burn a core; busy-waits if Atomics.wait is refused. */
function sleepSync(ms) {
  try {
    Atomics.wait(_sleepView, 0, 0, ms);
  } catch {
    const until = Date.now() + ms;
    while (Date.now() < until) { /* busy-wait fallback */ }
  }
}

/**
 * Rejects an async fn. The `finally` in withFileLock unlinks the lockfile the moment
 * fn() returns, so a promise-returning fn would run its critical section UNLOCKED while
 * looking guarded. Failing loudly here is far cheaper than debugging that corruption.
 */
function assertSync(out) {
  if (out && typeof out.then === 'function') {
    throw new TypeError('withFileLock requires a SYNCHRONOUS fn; got a thenable');
  }
  return out;
}

/**
 * Runs fn() while holding an exclusive advisory lock on `${targetPath}.lock`.
 * @param {string} targetPath  the file being protected (the lock is a sibling `.lock`)
 * @param {Function} fn        SYNCHRONOUS critical section; its return value is returned
 * @param {object} [opts]      { maxTries, waitMs, staleMs, label }
 * @returns {*} whatever fn() returns
 * @throws if the lock cannot be acquired within maxTries — the caller MUST NOT write
 */
function withFileLock(targetPath, fn, opts = {}) {
  const lock = `${targetPath}.lock`;

  const depth = _held.get(lock) || 0;
  if (depth > 0) {                       // already ours — re-enter, do not re-acquire
    _held.set(lock, depth + 1);
    try { return assertSync(fn()); }
    finally { _held.set(lock, _held.get(lock) - 1); }
  }

  const maxTries = opts.maxTries ?? MAX_TRIES;
  const waitMs = opts.waitMs ?? WAIT_MS;
  const staleMs = opts.staleMs ?? STALE_MS;
  const label = opts.label || targetPath;

  // The lock must be creatable before the target's own mkdir runs, so ensure the dir
  // here. A bad path still throws ENOTDIR/ENOENT to the caller, unchanged.
  fs.mkdirSync(path.dirname(lock), { recursive: true });

  let acquired = false;
  for (let i = 0; i < maxTries && !acquired; i++) {
    try {
      fs.closeSync(fs.openSync(lock, 'wx'));   // O_CREAT|O_EXCL|O_WRONLY
      acquired = true;
    } catch (err) {
      if (err.code !== 'EEXIST') throw err;
      try {
        const age = Date.now() - fs.statSync(lock).mtimeMs;
        if (age > staleMs) { fs.unlinkSync(lock); continue; }   // orphaned by a kill
      } catch { /* lock vanished between EEXIST and stat — retry */ }
      sleepSync(waitMs + Math.floor(Math.random() * waitMs));   // jitter breaks the herd
    }
  }
  if (!acquired) throw new Error(`could not acquire ${label} lock: ${lock}`);

  _held.set(lock, 1);
  try { return assertSync(fn()); }
  finally {
    _held.set(lock, 0);
    try { fs.unlinkSync(lock); } catch { /* already gone */ }
  }
}

module.exports = { withFileLock, MAX_TRIES, WAIT_MS, STALE_MS };
