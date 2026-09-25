'use strict';
const crypto = require('crypto');
/**
 * Canonical audit hash material. MUST be the single source of truth for both
 * the writer (pre-_hash entry) and the verifier (entry with _hash stripped).
 * Hashes {...entry, previous_hash} — entry must NOT contain _hash.
 */
function hashAuditEntry(entryWithoutHash, previousHash) {
  const material = JSON.stringify({ ...entryWithoutHash, previous_hash: previousHash });
  return crypto.createHash('sha256').update(material).digest('hex');
}
module.exports = { hashAuditEntry };
