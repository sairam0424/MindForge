#!/usr/bin/env node
'use strict';

/**
 * MindForge Harness Audit — deterministic 0-10/category scorecard.
 *
 * Adapted from ECC (scripts/harness-audit.js): the scoring ENGINE is kept
 * verbatim (category normalization, buildReport, the JSON contract:
 * overall_score / max_score / applicable_categories / rubric_version /
 * top_actions, and the 0/1 exit). The ~25 check PREDICATES are re-authored for
 * MindForge's real layout: .agent/skills, the .mindforge engine skills
 * (SKILL.md per dir), .claude/commands/mindforge, .agent/hooks + bin/,
 * subagents/categories, MINDFORGE.md, SOUL.md, AUDIT.jsonl.
 *
 * This is the DETERMINISTIC layer behind /mindforge:health — it complements
 * (does not replace) the LLM soft-signal layer. CI-gateable via --format json.
 *
 * Usage:
 *   node bin/harness-audit.js                 # text scorecard for repo scope
 *   node bin/harness-audit.js --format json   # machine-readable
 *   node bin/harness-audit.js --scope security
 *   node bin/harness-audit.js --root /path/to/checkout
 */

const fs = require('fs');
const path = require('path');

const CATEGORIES = [
  'Tool Coverage',
  'Context Efficiency',
  'Quality Gates',
  'Memory & Learning',
  'Eval Coverage',
  'Security Guardrails',
  'Cost Efficiency',
  'Governance & Identity',
];

const RUBRIC_VERSION = '2026-06-10';

const SCOPES = ['repo', 'hooks', 'skills', 'commands', 'agents', 'security'];

function normalizeScope(scope) {
  const value = (scope || 'repo').toLowerCase();
  if (!SCOPES.includes(value)) {
    throw new Error(`Invalid scope: ${scope}. Use one of ${SCOPES.join(', ')}.`);
  }
  return value;
}

function parseArgs(argv) {
  const args = argv.slice(2);
  const parsed = {
    scope: 'repo',
    format: 'text',
    help: false,
    root: path.resolve(process.env.AUDIT_ROOT || process.cwd()),
  };

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];

    if (arg === '--help' || arg === '-h') { parsed.help = true; continue; }
    if (arg === '--format') { parsed.format = (args[index + 1] || '').toLowerCase(); index += 1; continue; }
    if (arg === '--scope') { parsed.scope = normalizeScope(args[index + 1]); index += 1; continue; }
    if (arg === '--root') { parsed.root = path.resolve(args[index + 1] || process.cwd()); index += 1; continue; }
    if (arg.startsWith('--format=')) { parsed.format = arg.split('=')[1].toLowerCase(); continue; }
    if (arg.startsWith('--scope=')) { parsed.scope = normalizeScope(arg.split('=')[1]); continue; }
    if (arg.startsWith('--root=')) { parsed.root = path.resolve(arg.slice('--root='.length)); continue; }
    if (arg.startsWith('-')) { throw new Error(`Unknown argument: ${arg}`); }
    parsed.scope = normalizeScope(arg);
  }

  if (!['text', 'json'].includes(parsed.format)) {
    throw new Error(`Invalid format: ${parsed.format}. Use text or json.`);
  }

  return parsed;
}

function fileExists(rootDir, relativePath) {
  return fs.existsSync(path.join(rootDir, relativePath));
}

function readText(rootDir, relativePath) {
  return fs.readFileSync(path.join(rootDir, relativePath), 'utf8');
}

function safeRead(rootDir, relativePath) {
  try { return readText(rootDir, relativePath); } catch (_error) { return ''; }
}

function safeParseJson(text) {
  if (!text || !text.trim()) return null;
  try { return JSON.parse(text); } catch (_error) { return null; }
}

function countFiles(rootDir, relativeDir, extension) {
  const dirPath = path.join(rootDir, relativeDir);
  if (!fs.existsSync(dirPath)) return 0;

  const stack = [dirPath];
  let count = 0;
  while (stack.length > 0) {
    const current = stack.pop();
    const entries = fs.readdirSync(current, { withFileTypes: true });
    for (const entry of entries) {
      const nextPath = path.join(current, entry.name);
      if (entry.isDirectory()) {
        stack.push(nextPath);
      } else if (!extension || entry.name.endsWith(extension)) {
        count += 1;
      }
    }
  }
  return count;
}

