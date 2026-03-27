const ModelBroker = require('../bin/models/model-broker');
const fs = require('fs');
const path = require('path');

async function runTests() {
  const broker = new ModelBroker();
  const testResults = [];

  console.log('--- ModelBroker: C2C Routing Tests ---');

  // Test 1: Security Tier 3 Routing
  const t3Result = broker.resolveModel({ persona: 'executor', tier: 3 });
  const t3Passed = t3Result.modelId === 'claude-3-opus';
  testResults.push({ test: 'Tier 3 (Principal) -> Opus', status: t3Passed ? 'PASS' : 'FAIL' });

  // Test 2: Low Difficulty Optimization
  const lowDiffResult = broker.resolveModel({ persona: 'executor', difficulty: 1.5, tier: 1 });
  const lowDiffPassed = lowDiffResult.modelId === 'claude-3-haiku';
  testResults.push({ test: 'Low Difficulty (1.5) -> Haiku', status: lowDiffPassed ? 'PASS' : 'FAIL' });

  // Test 3: High Difficulty Complexity Upgrade
  const highDiffResult = broker.resolveModel({ persona: 'developer', difficulty: 4.5, tier: 1 });
  const highDiffPassed = highDiffResult.modelId === 'claude-3-opus';
  testResults.push({ test: 'High Difficulty (4.5) -> Opus', status: highDiffPassed ? 'PASS' : 'FAIL' });

  // Test 4: Default Persona Routing
  const defaultResult = broker.resolveModel({ persona: 'qa-engineer', difficulty: 3.0, tier: 1 });
  const defaultPassed = defaultResult.modelId === 'claude-3-5-sonnet';
  testResults.push({ test: 'Standard Task -> Sonnet', status: defaultPassed ? 'PASS' : 'FAIL' });

  console.table(testResults);

  // ROI Tracking Test
  console.log('\n--- ROI Tracking Test ---');
  const report = {
    planId: 'test-plan-001',
    taskName: 'Implement Auth',
    modelId: 'claude-3-5-sonnet',
    costTier: 'medium',
    inputTokens: 1000,
    outputTokens: 500,
    durationMs: 1200,
    status: 'completed'
  };

  broker.trackROI(report);
  const roiPath = path.join(process.cwd(), '.planning', 'ROI.jsonl');
  if (fs.existsSync(roiPath)) {
    console.log('PASS: ROI log entry created.');
  } else {
    console.log('FAIL: ROI log entry missing.');
  }
}

runTests().catch(console.error);
