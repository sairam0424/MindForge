/**
 * MindForge v6.6.0 — SCS Verification Suite
 * Tests the Self-Corrective Synthesis self-healing loop.
 */
'use strict';

const rsa = require('./reason-source-aligner.js');
const scs = require('./self-corrective-synthesizer.js');

async function runTests() {
  console.log('🧪 Starting MindForge v6.6.0 SCS Verification...');
  await rsa.init();

  // Test Case 1: Detect Drift and Refocus on REQ-004 (RSA)
  console.log('\n--- Test Case 1: Targeted Refocus ---');
  const driftingAudit = [
    { type: 'mission_fidelity', alignment: { is_aligned: true, best_match_id: 'REQ-004', confidence: 0.85 } }, // Good
    { type: 'mission_fidelity', alignment: { is_aligned: false, best_match_id: 'REQ-004', confidence: 0.35 } } // Drift detected
  ];

  const correction = await scs.synthesizeCorrection(driftingAudit, { phase: '6.6.0-test' });
  
  if (correction.type === 'scs_refocus' && correction.req_id === 'REQ-004') {
    console.log('✅ SUCCESS: SCS correctly identified target requirement [REQ-004].');
    console.log(`[SYNTHESIS] ${correction.instruction}`);
  } else {
    console.error('❌ FAIL: SCS failed to target REQ-004 correctly.', correction);
  }

  // Test Case 2: General Homing (No obvious requirements match in drift)
  console.log('\n--- Test Case 2: General Homing ---');
  const chaoticAudit = [
    { type: 'mission_fidelity', alignment: { is_aligned: false, best_match_id: null, confidence: 0.1 } }
  ];

  const generalCorrection = await scs.synthesizeCorrection(chaoticAudit, { phase: '6.6.0-test' });

  if (generalCorrection.instruction.includes('[SCS-GENERAL-HOMING]')) {
    console.log('✅ SUCCESS: SCS triggered general homing for chaotic audit state.');
    console.log(`[SYNTHESIS] ${generalCorrection.instruction}`);
  } else {
    console.error('❌ FAIL: SCS failed to trigger general homing.', generalCorrection);
  }

  // Test Case 3: Validating the Synthesized instruction with RSA
  console.log('\n--- Test Case 3: RSA Validation of SCS Instruction ---');
  const alignment = rsa.checkAlignment(correction.instruction);
  if (alignment.best_match_id === 'REQ-004' && alignment.confidence > 0.60) {
    console.log(`✅ SUCCESS: RSA confirms synthesized instruction aligns with [REQ-004] (Confidence: ${alignment.confidence})`);
  } else {
    console.error(`❌ FAIL: Synthesized instruction failed RSA validation. Match: ${alignment.best_match_id}, Conf: ${alignment.confidence}`);
  }

  console.log('\n✨ v6.6.0 SCS Verification Suite Complete.');
}

runTests().catch(console.error);
