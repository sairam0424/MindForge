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
    description: 'Validate configuration and run security checks'
    // No defaultArgs: validate-config.js already defaults to MINDFORGE.md
    // (bin/validate-config.js:13). Declaring it here would prepend a positional
    // that shadows a user-supplied config path.
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
  // NOTE: install-skill / register-skill / audit-skill deliberately carry NO
  // defaultArgs. Supplying their subcommand token here reaches skill-registry's
  // write paths, which perform no existence or validation checks:
  //   - audit-skill <name> <ver> <tier> appended a hash-chained
  //     {event:'skill_installed', validation_passed:true} entry for a skill that
  //     does not exist, and exited 0. For a product whose central claim is a
  //     tamper-evident audit chain, a CLI that mints authentic-looking false
  //     entries on request is worse than one that refuses.
  //   - register-skill <name> <ver> 1 wrote a malformed 5-column row above the
  //     table header of .mindforge/org/skills/MANIFEST.md, which ships in the
  //     tarball, and exited 0.
  // Without defaultArgs these refuse with "Invalid or missing action" (exit 1),
  // which is the pre-11.9.2 behaviour. Re-enable only once skill-registry gates
  // on skill existence and fixes its table-separator match.
  'install-skill': {
    script: 'bin/skill-registry.js',
    description: 'Install a skill to the correct tier folder (pass the "install" action explicitly)'
  },
  'register-skill': {
    script: 'bin/skill-registry.js',
    description: 'Register a skill in MANIFEST.md (pass the "register" action explicitly)'
  },
  'audit-skill': {
    script: 'bin/skill-registry.js',
    description: 'Record skill life cycle events in audit log (pass the "audit" action explicitly)'
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
  // spawn-agent.js reads MODE from ARGS[0] and supports spawn|identity|subagent.
  // 'subagent' had no router entry, so it was reached as `mindforge spawn subagent
  // <name>` — which prepending 'spawn' now shadows (MODE='spawn', TARGET='subagent').
  // Promoting it to a first-class command keeps the only implemented mode reachable.
  'subagent': {
    script: 'bin/spawn-agent.js',
    description: 'Invoke a subagent definition from /subagents/',
    defaultArgs: ['subagent']
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
  // No defaultArgs: 'record' reaches a writer that resolves its target relative to
  // the spawn cwd, which is still ROOT (deferred to v12). In a consumer install that
  // writes inside node_modules/mindforge-cc/ and is destroyed by the next npm ci.
  // Activating a writer while its path resolution is known-wrong is worse than
  // leaving it inert; re-enable together with the cwd fix.
  'record-learning': {
    script: 'bin/engine/learning-manager.js',
    description: 'Append a new Learning Entry to the Evolution Log (pass the "record" action explicitly)'
  },
  'verify': {
    script: 'bin/engine/verify-cli.js',
    description: 'Run unified verification (tests, lint, audit, typecheck) and write report'
  }
};

// ── Workflow subcommand (non-script, handled inline) ─────────────────────────
//
// Routable but NOT a COMMANDS key, because it dispatches to a module rather than spawning a script.
// That made the CLI lie about itself: `workflow` is the most-documented verb in the project (126
// references across the docs) and it works, yet it appeared in neither `--help` nor the
// "Available commands" list, so a user who mistyped it was told it does not exist. Declared here, next
// to the handler that makes it real, and consumed by both self-report sites below — one source, so the
// two cannot drift.
const INLINE_COMMANDS = ['workflow'];
/** Every verb the router will actually dispatch: table-driven plus inline. */
const ROUTABLE = [...Object.keys(COMMANDS), ...INLINE_COMMANDS].sort();

if (COMMAND === 'workflow') {
  const workflowRunner = require('./workflows/workflow-runner');
  workflowRunner.run(COMMAND_ARGS[0], COMMAND_ARGS.slice(1));
  process.exit(0);
}

if (ARGS.includes('--version') || ARGS.includes('-V')) {
  // Resolve by package NAME. In an install this file lands at <project>/bin/mindforge-cli.js, so
  // '../package.json' is the CONSUMER's manifest and `--version` confidently printed THEIR app's
  // version as MindForge's — measured: 1.0.0 for a host app at 1.0.0, while MindForge was 11.9.2.
  // Exit non-zero on an unresolvable version rather than guessing: the whole point of this command
  // is to be trusted, and a plausible wrong answer is worse than an honest failure.
  try {
    console.log(require('./utils/mindforge-version').resolveMindforgeVersion().version);
    process.exit(0);
  } catch (err) {
    console.error(err.message);
    process.exit(1);
  }
}

if (!COMMAND || ARGS.includes('--help') || ARGS.includes('-h')) {
  printUsage();
  process.exit(0);
}

const target = COMMANDS[COMMAND];
if (!target) {
  console.error(`Unknown command: ${COMMAND}`);

  // Suggest similar commands using Levenshtein distance. ROUTABLE, not Object.keys(COMMANDS): a
  // near-miss on `workflow` (`worklow`, `wokflow`) previously produced no suggestion at all, because
  // the only verb it resembles was absent from the pool.
  const suggestions = ROUTABLE
    .map(cmd => ({ cmd, dist: levenshtein(COMMAND, cmd) }))
    .filter(s => s.dist <= 3)
    .sort((a, b) => a.dist - b.dist)
    .slice(0, 3);

  if (suggestions.length > 0) {
    console.error(`\nDid you mean: ${suggestions.map(s => s.cmd).join(', ')}?`);
  } else {
    console.error('Available commands: ' + ROUTABLE.join(', '));
  }
  process.exit(1);
}

const scriptPath = path.join(ROOT, target.script);

// defaultArgs are PREPENDED, never replaced. They carry the subcommand token or
// mode flag the child script requires (e.g. 'inject' for hindsight, '--check' for
// health), so dropping them when the user supplies an argument silently changes
// which code path runs — `health --force` used to lose '--check' and fall through
// to installer-core's install() path.
const finalArgs = [...(target.defaultArgs || []), ...COMMAND_ARGS];

console.log(`🚀 Executing: ${COMMAND} (${target.description})`);

// The child runs in the USER'S project, not in MindForge's install directory.
//
// This was `cwd: ROOT`, which made every routed command operate on the framework's own tree
// instead of the caller's. The worst case was `security-scan`, the command the protocol mandates
// pre-commit for any Auth/Payment/PII change: measured against a fixture project whose
// MINDFORGE.md declared 4 settings including `[MIN_SOUL_SCORE] = 99` (schema maximum is 10) and
// `[COST_HARD_LIMIT_USD] = not-a-number`, it printed
//
//     ✅ MINDFORGE.md valid — 43 settings configured
//
// and exited 0. 43 is MindForge's OWN setting count. Two different fixture configs produced
// byte-identical output, which is the proof it read neither: a security gate that cannot fail,
// because it never sees the input it claims to check.
//
// MEASURED BLAST RADIUS before changing it — all 27 routed commands run under both values against
// the same fixture. 7 differ, every one of them moving from the vendor's tree to the caller's, and
// NONE regressed from success to failure:
//
//   security-scan                validated MindForge's config      -> reads the caller's
//   classify                     TIER=2 from MindForge's git diff  -> diffs the caller's repo
//   pr-review, cross-review      loaded MindForge's ConfigManager  -> looks in the caller's project
//   learning, record-learning    reported MindForge's state        -> reports the caller's
//   test-memory                  same ConfigManager shift
//
// `classify` deserves its own note: for every consumer it was classifying MindForge's changes.
//
// CI is unaffected, checked rather than assumed. control-plane.yml:80 runs `security-scan` as the
// required ⚖️ Governance Enforcement check and mindforge-ci.yml:46 runs validate-config.js
// directly; both execute with the repo root as cwd, so ROOT and process.cwd() are the same path
// there and behaviour is byte-identical.
//
// A script that needs the FRAMEWORK's own assets must resolve them from __dirname, which is
// independent of cwd — see the SCHEMA_PATH note in bin/validate-config.js. Anchoring vendor assets
// to the process's working directory is what coupled these two unrelated things in the first place.
const result = spawnSync('node', [scriptPath, ...finalArgs], {
  cwd: process.cwd(),
  stdio: 'inherit',
  env: { ...process.env, MINDFORGE_CLI: 'true' }
});

process.exit(result.status != null ? result.status : (result.signal ? 1 : 0));

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
  // Listed separately because it dispatches to a module rather than spawning a script, so it has no
  // COMMANDS entry to carry a description. Omitting it made --help contradict the router.
  console.log(`  ${'workflow'.padEnd(15)} Run a registered dynamic workflow (see \`workflow list\`)`);
  console.log('\nExamples:');
  console.log('  node bin/mindforge-cli.js security-scan');
  console.log('  node bin/mindforge-cli.js headless --phase 1');
  console.log('  node bin/mindforge-cli.js workflow list');
  console.log('\n');
}
