/**
 * MindForge v2 — Autonomous Engine Tests (Standalone)
 */
'use strict';

const assert = require('assert');
const fs = require('fs');
const repairOperator = require('../bin/autonomous/repair-operator');
const StuckMonitor = require('../bin/autonomous/stuck-monitor');
const steeringManager = require('../bin/autonomous/steer');

function runTest(name, fn) {
  try {
    fn();
    console.log(`✅ PASSED: ${name}`);
  } catch (err) {
    console.error(`❌ FAILED: ${name}`);
    console.error(err);
    process.exit(1);
  }
}

console.log('--- Running Autonomous Engine Logic Tests ---');

runTest('Repair Operator: Escalate Tier 3', () => {
  const strategy = repairOperator.determineRepairStrategy({ isTier3Change: true });
  assert.strictEqual(strategy, 'ESCALATE');
});

runTest('Repair Operator: Retry on attempt 1', () => {
  const strategy = repairOperator.determineRepairStrategy({ attemptNumber: 1 });
  assert.strictEqual(strategy, 'RETRY');
});

runTest('Stuck Monitor: Detect S02', () => {
  const monitor = new StuckMonitor();
  const event = { tool: 'run_command', status: 'failed', args: { CommandLine: 'npm test' } };
  monitor.analyze(event);
  monitor.analyze(event);
  const result = monitor.analyze(event);
  assert.ok(result);
  assert.strictEqual(result.pattern, 'S02');
});

runTest('Steering Manager: Inject guidance', () => {
  const original = '<action>Do something</action>';
  const guidance = [{ instruction: 'Use v2 API' }];
  const injected = steeringManager.injectSteering(original, guidance);
  assert.ok(injected.includes('[STEERING GUIDANCE — DO NOT IGNORE]'));
  assert.ok(injected.includes('Use v2 API'));
});

console.log('--- All Tests Passed ---');
