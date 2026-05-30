'use strict';
/**
 * MindForge — Audit chain verifier (UC-04). Fail-closed: any break => valid:false.
 *
 * Walks the JSONL audit log line-by-line and re-derives each entry's hash from its
 * content plus the prior entry's hash. The chain is valid only if EVERY link holds:
 *   1. entry.previous_hash matches the running previousHash (null for the first entry)
 *   2. entry._hash equals sha256({...entry-without-_hash, previous_hash})
 *
 * CRITICAL INVARIANT: hashEntry() here MUST produce byte-identical material to the
 * writer (bin/autonomous/audit-writer.js). The writer hashes {...e, previous_hash}
 * where `e` has no `_hash`. The stored entry is {...e, previous_hash, _hash}; stripping
 * `_hash` via destructuring yields {...e, previous_hash} with the SAME key insertion
 * order, so {...rest, previous_hash} reproduces the writer's material exactly.
 */
const fs = require('fs');
const crypto = require('crypto');

/**
 * Re-derives an entry's chained hash. Excludes `_hash` from the material.
 * @param {object} entry — stored entry (may include `_hash`, which is stripped)
 * @param {string|null} previousHash — prior entry's `_hash` (null for the first link)
 * @returns {string} hex-encoded SHA-256 digest
 */
function hashEntry(entry, previousHash) {
  const { _hash, ...rest } = entry; // exclude _hash from material
  const material = JSON.stringify({ ...rest, previous_hash: previousHash });
  return crypto.createHash('sha256').update(material).digest('hex');
}

/**
 * Verifies the integrity of a hash-chained audit log. Fail-closed.
 * @param {string} auditPath — path to the AUDIT.jsonl file
 * @returns {{ valid: boolean, count: number, brokenAt?: number, reason?: string }}
 */
function verifyAuditChain(auditPath) {
  let lines;
  try { lines = fs.readFileSync(auditPath, 'utf8').split('\n').filter(Boolean); }
  catch (e) { return { valid: false, count: 0, brokenAt: 0, reason: `unreadable: ${e.message}` }; }

  let previousHash = null;
  for (let i = 0; i < lines.length; i++) {
    let entry;
    try { entry = JSON.parse(lines[i]); }
    catch { return { valid: false, count: lines.length, brokenAt: i, reason: 'unparseable line' }; }

    if (entry.previous_hash !== previousHash) {
      return { valid: false, count: lines.length, brokenAt: i, reason: 'previous_hash mismatch' };
    }
    const expected = hashEntry(entry, previousHash);
    if (entry._hash !== expected) {
      return { valid: false, count: lines.length, brokenAt: i, reason: 'hash mismatch (entry mutated)' };
    }
    previousHash = entry._hash;
  }
  return { valid: true, count: lines.length };
}

module.exports = { verifyAuditChain };