function hasFileWithExtension(rootDir, relativeDir, extensions) {
  const dirPath = path.join(rootDir, relativeDir);
  if (!fs.existsSync(dirPath)) return false;

  const allowed = Array.isArray(extensions) ? extensions : [extensions];
  const stack = [dirPath];
  while (stack.length > 0) {
    const current = stack.pop();
    const entries = fs.readdirSync(current, { withFileTypes: true });
    for (const entry of entries) {
      const nextPath = path.join(current, entry.name);
      if (entry.isDirectory()) { stack.push(nextPath); continue; }
      if (allowed.some(extension => entry.name.endsWith(extension))) return true;
    }
  }
  return false;
}

/**
 * MindForge harness checks. Re-authored from ECC's getRepoChecks for the actual
 * MindForge tree. Each check: { id, category, points, scopes, path, description,
 * pass, fix }.
 */
function getChecks(rootDir) {
  const packageJson = safeParseJson(safeRead(rootDir, 'package.json'));
  const claudeSettings = safeRead(rootDir, '.claude/settings.json');
  const agentSettings = safeRead(rootDir, '.agent/settings.json');
  const mindforgeMd = safeRead(rootDir, 'MINDFORGE.md');
  const config = safeParseJson(safeRead(rootDir, '.mindforge/config.json'));

  return [
    // ── Tool Coverage ──────────────────────────────────────────────────────
    {
      id: 'tool-commands',
      category: 'Tool Coverage', points: 3, scopes: ['repo', 'commands'],
      path: '.claude/commands/mindforge/',
      description: 'At least 50 mindforge slash-commands exist',
      pass: countFiles(rootDir, '.claude/commands/mindforge', '.md') >= 50,
      fix: 'Restore mindforge command definitions under .claude/commands/mindforge/.',
    },
    {
      id: 'tool-command-mirror',
      category: 'Tool Coverage', points: 2, scopes: ['repo', 'commands'],
      path: '.agent/mindforge/',
      description: 'Gemini-mirror command set exists under .agent/mindforge/',
      pass: countFiles(rootDir, '.agent/mindforge', '.md') >= 50,
      fix: 'Keep the .agent/mindforge mirror in sync with .claude/commands/mindforge.',
    },
    {
      id: 'tool-engine-skills',
      category: 'Tool Coverage', points: 2, scopes: ['repo', 'skills'],
      path: '.agent/skills/',
      description: 'At least 40 mindforge-* skills exist',
      pass: countFiles(rootDir, '.agent/skills', 'SKILL.md') >= 40,
      fix: 'Restore mindforge-* skills under .agent/skills/.',
    },
    {
      id: 'tool-subagents',
      category: 'Tool Coverage', points: 2, scopes: ['repo', 'agents'],
      path: 'subagents/categories/',
      description: 'At least 100 subagents are indexed',
      pass: countFiles(rootDir, 'subagents/categories', '.md') >= 100,
      fix: 'Import subagents into subagents/categories/ and rebuild the index.',
    },
    {
      id: 'tool-subagent-index',
      category: 'Tool Coverage', points: 2, scopes: ['repo', 'agents'],
      path: '.mindforge/imported-agents.jsonl',
      description: 'Subagent JSONL index is present',
      pass: fileExists(rootDir, '.mindforge/imported-agents.jsonl'),
      fix: 'Run node scripts/build-subagent-index.js to regenerate the index.',
    },

    // ── Context Efficiency ─────────────────────────────────────────────────
    {
      id: 'context-monitor-hook',
      category: 'Context Efficiency', points: 3, scopes: ['repo', 'hooks'],
      path: '.agent/hooks/mindforge-context-monitor.js',
      description: 'Context-monitor hook exists',
      pass: fileExists(rootDir, '.agent/hooks/mindforge-context-monitor.js'),
      fix: 'Implement .agent/hooks/mindforge-context-monitor.js for context-pressure tracking.',
    },
    {
      id: 'context-sharding',
      category: 'Context Efficiency', points: 3, scopes: ['repo'],
      path: 'bin/shard-helper.js',
      description: 'Sharded-memory helper exists',
      pass: fileExists(rootDir, 'bin/shard-helper.js'),
      fix: 'Add bin/shard-helper.js for the Tri-Tier sharded-memory loop.',
    },
    {
      id: 'context-llm-route',
      category: 'Context Efficiency', points: 2, scopes: ['repo', 'commands'],
      path: '.claude/commands/mindforge/llm-route.md',
      description: 'Model-routing command exists',
      pass: fileExists(rootDir, '.claude/commands/mindforge/llm-route.md'),
      fix: 'Add the llm-route command for complexity-aware routing.',
    },

    // ── Quality Gates ──────────────────────────────────────────────────────
    {
      id: 'quality-test-runner',
      category: 'Quality Gates', points: 3, scopes: ['repo'],
      path: 'tests/',
      description: 'A test entrypoint exists (tests/run-all.js or npm test)',
      pass: fileExists(rootDir, 'tests/run-all.js') || typeof packageJson?.scripts?.test === 'string',
      fix: 'Add tests/run-all.js or a package.json test script.',
    },
    {
      id: 'quality-test-count',
      category: 'Quality Gates', points: 2, scopes: ['repo'],
      path: 'tests/',
      description: 'At least 20 test files exist',
      pass: countFiles(rootDir, 'tests', '.test.js') >= 20,
      fix: 'Increase automated test coverage under tests/.',
    },
    {
      id: 'quality-skill-validator',
      category: 'Quality Gates', points: 2, scopes: ['repo'],
      path: 'bin/skill-validator.js',
      description: 'Skill validator exists',
      pass: fileExists(rootDir, 'bin/skill-validator.js'),
      fix: 'Add bin/skill-validator.js to certify skills.',
    },
    {
      id: 'quality-harness-audit',
      category: 'Quality Gates', points: 2, scopes: ['repo'],
      path: 'bin/harness-audit.js',
      description: 'Deterministic harness-audit scorecard exists',
      pass: fileExists(rootDir, 'bin/harness-audit.js'),
      fix: 'Add bin/harness-audit.js (this file) and wire harness:audit npm script.',
    },

    // ── Memory & Learning ──────────────────────────────────────────────────
    {
      id: 'memory-instinct-capture',
      category: 'Memory & Learning', points: 3, scopes: ['repo', 'hooks'],
      path: 'bin/hooks/instinct-capture-hook.js',
      description: 'Instinct-capture hook exists',
      pass: fileExists(rootDir, 'bin/hooks/instinct-capture-hook.js'),
      fix: 'Add bin/hooks/instinct-capture-hook.js for auto-capture of instincts.',
    },
    {
      id: 'memory-continuous-learning',
      category: 'Memory & Learning', points: 3, scopes: ['repo', 'skills'],
      path: '.mindforge/skills/continuous-learning/SKILL.md',
      description: 'Continuous-learning skill exists',
      pass: fileExists(rootDir, '.mindforge/skills/continuous-learning/SKILL.md'),
      fix: 'Add .mindforge/skills/continuous-learning/SKILL.md.',
    },
    {
      id: 'memory-instinct-config',
      category: 'Memory & Learning', points: 2, scopes: ['repo'],
      path: '.mindforge/config.json',
      description: 'Instinct engine is configured',
      pass: Boolean(config?.instincts?.store_path),
      fix: 'Configure the instincts block in .mindforge/config.json.',
    },

    // ── Eval Coverage ──────────────────────────────────────────────────────
    {
      id: 'eval-harness-skill',
      category: 'Eval Coverage', points: 4, scopes: ['repo', 'skills'],
      path: '.mindforge/skills/eval-harness/SKILL.md',
      description: 'Eval-harness skill exists',
      pass: fileExists(rootDir, '.mindforge/skills/eval-harness/SKILL.md'),
      fix: 'Add .mindforge/skills/eval-harness/SKILL.md for pass/fail regression evaluation.',
    },
    {
      id: 'eval-verification-loop',
      category: 'Eval Coverage', points: 3, scopes: ['repo', 'skills'],
      path: '.mindforge/skills/verification-loop/SKILL.md',
      description: 'Verification-loop skill exists',
      pass: fileExists(rootDir, '.mindforge/skills/verification-loop/SKILL.md'),
      fix: 'Add .mindforge/skills/verification-loop/SKILL.md to standardize verify gates.',
    },
    {
      id: 'eval-engine',
      category: 'Eval Coverage', points: 2, scopes: ['repo'],
      path: 'bin/eval/',
      description: 'Eval engine exists under bin/',
      pass: fileExists(rootDir, 'bin/eval'),
      fix: 'Add the eval engine under bin/eval/.',
    },

    // ── Security Guardrails ────────────────────────────────────────────────
    {
      id: 'security-trust-gate',
      category: 'Security Guardrails', points: 3, scopes: ['repo', 'hooks', 'security'],
      path: 'bin/security/trust-gate-hook.js',
      description: 'TrustGate Bash guard exists',
      pass: fileExists(rootDir, 'bin/security/trust-gate-hook.js') && fileExists(rootDir, 'bin/security/trust-boundaries.js'),
      fix: 'Restore bin/security/trust-gate-hook.js + trust-boundaries.js.',
    },
    {
      id: 'security-block-no-verify',
      category: 'Security Guardrails', points: 2, scopes: ['repo', 'hooks', 'security'],
      path: '.agent/hooks/mindforge-block-no-verify.js',
      description: 'Git-hook-bypass guard exists',
      pass: fileExists(rootDir, '.agent/hooks/mindforge-block-no-verify.js'),
      fix: 'Add .agent/hooks/mindforge-block-no-verify.js to block --no-verify.',
    },
    {
      id: 'security-deny-baseline',
      category: 'Security Guardrails', points: 3, scopes: ['repo', 'security'],
      path: '.claude/settings.json',
      description: 'permissions.deny baseline protects secret-bearing paths',
      pass: claudeSettings.includes('"deny"') && claudeSettings.includes('.ssh'),
      fix: 'Add a permissions.deny baseline to .claude/settings.json (see MINDFORGE-AGENTIC-SECURITY.md).',
    },
    {
      id: 'security-bash-guard-both',
      category: 'Security Guardrails', points: 2, scopes: ['repo', 'hooks', 'security'],
      path: '.agent/settings.json',
      description: 'Bash guards wired in BOTH .claude and the .agent Gemini mirror',
      pass: claudeSettings.includes('trust-gate-hook') && agentSettings.includes('trust-gate-hook'),
      fix: 'Wire trust-gate + block-no-verify into both .claude/settings.json and .agent/settings.json.',
    },
    {
      id: 'security-threat-model',
      category: 'Security Guardrails', points: 2, scopes: ['repo', 'security'],
      path: 'MINDFORGE-AGENTIC-SECURITY.md',
      description: 'Agentic-harness threat model is documented',
      pass: fileExists(rootDir, 'MINDFORGE-AGENTIC-SECURITY.md'),
      fix: 'Add MINDFORGE-AGENTIC-SECURITY.md (outward harness threat model).',
    },
    {
      id: 'security-scan-command',
      category: 'Security Guardrails', points: 1, scopes: ['repo', 'commands', 'security'],
      path: '.claude/commands/mindforge/security-scan.md',
      description: 'Security-scan command exists',
      pass: fileExists(rootDir, '.claude/commands/mindforge/security-scan.md'),
      fix: 'Add the security-scan command.',
    },

    // ── Cost Efficiency ────────────────────────────────────────────────────
    {
      id: 'cost-routing-config',
      category: 'Cost Efficiency', points: 3, scopes: ['repo'],
      path: '.mindforge/config.json',
      description: 'Cost-routing with budget caps is configured',
      pass: Boolean(config?.cost_routing?.budget?.session_hard_limit_usd),
      fix: 'Configure cost_routing.budget in .mindforge/config.json.',
    },
    {
      id: 'cost-revops-engine',
      category: 'Cost Efficiency', points: 3, scopes: ['repo'],
      path: 'bin/revops/',
      description: 'RevOps cost engine exists',
      pass: fileExists(rootDir, 'bin/revops'),
      fix: 'Add the RevOps cost engine under bin/revops/.',
    },
    {
      id: 'cost-model-registry',
      category: 'Cost Efficiency', points: 2, scopes: ['repo'],
      path: '.mindforge/config.json',
      description: 'Model market-registry with per-model pricing exists',
      pass: Boolean(config?.revops?.market_registry),
      fix: 'Populate revops.market_registry with per-model cost/benchmark data.',
    },

    // ── Governance & Identity ──────────────────────────────────────────────
    {
      id: 'gov-param-registry',
      category: 'Governance & Identity', points: 3, scopes: ['repo'],
      path: 'MINDFORGE.md',
      description: 'Parameter registry (MINDFORGE.md) with non-overridable gates exists',
      pass: mindforgeMd.includes('NON-OVERRIDABLE') && mindforgeMd.includes('MIN_SOUL_SCORE'),
      fix: 'Restore MINDFORGE.md with the non-overridable governance section.',
    },
    {
      id: 'gov-sovereign-identity',
      category: 'Governance & Identity', points: 2, scopes: ['repo'],
      path: 'SOUL.md',
      description: 'Sovereign identity + prompt-defense baseline present',
      pass: fileExists(rootDir, 'SOUL.md') && safeRead(rootDir, 'SOUL.md').includes('Prompt-Defense Baseline'),
      fix: 'Add the prompt-defense baseline to SOUL.md (scoped to untrusted content).',
    },
    {
      id: 'gov-engine',
      category: 'Governance & Identity', points: 3, scopes: ['repo'],
      path: 'bin/governance/',
      description: 'Governance engine exists',
      pass: fileExists(rootDir, 'bin/governance'),
      fix: 'Restore the governance engine under bin/governance/.',
    },
    {
      id: 'gov-audit-trail',
      category: 'Governance & Identity', points: 2, scopes: ['repo'],
      path: '.mindforge/audit/',
      description: 'Merkle-linked audit trail directory exists',
      pass: fileExists(rootDir, '.mindforge/audit') || fileExists(rootDir, '.planning'),
      fix: 'Ensure the audit-trail directory (.mindforge/audit/) is present.',
    },
  ];
}

