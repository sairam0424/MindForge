/**
 * MindForge v6.3.0 — IDC Verification Test
 * 
 * Simulates a scenario where an agent starts "rambling" (low semantic density) 
 * and repeats itself, triggering the Intelligence Interlock to upgrade the MIR.
 */
'use strict';

const interlock = require('./intelligence-interlock');

async function runTest() {
  console.log('🧪 Starting IDC Verification Test...');

  const spanId = 'test-span-drift-001';
  
  // 1. Stable thought
  console.log('\n--- Step 1: Stable Thought ---');
  const t1 = "I will implement the authentication controller by defining the login and signup routes first.";
  const r1 = interlock.evaluate(spanId, t1);
  console.log(`Result: ${r1.action}, Drift: ${r1.drift || 'N/A'}`);

  // 2. Drifting thought (Rambling and Repetitive)
  console.log('\n--- Step 2: Drifting Thought (Injection) ---');
  const t2 = "I will implement the implement the implement the logic of the logic of the logic and then i will implement and then i will implement implement implement implement implement implement implement implement.";
  const r2 = interlock.evaluate(spanId, t2);
  console.log(`Result: ${r2.action}, Drift: ${r2.drift || 'N/A'}`);

  if (r2.action === 'UPGRADE_MIR') {
    console.log('✅ SUCCESS: IDC triggered an upgrade signal for critical drift.');
    console.log(`Target MIR: ${r2.new_mir}`);
  } else {
    console.error('❌ FAILURE: IDC failed to trigger upgrade even with extreme repetition.');
    process.exit(1);
  }
}

runTest().catch(err => {
  console.error(err);
  process.exit(1);
});
