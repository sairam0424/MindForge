'use strict';
/**
 * MindForge — EIS remote-provenance verification tests (UC-22, finding #22)
 *
 * Regression anchor: verifyRemoteProvenance previously did
 *     if (!signature) return false; return true;   // TODO
 * i.e. it returned TRUE for ANY non-empty signature, with no crypto.verify and
 * no DID resolution — while the class doc claimed it "ensures verifiable
 * provenance." That is a false security claim.
 *
 * Honest contract (fail-closed): the method MUST NOT return true for a
 * signature it has not actually cryptographically verified against a
 * resolvable public key. It returns true ONLY when ZTAI verifySignature
 * confirms the signature; in every other case (missing signature, missing or
 * unresolvable DID, tampered payload/signature) it returns false.
 *
 * The module exports a class; ZTAI exports a singleton instance.
 */
const assert = require('assert');

const EISClient = require('../bin/memory/eis-client');
const ztai = require('../bin/governance/ztai-manager');

let passed = 0, failed = 0;
const tests = [];
function test(name, fn) { tests.push({ name, fn }); }

// ── Fail-closed: unverifiable / bogus inputs MUST be false ───────────────────

test('returns false for a missing signature', () => {
  const client = new EISClient();
  assert.strictEqual(client.verifyRemoteProvenance({ did: 'did:mindforge:x', signedData: 'd' }, ''), false);
  assert.strictEqual(client.verifyRemoteProvenance({ did: 'did:mindforge:x', signedData: 'd' }, null), false);
  assert.strictEqual(client.verifyRemoteProvenance({ did: 'did:mindforge:x', signedData: 'd' }, undefined), false);
});

test('returns false for a bogus signature on an UNRESOLVABLE remote DID (core RED)', () => {
  // This is the exact case the old code returned TRUE for: a non-empty
  // signature with no resolvable key. A remote DID is not in the local ZTAI
  // registry, so provenance cannot be verified and MUST fail closed.
  const client = new EISClient();
  const entry = { did: 'did:mindforge:remote-peer-unknown', signedData: 'arbitrary' };
  const bogus = Buffer.from('not-a-real-signature').toString('base64');
  assert.strictEqual(client.verifyRemoteProvenance(entry, bogus), false,
    'unresolvable DID + bogus signature must NOT be accepted as verified');
});

test('returns false when the entry carries no DID to resolve', () => {
  const client = new EISClient();
  const bogus = Buffer.from('xx').toString('base64');
  assert.strictEqual(client.verifyRemoteProvenance({ signedData: 'd' }, bogus), false);
  assert.strictEqual(client.verifyRemoteProvenance(null, bogus), false);
  assert.strictEqual(client.verifyRemoteProvenance(undefined, bogus), false);
});

// ── Real verification: genuine signatures pass, tampered ones fail ───────────

test('returns true ONLY for a genuine ZTAI signature from a resolvable DID', async () => {
  const client = new EISClient();
  const did = await ztai.registerAgent('eis-provenance-test', 2); // Tier 2 → real Ed25519
  const signedData = JSON.stringify({ id: 'k1', payload: 'shared-knowledge' });
  const signature = await ztai.signData(did, signedData);

  const entry = { did, signedData };
  assert.strictEqual(client.verifyRemoteProvenance(entry, signature), true,
    'a real, registry-resolvable signature must verify');

  // Tampered payload → must fail closed.
  const tampered = { did, signedData: signedData + 'X' };
  assert.strictEqual(client.verifyRemoteProvenance(tampered, signature), false,
    'tampered signed data must NOT verify');

  // Tampered signature → must fail closed.
  const flipped = Buffer.from('tampered-signature-bytes').toString('base64');
  assert.strictEqual(client.verifyRemoteProvenance(entry, flipped), false,
    'tampered signature must NOT verify');

  ztai.revokeAgent(did);
});

(async () => {
  for (const { name, fn } of tests) {
    try { await fn(); console.log('  ✅  ' + name); passed++; }
    catch (e) { console.error('  ❌  ' + name + '\n      ' + e.message); failed++; }
  }
  console.log('\nEIS Remote Provenance: ' + passed + ' passed, ' + failed + ' failed');
  if (failed > 0) process.exit(1);
})();
