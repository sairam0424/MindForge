/**
 * MindForge — WaveFeedbackLoop & TemporalHindsight Tests
 */

const WaveFeedbackLoop = require('../bin/engine/feedback-loop');
const TemporalHindsight = require('../bin/engine/temporal-hindsight');

async function runTests() {
  const loop = new WaveFeedbackLoop();
  const hindsight = new TemporalHindsight();
  const testResults = [];

  console.log('--- WaveFeedbackLoop: Divergence Tests ---');

  // Test 1: Healthy Wave (0% Failure)
  loop.reset();
  for (let i = 0; i < 10; i++) loop.update({ status: 'completed' });
  const healthyResult = loop.shouldTriggerHindsight();
  testResults.push({ test: 'Healthy Wave (0% Fail) -> No trigger', status: !healthyResult.shouldPause ? 'PASS' : 'FAIL' });

  // Test 2: Diverging Wave (30% Failure)
  loop.reset();
  for (let i = 0; i < 7; i++) loop.update({ status: 'completed' });
  for (let i = 0; i < 3; i++) loop.update({ status: 'failed' });
  const divergingResult = loop.shouldTriggerHindsight();
  testResults.push({ test: 'Diverging Wave (30% Fail) -> Trigger', status: divergingResult.shouldPause ? 'PASS' : 'FAIL' });

  // Test 3: High Skips (Divergence Check)
  loop.reset();
  for (let i = 0; i < 5; i++) loop.update({ status: 'completed' });
  for (let i = 0; i < 5; i++) loop.update({ status: 'skipped' });
  const skipDivergence = loop.calculateDivergence();
  testResults.push({ test: 'High Skips (50% Skips) -> High Score', status: skipDivergence > 0.1 ? 'PASS' : 'FAIL' });

  console.table(testResults);

  // Test 4: Temporal Hindsight Analysis
  console.log('\n--- Temporal Hindsight: Analysis Test ---');
  const waveReport = {
    failedTasks: [
      { taskName: 'Task 01', error: 'Permission denied: /Users/sairam/Desktop' },
      { taskName: 'Task 02', error: 'Permission denied' },
    ],
    divergence: 0.3,
    phase: 4
  };

  const analysis = await hindsight.analyze(waveReport);
  if (analysis.diagnosis.type === 'ENVIRONMENTAL') {
    console.log('PASS: Correctly diagnosed ENVIRONMENTAL issue.');
  } else {
    console.log('FAIL: INCORRECT diagnosis: ' + analysis.diagnosis.type);
  }

  if (analysis.repairPlan.steps.length > 0) {
    console.log('PASS: Repair plan generated.');
  } else {
    console.log('FAIL: Repair plan missing.');
  }
}

runTests().catch(console.error);
