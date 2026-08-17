/**
 * CI-01 guard: the repo's own quality gates must actually be invoked by CI.
 *
 * Before CI-01, ZERO of the 11 workflows invoked any of harness:audit,
 * harness:compliance, release:ready, verify-audit or eval:retrieval — while CLAUDE.md:96
 * stated that `--check` mode "will fail CI". A gate nothing runs is indistinguishable
 * from a gate that does not exist, and that is the defect class this whole branch closes.
 *
 * This file asserts the wiring itself, so the gates cannot be quietly unwired later. It
 * deliberately does NOT run them (the suite already takes ~30s; CI runs them directly).
 *
 * It also pins the two gates that must stay OUT, with the measured reason, so a future
 * contributor does not "complete" CI-01 by adding a step that reds every run.
 */
'use strict';

const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const REPO_ROOT = path.join(__dirname, '..');
const CI = path.join(REPO_ROOT, '.github', 'workflows', 'mindforge-ci.yml');

let passed = 0;
let failed = 0;
function test(name, fn) {
  try { fn(); console.log(`  ✅  ${name}`); passed++; }
  catch (e) { console.error(`  ❌  ${name}\n      ${e.message}`); failed++; }
}

const ci = fs.readFileSync(CI, 'utf8');
const pkg = JSON.parse(fs.readFileSync(path.join(REPO_ROOT, 'package.json'), 'utf8'));

// Every `run:` line in the CI workflow, so assertions are about EXECUTED commands rather
// than about any mention in a comment. Comment-matching is how this kind of check gives a
// false pass: the "not wired" reasons below are themselves written in comments.
const runLines = ci
  .split('\n')
  .map((l) => l.trim())
  .filter((l) => l.startsWith('run:') || l.startsWith('- run:') || /^npm |^node /.test(l));
const runText = runLines.join('\n');

// The gates CI must invoke. Adding one here without wiring it fails; unwiring one fails too.
const WIRED = ['harness:gate', 'harness:compliance', 'release:ready', 'version:check'];

test('every wired gate is invoked by a run: line, not just mentioned in a comment', () => {
  for (const cmd of WIRED.map((s) => `npm run ${s}`)) {
    assert.ok(runText.includes(cmd),
      `mindforge-ci.yml must invoke "${cmd}" from a run: line (found only in prose, or not at all)`);
  }
});

test('harness:compliance is invoked in --check mode, which is what makes it a gate', () => {
  const line = runLines.find((l) => l.includes('harness:compliance'));
  assert.ok(line, 'no run: line invokes harness:compliance');
  assert.match(line, /--check/,
    `harness:compliance without --check only prints a scorecard; CLAUDE.md:96 promises it fails CI. Got: ${line}`);
});

test('every wired gate exists as an npm script', () => {
  for (const s of WIRED) {
    assert.ok(pkg.scripts && pkg.scripts[s], `package.json must define the "${s}" script that CI invokes`);
  }
});

test('harness:gate is a GATE — it passes a threshold, so it can fail', () => {
  // GATE-A's whole point: `harness:audit` scored 0/76 with 31/31 checks failing and exited 0.
  // Wiring the ungated form would add a permanently-green required check.
  const script = pkg.scripts['harness:gate'];
  assert.match(script, /--min-score\s*\d+/, `harness:gate must pass --min-score; got: ${script}`);
  assert.match(script, /--fail-on-findings/,
    `harness:gate must pass --fail-on-findings; a score threshold alone cannot detect a check being removed. Got: ${script}`);
});

test('the ungated harness:audit is NOT what CI runs', () => {
  const bare = runLines.filter((l) => /npm run harness:audit(\s|$)/.test(l));
  assert.deepStrictEqual(bare, [],
    'CI must invoke harness:gate, not the ungated harness:audit, which exits 0 even at 0/76');
});

test('verify-audit stays OUT: .planning/AUDIT.jsonl is gitignored, so it reds every run', () => {
  // Measured: with the file absent, bin/verify-audit.js exits 1 —
  // "audit chain BROKEN at entry 0: unreadable: ENOENT". Its algorithm is already covered
  // by tests/audit-integrity.test.js, which the suite runs.
  assert.ok(!runText.includes('verify-audit'),
    'mindforge-ci.yml must not invoke bin/verify-audit.js: .planning/AUDIT.jsonl is gitignored, ' +
    'so a fresh checkout has no chain to verify and the step fails on every run');
  const gitignore = fs.readFileSync(path.join(REPO_ROOT, '.gitignore'), 'utf8');
  assert.match(gitignore, /AUDIT\.jsonl/,
    'this exclusion is only justified while .planning/AUDIT.jsonl is gitignored — if that changed, wire the gate');
});

test('eval:retrieval stays OUT of CI because a suite already asserts its floor', () => {
  assert.ok(!runText.includes('eval:retrieval'),
    'eval:retrieval duplicates tests/retrieval-fts.test.js and doubles the slowest suite');
  const fts = fs.readFileSync(path.join(REPO_ROOT, 'tests', 'retrieval-fts.test.js'), 'utf8');
  assert.match(fts, /runGoldenSetEval/,
    'the exclusion above is only justified while tests/retrieval-fts.test.js runs the golden-set eval');
});

test('version:check is invoked in --check mode, so it reports drift instead of rewriting CI', () => {
  // The same script writes when given no flag. A CI step that WROTE would make the tree
  // dirty and mask the drift it exists to surface, so --check is what makes it a gate.
  const line = runLines.find((l) => l.includes('version:check'));
  assert.ok(line, 'no run: line invokes version:check');
  assert.match(pkg.scripts['version:check'], /--check/,
    `version:check must pass --check; without it the script WRITES. Got: ${pkg.scripts['version:check']}`);
});

test('version:check covers the non-npm channels the runtime version check does not', () => {
  // bin/utils/version-check.js is deliberately npm-focused so a stale Homebrew formula
  // cannot block a wave at pre-flight. That split is only safe while something else covers
  // the distribution channels — this gate. Both halves must exist.
  const sync = fs.readFileSync(path.join(REPO_ROOT, 'scripts', 'sync-version.js'), 'utf8');
  for (const channel of ['Formula/mindforge.rb', 'Dockerfile', '.claude-plugin/marketplace.json']) {
    assert.ok(sync.includes(channel),
      `scripts/sync-version.js must cover ${channel} — it sat four releases behind unasserted`);
  }
  const runtime = fs.readFileSync(path.join(REPO_ROOT, 'bin', 'utils', 'version-check.js'), 'utf8');
  assert.ok(!runtime.includes('Formula/'),
    'the runtime check must stay npm-focused: a stale Homebrew formula must not block pre-flight');
});

console.log(`\nCI Gates Wired: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
