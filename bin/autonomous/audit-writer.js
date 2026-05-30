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

const FLUSH_INTERVAL_MS = 100;
const FLUSH_THRESHOLD = 10;

const rotator = new AuditRotator({ maxLines: 5000 });

/**
 * Computes the SHA-256 hash of an entry chained to its predecessor (UC-04).
 * CRITICAL INVARIANT: the hash material MUST be byte-identical to the verifier
 * (bin/governance/audit-verifier.js). The material is JSON.stringify({...entry,
 * previous_hash}) where `entry` does NOT yet contain `_hash`. The verifier strips
 * `_hash` from the stored entry to reproduce exactly this material. Do not reorder
 * keys or include `_hash` here.
 * @param {object} entry — buffered entry WITHOUT a `_hash` field
 * @param {string|null} previousHash — prior entry's `_hash` (null for the first link)
 * @returns {string} hex-encoded SHA-256 digest
 */
function hashEntry(entry, previousHash) {
  const material = JSON.stringify({ ...entry, previous_hash: previousHash });
  return crypto.createHash('sha256').update(material).digest('hex');
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

module.exports = { createAuditWriter };
