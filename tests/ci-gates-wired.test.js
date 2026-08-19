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
 *
 * BLIND SPOT THIS FILE ONCE HAD. It read only mindforge-ci.yml. That is why it never caught the
 * dead Tier-3 gate in control-plane.yml, and why the same defect class the file exists to
 * prevent survived inside a workflow it did not look at. It now enumerates EVERY workflow, and
 * ties a gate's predicate to the existence of a producer that can satisfy it -- because a
 * predicate no writer produces is the purest form of a check that cannot fail.
 */
'use strict';

const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

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

// EVERY workflow, so a gate defect cannot hide in a file this test does not open.
const WORKFLOW_DIR = path.join(REPO_ROOT, '.github', 'workflows');
const workflows = fs.readdirSync(WORKFLOW_DIR)
  .filter((f) => f.endsWith('.yml') || f.endsWith('.yaml'))
  .map((f) => ({ name: f, text: fs.readFileSync(path.join(WORKFLOW_DIR, f), 'utf8') }));

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

test('this test opens every workflow, not just one', () => {
  // The guard on its own blind spot. If workflows are added, they are covered automatically.
  assert.ok(workflows.length >= 2,
    `expected to enumerate the workflow directory, found ${workflows.length} file(s)`);
  const names = workflows.map((w) => w.name);
  for (const required of ['mindforge-ci.yml', 'control-plane.yml']) {
    assert.ok(names.includes(required),
      `${required} must be among the enumerated workflows (found: ${names.join(', ')})`);
  }
});

