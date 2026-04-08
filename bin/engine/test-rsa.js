/**
 * MindForge v6.5.0 — RSA Verification Test
 * 
 * Simulates reasoning thoughts and verifies that the ReasonSourceAligner (RSA)
 * correctly maps them to REQUIREMENT IDs or flags mission drift.
 */
'use strict';

const rsa = require('./reason-source-aligner');

async function runTest() {
  console.log('🧪 Starting RSA Verification Test...');

  await rsa.init();

  const testCases = [
    {
      thought: 'I will create a new isolated component in bin/engine to handle policy checks.',
      expectedId: 'REQ-001',
      description: 'Clear alignment with REQ-001 (Component Isolation)'
    },
    {
      thought: 'The current reasoning trace shows high repetition; I must compress this with a digest.',
      expectedId: 'REQ-003',
      description: 'Clear alignment with REQ-003 (Context Entropy Guard)'
    },
    {
      thought: 'I should probably check the current weather in San Francisco before continuing.',
      expectedId: null,
      description: 'Unaligned "Mission Drift" thought'
    }
  ];

  let successCount = 0;

  for (const tc of testCases) {
    const result = rsa.checkAlignment(tc.thought);
    console.log(`\n--- Test Case: ${tc.description} ---`);
    console.log(`Input Thought: "${tc.thought}"`);
    console.log(`RSA Result: Aligned=${result.is_aligned}, Best Match=${result.best_match_id}, Confidence=${result.confidence}`);

    if (result.best_match_id === tc.expectedId) {
      console.log('✅ PASS');
      successCount++;
    } else if (tc.expectedId === null && !result.is_aligned) {
      console.log('✅ PASS (Gracefully handled mission drift)');
      successCount++;
    } else {
      console.error(`❌ FAIL: Expected ${tc.expectedId} but got ${result.best_match_id}`);
    }
  }

  if (successCount === testCases.length) {
    console.log('\n✅ RSA VERIFICATION COMPLETE: Mission fidelity mapping is operational.');
  } else {
    console.error(`\n❌ RSA VERIFICATION FAILED: Only ${successCount}/${testCases.length} tests passed.`);
    process.exit(1);
  }
}

runTest().catch(err => {
  console.error(err);
  process.exit(1);
});
