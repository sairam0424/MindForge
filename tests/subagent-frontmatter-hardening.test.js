/**
 * MindForge — Subagent Frontmatter Hardening (pilot)
 * Verifies the pilot set of subagents (chosen as the broadest `tools:`
 * allowlist grants across subagents/categories/) declare `isolation:
 * worktree` in frontmatter, and that NO subagent anywhere under
 * subagents/categories/ (not just the pilot 3) declares a `disallowedTools`
 * entry with a Bash(...) specifier that contradicts its own `tools:` grant
 * — that exact contradiction was found live in the 3 pilot files on
 * 2026-09-26 (a `disallowedTools: [Bash(...)]` entry alongside a bare
 * `Bash` grant in `tools:`), because per Claude Code's own docs a
 * disallowedTools specifier removes the WHOLE tool, not the matching
 * pattern, so the entries silently stripped all Bash access from all 3
 * pilot subagents rather than scoping it as their frontmatter implied.
 *
 * Fix: the pilot 3 subagents' disallowedTools entries were removed (see
 * their frontmatter comments for the per-file rationale); the patterns they
 * were trying to block are now covered project-wide by the PreToolUse trust
 * gate (bin/security/trust-boundaries.js isHighImpact(), registered in
 * .claude/settings.json with matcher "Bash"). This file's tests below both
 * confirm the pilot 3 are fixed AND generalize the regression guard to
 * every subagent under subagents/categories/, so this exact mistake cannot
 * silently recur for a subagent hardened later.
 *
 * Pilot scope: bin/spawn-agent.js's `subagent` mode is the one real,
 * currently-existing mechanism that resolves a subagent name to a file under
 * subagents/categories/ (via the index from scripts/build-subagent-index.js),
 * even though dispatch through it is dry-run only today. That resolver
 * indexes all 164 subagents equally by exact name — there is no narrower
 * "hot path" subset within it. The pilot below was instead selected by
 * counting comma-separated entries in each subagent's `tools:` frontmatter
 * line: the widest allowlists carry the highest blast radius if compromised,
 * so they are hardened first. See this task's commit message / report for
 * the full selection trail.
 *
 * Run: node tests/subagent-frontmatter-hardening.test.js
 */
'use strict';

const fs = require('fs');
const path = require('path');
const assert = require('assert');
const { isHighImpact } = require('../bin/security/trust-boundaries');

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

// Populated from Task 3 Step 1's discovery: the 3 subagents (of 164 under
// subagents/categories/) with the broadest `tools:` allowlist by
// comma-separated entry count — codebase-orchestrator (13), ui-ux-tester (9),
// and wordpress-master (8, tie-broken against 3 other 8-entry files by real
// production/blast-radius impact — see report for the tie-break rationale).
const PILOT_SUBAGENTS = [
  'subagents/categories/09-meta-orchestration/codebase-orchestrator.md',
  'subagents/categories/04-quality-security/ui-ux-tester.md',
  'subagents/categories/08-business-product/wordpress-master.md',
];

function parseFrontmatter(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  if (!content.startsWith('---'))
    throw new Error(`${filePath}: missing frontmatter (must start with ---)`);
  const end = content.indexOf('---', 3);
  if (end === -1) throw new Error(`${filePath}: unclosed frontmatter`);
  const fm = content.slice(3, end).trim();
  const result = {};
  fm.split('\n').forEach((line) => {
    if (line.trim().startsWith('#')) return; // skip frontmatter comments
    const colon = line.indexOf(':');
    if (colon === -1) return;
    result[line.slice(0, colon).trim()] = line.slice(colon + 1).trim();
  });
  return result;
}

function allSubagentFiles() {
  const root = path.join(__dirname, '..', 'subagents', 'categories');
  const results = [];
  (function walk(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (
        entry.isFile() &&
        entry.name.endsWith('.md') &&
        entry.name !== 'README.md'
      ) {
        results.push(full);
      }
    }
  })(root);
  return results;
}

