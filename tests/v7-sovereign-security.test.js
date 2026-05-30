/**
 * MindForge v7 — Pillar XI (PQAS) Verification
 */
'use strict';

const assert = require('node:assert');
const quantumCrypto = require('../bin/governance/quantum-crypto');
const policyEngine = require('../bin/governance/policy-engine');
const configManager = require('../bin/governance/config-manager');

async function testPQAS() {
  console.log('--- Testing Post-Quantum Agentic Security (Pillar XI) ---');

  // 1. Test Lattice Key Generation & Signing
  console.log('Step 1: Testing Dilithium-5 Signature Flow...');

  // UC-24: simulated PQC is now OFF the live trust path by default. The
  // simulated lattice flow MUST refuse to mint keys unless the operator has
  // explicitly opted in via experimental.pqc_demo. Verify the gate first.
  await assert.rejects(
    () => quantumCrypto.generateLatticeKeyPair(),
    /PQC demo disabled/,
    'Simulated PQC must be gated off the live trust path by default (UC-24)'
  );

  // Opt into the demo IN-MEMORY only (no disk write) to exercise the simulated
  // round-trip this Pillar-XI test was designed to verify, then restore. Both
  // the experimental.pqc_demo gate (UC-24) and the legacy pqas_enabled switch
  // must be on for the simulated lattice flow to run.
  const prevDemo = configManager.get('experimental.pqc_demo', false);
  const prevPqasCached = quantumCrypto.pqasEnabled;
  configManager.config.experimental = { ...(configManager.config.experimental || {}), pqc_demo: true };
  quantumCrypto.pqasEnabled = true;
  try {
    const keyPair = await quantumCrypto.generateLatticeKeyPair();
    const data = 'Sovereign mutation: update core/kernel';
    const signature = await quantumCrypto.signPQ(data, keyPair.privateKey);

    const isValid = quantumCrypto.verifyPQ(data, signature, keyPair.publicKey);
    assert.strictEqual(isValid, true, 'Lattice signature verification failed');
    console.log('✅ Lattice signature verified (under explicit experimental.pqc_demo).');
  } finally {
    configManager.config.experimental = { ...(configManager.config.experimental || {}), pqc_demo: prevDemo };
    quantumCrypto.pqasEnabled = prevPqasCached;
  }

  // 2. Test ZK-Proof Policy Bypass
  console.log('\nStep 2: Testing ZK-Proof Policy Bypass...');
  const PolicyEngine = require('../bin/governance/policy-engine');
  const pe = new PolicyEngine();
  
  const intent = {
    id: 'intent_v7_001',
    tier: 3,
    pq_proof: quantumCrypto.generateZKProof({ id: 'intent_v7_001' }, { verdict: 'ALLOW' })
  };
  
  // Simulated high impact
  // Mocking matches and policies for testing
  pe.matches = () => true;
  pe.loadPolicies = () => [{ id: 'test_policy', effect: 'PERMIT', max_impact: 80 }];
  
  const verdict = await pe.evaluate(intent);
  console.log(`✅ Policy Evaluation returned: ${verdict.verdict} (${verdict.reason})`);
  assert.strictEqual(verdict.verdict, 'PERMIT', 'ZK-Proof bypass should result in PERMIT if verified');

  // 3. Test Biometric Challenge (Risk > 95)
  console.log('\nStep 3: Testing Biometric Challenge (Edge Case)...');
  const ImpactAnalyzer = require('../bin/governance/impact-analyzer');
  const originalAnalyze = ImpactAnalyzer.analyze;
  ImpactAnalyzer.analyze = () => 98; // Force critical risk
  
  const highRiskIntent = { id: 'intent_v7_002', tier: 3, action: 'CRITICAL_MUTATION' };
  const biometricVerdict = await pe.evaluate(highRiskIntent);
  
  assert.strictEqual(biometricVerdict.status, 'WAIT_FOR_BIOMETRIC', 'Biometric challenge did not trigger for risk > 95');
  console.log('✅ Biometric challenge successfully triggered for Risk=98.');
  
  // Restore mock
  ImpactAnalyzer.analyze = originalAnalyze;

  console.log('\n--- PQAS Verification Complete ---');
}

testPQAS().catch(err => {
  console.error('❌ PQAS Test Failed:', err);
  process.exit(1);
});