function summarizeCategoryScores(checks) {
  const scores = {};
  for (const category of CATEGORIES) {
    const inCategory = checks.filter(check => check.category === category);
    const max = inCategory.reduce((sum, check) => sum + check.points, 0);
    const earned = inCategory.filter(check => check.pass).reduce((sum, check) => sum + check.points, 0);
    const normalized = max === 0 ? 0 : Math.round((earned / max) * 10);
    scores[category] = { score: normalized, earned, max };
  }
  return scores;
}

function buildReport(scope, options = {}) {
  const rootDir = path.resolve(options.rootDir || process.cwd());
  const checks = getChecks(rootDir).filter(check => check.scopes.includes(scope));
  const categoryScores = summarizeCategoryScores(checks);
  const maxScore = checks.reduce((sum, check) => sum + check.points, 0);
  const overallScore = checks.filter(check => check.pass).reduce((sum, check) => sum + check.points, 0);
  const applicableCategories = CATEGORIES.filter(name => categoryScores[name]?.max > 0);

  const topActions = checks
    .filter(check => !check.pass)
    .sort((left, right) => right.points - left.points)
    .slice(0, 3)
    .map(check => ({ action: check.fix, path: check.path, category: check.category, points: check.points }));

  return {
    scope,
    root_dir: rootDir,
    deterministic: true,
    rubric_version: RUBRIC_VERSION,
    overall_score: overallScore,
    max_score: maxScore,
    categories: categoryScores,
    applicable_categories: applicableCategories,
    category_count: applicableCategories.length,
    checks: checks.map(check => ({
      id: check.id,
      category: check.category,
      points: check.points,
      path: check.path,
      description: check.description,
      pass: check.pass,
    })),
    top_actions: topActions,
  };
}

