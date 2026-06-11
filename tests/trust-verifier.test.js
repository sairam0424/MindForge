'use strict';

/**
 * MindForge Governance — trust-verifier tests (Wave 6).
 *
 * trust-verifier.js (ZTAI audit-entry signature verification + Tier-3 authz +
 * audit-log scanning) had ZERO test coverage. The audit flagged the gap on a
 * safety-critical module. These tests lock its fail-closed contract:
 *   - missing did/signature -> invalid,
 *   - a genuine ZTAI signature -> valid; tampered payload/signature -> invalid,
 *   - an unresolvable DID -> invalid (never throws out),
 *   - isAuthorizedForTier3 is true ONLY for a registered tier>=3 agent,
 *   - verifyAuditLog tallies valid / invalid / malformed-JSON lines.
 *
 * The module exports a SINGLETON instance; ZTAI is likewise a singleton.
 */

const assert = require('node:assert');
const { test } = require('node:test');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const tv = require(path.join(ROOT, 'bin', 'governance', 'trust-verifier'));
const ztai = require(path.join(ROOT, 'bin', 'governance', 'ztai-manager'));

// Build a genuinely-signed audit entry for a freshly-registered DID.
async function signedEntry(tier = 3, extra = {}) {
  const did = await ztai.registerAgent(`tv-test-${tier}`, tier);
  const payloadObj = { event: 'test_event', did, timestamp: '2026-01-01T00:00:00Z', ...extra };
  const signature = await ztai.signData(did, JSON.stringify(payloadObj));
  return { did, entry: { ...payloadObj, signature } };
}

// ── verifyEntry: fail-closed on missing identity ─────────────────────────────

test('verifyEntry rejects an entry with no did or signature', () => {
  assert.strictEqual(tv.verifyEntry({ event: 'x' }).valid, false);
  assert.strictEqual(tv.verifyEntry({ did: 'did:x' }).valid, false, 'did without signature is invalid');
  assert.strictEqual(tv.verifyEntry({ signature: 'sig' }).valid, false, 'signature without did is invalid');
});

test('verifyEntry rejects a bogus signature on an unresolvable DID (no throw escapes)', () => {
  const r = tv.verifyEntry({ event: 'x', did: 'did:mindforge:ghost', signature: 'bogus' });
  assert.strictEqual(r.valid, false, 'unresolvable DID must fail closed');
  assert.strictEqual(r.tier, 0);
});

// ── verifyEntry: genuine vs tampered ─────────────────────────────────────────

test('verifyEntry accepts a genuine ZTAI-signed entry and reports its tier', async () => {
  const { did, entry } = await signedEntry(3);
  try {
    const r = tv.verifyEntry(entry);
    assert.strictEqual(r.valid, true);
    assert.strictEqual(r.error, null);
    assert.strictEqual(r.tier, 3);
  } finally { ztai.revokeAgent(did); }
});

test('verifyEntry rejects a tampered payload (signature no longer matches)', async () => {
  const { did, entry } = await signedEntry(2);
  try {
    const tampered = { ...entry, event: 'ESCALATE_PRIVILEGES' };
    const r = tv.verifyEntry(tampered);
    assert.strictEqual(r.valid, false);
    assert.match(r.error, /mismatch/i);
  } finally { ztai.revokeAgent(did); }
});

test('verifyEntry rejects a tampered signature', async () => {
  const { did, entry } = await signedEntry(2);
  try {
    const r = tv.verifyEntry({ ...entry, signature: Buffer.from('forged').toString('base64') });
    assert.strictEqual(r.valid, false);
  } finally { ztai.revokeAgent(did); }
});

// ── isAuthorizedForTier3 ─────────────────────────────────────────────────────

test('isAuthorizedForTier3 is true ONLY for a registered tier>=3 agent', async () => {
  const t3 = await ztai.registerAgent('tv-authz-3', 3);
  const t1 = await ztai.registerAgent('tv-authz-1', 1);
  try {
    assert.strictEqual(tv.isAuthorizedForTier3(t3), true);
    assert.ok(!tv.isAuthorizedForTier3(t1), 'tier 1 must not be Tier-3 authorized');
    assert.ok(!tv.isAuthorizedForTier3('did:mindforge:unregistered'), 'unknown DID must not be authorized');
  } finally { ztai.revokeAgent(t3); ztai.revokeAgent(t1); }
});

// ── verifyAuditLog ───────────────────────────────────────────────────────────

test('verifyAuditLog tallies valid, invalid, and malformed-JSON lines', async () => {
  const { did, entry } = await signedEntry(3);
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'mf-tv-'));
  try {
    const logPath = path.join(dir, 'AUDIT.jsonl');
    fs.writeFileSync(logPath, [
      JSON.stringify(entry),                                   // valid
      JSON.stringify({ event: 'no-identity' }),                // invalid: missing did/sig
      'this is not json',                                      // invalid: malformed JSON
    ].join('\n') + '\n');

    const res = await tv.verifyAuditLog(logPath);
    assert.strictEqual(res.total, 3);
    assert.strictEqual(res.valid, 1);
    assert.strictEqual(res.invalid, 2);
    assert.ok(res.errors.some(e => /Invalid JSON/.test(e)), 'malformed line reported');
  } finally {
    ztai.revokeAgent(did);
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

console.log('trust-verifier tests defined');
