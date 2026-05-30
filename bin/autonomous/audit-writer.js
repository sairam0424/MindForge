/**
 * MindForge — Audit Writer (Async Buffered)
 * Extracted from auto-runner.js — handles all JSONL audit append operations.
 * Buffers entries and flushes every 100ms or when buffer reaches 10 entries.
 */
'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { AuditRotator } = require('../utils/file-io');
const { createAppendQueue } = require('../utils/append-queue');
const { hashAuditEntry } = require('../governance/audit-hash');

const FLUSH_INTERVAL_MS = 100;
const FLUSH_THRESHOLD = 10;

const rotator = new AuditRotator({ maxLines: 5000 });

/**
 * Computes the SHA-256 hash of an entry chained to its predecessor (UC-04).
 * Delegates to the canonical {@link hashAuditEntry} (bin/governance/audit-hash.js)
 * so the writer and verifier share ONE hasher — material drift is impossible.
 * The material is {...entry, previous_hash} where `entry` does NOT contain `_hash`.
 * @param {object} entry — buffered entry WITHOUT a `_hash` field
 * @param {string|null} previousHash — prior entry's `_hash` (null for the first link)
 * @returns {string} hex-encoded SHA-256 digest
 */
function hashEntry(entry, previousHash) {
  return hashAuditEntry(entry, previousHash);
}

/**
 * Reads the `_hash` of the last entry already on disk so a re-opened writer
 * continues the existing chain instead of starting a fresh, disconnected one.
 * @param {string} auditPath — path to the AUDIT.jsonl file
 * @returns {string|null} last `_hash`, or null if absent/unreadable/empty
 */
function readLastHash(auditPath) {
  try {
    const lines = fs.readFileSync(auditPath, 'utf8').split('\n').filter(Boolean);
    if (lines.length === 0) return null;
    const last = JSON.parse(lines[lines.length - 1]);
    return last._hash || null;
  } catch { return null; }
}

// ── Unified synchronous-durable chained append (UC-04b) ───────────────────────
// ONE primitive that ALL audit write sites funnel through, producing a single
// verifiable chain via the canonical hashAuditEntry. Synchronous + fsync'd so an
// acknowledged write is on disk before the call returns (UC-09 durability) — this
// is what lets us delete the old raw `appendFileSync` shadow-writes: the durable
// sync write gives in-process consumers (e.g. StuckMonitor, which is fed the event
// object directly but may also re-read the file) immediate, durable data.
//
// Chain head caching: re-reading the file's tail on every append is O(file) — bad
// on hot paths. Instead we keep a per-path in-memory lastHash (Map keyed by the
// RESOLVED absolute path), seeded ONCE from the file's last entry on the first
// append, then advanced in-process for O(1) appends. If the cache is cold (new
// process, or a path never written in this process) we seed from disk — so a
// second process correctly continues the on-disk chain from its tail.
//
// Concurrency: within a process this is fully synchronous, so calls cannot
// interleave and the cached lastHash is always current. ACROSS processes, each
// process seeds from the file tail on its first append; this is correct only under
// the single-operator model (no two processes appending CONCURRENTLY to the same
// audit file). MindForge runs one autonomous operator at a time, so this holds.
const _lastHashCache = new Map(); // resolvedPath -> last `_hash` written/seen

/**
 * Synchronously appends ONE hash-chained, durable entry to an audit JSONL file.
 * This is the single unified append used by every audit write site (UC-04b).
 * @param {string} auditPath — path to the AUDIT.jsonl file
 * @param {object} event — the event payload (id/timestamp stamped if missing)
 * @returns {object} the stamped + chained entry actually written
 */
function appendAuditEntrySync(auditPath, event) {
  const resolved = path.resolve(auditPath);

  // 1. Stamp id + timestamp if missing — immutable (new object, never mutate input).
  const stamped = {
    ...event,
    id: event.id || crypto.randomBytes(8).toString('hex'),
    timestamp: event.timestamp || new Date().toISOString(),
  };

  // 2. Seed previous_hash: prefer the warm in-process cache; fall back to the
  //    file's last entry when cold (first append in this process for this path).
  let previous_hash = _lastHashCache.has(resolved)
    ? _lastHashCache.get(resolved)
    : readLastHash(resolved);

  // 3. Compute _hash over {...stamped, previous_hash} WITHOUT _hash in the material.
  const _hash = hashAuditEntry(stamped, previous_hash);

  // 4. Write {...stamped, previous_hash, _hash} as one JSON line, durably+synchronously
  //    (openSync('a') + writeSync + fsyncSync + closeSync — mirrors appendDurableSync).
  const chained = { ...stamped, previous_hash, _hash };
  fs.mkdirSync(path.dirname(resolved), { recursive: true });
  const fd = fs.openSync(resolved, 'a');
  try {
    fs.writeSync(fd, JSON.stringify(chained) + '\n');
    fs.fsyncSync(fd);
  } finally {
    fs.closeSync(fd);
  }

  // 5. Advance the in-process chain head and return the written entry.
  _lastHashCache.set(resolved, _hash);
  return chained;
}

