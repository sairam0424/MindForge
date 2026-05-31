/**
 * MindForge — Orbital Guardian verify() integrity test (UC-22).
 *
 * Audit finding #2: a CRITICAL governance bypass. orbitalGuardian.verify()
 * trusted ANY attestations row with status='APPROVED' without re-checking the
 * cryptographic signature attest() created. An attacker who could insert one
 * forged APPROVED row therefore satisfied the highest governance gate
 * (policy-gate-hardened trusts attestation.verified for >95 impact mutations).
 *
 * These tests prove verify() now genuinely re-verifies the signature:
 *   1. Happy path  — a real attest() round-trips to verified:true.
 *   2. Bypass regression (the key test) — a forged APPROVED row with a bogus
 *      signature MUST be rejected (verified:false). This FAILS pre-fix (RED).
 *   3. Missing requestId — fail-closed (verified:false).
 *
 * Run: node tests/orbital-verify.test.js
 */
'use strict';

const assert = require('assert');
const orbitalGuardian = require('../bin/engine/orbital-guardian');
const ztaiManager = require('../bin/governance/ztai-manager');
const vectorHub = require('../bin/memory/vector-hub');

let passed = 0;
let failed = 0;
const tests = [];
function test(name, fn) { tests.push({ name, fn }); }

// Unique suffix so rows from this run never collide with prior runs in the
// shared celestial.db (the suite reuses one on-disk database).
const RUN = Math.random().toString(36).slice(2, 8);

test('happy path: a real attest() round-trips to verified:true', async () => {
  await vectorHub.init();
  const did = await ztaiManager.registerAgent('mf-governor', 3);
  const requestId = `req_happy_${RUN}`;

  const report = await orbitalGuardian.attest(requestId, did, { action: 'DELETE_PRODUCTION_INDEX' });
  assert.strictEqual(report.status, 'APPROVED', 'attest() must record an APPROVED report');

  const result = await orbitalGuardian.verify(requestId);
  assert.strictEqual(result.verified, true,
    'a genuinely attested request must verify:true');
  assert.ok(result.id, 'verified result must surface the attestation id');
});

test('bypass regression: a forged APPROVED row must be rejected (verified:false)', async () => {
  await vectorHub.init();
  const requestId = `req_forged_${RUN}`;

  // Forge an APPROVED row directly using ONLY the original schema columns —
  // exactly the attack the gate must resist: write one row, satisfy the gate.
  // No DID, no signed message, a bogus signature blob. Pre-fix, verify() trusts
  // status='APPROVED' blindly and returns verified:true (the vulnerability).
  // Post-fix, the absence of a verifiable (did, signed_message, signature) tuple
  // makes verify() fail closed.
  vectorHub.run(
    `INSERT INTO attestations (id, request_id, status, attestation_payload, timestamp)
     VALUES (?, ?, ?, ?, ?)`,
    [
      `att_forged_${RUN}`,
      requestId,
      'APPROVED',
      'FORGED_NOT_A_REAL_SIGNATURE',
      new Date().toISOString()
    ]
  );

  const result = await orbitalGuardian.verify(requestId);
  assert.strictEqual(result.verified, false,
    'a forged APPROVED row with no verifiable signature MUST NOT verify');
  assert.ok(result.reason, 'rejection must carry a reason for the audit trail');
});

test('missing requestId is fail-closed (verified:false)', async () => {
  await vectorHub.init();
  const result = await orbitalGuardian.verify(undefined);
  assert.strictEqual(result.verified, false,
    'verify() with no requestId must fail closed');
});

(async () => {
  for (const { name, fn } of tests) {
    try { await fn(); console.log(`  ✅  ${name}`); passed++; }
    catch (e) { console.error(`  ❌  ${name}\n      ${e.message}`); failed++; }
  }
  console.log(`\nOrbital Verify: ${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
  process.exit(0);
})();