function printText(report) {
  console.log(`MindForge Harness Audit (${report.scope}): ${report.overall_score}/${report.max_score}`);
  console.log(`Root: ${report.root_dir}`);
  console.log('');

  for (const category of CATEGORIES) {
    const data = report.categories[category];
    if (!data || data.max === 0) continue;
    console.log(`- ${category}: ${data.score}/10 (${data.earned}/${data.max} pts)`);
  }

  const failed = report.checks.filter(check => !check.pass);
  console.log('');
  console.log(`Checks: ${report.checks.length} total, ${failed.length} failing`);

  if (failed.length > 0) {
    console.log('');
    console.log('Top 3 Actions:');
    report.top_actions.forEach((action, index) => {
      console.log(`${index + 1}) [${action.category}] ${action.action} (${action.path})`);
    });
  }
}

function showHelp(exitCode = 0) {
  console.log(`
Usage: node bin/harness-audit.js [scope] [--scope <${SCOPES.join('|')}>] [--format <text|json>] [--root <path>]

Deterministic MindForge harness audit based on explicit file/config checks.
Audits the current working directory by default.
`);
  process.exit(exitCode);
}

function main() {
  try {
    const args = parseArgs(process.argv);
    if (args.help) { showHelp(0); return; }

    const report = buildReport(args.scope, { rootDir: args.root });

    if (args.format === 'json') {
      console.log(JSON.stringify(report, null, 2));
    } else {
      printText(report);
    }
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { buildReport, parseArgs, getChecks, CATEGORIES, RUBRIC_VERSION };
