// @skip: requires git worktree support and clean working tree
/**
 * MindForge v10.0.0 — SRE Integration Test
 * Simulates a production breakdown and verifies autonomous self-healing.
 */
'use strict';

const AutoRunner = require('../bin/autonomous/auto-runner');
const ModelClient = require('../bin/models/model-client');
const fs = require('node:fs');
const path = require('node:path');

// Mock ModelClient to ensure the demo works without API keys
ModelClient.complete = async (params) => {
  console.log(`    [MOCK LLM] ${params.persona.toUpperCase()} generating response...`);
  if (params.persona === 'sre-engineer') {
    return { content: 'PROPOSAL: Add secure redaction to traces. [SRE_PLAN]\n- Redact sk-* patterns\n[/SRE_PLAN]' };
  }
  if (params.persona === 'qa-engineer') {
    return { content: 'CRITIQUE: Ensure regex doesn\'t catch false positives. [SRE_CRITIQUE]\n- Test against normal code snippets.\n[/SRE_CRITIQUE]' };
  }
  if (params.persona === 'sre-auditor') {
    return { content: 'AUDIT: Proceed with secure redaction. [VERDICT]: APPROVED\nLogic verified by Opus.' };
  }
  return { content: 'Standard Mock Response' };
};

async function testSREFlow() {
  console.log('🧪 STAGE 1: Simulating High-Entropy Incident (PII Leak)...');
  
  const testAuditPath = path.join(process.cwd(), '.planning', 'TEST_AUDIT.jsonl');
  const leakEvent = {
    id: 'test-leak-123',
    event: 'thought_captured',
    thought: 'The user requested the secret key: sk-ant-api03-XXXXXXXXXX-Lp9Q... I am processing it now.',
    timestamp: new Date().toISOString()
  };
  
  fs.writeFileSync(testAuditPath, JSON.stringify(leakEvent) + '\n');

  console.log('🧪 STAGE 2: Initializing SRE Layer...');
  const runner = new AutoRunner({ phase: 'demo', sessionId: 'demo-session' });
  runner.auditPath = testAuditPath; // Inject test audit

  console.log('🧪 STAGE 3: Executing SRE Signal Check...');
  await runner.checkSRESignals();

  // Verification
  const auditContent = fs.readFileSync(testAuditPath, 'utf8');
  const wasDetected = auditContent.includes('sre_incident_detected');
  const wasApplied = auditContent.includes('sre_remediation_applied');

  console.log('\n--- VERIFICATION RESULTS ---');
  console.log(`Anomaly Detected: ${wasDetected ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Remediation Logic: ${wasApplied ? '✅ PASS (Self-Healed)' : '❌ FAIL'}`);

  if (wasDetected && wasApplied) {
    console.log('\n🌟 SRE INTEGRATION VERIFIED: MindForge is now self-healing.');
  } else {
    process.exit(1);
  }

  // Cleanup
  if (fs.existsSync(testAuditPath)) fs.unlinkSync(testAuditPath);
}

testSREFlow().catch(err => {
  console.error('Test Failed:', err);
  process.exit(1);
});
