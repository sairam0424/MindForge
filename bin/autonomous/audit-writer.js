/**
 * MindForge — Audit Writer (Synchronous Durable, Hash-Chained)
 *
 * Provides the ONE unified audit-append primitive {@link appendAuditEntrySync}
 * that every audit write site funnels through, producing a single verifiable
 * hash chain (UC-04 / UC-04b).
 *
 * Retired in UC-04b: the old buffered async writer (`createAuditWriter`) and its
 * AuditRotator-based 5000-line rotation. Rotation BROKE the hash chain — archiving
 * + truncating AUDIT.jsonl orphaned the carried head's `previous_hash` from an entry
 * no longer on disk, so the verifier failed closed on a rotated-but-untampered file.
 * As a result AUDIT.jsonl now grows UNBOUNDED. That is an accepted short-term tradeoff
 * at single-operator/dev scale. The proper fix — chain-aware compaction (archive old
 * entries AND re-anchor the first carried entry to previous_hash=null so the live tail
 * verifies standalone) — is a DEFERRED future feature, intentionally NOT in scope here.
 */
'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { hashAuditEntry } = require('../governance/audit-hash');

/**
 * Computes the SHA-256 hash of an entry chained to its predecessor (UC-04).
 * Delegates to the canonical {@link hashAuditEntry} (bin/governance/audit-hash.js)
 * so the writer and verifier share ONE hasher — material drift is impossible.
 * The material is {...entry, previous_hash} where `entry` does NOT contain `_hash`.
 * @param {object} entry — entry WITHOUT a `_hash` field
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
 *
 * NOTE: performs an fsync (openSync('a') + writeSync + fsyncSync + closeSync) on
 * EVERY call. This is deliberate for audit integrity/durability — but it makes the
 * call relatively expensive, so it is intended for audit-grade events, NOT for
 * high-frequency telemetry. Hot-path callers (e.g. nexus-tracer span/reasoning
 * events) pay one fsync per event; keep that cost in mind before adding new hot
 * write sites.
 *
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
  const _hash = hashEntry(stamped, previous_hash);

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

module.exports = { appendAuditEntrySync };
