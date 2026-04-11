/**
 * MindForge v7 — NDR Integration Test
 * Verifies that logic drift triggers remediation and pulls from SemanticHub.
 */
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const driftDetector = require('./logic-drift-detector');
const remediationEngine = require('./remediation-engine');
const semanticHub = require('../memory/semantic-hub');

async function testNDR() {
  console.log('--- NDR Pillar Test ---');

  // 1. Setup Mock Semantic Hub Data
  const globalPath = path.join(os.homedir(), '.mindforge/memory/global');
  const patternFile = path.join(globalPath, 'pattern-library.jsonl');
  
  if (!fs.existsSync(globalPath)) {
    fs.mkdirSync(globalPath, { recursive: true });
  }

  const mockTrace = {
    id: 'gt_test_001',
    type: 'golden-trace',
    skill: 'testing',
    tags: ['success', 'logic-fix'],
    content: 'Always verify before you trust.'
  };

  fs.appendFileSync(patternFile, JSON.stringify(mockTrace) + '\n');
  console.log('[Test Setup] Injected mock golden trace into global hub.');

  // 2. Simulate Drift
  const spanId = 'sp_test_drift';
  const ramblingThought = 'I am thinking about the thing and the thing is a thing and I keep repeating the thing because things are things.';
  
  const report = driftDetector.analyze(spanId, ramblingThought);
  console.log(`[Drift Detector] Report Status: ${report.status} (Score: ${report.drift_score})`);

  if (report.status !== 'DRIFT_DETECTED') {
    throw new Error('Drift detector failed to recognize rambling pattern');
  }

  // 3. Trigger Remediation
  const action = await remediationEngine.trigger(spanId, report);
  console.log(`[Remediation Engine] Action: ${action.strategy} (ID: ${action.remediation_id})`);

  if (action.strategy !== 'GOLDEN_TRACE_INJECTION') {
    throw new Error(`Expected GOLDEN_TRACE_INJECTION but got ${action.strategy}`);
  }

  console.log('PASSED');
}

testNDR().catch(err => {
  console.error(`FAILED: ${err.message}`);
  process.exit(1);
});
