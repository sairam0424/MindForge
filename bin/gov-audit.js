/**
 * MindForge v5.3.0 — Governance Visual Audit Simulation
 * Tests the ImpactAnalyzer and PolicyEngine against a suite of intents.
 */
'use strict';

const ImpactAnalyzer = require('./governance/impact-analyzer');
const PolicyEngine = require('./governance/policy-engine');
const fs = require('node:fs');
const path = require('node:path');

const engine = new PolicyEngine();

const INTENTS = [
  { action: 'READ', resource: 'docs/README.md', did: 'agent_01' },
  { action: 'WRITE', resource: 'src/main.js', did: 'agent_02' },
  { action: 'DELETE', resource: '.mindforge/vault.key', did: 'agent_03' },
  { action: 'EXECUTE', resource: 'bin/install.sh', did: 'agent_04' },
  { action: 'WRITE', resource: 'config/.env', did: 'agent_05' },
  { action: 'READ', resource: 'security/audit.log', did: 'agent_01' }
];

console.log('--- MindForge v5.3.0 Governance Audit Simulation ---');
console.log('| Action | Resource | Impact | Risk Tier | Verdict | Reason |');
console.log('|--------|----------|--------|-----------|---------|--------|');

INTENTS.forEach(intent => {
  const impact = ImpactAnalyzer.analyze({
    action: intent.action,
    target: intent.resource
  });
  const tier = ImpactAnalyzer.getRiskTier(impact);
  const result = engine.evaluate(intent);
  
  console.log(`| ${intent.action} | ${intent.resource} | ${impact}/100 | ${tier} | ${result.verdict} | ${result.reason} |`);
});

console.log('--- Simulation Complete ---');
