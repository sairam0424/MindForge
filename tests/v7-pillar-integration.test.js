/**
 * MindForge v6.1.0-alpha — Pillar IX & X Integration Suite
 * 
 * Verifies the Sovereign Phase 1 ecosystem:
 * 1. Autonomous Resource Harvesting (ARH) - Token Arbitrage
 * 2. Neural Drift Remediation (NDR) - Self-Correction
 */
'use strict';

const nexus = require('../bin/engine/nexus-tracer');
const router = require('../bin/revops/router-steering-v2');
const roi = require('../bin/revops/roi-engine');

async function runIntegratedAudit() {
  console.log('--- Starting MindForge v6.1 Integration Audit ---');

  // [Pillar IX Test] - Complex Architecture Task
  console.log('\n[TEST] Verifying Pillar IX (Arbitrage)...');
  const span1 = await nexus.startSpan('v7_blueprint_execution', { tier: 3 });
  const steer1 = await router.steer(span1, 'Design a post-quantum cryptographic enclave for agentic mesh');
  
  if (steer1.selected_model === 'claude-3-5-sonnet' || steer1.selected_model === 'gemini-1.5-pro') {
    console.log(`✅ ARH correctly selected premium model (${steer1.selected_model}) for high-MIR task.`);
  } else {
    console.warn(`❌ ARH failed to select premium model for complex task. Selected: ${steer1.selected_model}`);
  }

  // [Pillar IX Test] - Common Test Task
  const span2 = await nexus.startSpan('boilerplate_generation');
  const steer2 = await router.steer(span2, 'Write a basic unit test for a counter in javascript');
  if (steer2.selected_model.includes('llama') || steer2.selected_model.includes('flash')) {
    console.log(`✅ ARH correctly leveraged arbitrage model (${steer2.selected_model}) for low-MIR task.`);
    console.log(`💰 Estimated Savings: $${steer2.estimated_arbitrage_savings.toFixed(4)}`);
  }

  // [Pillar X Test] - Neural Drift Detection
  console.log('\n[TEST] Verifying Pillar X (Drift Remediation)...');
  const span3 = await nexus.startSpan('long_running_reasoning');
  
  console.log('Simulating stable reasoning...');
  await nexus.recordReasoning(span3, 'mf-executor', 'Analyzing directory structure for security bypass possibilities.');
  
  console.log('Simulating reasoning drift (repetitive rambling)...');
  await nexus.recordReasoning(span3, 'mf-executor', 'I will check. I will check. I will check again. Nevertheless I will check one more time. Contradicting previous logic, I will restart checking. However, I will instead check again.');
  
  // Checking audit for remediation events
  const auditEntries = require('fs').readFileSync('.planning/AUDIT.jsonl', 'utf-8').split('\n').filter(Boolean).map(JSON.parse);
  const remediation = auditEntries.find(e => e.event === 'drift_remediation_event' && e.span_id === span3);
  
  if (remediation) {
    console.log(`✅ NDR correctly detected drift (Score: ${remediation.score}) and triggered: ${remediation.strategy}`);
  } else {
    console.warn('❌ NDR failed to record drift remediation event in audit log.');
  }

  // ROI Summary
  console.log('\n[TEST] Verifying ROI Engine v6.1 Integration...');
  const finalROI = roi.calculate({
    costs: [{ cost: 0.12 }],
    arbitrageSavings: steer1.estimated_arbitrage_savings + steer2.estimated_arbitrage_savings,
    auditEntries: [{ event: 'task_completed', message: 'Architect Pillar IX' }]
  });

  console.log(`📈 Session Net Value: $${finalROI.net_value}`);
  console.log(`🏛️ Arbitrage Savings Realized: $${finalROI.arbitrage_savings}`);

  console.log('\n--- MindForge v6.1 Integration Audit Complete ---');
}

runIntegratedAudit().catch(err => {
  console.error('Audit Suite Failed:', err);
  process.exit(1);
});
