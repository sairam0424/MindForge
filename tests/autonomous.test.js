/**
 * MindForge v2 — Autonomous Engine Tests (Standalone)
 */
'use strict';

const assert = require('assert');
const fs = require('fs');
const repairOperator = require('../bin/autonomous/repair-operator');
const StuckMonitor = require('../bin/autonomous/stuck-monitor');
const steeringManager = require('../bin/autonomous/steer');
const AutoRunner = require('../bin/autonomous/auto-runner');

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

runTest('Pre-flight (UC-03): no-op when DAG mode is OFF (default)', () => {
  const runner = new AutoRunner({ phase: 1 });
  runner._useDagMode = () => false; // force OFF
  // A cyclic plan must NOT throw when DAG is disabled (legacy behavior).
  runner._assertNoCycles([
    { id: 'A', depends_on: ['B'] },
    { id: 'B', depends_on: ['A'] },
  ]);
});

runTest('Pre-flight (UC-03): HALTS LOUD on cycle when DAG mode is ON', () => {
  const runner = new AutoRunner({ phase: 1 });
  runner._useDagMode = () => true; // force ON
  assert.throws(
    () => runner._assertNoCycles([
      { id: 'A', depends_on: ['B'] },
      { id: 'B', depends_on: ['A'] },
    ]),
    /\[pre-flight\] .*[Cc]ircular/
  );
});

runTest('Pre-flight (UC-03): explicit .wave field bypasses DAG cycle check', () => {
  const runner = new AutoRunner({ phase: 1 });
  runner._useDagMode = () => true; // DAG on, but explicit .wave wins
  // Cyclic depends_on is irrelevant because .wave grouping is used.
  runner._assertNoCycles([
    { id: 'A', wave: 0, depends_on: ['B'] },
    { id: 'B', wave: 1, depends_on: ['A'] },
  ]);
});

runTest('Pre-flight (UC-03): passes a valid DAG when DAG mode is ON', () => {
  const runner = new AutoRunner({ phase: 1 });
  runner._useDagMode = () => true;
  runner._assertNoCycles([
    { id: 'A', depends_on: [] },
    { id: 'B', depends_on: ['A'] },
  ]);
});

runTest('Pre-flight (UC-03/FIX1): id-less handoffs are EXCLUDED from cycle-checking (warn, no throw)', () => {
  // An id-less handoff gets a RANDOM synthesized id in planWaves, so it can
  // never be a depends_on target and cannot form a real cycle. _assertNoCycles
  // must skip it (logging a warning) rather than build a graph that differs from
  // what executes. Two id-less, acyclic tasks must NOT throw.
  const runner = new AutoRunner({ phase: 1 });
  runner._useDagMode = () => true;
  const warned = [];
  const origWarn = console.warn;
  console.warn = (msg) => warned.push(msg);
  try {
    runner._assertNoCycles([
      { depends_on: [] },          // no id, no task_id
      { name: 'also id-less' },    // no id, no task_id
    ]);
  } finally {
    console.warn = origWarn;
  }
  assert.ok(
    warned.some(m => /lack a stable id/.test(m)),
    'expected a warning that id-less handoffs were excluded from cycle-checking'
  );
});

runTest('Pre-flight (UC-03/FIX1): stable-id cycle still HALTS even with id-less tasks mixed in', () => {
  // The pre-flight graph (stable-id subset) must still catch a genuine cycle
  // among real-id tasks, regardless of any id-less tasks present.
  const runner = new AutoRunner({ phase: 1 });
  runner._useDagMode = () => true;
  const origWarn = console.warn;
  console.warn = () => {};
  try {
    assert.throws(
      () => runner._assertNoCycles([
        { id: 'A', depends_on: ['B'] },
        { id: 'B', depends_on: ['A'] },
        { depends_on: [] }, // id-less — excluded, irrelevant to the cycle
      ]),
      /\[pre-flight\] .*[Cc]ircular/
    );
  } finally {
    console.warn = origWarn;
  }
});

runTest('Pre-flight (UC-03/FIX4): dangling depends_on fails loud as unknown-dep (not circular)', () => {
  // A depends_on target that is not itself a handoff is a planning error; it must
  // surface the DISTINCT unknown-dependency message via buildGraph, not "circular".
  const runner = new AutoRunner({ phase: 1 });
  runner._useDagMode = () => true;
  assert.throws(
    () => runner._assertNoCycles([
      { id: 'A', depends_on: ['GHOST'] },
    ]),
    (err) => /\[pre-flight\]/.test(err.message) && /unknown task|Unknown dependency/i.test(err.message) && !/[Cc]ircular/.test(err.message)
  );
});

console.log('--- All Tests Passed ---');
