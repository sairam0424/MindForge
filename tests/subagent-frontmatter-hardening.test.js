/**
 * MindForge — Subagent Frontmatter Hardening (pilot)
 * Verifies the pilot set of subagents (chosen as the broadest `tools:`
 * allowlist grants across subagents/categories/) declare an explicit
 * `disallowedTools` denylist and `isolation: worktree` in frontmatter, and
 * that the denylist never contradicts the subagent's own `tools:` grant.
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
    const colon = line.indexOf(':');
    if (colon === -1) return;
    result[line.slice(0, colon).trim()] = line.slice(colon + 1).trim();
  });
  return result;
}

console.log('\nSubagent frontmatter hardening — pilot set\n');

test('PILOT_SUBAGENTS is populated from discovery', () => {
  assert.ok(
    PILOT_SUBAGENTS.length > 0,
    'PILOT_SUBAGENTS is empty — fill in from Task 3 Step 1',
  );
});

PILOT_SUBAGENTS.forEach((rel) => {
  test(`${rel}: declares disallowedTools and isolation:worktree`, () => {
    const fm = parseFrontmatter(path.join(__dirname, '..', rel));
    assert.ok(fm.disallowedTools, `${rel}: missing disallowedTools`);
    assert.strictEqual(
      fm.isolation,
      'worktree',
      `${rel}: isolation must be worktree`,
    );
  });

  test(`${rel}: does not deny a tool its own tools: allowlist grants`, () => {
    const fm = parseFrontmatter(path.join(__dirname, '..', rel));
    const allowed = new Set(
      (fm.tools || '')
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
    );
    const denied = new Set(
      (fm.disallowedTools || '')
        .replace(/[[\]]/g, '')
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
    );
    denied.forEach((d) =>
      assert.ok(
        !allowed.has(d),
        `${rel}: disallowedTools denies "${d}" which tools: also allows — contradictory`,
      ),
    );
  });
});

console.log(`\n${passed} passed, ${failed} failed\n`);
process.exit(failed > 0 ? 1 : 0);
