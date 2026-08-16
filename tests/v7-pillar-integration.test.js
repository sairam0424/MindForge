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

// Expectations are derived from .mindforge/config.json's revops.market_registry rather than
// hardcoded model ids. The previous version asserted `claude-3-5-sonnet || gemini-1.5-pro`,
// neither of which has existed in the registry for several releases — so the check silently
// stopped describing anything, and because it only console.warn'd, nothing noticed.
// Registry benchmarks today: 100/99/98/97 (premium) then 92/85/82 (arbitrage). The 95 split
// sits in the gap, so a model rename or a re-tier does not rot this test.
const PREMIUM_BENCHMARK_FLOOR = 95;

let failures = 0;
function check(ok, passMsg, failMsg) {
  if (ok) { console.log(`✅ ${passMsg}`); return true; }
  console.error(`❌ ${failMsg}`);
  failures++;
  return false;
}

function registryBenchmark(model) {
  const registry = require('../.mindforge/config.json').revops?.market_registry || {};
  return { known: Object.prototype.hasOwnProperty.call(registry, model), benchmark: registry[model]?.benchmark };
}

async function runIntegratedAudit() {
  console.log('--- Starting MindForge v6.1 Integration Audit ---');

  // [Pillar IX Test] - Complex Architecture Task
  console.log('\n[TEST] Verifying Pillar IX (Arbitrage)...');
  const span1 = await nexus.startSpan('v7_blueprint_execution', { tier: 3 });
  const steer1 = await router.steer(span1, 'Design a post-quantum cryptographic enclave for agentic mesh');
  
  const hi = registryBenchmark(steer1.selected_model);
  check(hi.known,
    `ARH selected a model present in market_registry (${steer1.selected_model}).`,
    `ARH selected "${steer1.selected_model}", which is NOT in revops.market_registry — the router and the registry disagree.`);
  check(hi.known && hi.benchmark >= PREMIUM_BENCHMARK_FLOOR,
    `ARH correctly selected premium model ${steer1.selected_model} (benchmark ${hi.benchmark}) for high-MIR task.`,
    `ARH failed to select a premium model for a complex task. Selected: ${steer1.selected_model} (benchmark ${hi.benchmark}), floor ${PREMIUM_BENCHMARK_FLOOR}.`);

  // [Pillar IX Test] - Common Test Task
  const span2 = await nexus.startSpan('boilerplate_generation');
  const steer2 = await router.steer(span2, 'Write a basic unit test for a counter in javascript');
  const lo = registryBenchmark(steer2.selected_model);
  // This branch previously had NO else at all, so a low-MIR task routed to an expensive model
  // produced silence rather than a finding.
  check(lo.known,
    `Arbitrage selection is a known registry model (${steer2.selected_model}).`,
    `Arbitrage selected "${steer2.selected_model}", which is NOT in revops.market_registry.`);
  if (check(lo.known && lo.benchmark < PREMIUM_BENCHMARK_FLOOR,
    `ARH correctly leveraged arbitrage model ${steer2.selected_model} (benchmark ${lo.benchmark}) for low-MIR task.`,
    `ARH spent a premium model on a low-MIR task. Selected: ${steer2.selected_model} (benchmark ${lo.benchmark}).`)) {
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
  
  check(Boolean(remediation),
    remediation
      ? `NDR correctly detected drift (Score: ${remediation.score}) and triggered: ${remediation.strategy}`
      : 'NDR drift detection',
    `NDR failed to record a drift_remediation_event for span ${span3} in .planning/AUDIT.jsonl.`);

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

  // Propagate the outcome. Every check above used to console.warn only, so this suite reported
  // ✓ PASS with zero assertions and could not fail for any reason except an exception.
  if (failures > 0) {
    console.error(`\n❌ v7 pillar integration: ${failures} check(s) failed.`);
    process.exitCode = 1;
  } else {
    console.log('\n✅ v7 pillar integration: all checks passed.');
  }
}

runIntegratedAudit().catch(err => {
  console.error('Audit Suite Failed:', err);
  process.exit(1);
});
