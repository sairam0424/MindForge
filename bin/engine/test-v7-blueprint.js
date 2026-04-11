/**
 * MindForge v7 — Test Suite
 * Blueprint Verification: NDR Pillar X
 */
'use strict';

const tracer = require('./nexus-tracer');
const remediationQueue = require('../revops/remediation-queue');
const fs = require('node:fs');

async function testNDRBlueprint() {
  console.log('--- STARTING NDR BLUEPRINT VERIFICATION ---');

  // Clear existing queue for clean test
  if (fs.existsSync(remediationQueue.queuePath)) fs.unlinkSync(remediationQueue.queuePath);

  // We need to create an active span to record reasoning
  await tracer.startSpan('span_stable', { agent: 'mf-researcher' });
  await tracer.startSpan('span_drift', { agent: 'mf-researcher' });

  // 1. Simulate a Stable Thought (should have high confidence)
  console.log('\n[TEST 1] Testing Stable reasoning...');
  await tracer.recordReasoning('span_stable', 'mf-researcher', 'I will now analyze the dependencies and create a plan.');
  
  // 2. Simulate a Drifting Thought (should trigger validator critique)
  console.log('\n[TEST 2] Testing Drifting reasoning (Self-Doubt)...');
  await tracer.recordReasoning('span_drift', 'mf-researcher', 'I am not sure how to proceed, maybe I should wait and check the goal again.');

  // 3. Verify Queue Persistence
  const pending = remediationQueue.getPending();
  console.log(`\n[RESULT] Pending Remediations in Queue: ${pending.length}`);
  
  if (pending.length > 0) {
    console.log('--- NDR BLUEPRINT VERIFICATION PASSED ---');
  } else {
    console.error('--- NDR BLUEPRINT VERIFICATION FAILED: No remediation queued ---');
    process.exit(1);
  }
}

testNDRBlueprint().catch(err => {
  console.error(err);
  process.exit(1);
});
