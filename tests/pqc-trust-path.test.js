/**
 * MindForge — PQC trust-path test (UC-24). Run: node tests/pqc-trust-path.test.js
 */
'use strict';
const fs = require('fs'); const path = require('path'); const assert = require('assert');
let passed = 0, failed = 0; const tests = [];
function test(name, fn) { tests.push({ name, fn }); }
const ROOT = path.resolve(__dirname, '..');

test('config: pqas_enabled is false by default (simulated PQC off the live trust path)', () => {
  const cfg = JSON.parse(fs.readFileSync(path.join(ROOT, '.mindforge', 'config.json'), 'utf8'));
  assert.strictEqual(cfg.security.pqas_enabled, false,
    'pqas_enabled must default to false until real PQC ships');
});

test('config: simulated PQC is gated behind an explicit experimental.pqc_demo flag', () => {
  const cfg = JSON.parse(fs.readFileSync(path.join(ROOT, '.mindforge', 'config.json'), 'utf8'));
  assert.ok(cfg.experimental && typeof cfg.experimental.pqc_demo === 'boolean',
    'experimental.pqc_demo flag must exist');
  assert.strictEqual(cfg.experimental.pqc_demo, false, 'pqc_demo must default to false');
});

test('quantum-crypto self-labels as simulated (no false assurance)', () => {
  const src = fs.readFileSync(path.join(ROOT, 'bin', 'governance', 'quantum-crypto.js'), 'utf8');
  assert.ok(/simulated/i.test(src), 'quantum-crypto must honestly label simulated output');
});

test('Tier-3 signing uses real Ed25519 by default (verifiable round-trip, not simulated)', async () => {
  // ZTAIManager is exported as a singleton instance. registerAgent(persona, tier, sessionId)
  // -> Promise<did>; signData(did, data) -> Promise<base64 sig>; verifySignature(did, data, sig) -> bool.
  const ztai = require('../bin/governance/ztai-manager');
  const did = await ztai.registerAgent('security-engineer', 3);

  // Tier-3 must route to the real-Ed25519 enclave provider, NOT the simulated quantum provider.
  assert.strictEqual(ztai.getAgent(did).providerType, 'enclave',
    'Tier-3 must use the real-Ed25519 enclave provider by default, not simulated PQC');

  const payload = 'integrity-test-payload';
  const sig = await ztai.signData(did, payload);

  // A real Ed25519 signature is an opaque base64 blob, NOT a simulated PQC envelope object.
  assert.strictEqual(typeof sig, 'string',
    'Tier-3 signature must be a raw Ed25519 string, not a simulated {simulated:true} object');
  assert.ok(!sig.startsWith('pqas_sig_'),
    'Tier-3 signature must NOT be a simulated Dilithium-5 (pqas_sig_) envelope');

  assert.strictEqual(ztai.verifySignature(did, payload, sig), true,
    'Tier-3 signature must verify with real Ed25519 under default (pqc_demo=false) config');

  // Tamper check: a modified payload must NOT verify (proves real crypto, not a stub).
  assert.strictEqual(ztai.verifySignature(did, payload + 'X', sig), false,
    'Tampered payload must fail verification under real Ed25519');
});

(async () => {
  for (const { name, fn } of tests) {
    try { await fn(); console.log(`  ✅  ${name}`); passed++; }
    catch (e) { console.error(`  ❌  ${name}\n      ${e.message}`); failed++; }
  }
  console.log(`\nPQC Trust Path: ${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
})();
