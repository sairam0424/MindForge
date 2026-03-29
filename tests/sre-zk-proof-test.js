/**
 * MindForge — Pillar VI: Sovereign Reason Enclave (SRE) ZK-Proof Test
 * Verifies that confidential reasoning is masked in logs while providing verifiable compliance proofs.
 */
'use strict';

const { NexusTracer } = require('../bin/engine/nexus-tracer');
const SREManager = require('../bin/engine/sre-manager');
const ztai = require('../bin/governance/ztai-manager');
const fs = require('fs');
const path = require('path');

async function runTest() {
  console.log('--- STARTING SRE ZK-PROOF TEST ---');

  const tracer = new NexusTracer({
    auditPath: path.join(__dirname, 'test_audit.jsonl'),
    did: 'did:mindforge:agent:test-beast'
  });

  // Seed the ZTAI Registry for the test agent
  await ztai.providers.enclave.generate('did:mindforge:agent:test-beast');
  ztai.agentRegistry.set('did:mindforge:agent:test-beast', {
    providerType: 'enclave',
    tier: 3
  });

  const sre = new SREManager();
  tracer.startTrace();

  // Test Case 1: Standard Reasoning (Plaintext)
  console.log('\n[TEST] Recording standard reasoning...');
  const span1 = await tracer.startSpan('standard-task');
  await tracer.recordReasoning(span1, 'test-agent', 'This is a public thought.');
  await tracer.endSpan(span1);

  // Test Case 2: Confidential Reasoning (SRE Isolated)
  console.log('\n[TEST] Recording confidential reasoning (SRE)...');
  const span2 = await tracer.startSpan('confidential-task', { is_confidential: true, tier: 3 });
  
  // The actual thought that should NOT be in the log
  const privateThought = 'PRIVATE_IP: The secret formula is 42.';
  await tracer.recordReasoning(span2, 'test-agent', privateThought);
  await tracer.endSpan(span2);

  // Verification: Read the audit log
  console.log('\n[VERIFICATION] Analyzing audit log output...');
  const logContent = fs.readFileSync(path.join(__dirname, 'test_audit.jsonl'), 'utf8');
  const lines = logContent.trim().split('\n').map(JSON.parse);

  const reasoningTraces = lines.filter(l => l.event === 'reasoning_trace');
  const sreProofs = lines.filter(l => l.event === 'sre_proof_logged');

  console.log(`Standard Traces found: ${reasoningTraces.length}`);
  console.log(`SRE Proofs found: ${sreProofs.length}`);

  if (sreProofs.length > 0) {
    const proof = sreProofs[0].certificate;
    console.log(`\nProof Certificate Message: ${proof.message}`);
    console.log(`Proof Status: ${proof.status}`);
    
    // Verify the proof
    const isValid = sre.verifyZKProof(proof);
    console.log(`Proof Cryptographic Validation: ${isValid ? 'PASSED' : 'FAILED'}`);
    
    // Check for leakage
    const leaked = logContent.includes('PRIVATE_IP');
    console.log(`Confidential Content Leakage Check: ${leaked ? 'FAILED (Content Leaked!)' : 'PASSED (No Leakage)'}`);
  }

  // Cleanup
  fs.unlinkSync(path.join(__dirname, 'test_audit.jsonl'));
  console.log('\n--- SRE TEST COMPLETE ---');
}

runTest().catch(console.error);
