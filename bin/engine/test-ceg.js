/**
 * MindForge v6.4.0 — CEG Verification Test
 * 
 * Simulates a "noisy" reasoning trace with repetitive thoughts 
 * and verifies that the ContextEntropyGuard (CEG) correctly 
 * suppresses noise and compresses the history.
 */
'use strict';

const ceg = require('./context-entropy-guard');

async function runTest() {
  console.log('🧪 Starting CEG Verification Test...');

  const trace = [
    { event: 'reasoning_trace', thought: 'I should analyze the target directory structure.', is_stagnant: false },
    { event: 'reasoning_trace', thought: 'Analyzing the directory layout now.', is_stagnant: false },
    // Repetitive noise (to be suppressed)
    { event: 'reasoning_trace', thought: 'Analyzing the directory layout now.', is_stagnant: true },
    { event: 'reasoning_trace', thought: 'Analyzing the directory layout now.', is_stagnant: true },
    // New thought
    { event: 'reasoning_trace', thought: 'Found a potential vulnerability in the config file.', is_stagnant: false },
    // Loop (to be compressed)
    { event: 'reasoning_trace', thought: 'Checking config permissions.', is_stagnant: true },
    { event: 'reasoning_trace', thought: 'Checking config permissions.', is_stagnant: true },
    { event: 'reasoning_trace', thought: 'Checking config permissions.', is_stagnant: true },
    { event: 'reasoning_trace', thought: 'Checking config permissions.', is_stagnant: true }
  ];

  console.log(`\nInput Trace Length: ${trace.length}`);

  const compressed = ceg.compress(trace);
  console.log(`Compressed Trace Length: ${compressed.length}`);

  console.log('\n--- Final Trace Preview ---');
  compressed.forEach((e, idx) => {
    if (e.event === 'reasoning_digest') {
      console.log(`[${idx}] DIGEST: ${e.summary} | Last Conclusion: ${e.final_conclusion}`);
    } else {
      console.log(`[${idx}] THOUGHT: ${e.thought}`);
    }
  });

  // Validations
  const hasDigest = compressed.some(e => e.event === 'reasoning_digest');
  const totalReduction = trace.length - compressed.length;

  if (hasDigest && totalReduction >= 2) {
    console.log('\n✅ SUCCESS: CEG successfully suppressed noise and compressed the reasoning loop.');
  } else {
    console.error('\n❌ FAILURE: CEG failed to compress the history significantly.');
    process.exit(1);
  }
}

runTest().catch(err => {
  console.error(err);
  process.exit(1);
});
