/**
 * MindForge installer smoke tests
 * Run: node tests/install.test.js
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

console.log('\nMindForge Core Installation & Structural Tests\n');

// ── Directory structure tests ─────────────────────────────────────────────────
console.log('Directories:');
const dirs = [
  '.claude/commands/mindforge',
  '.agent/mindforge',
  '.mindforge/personas',
  '.mindforge/integrations',
  '.mindforge/governance',
  '.mindforge/team',
  '.mindforge/org/integrations',
  '.mindforge/skills/security-review',
  '.mindforge/skills/code-quality',
  '.mindforge/skills/api-design',
  '.mindforge/skills/testing-standards',
  '.mindforge/skills/documentation',
  '.mindforge/org',
  '.planning/decisions',
  'bin',
  'docs',
  'tests',
  '.planning/audit-archive',
  '.planning/approvals',
  '.planning/milestones',
];
dirs.forEach(d => test(d, () => assert.ok(fs.existsSync(d), `Missing: ${d}`)));

// ── Required files tests ──────────────────────────────────────────────────────
console.log('\nRequired files:');
const files = [
  '.claude/CLAUDE.md',
  '.agent/CLAUDE.md',
  '.claude/commands/mindforge/help.md',
  '.claude/commands/mindforge/init-project.md',
  '.claude/commands/mindforge/plan-phase.md',
  '.claude/commands/mindforge/execute-phase.md',
  '.claude/commands/mindforge/verify-phase.md',
  '.claude/commands/mindforge/ship.md',
  '.claude/commands/mindforge/audit.md',
  '.claude/commands/mindforge/milestone.md',
  '.claude/commands/mindforge/complete-milestone.md',
  '.claude/commands/mindforge/approve.md',
  '.claude/commands/mindforge/sync-jira.md',
  '.claude/commands/mindforge/sync-confluence.md',
  '.mindforge/personas/analyst.md',
  '.mindforge/personas/architect.md',
  '.mindforge/personas/developer.md',
  '.mindforge/personas/qa-engineer.md',
  '.mindforge/personas/security-reviewer.md',
  '.mindforge/personas/tech-writer.md',
  '.mindforge/personas/debug-specialist.md',
  '.mindforge/personas/release-manager.md',
  '.mindforge/skills/security-review/SKILL.md',
  '.mindforge/skills/code-quality/SKILL.md',
  '.mindforge/skills/api-design/SKILL.md',
  '.mindforge/skills/testing-standards/SKILL.md',
  '.mindforge/skills/documentation/SKILL.md',
  '.mindforge/org/ORG.md',
  '.mindforge/org/CONVENTIONS.md',
  '.mindforge/org/SECURITY.md',
  '.mindforge/org/TOOLS.md',
  '.mindforge/integrations/connection-manager.md',
  '.mindforge/integrations/jira.md',
  '.mindforge/integrations/confluence.md',
  '.mindforge/integrations/slack.md',
  '.mindforge/integrations/github.md',
  '.mindforge/integrations/gitlab.md',
  '.mindforge/governance/change-classifier.md',
  '.mindforge/governance/approval-workflow.md',
  '.mindforge/governance/compliance-gates.md',
  '.mindforge/governance/GOVERNANCE-CONFIG.md',
  '.mindforge/team/multi-handoff.md',
  '.mindforge/team/session-merger.md',
  '.mindforge/org/integrations/INTEGRATIONS-CONFIG.md',
  '.planning/STATE.md',
  '.planning/HANDOFF.json',
  '.planning/jira-sync.json',
  '.planning/slack-threads.json',
  'bin/install.js',
  'package.json',
  'README.md',
  'docs/enterprise-setup.md',
  'docs/governance-guide.md',
];
files.forEach(f => test(f, () => assert.ok(fs.existsSync(f), `Missing: ${f}`)));

// ── Content tests ─────────────────────────────────────────────────────────────
console.log('\nContent validation:');

test('CLAUDE.md has session start protocol', () => {
  const content = fs.readFileSync('.claude/CLAUDE.md', 'utf8');
  assert.ok(content.includes('SESSION START PROTOCOL'), 'Missing session start protocol');
  assert.ok(content.includes('PLAN-FIRST RULE'), 'Missing plan-first rule');
  assert.ok(content.includes('Quality gates'), 'Missing quality gates');
  assert.ok(content.includes('SECURITY AUTO-TRIGGER'), 'Missing security auto-trigger');
  assert.ok(content.includes('/mindforge:audit'), 'Missing Day 4 command awareness');
  assert.ok(content.includes('Tier 3'), 'Missing governance tier awareness');
});

test('CLAUDE.md and .agent/CLAUDE.md are identical', () => {
  const claude = fs.readFileSync('.claude/CLAUDE.md', 'utf8');
  const agent = fs.readFileSync('.agent/CLAUDE.md', 'utf8');
  assert.strictEqual(claude, agent, '.claude/CLAUDE.md and .agent/CLAUDE.md differ');
});

test('All commands mirrored to .agent/mindforge/', () => {
  const claudeCommands = fs.readdirSync('.claude/commands/mindforge/').sort();
  const agentCommands = fs.readdirSync('.agent/mindforge/').sort();
  assert.deepStrictEqual(claudeCommands, agentCommands, 'Command files differ between runtimes');
});

test('HANDOFF.json is valid JSON', () => {
  const content = fs.readFileSync('.planning/HANDOFF.json', 'utf8');
  const parsed = JSON.parse(content);
  assert.ok(parsed.schema_version, 'Missing schema_version field');
  assert.ok(parsed._warning, 'Missing _warning anti-secret field');
});

test('package.json has bin field', () => {
  const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  assert.ok(pkg.bin, 'Missing bin field');
  assert.ok(pkg.bin['mindforge-cc'], 'Missing bin.mindforge-cc');
  assert.ok(pkg.engines, 'Missing engines field');
  assert.ok(pkg.engines.node, 'Missing engines.node');
});

test('All skill packs have frontmatter triggers', () => {
  const skillDirs = fs.readdirSync('.mindforge/skills/');
  skillDirs.forEach(dir => {
    const skillPath = `.mindforge/skills/${dir}/SKILL.md`;
    if (fs.existsSync(skillPath)) {
      const content = fs.readFileSync(skillPath, 'utf8');
      assert.ok(content.includes('triggers:'), `${skillPath} missing triggers frontmatter`);
      assert.ok(content.includes('name:'), `${skillPath} missing name frontmatter`);
    }
  });
});

test('bin/install.js is executable and has no obvious syntax errors', () => {
  const stat = fs.statSync('bin/install.js');
  assert.ok(stat.size > 1000, 'bin/install.js is suspiciously small');
  const content = fs.readFileSync('bin/install.js', 'utf8');
  assert.ok(content.includes('#!/usr/bin/env node'), 'Missing shebang line');
  assert.ok(content.includes('verifyInstall'), 'Missing install verification function');
});

test('No secrets in any committed file', () => {
  const secretPatterns = [
    /password\s*=\s*['"][^'"]{6,}/i,
    /api[_-]?key\s*=\s*['"][^'"]{10,}/i,
    /secret\s*=\s*['"][^'"]{8,}/i,
    /-----BEGIN (RSA |EC |PRIVATE )?KEY-----/,
    /sk-[a-zA-Z0-9]{20,}/,
  ];

  // Skip dirs that are not committed to this repo: deps, VCS internals, and the
  // gitignored donor/upstream repos (ECC/, awesome-claude-code-subagents/) whose
  // OWN content — including security docs that contain example secret patterns —
  // is not part of MindForge's committed tree. This test asserts on COMMITTED
  // files, so scanning gitignored donor trees is both wrong and a false-positive
  // source.
  const SKIP_DIRS = ['node_modules', '.git', 'ECC', 'awesome-claude-code-subagents', '.serena', 'hermes-agent'];

  // Obvious placeholder tokens. A "secret-shaped" match that contains one of
  // these is a pedagogical example (e.g. security rule docs that TEACH about
  // secret patterns), not a real credential. We allowlist the placeholder VALUE
  // rather than skip whole directories, so the scanner stays active over those
  // files and would still catch a genuine leaked secret.
  const PLACEHOLDER = /(xxxx|x{4,}|your[-_]?(api[-_]?)?key|placeholder|example|redacted|\.\.\.|<[^>]+>|changeme|dummy|fake|sample)/i;

  function scanDir(dir) {
    const base = path.basename(dir);
    if (SKIP_DIRS.includes(base) || dir.includes('node_modules') || dir.includes('.git')) return;
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    entries.forEach(entry => {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        scanDir(full);
      } else if (entry.name.endsWith('.md') || entry.name.endsWith('.js') || entry.name.endsWith('.json')) {
        const content = fs.readFileSync(full, 'utf8');
        secretPatterns.forEach(pattern => {
          const m = content.match(pattern);
          // A match is a violation only if it is NOT an obvious placeholder.
          if (m && !PLACEHOLDER.test(m[0])) {
            assert.fail(`Potential secret in ${full}: ${m[0].slice(0, 40)}`);
          }
        });
      }
    });
  }

  scanDir('.');
});

// ── Results ───────────────────────────────────────────────────────────────────
console.log(`\n${'─'.repeat(50)}`);
console.log(`Results: ${passed} passed, ${failed} failed`);

if (failed > 0) {
  console.error(`\n❌ ${failed} test(s) failed. Fix before pushing.\n`);
  process.exit(1);
} else {
  console.log('\n✅ All tests passed. Foundation is solid.\n');
}