/**
 * Creates a buffered async audit writer.
 * @param {string} auditPath — Path to the AUDIT.jsonl file
 * @returns {{ write: (entry: object) => void, flush: () => Promise<void>, close: () => Promise<void> }}
 */
function createAuditWriter(auditPath) {
  let buffer = [];
  let flushTimer = null;
  let isClosed = false;
  // Hash-chain state (UC-04): seeded once from the existing file on first flush so
  // a re-opened writer extends the on-disk chain rather than forking a new one.
  let lastHash = null;
  let seeded = false;
  const queue = createAppendQueue(auditPath);

  function scheduleFlush() {
    if (flushTimer !== null) return;
    flushTimer = setTimeout(async () => {
      flushTimer = null;
      await flush();
    }, FLUSH_INTERVAL_MS);
  }

  /**
   * Adds an entry to the buffer. Triggers flush if threshold reached.
   * Stamps entry with id and timestamp if missing (immutable — creates new object).
   */
  function write(entry) {
    if (isClosed) {
      throw new Error('AuditWriter is closed — cannot write after close()');
    }

    const stamped = Object.assign(Object.create(null), entry, {
      id: entry.id || crypto.randomBytes(8).toString('hex'),
      timestamp: entry.timestamp || new Date().toISOString(),
    });

    buffer = [...buffer, stamped];

    if (buffer.length >= FLUSH_THRESHOLD) {
      // Immediate flush — don't wait for timer
      if (flushTimer !== null) {
        clearTimeout(flushTimer);
        flushTimer = null;
      }
      flush();
    } else {
      scheduleFlush();
    }

    return stamped;
  }

  /**
   * Flushes the buffer to disk using async appendFile.
   */
  async function flush() {
    if (buffer.length === 0) return;

    const toWrite = buffer;
    buffer = [];

    // Seed the chain head once from the existing file (continues an on-disk chain).
    if (!seeded) { lastHash = readLastHash(auditPath); seeded = true; }

    // Chain entries IN ORDER at serialize time: hash {...e, previous_hash} BEFORE
    // adding _hash, then append _hash. The verifier strips _hash to reproduce the
    // identical material. lastHash advances per entry so each links to its predecessor.
    const chained = toWrite.map((e) => {
      const previous_hash = lastHash;
      const _hash = hashEntry(e, previous_hash);
      lastHash = _hash;
      return { ...e, previous_hash, _hash };
    });

    // append() re-adds the trailing newline delimiter, so build payload without it.
    const payload = chained.map(e => JSON.stringify(e)).join('\n');
    // Non-fatal durable write: a rejected append (ENOSPC/EACCES/EIO/EROFS) must NOT
    // become an unhandledRejection and terminate the process — the threshold/timer
    // paths call flush() un-awaited. Catch here so the failure is logged and the
    // process survives; callers that explicitly `await flush()`/`await close()`
    // still resolve cleanly (the rejection is absorbed, never rethrown).
    await queue.append(payload).catch((err) => {
      process.stderr.write(`[audit-writer] durable flush failed: ${err.message}\n`);
    });

    try {
      if (rotator.shouldRotate(auditPath)) {
        const archiveDir = path.join(path.dirname(auditPath), '..', '.planning', 'audit-archive');
        rotator.rotate(auditPath, archiveDir);
      }
    } catch (err) {
      process.stderr.write(`[audit-writer] rotation warning: ${err.message}\n`);
    }
  }

  /**
   * Flushes remaining entries and stops the timer. After close(), write() will throw.
   */
  async function close() {
    isClosed = true;
    if (flushTimer !== null) {
      clearTimeout(flushTimer);
      flushTimer = null;
    }
    await flush();
    // Drain any in-flight threshold-triggered flushes that enqueued without being
    // awaited — guarantees all acknowledged writes are durable before close resolves.
    await queue.drain();
  }

  return Object.freeze({ write, flush, close });
}

module.exports = { createAuditWriter, appendAuditEntrySync };
