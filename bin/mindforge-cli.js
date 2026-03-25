#!/usr/bin/env node
/**
 * MindForge CLI Router — v2.0.0
 * Standardizes command invocation for GitHub Actions and local development.
 */

'use strict';

const { spawnSync } = require('child_process');
const path = require('path');

const ARGS = process.argv.slice(2);
const COMMAND = ARGS[0];
const COMMAND_ARGS = ARGS.slice(1);

const ROOT = path.resolve(__dirname, '..');

const COMMANDS = {
  'security-scan': {
    script: 'bin/validate-config.js',
    description: 'Validate configuration and run security checks',
    defaultArgs: ['MINDFORGE.md']
  },
  'health': {
    script: 'bin/installer-core.js',
    description: 'Verify project health and installation integrity',
    defaultArgs: ['--check']
  },
  'headless': {
    script: 'bin/autonomous/headless.js',
    description: 'Run MindForge agent in headless mode'
  },
  'pr-review': {
    script: 'bin/review/cross-review-engine.js',
    description: 'Run standard PR review logic'
  },
  'cross-review': {
    script: 'bin/review/cross-review-engine.js',
    description: 'Run advanced cross-model review'
  },
  'classify': {
    script: 'bin/change-classifier.js',
    description: 'Classify changes into governance tiers'
  },
  'approve': {
    script: 'bin/governance/approve.js',
    description: 'Generate a governance approval signature to unblock Tier 3 gates'
  },
  'validate-skill': {
    script: 'bin/skill-validator.js',
    description: 'Run Level 1 & 2 validation on a SKILL.md file'
  },
  'install-skill': {
    script: 'bin/skill-registry.js',
    description: 'Install a skill to the correct tier folder (Tier 1/2/3)',
    defaultArgs: ['install']
  },
  'register-skill': {
    script: 'bin/skill-registry.js',
    description: 'Register a skill in MANIFEST.md',
    defaultArgs: ['register']
  },
  'audit-skill': {
    script: 'bin/skill-registry.js',
    description: 'Record skill life cycle events in audit log',
    defaultArgs: ['audit']
  },
  'remember': {
    script: 'bin/memory/cli.js',
    description: 'Manage the MindForge long-term memory (knowledge graph)'
  },
  'test-memory': {
    script: 'tests/memory.test.js',
    description: 'Run the persistent memory test suite'
  },
  'learn-skill': {
    script: 'bin/skills-builder/learn-cli.js',
    description: 'Ingest source and generate a validated SKILL.md'
  },
  'marketplace': {
    script: 'bin/skills-builder/marketplace-cli.js',
    description: 'Search and install community skills from the marketplace'
  },
  'spawn': {
    script: 'bin/spawn-agent.js',
    description: 'Spawn a persona essence (e.g., mf-planner)',
    defaultArgs: ['spawn']
  },
  'identity': {
    script: 'bin/spawn-agent.js',
    description: 'Invoke a specialized identity from /agents/',
    defaultArgs: ['identity']
  }
};

if (!COMMAND || ARGS.includes('--help') || ARGS.includes('-h')) {
  printUsage();
  process.exit(0);
}

const target = COMMANDS[COMMAND];
if (!target) {
  console.error(`❌ Unknown command: ${COMMAND}`);
  console.error('Available commands: ' + Object.keys(COMMANDS).join(', '));
  process.exit(1);
}

const scriptPath = path.join(ROOT, target.script);
const finalArgs = COMMAND_ARGS.length > 0 ? COMMAND_ARGS : (target.defaultArgs || []);

console.log(`🚀 Executing: ${COMMAND} (${target.description})`);

const result = spawnSync('node', [scriptPath, ...finalArgs], {
  cwd: ROOT,
  stdio: 'inherit',
  env: { ...process.env, MINDFORGE_CLI: 'true' }
});

process.exit(result.status || 0);

function printUsage() {
  console.log('\n⚡ MindForge Enterprise CLI\n');
  console.log('Usage: node bin/mindforge-cli.js <command> [options]\n');
  console.log('Commands:');
  for (const [name, cfg] of Object.entries(COMMANDS)) {
    console.log(`  ${name.padEnd(15)} ${cfg.description}`);
  }
  console.log('\nExamples:');
  console.log('  node bin/mindforge-cli.js security-scan');
  console.log('  node bin/mindforge-cli.js headless --phase 1');
  console.log('\n');
}
