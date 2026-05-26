/**
 * MindForge v6.0.0 — CADIA Governance Test Suite
 * Automated verification for the Neural Blast Radius Optimizer.
 */
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const ImpactAnalyzer = require('../../bin/governance/impact-analyzer');
const PolicyEngine = require('../../bin/governance/policy-engine');

async function runTests() {
  console.log('🚀 Starting CADIA Governance Verifier...\n');

  // Setup temporary test policies
  const testPoliciesDir = path.join(__dirname, 'test-policies');
  if (!fs.existsSync(testPoliciesDir)) fs.mkdirSync(testPoliciesDir, { recursive: true });

  const policy1 = {
    'id': 'policy_enforce_tier_3_security',
    'effect': 'DENY',
    'description': 'Restricted tier agents cannot modify security/governance.',
    'conditions': {
      'resource': '*/security/*,*/governance/*',
      'min_tier': 3
    }
  };

  const policy2 = {
    'id': 'policy_max_impact_tier_2',
    'effect': 'PERMIT',
    'conditions': {
      'action': 'WRITE',
      'resource': '*',
      'min_tier': 2
    },
    'max_impact': 60
  };

  fs.writeFileSync(path.join(testPoliciesDir, 'deny-security.json'), JSON.stringify(policy1, null, 2));
  fs.writeFileSync(path.join(testPoliciesDir, 'permit-t2.json'), JSON.stringify(policy2, null, 2));

  const engine = new PolicyEngine({ policiesDir: testPoliciesDir });

  const results = [];

  // Scenario 1: Tier 1 Agent + Core File
  console.log('--- SCENARIO 1: Tier 1 Agent + Core File ---');
  const res1 = engine.evaluate({
    did: 'agent-001',
    tier: 1,
    action: 'WRITE',
    resource: 'bin/governance/impact-analyzer.js',
    sessionId: 'session_rogue'
  });
  console.log(`Verdict: ${res1.verdict} | Reason: ${res1.reason}\n`);
  results.push(res1.verdict === 'DENY');

  // Scenario 2: Tier 3 Agent + Core File + Reasoning Bypass
  console.log('--- SCENARIO 2: Tier 3 Agent + Core File + Reasoning Proof ---');
  const res2 = engine.evaluate({
    did: 'agent-senior',
    tier: 3,
    action: 'WRITE',
    resource: 'bin/governance/impact-analyzer.js',
    sessionId: 'session_authorized',
    reasoning_proof: 'Urgent upgrade to CADIA v6 architecture.'
  });
  console.log(`Verdict: ${res2.verdict} | Reason: ${res2.reason}\n`);
  results.push(res2.verdict === 'PERMIT');

  // Scenario 3: Session Entropy Escalation
  console.log('--- SCENARIO 3: Session Entropy Escalation (Tier 1) ---');
  ImpactAnalyzer.resetSession('session_spam');
  for (let i = 1; i <= 8; i++) {
    const res = engine.evaluate({
      did: 'agent-spam',
      tier: 1, // Tier 1 has only 10 points of buffer
      action: 'WRITE',
      resource: `src/file_${i}.js`,
      sessionId: 'session_spam'
    });
    console.log(`[File ${i}] Blast Radius: ${res.verdict === 'DENY' ? 'DENIED' : 'PERMITTED'} (${res.verdict})`);
  }
  console.log('');


  // Scenario 4: Goal Alignment Check
  console.log('--- SCENARIO 4: Goal Alignment Check ---');
  // Reset session for alignment test
  ImpactAnalyzer.resetSession('session_misaligned');
  fs.writeFileSync(path.join(process.cwd(), '.planning', 'STATE.md'), 
    '# State\n## Current phase\nRefactor UI Components\n');
  
  const resGoal = engine.evaluate({
    did: 'agent-ui',
    tier: 2,
    action: 'WRITE',
    resource: 'bin/governance/rbac-manager.js',
    sessionId: 'session_misaligned'
  });
  console.log(`[Goal: UI] [Target: RBAC] Verdict: ${resGoal.verdict} | Reason: ${resGoal.reason}\n`);

  results.push(resGoal.verdict === 'DENY');

  // Final Audit Verification
  console.log('--- FINAL AUDIT: RISK-AUDIT.jsonl Check ---');
  const auditContent = fs.readFileSync(path.join(process.cwd(), '.planning', 'RISK-AUDIT.jsonl'), 'utf8');
  console.log(`Total Audit Entries: ${auditContent.split('\n').filter(Boolean).length}`);
}

runTests().catch(console.error);
