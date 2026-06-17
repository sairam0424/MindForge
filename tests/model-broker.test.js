/**
 * MindForge — ModelBroker C2C Routing Tests
 * Run: node tests/model-broker.test.js
 */

const fs = require('fs');
const path = require('path');
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

const ModelBroker = require('../bin/models/model-broker');

console.log('\nModelBroker: C2C Routing Tests\n');

// ── Model Resolution ─────────────────────────────────────────────────────────
console.log('Model resolution:');

test('Tier 3 (Principal) routes to Opus-class model', () => {
  const broker = new ModelBroker();
  const result = broker.resolveModel({ persona: 'executor', tier: 3 });
  assert.ok(result.modelId, 'modelId should be defined');
  assert.strictEqual(result.modelGroup, 'opus', 'Tier 3 should resolve to opus model group');
});

test('Low difficulty (1.5) routes to Haiku-class model', () => {
  const broker = new ModelBroker();
  const result = broker.resolveModel({ persona: 'executor', difficulty: 1.5, tier: 1 });
  assert.ok(result.modelId, 'modelId should be defined');
  assert.strictEqual(result.modelGroup, 'haiku', 'Low difficulty should resolve to haiku model group');
});

test('High difficulty (4.5+) routes to Opus-class model', () => {
  const broker = new ModelBroker();
  const result = broker.resolveModel({ persona: 'developer', difficulty: 4.6, tier: 1 });
  assert.ok(result.modelId, 'modelId should be defined');
  assert.strictEqual(result.modelGroup, 'opus', 'High difficulty should resolve to opus model group');
});

test('Standard task (mid difficulty) routes to Sonnet-class model', () => {
  const broker = new ModelBroker();
  const result = broker.resolveModel({ persona: 'qa-engineer', difficulty: 3.0, tier: 1 });
  assert.ok(result.modelId, 'modelId should be defined');
  assert.strictEqual(result.modelGroup, 'sonnet', 'Standard task should resolve to sonnet model group');
});

test('Security persona routes to Opus when tier >= 3', () => {
  const broker = new ModelBroker();
  const result = broker.resolveModel({ persona: 'security-reviewer', tier: 3 });
  assert.strictEqual(result.modelGroup, 'opus');
});

test('resolveModel always returns reasoning string', () => {
  const broker = new ModelBroker();
  const result = broker.resolveModel({ persona: 'executor', tier: 1, difficulty: 3.0 });
  assert.ok(typeof result.reasoning === 'string', 'reasoning should be a string');
  assert.ok(result.reasoning.length > 0, 'reasoning should not be empty');
});

// ── Provider Fallback ────────────────────────────────────────────────────────
console.log('\nProvider fallback:');

test('handleProviderFailure returns a different provider', () => {
  const broker = new ModelBroker();
  const fallback = broker.handleProviderFailure('anthropic', 'sonnet');
  assert.ok(fallback.provider, 'fallback should have a provider');
  assert.notStrictEqual(fallback.provider, 'anthropic', 'Fallback should not be the failed provider');
  assert.ok(fallback.modelId, 'Fallback should have a modelId');
});

// ── ROI Tracking ─────────────────────────────────────────────────────────────
console.log('\nROI tracking:');

test('trackROI creates an entry in ROI.jsonl', () => {
  const roiDir = path.join(process.cwd(), '.planning');
  const roiPath = path.join(roiDir, 'ROI.jsonl');

  // Ensure the directory exists
  if (!fs.existsSync(roiDir)) {
    fs.mkdirSync(roiDir, { recursive: true });
  }

  // Record the current file size (or 0 if it does not exist)
  const sizeBefore = fs.existsSync(roiPath) ? fs.statSync(roiPath).size : 0;

  const broker = new ModelBroker();
  const report = {
    planId: 'test-plan-001',
    taskName: 'Implement Auth',
    modelId: 'claude-sonnet-4-6',
    costTier: 'medium',
    inputTokens: 1000,
    outputTokens: 500,
    durationMs: 1200,
    status: 'completed',
  };

  broker.trackROI(report);

  assert.ok(fs.existsSync(roiPath), 'ROI.jsonl should exist after trackROI');
  const sizeAfter = fs.statSync(roiPath).size;
  assert.ok(sizeAfter > sizeBefore, 'ROI.jsonl should grow after trackROI');

  // Validate the last entry is valid JSON with expected fields
  const lines = fs.readFileSync(roiPath, 'utf8').trim().split('\n');
  const lastEntry = JSON.parse(lines[lines.length - 1]);
  assert.strictEqual(lastEntry.planId, 'test-plan-001');
  assert.strictEqual(lastEntry.task, 'Implement Auth');
  assert.strictEqual(lastEntry.model, 'claude-sonnet-4-6');
  assert.strictEqual(lastEntry.status, 'completed');
  assert.strictEqual(lastEntry.goalAchieved, 1);
  assert.ok(typeof lastEntry.estimatedCostUSD === 'number', 'estimatedCostUSD should be a number');
});

// ── Cost Estimation ──────────────────────────────────────────────────────────
console.log('\nCost estimation:');

test('estimateCost returns a positive number for known models', () => {
  const broker = new ModelBroker();
  const cost = broker.estimateCost('claude-sonnet-4-6', 10000, 5000);
  assert.ok(typeof cost === 'number', 'Cost should be a number');
  assert.ok(cost > 0, 'Cost should be positive for non-zero tokens');
});

test('estimateCost returns 0 for zero tokens', () => {
  const broker = new ModelBroker();
  const cost = broker.estimateCost('claude-sonnet-4-6', 0, 0);
  assert.strictEqual(cost, 0);
});

// ── Results ──────────────────────────────────────────────────────────────────
console.log(`\n${'─'.repeat(50)}`);
console.log(`Results: ${passed} passed, ${failed} failed`);

if (failed > 0) {
  console.error(`\n❌ ${failed} test(s) failed.\n`);
  process.exit(1);
} else {
  console.log('\n✅ All model-broker tests passed.\n');
}
