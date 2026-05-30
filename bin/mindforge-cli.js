#!/usr/bin/env node
/**
 * MindForge CLI Router — v2.0.0
 * Standardizes command invocation for GitHub Actions and local development.
 */

'use strict';

const { spawnSync } = require('child_process');
const path = require('path');

const RAW_ARGS = process.argv.slice(2);

// ── Parse global flags ────────────────────────────────────────────────────────
if (RAW_ARGS.includes('--verbose') || RAW_ARGS.includes('-v')) {
  process.env.MINDFORGE_VERBOSE = '1';
}

const ARGS = RAW_ARGS.filter(a => a !== '--verbose' && a !== '-v');
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
  },
  'temporal': {
    script: 'bin/engine/temporal-cli.js',
    description: 'Manage time-travel debugging and state history'
  },
  'hindsight': {
    script: 'bin/engine/temporal-cli.js',
    description: 'Inject a fix into a past point and regenerate state',
    defaultArgs: ['inject']
  },
  'harvest': {
    script: 'bin/autonomous/intent-harvester.js',
    description: 'Proactively harvest semantic intent from the intelligence mesh'
  },
  'self-heal': {
    script: 'bin/autonomous/mesh-self-healer.js',
    description: 'Auto-detect and repair reasoning drifts in the active swarm'
  },
  // Planned: jira-sync, confluence-sync (not yet implemented)
  'metrics': {
    script: 'bin/dashboard/metrics-aggregator.js',
    description: 'Display real-time velocity and quality metrics'
  },
  'tokens': {
    script: 'bin/models/cost-tracker.js',
    description: 'Analyze token consumption and cost efficiency',
    defaultArgs: ['--report']
  },
  'learning': {
    script: 'bin/engine/learning-manager.js',
    description: 'Consult or initialize the project agentic learning memory'
  },
  'record-learning': {
    script: 'bin/engine/learning-manager.js',
    description: 'Append a new Learning Entry to the Evolution Log',
    defaultArgs: ['record']
  }
};

if (!COMMAND || ARGS.includes('--help') || ARGS.includes('-h')) {
  printUsage();
  process.exit(0);
}

const target = COMMANDS[COMMAND];
if (!target) {
  console.error(`Unknown command: ${COMMAND}`);

  // Suggest similar commands using Levenshtein distance
  const suggestions = Object.keys(COMMANDS)
    .map(cmd => ({ cmd, dist: levenshtein(COMMAND, cmd) }))
    .filter(s => s.dist <= 3)
    .sort((a, b) => a.dist - b.dist)
    .slice(0, 3);

  if (suggestions.length > 0) {
    console.error(`\nDid you mean: ${suggestions.map(s => s.cmd).join(', ')}?`);
  } else {
    console.error('Available commands: ' + Object.keys(COMMANDS).join(', '));
  }
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

/**
 * Levenshtein distance — dynamic programming edit distance between two strings.
 */
function levenshtein(a, b) {
  const m = a.length;
  const n = b.length;
  const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));

  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + cost
      );
    }
  }
  return dp[m][n];
}

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