// A disallowedTools entry contradicts tools: when its base tool name (the
// part before an optional "(" specifier) is also present, bare, in tools:.
// This is the exact class of mistake found in the 3 pilot files: a
// Bash(pattern) denial alongside a bare Bash grant, where the specifier
// removes the whole tool per Claude Code's docs rather than just the
// matching command.
function findContradictions(fm) {
  const allowed = new Set(
    (fm.tools || '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean),
  );
  const denied = (fm.disallowedTools || '')
    .replace(/[[\]]/g, '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  return denied.filter((d) => {
    const baseTool = d.split('(')[0].trim();
    return allowed.has(baseTool);
  });
}

console.log('\nSubagent frontmatter hardening — pilot set\n');

test('PILOT_SUBAGENTS is populated from discovery', () => {
  assert.ok(
    PILOT_SUBAGENTS.length > 0,
    'PILOT_SUBAGENTS is empty — fill in from Task 3 Step 1',
  );
});

PILOT_SUBAGENTS.forEach((rel) => {
  test(`${rel}: declares isolation:worktree`, () => {
    const fm = parseFrontmatter(path.join(__dirname, '..', rel));
    assert.strictEqual(
      fm.isolation,
      'worktree',
      `${rel}: isolation must be worktree`,
    );
  });

  test(`${rel}: no longer declares a disallowedTools Bash(...) specifier (removed 2026-09-26 — see file comment)`, () => {
    const fm = parseFrontmatter(path.join(__dirname, '..', rel));
    assert.ok(
      !fm.disallowedTools,
      `${rel}: still declares disallowedTools — the broken Bash(...) specifier pattern should have been removed`,
    );
  });
});

test('repo-wide: no subagent under subagents/categories/ denies (via a Bash(...) specifier) a tool its own tools: allowlist grants bare', () => {
  const offenders = [];
  for (const file of allSubagentFiles()) {
    const fm = parseFrontmatter(file);
    const contradictions = findContradictions(fm);
    if (contradictions.length > 0) {
      offenders.push(
        `${path.relative(path.join(__dirname, '..'), file)}: ${contradictions.join(', ')}`,
      );
    }
  }
  assert.strictEqual(
    offenders.length,
    0,
    `Found disallowedTools/tools: contradictions (specifier removes the whole tool, not the pattern):\n  ${offenders.join('\n  ')}`,
  );
});

test('replacement protection: .claude/settings.json registers a PreToolUse trust gate on Bash', () => {
  const settings = JSON.parse(
    fs.readFileSync(
      path.join(__dirname, '..', '.claude', 'settings.json'),
      'utf8',
    ),
  );
  const preToolUse = settings.hooks && settings.hooks.PreToolUse;
  assert.ok(
    Array.isArray(preToolUse),
    '.claude/settings.json has no hooks.PreToolUse array',
  );
  const bashGate = preToolUse.find(
    (entry) =>
      entry.matcher === 'Bash' &&
      entry.hooks.some((h) => /trust-gate-hook\.js/.test(h.command)),
  );
  assert.ok(
    bashGate,
    'no PreToolUse hook with matcher "Bash" running trust-gate-hook.js — the pilot subagents\' removed disallowedTools entries relied on this being registered',
  );
});

test('replacement protection: isHighImpact still catches every pattern the removed disallowedTools entries named', () => {
  assert.strictEqual(isHighImpact('rm -rf /'), true, 'rm -rf must be caught');
  assert.strictEqual(
    isHighImpact('git push --force'),
    true,
    'git push --force must be caught',
  );
  assert.strictEqual(
    isHighImpact('git reset --hard HEAD~1'),
    true,
    'git reset --hard must be caught',
  );
  assert.strictEqual(
    isHighImpact('DROP DATABASE prod'),
    true,
    'DROP DATABASE must be caught',
  );
  assert.strictEqual(
    isHighImpact('sudo rm /etc/passwd'),
    true,
    'sudo must be caught (added 2026-09-26)',
  );
});

console.log(`\n${passed} passed, ${failed} failed\n`);
process.exit(failed > 0 ? 1 : 0);
