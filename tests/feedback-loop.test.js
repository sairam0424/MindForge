/**
 * MindForge — WaveFeedbackLoop & TemporalHindsight Tests
 * Run: node tests/feedback-loop.test.js
 */

const assert = require('assert');

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`  ✅ ${name}`);
    passed++;
  } catch (err) {
    console.error(`  ❌ ${name}`);
    console.error(`     ${err.message}`);
    failed++;
  }
}

async function asyncTest(name, fn) {
  try {
    await fn();
    console.log(`  ✅ ${name}`);
    passed++;
  } catch (err) {
    console.error(`  ❌ ${name}`);
    console.error(`     ${err.message}`);
    failed++;
  }
}

const WaveFeedbackLoop = require('../bin/engine/feedback-loop');
const TemporalHindsight = require('../bin/engine/temporal-hindsight');

async function run() {
  console.log('\nWaveFeedbackLoop & TemporalHindsight Tests\n');

  // ── WaveFeedbackLoop: Divergence Detection ─────────────────────────────────
  console.log('Divergence detection:');

  test('Healthy wave (0% failure) does not trigger hindsight', () => {
    const loop = new WaveFeedbackLoop();
    loop.reset();
    for (let i = 0; i < 10; i++) loop.update({ status: 'completed' });
    const result = loop.shouldTriggerHindsight();
    assert.strictEqual(result.shouldPause, false, 'Healthy wave should not trigger pause');
  });

  test('Diverging wave (30% failure) triggers hindsight', () => {
    const loop = new WaveFeedbackLoop();
    loop.reset();
    for (let i = 0; i < 7; i++) loop.update({ status: 'completed' });
    for (let i = 0; i < 3; i++) loop.update({ status: 'failed' });
    const result = loop.shouldTriggerHindsight();
    assert.strictEqual(result.shouldPause, true, '30% failure rate should trigger pause');
    assert.ok(result.reason, 'Should include a reason when triggering');
  });

  test('High skip rate produces elevated divergence score', () => {
    const loop = new WaveFeedbackLoop();
    loop.reset();
    for (let i = 0; i < 5; i++) loop.update({ status: 'completed' });
    for (let i = 0; i < 5; i++) loop.update({ status: 'skipped' });
    const divergence = loop.calculateDivergence();
    assert.ok(divergence > 0.1, `Expected divergence > 0.1 for 50% skips, got ${divergence}`);
  });

  test('Empty wave has zero divergence', () => {
    const loop = new WaveFeedbackLoop();
    loop.reset();
    const divergence = loop.calculateDivergence();
    assert.strictEqual(divergence, 0);
  });

  test('Below minimum sample count does not trigger', () => {
    const loop = new WaveFeedbackLoop();
    loop.reset();
    for (let i = 0; i < 3; i++) loop.update({ status: 'failed' });
    const result = loop.shouldTriggerHindsight();
    assert.strictEqual(result.shouldPause, false, 'Should not trigger with fewer than 5 samples');
  });

  test('reset clears all counters', () => {
    const loop = new WaveFeedbackLoop();
    for (let i = 0; i < 10; i++) loop.update({ status: 'failed' });
    loop.reset();
    assert.strictEqual(loop.calculateDivergence(), 0);
  });

  // ── TemporalHindsight: Analysis ───────────────────────────────────────────
  console.log('\nTemporal Hindsight analysis:');

  await asyncTest('Diagnoses ENVIRONMENTAL issue from permission errors', async () => {
    const hindsight = new TemporalHindsight();
    const waveReport = {
      failedTasks: [
        { taskName: 'Task 01', error: 'Permission denied: /Users/sairam/Desktop' },
        { taskName: 'Task 02', error: 'Permission denied' },
      ],
      divergence: 0.3,
      phase: 4,
    };

    const analysis = await hindsight.analyze(waveReport);
    assert.strictEqual(analysis.diagnosis.type, 'ENVIRONMENTAL');
    assert.strictEqual(analysis.diagnosis.severity, 'CRITICAL');
  });

  await asyncTest('Diagnoses RESOURCE issue from timeout errors', async () => {
    const hindsight = new TemporalHindsight();
    const waveReport = {
      failedTasks: [
        { taskName: 'Task 01', error: 'Request timeout exceeded' },
        { taskName: 'Task 02', error: 'Deadline exceeded for model call' },
      ],
      divergence: 0.4,
      phase: 2,
    };

    const analysis = await hindsight.analyze(waveReport);
    assert.strictEqual(analysis.diagnosis.type, 'RESOURCE');
  });

  await asyncTest('Diagnoses LOGIC issue from syntax errors', async () => {
    const hindsight = new TemporalHindsight();
    const waveReport = {
      failedTasks: [
        { taskName: 'Task 01', error: 'SyntaxError: Unexpected token' },
        { taskName: 'Task 02', error: 'lint failed with 5 errors' },
      ],
      divergence: 0.5,
      phase: 3,
    };

    const analysis = await hindsight.analyze(waveReport);
    assert.strictEqual(analysis.diagnosis.type, 'LOGIC');
  });

  await asyncTest('Generates a non-empty repair plan', async () => {
    const hindsight = new TemporalHindsight();
    const waveReport = {
      failedTasks: [
        { taskName: 'Task 01', error: 'Permission denied' },
      ],
      divergence: 0.3,
      phase: 1,
    };

    const analysis = await hindsight.analyze(waveReport);
    assert.ok(Array.isArray(analysis.repairPlan.steps), 'repairPlan.steps should be an array');
    assert.ok(analysis.repairPlan.steps.length > 0, 'repairPlan should have at least one step');
    assert.ok(analysis.repairPlan.title, 'repairPlan should have a title');
  });

  await asyncTest('handleProactiveRecovery returns a steering vector', async () => {
    const hindsight = new TemporalHindsight();
    const result = hindsight.handleProactiveRecovery('tr_test123', 0.85);
    assert.strictEqual(result.event, 'STEERING_VECTOR_GENERATED');
    assert.strictEqual(result.trace_id, 'tr_test123');
    assert.ok(result.instruction, 'Should include an instruction');
    assert.strictEqual(result.action, 'INJECT_SYSTEM_PROMPT');
  });

  // ── Results ──────────────────────────────────────────────────────────────────
  console.log(`\n${'─'.repeat(50)}`);
  console.log(`Results: ${passed} passed, ${failed} failed`);

  if (failed > 0) {
    console.error(`\n❌ ${failed} test(s) failed.\n`);
    process.exit(1);
  } else {
    console.log('\n✅ All feedback-loop tests passed.\n');
  }
}

run().catch(err => {
  console.error('Fatal test error:', err.message);
  process.exit(1);
});