test('no workflow gates on an approval field that no producer writes, without saying so', () => {
  // F1: mindforge-ci.yml greps approvals for '"status": "pending"'. bin/governance/approve.js --
  // the ONLY writer into .planning/approvals/ -- emits no status field, so the predicate can
  // never match and the step could never block. The shell is sound (a fixture carrying the field
  // does make it exit 1); the gap is producer-side.
  //
  // This assertion is satisfied EITHER WAY, so it stays true as the design evolves:
  //   (a) a producer writes `status`  -> the gate is live, nothing to disclose; or
  //   (b) no producer does           -> the step must not claim a governance check passed.
  const producer = fs.readFileSync(path.join(REPO_ROOT, 'bin', 'governance', 'approve.js'), 'utf8');
  const writesStatus = /\bstatus\s*:/.test(producer);

  // Strip YAML comments before matching. The first run of this assertion failed on the phrase
  // inside the comment that DOCUMENTS its removal — the same substring-false-positive class this
  // file already guards against for `run:` lines. Assert on executed content, never on prose.
  const executable = (text) => text
    .split('\n')
    .filter((l) => !/^\s*#/.test(l))
    .join('\n');

  for (const wf of workflows) {
    const body = executable(wf.text);
    if (!/"status":\s*"pending"/.test(body)) continue;
    if (writesStatus) continue;  // (a) — predicate has a producer
    // (b) — the step must not assert that a check succeeded.
    assert.ok(!/Governance check passed/.test(body),
      `${wf.name} gates on '"status": "pending"' but bin/governance/approve.js writes no status ` +
      'field, so the predicate can never match. The step must not print "Governance check ' +
      'passed" — that asserts a review that did not happen. Either add a status producer or ' +
      'state the limitation in the step output.');
    assert.match(body, /no producer writes that/,
      `${wf.name} must disclose, in step OUTPUT rather than a comment, that nothing writes the ` +
      'status field it gates on — a comment is invisible in the CI log a reader actually sees');
  }
});

test('the real Tier-3 evaluator is wired and its approval check can reject', () => {
  // The step above defers to control-plane.yml. That deferral is only honest while the
  // governance-gate job actually exists and its validation can fail.
  const cp = workflows.find((w) => w.name === 'control-plane.yml');
  assert.ok(cp, 'control-plane.yml must exist — mindforge-ci.yml defers Tier-3 evaluation to it');
  assert.match(cp.text, /needs\.classify\.outputs\.tier/,
    'control-plane.yml must consume the classifier tier');
  assert.match(cp.text, /verify-approvals\.js/,
    'the Tier-3 evaluation must run bin/governance/verify-approvals.js');

  // The rejecting path lives in the SCRIPT now, not inline in YAML, so assert it there. This
  // check exists because the previous inline gate could not fail against the change being built:
  // running it in a temp dir with no git repository at all exited 0.
  const verifier = fs.readFileSync(path.join(REPO_ROOT, 'bin', 'governance', 'verify-approvals.js'), 'utf8');
  assert.match(verifier, /return 1;/,
    'verify-approvals.js must have at least one rejecting path, or the gate is decorative');
  assert.match(verifier, /verifyRecord/,
    'it must verify record integrity through the shared module rather than re-implementing it');

  // And the shared module must still perform the two currency checks that killed the perpetual
  // approval: version binding and expiry. Without both, one record approves every later release.
  const rec = fs.readFileSync(path.join(REPO_ROOT, 'bin', 'governance', 'approval-record.js'), 'utf8');
  assert.match(rec, /currentVersion/, 'records must be bound to the release being built');
  assert.match(rec, /expires_at/, 'records must expire');
});

// ── Guards that generalise, rather than pinning one instance ─────────────────

test('no workflow guards a step on hashFiles() of an ABSOLUTE path', () => {
  // hashFiles() only matches paths inside GITHUB_WORKSPACE, so `hashFiles('/tmp/x') != ''` is
  // permanently false and the guarded step never runs — while the job still reports success.
  //
  // Measured before the fix: mindforge-ai-review.yml:60 guarded "Post AI Review Comment" on
  // hashFiles('/tmp/mindforge-review.md'), and that step was `skipped` in all five most recent runs
  // of the workflow while "Run AI Review" succeeded and the check went green.
  //
  // What makes this worth a generalised rule rather than a one-line fix: mindforge-ci.yml ALREADY
  // contained the correct pattern and a comment warning against exactly this — "hashFiles only
  // matches inside GITHUB_WORKSPACE, so guarding on an absolute /tmp path would be permanently
  // false and would silently suppress a genuine review". The knowledge was one directory entry
  // away and was not applied. A rule catches the next copy; a fix does not.
  const offenders = [];
  for (const wf of workflows) {
    for (const line of wf.text.split('\n')) {
      if (/^\s*#/.test(line)) continue;               // prose about the rule is not a violation
      const m = line.match(/hashFiles\(\s*['"]([^'"]+)['"]/);
      if (m && m[1].startsWith('/')) offenders.push(`${wf.name}: ${line.trim()}`);
    }
  }
  assert.deepStrictEqual(offenders, [],
    'hashFiles() on an absolute path is permanently false, so the guarded step silently never ' +
    'runs. Guard on a step OUTPUT instead, or write the file inside the workspace:\n  ' +
    offenders.join('\n  '));
});

test('every artifact path a workflow uploads is one something actually writes', () => {
  // CODE-REVIEW.md and CROSS-REVIEW.md were listed in two workflows' upload-artifact paths.
  // NOTHING in the repository writes either name — bin/review/cross-review-engine.js contains no
  // writeFileSync at all — so mindforge-ai-review.yml's upload step reported success having
  // uploaded nothing, and the run it was measured on produced zero artifacts.
  //
  // Only workspace-relative names are checked. Absolute paths like /tmp/review-summary.md are
  // legitimate — upload-artifact accepts them, measured at 1226 bytes on a real run — and the file
  // is written by a shell redirect this scan cannot follow.
  // Evidence must be an actual WRITE, not a mention. My first version collected the workflow texts
  // wholesale as "writers", which meant a filename in an upload list counted as evidence for
  // itself — circular, and a control that re-added CODE-REVIEW.md passed. Now it looks for write
  // syntax: a shell redirect, a tee, or a writeFileSync naming the file.
  const repoFiles = new Set(
    execFileSync('git', ['ls-files'], { cwd: REPO_ROOT, encoding: 'utf8' }).split('\n').filter(Boolean));

  const searchable = [
    ...workflows.map((w) => w.text),
    ...fs.readdirSync(path.join(REPO_ROOT, 'bin', 'review'))
      .map((f) => fs.readFileSync(path.join(REPO_ROOT, 'bin', 'review', f), 'utf8')),
  ].join('\n');

  /** Is there syntax anywhere that WRITES this filename? */
  const isWritten = (name) => {
    const n = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return new RegExp(`(>>?\\s*\\S*${n}|tee\\s+\\S*${n}|writeFileSync\\(\\s*['"\`][^'"\`]*${n})`).test(searchable);
  };

  const offenders = [];
  for (const wf of workflows) {
    const lines = wf.text.split('\n');
    for (let i = 0; i < lines.length; i++) {
      if (!/uses:\s*actions\/upload-artifact/.test(lines[i])) continue;
      for (let j = i; j < Math.min(i + 20, lines.length); j++) {
        const cand = lines[j].trim();
        if (!/^[A-Za-z0-9._-]+\.(md|json|txt|log)$/.test(cand)) continue;
        if (repoFiles.has(cand)) continue;   // tracked in the repo
        if (isWritten(cand)) continue;       // demonstrably written somewhere
        offenders.push(`${wf.name}: uploads "${cand}" — nothing writes or tracks it`);
      }
    }
  }
  assert.deepStrictEqual(offenders, [],
    'an upload step that names a file nothing produces reports success having uploaded nothing:\n  ' +
    offenders.join('\n  '));
});

test('the AI review comment step keys off a step output, not a file probe', () => {
  const wf = workflows.find((w) => w.name === 'mindforge-ai-review.yml');
  assert.ok(wf, 'mindforge-ai-review.yml must exist');
  assert.match(wf.text, /if:\s*steps\.review\.outputs\.produced\s*==\s*'true'/,
    'the post step must be gated on the review step publishing produced=true');
  assert.match(wf.text, /produced=true/,
    'and the review step must actually publish that output, or the guard can never be satisfied');
});

console.log(`\nCI Gates Wired: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
