'use strict';
/**
 * Tests for bin/harness-audit.js — the GATE, not the rubric.
 *
 * WHY this file exists: harness-audit.js scored, printed, and then exited 0 no
 * matter what it found. `node bin/harness-audit.js --root <empty dir>` reported
 * 0/76 and "31 total, 31 failing" and still exited 0; the only non-zero exit was
 * main()'s own catch block. Wiring `npm run harness:audit` into CI would have
 * added a required check that could never go red.
 *
 * These tests drive the REAL process and assert on REAL exit codes, because the
 * exit code is the entire contract CI consumes. The negative controls (an empty
 * root at a threshold, a malformed threshold) MUST exit non-zero — if any of
 * them ever exits 0, the instrument is lying again.
 */
const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const AUDIT = path.join(__dirname, '..', 'bin', 'harness-audit.js');
const REPO_ROOT = path.resolve(__dirname, '..');
const { buildReport, evaluateGate, parseArgs, parseMinScore } = require('../bin/harness-audit');

// The threshold `npm run harness:gate` ships with. Measured 76/76 on this repo,
// so 70 tolerates the loss of any single check (the largest is worth 4 points)
// without tolerating a broad regression.
const GATE_MIN_SCORE = 76;

let passed = 0, failed = 0;
const tests = [];
function test(name, fn) { tests.push({ name, fn }); }

// Drive the real CLI. Streams are kept separate on purpose: the gate reports on
// stderr so that --format json leaves stdout parseable.
function audit(...args) {
  const res = spawnSync(process.execPath, [AUDIT, ...args], {
    encoding: 'utf8',
    cwd: os.tmpdir(),   // the audit must obey --root, never the caller's cwd
    timeout: 60000,
  });
  return { code: res.status, stdout: res.stdout || '', stderr: res.stderr || '' };
}

// A guaranteed-empty root: every check fails there, which makes it the natural
// negative control. Created under os.tmpdir() so the repo is never written to.
function withEmptyRoot(fn) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'mf-harness-audit-'));
  try { return fn(dir); } finally { fs.rmSync(dir, { recursive: true, force: true }); }
}

function fakeReport(overrides) {
  return Object.assign({
    scope: 'repo',
    overall_score: 40,
    max_score: 76,
    checks: [{ id: 'alpha', pass: true }, { id: 'beta', pass: false }],
  }, overrides || {});
}

// ── The defect being locked down ──────────────────────────────────────────────

test('empty root scores zero with every check failing', () => {
  withEmptyRoot(dir => {
    const r = audit('--root', dir, '--format', 'json');
    const report = JSON.parse(r.stdout);
    assert.strictEqual(report.overall_score, 0, 'an empty dir must score 0');
    assert.ok(report.max_score > 0, 'max_score must be positive');
    assert.ok(report.checks.length > 0, 'checks must be non-empty');
    assert.deepStrictEqual(report.checks.filter(c => c.pass), [], 'no check can pass in an empty dir');
  });
});

test('DEFAULT UNCHANGED: empty root with no gate flag still exits 0', () => {
  withEmptyRoot(dir => {
    assert.strictEqual(audit('--root', dir).code, 0,
      'no-flag invocation must keep its historical exit 0 (existing callers depend on it)');
  });
});

test('DEFAULT UNCHANGED: repo root with no gate flag exits 0', () => {
  assert.strictEqual(audit('--root', REPO_ROOT).code, 0);
});

// ── --min-score ───────────────────────────────────────────────────────────────

test('NEGATIVE CONTROL: empty root at --min-score exits 1', () => {
  withEmptyRoot(dir => {
    const r = audit('--root', dir, '--min-score', String(GATE_MIN_SCORE));
    assert.strictEqual(r.code, 1, 'a 0-score root MUST fail the gate');
    assert.match(r.stderr, /Gate FAIL: score 0\//);
  });
});

test('POSITIVE: this repo clears --min-score at the shipped threshold', () => {
  const report = buildReport('repo', { rootDir: REPO_ROOT });
  assert.ok(report.overall_score >= GATE_MIN_SCORE,
    `repo scores ${report.overall_score}/${report.max_score}, below the shipped gate of ${GATE_MIN_SCORE}`);
  const r = audit('--root', REPO_ROOT, '--min-score', String(GATE_MIN_SCORE));
  assert.strictEqual(r.code, 0, `harness:gate must pass on this repo; stderr: ${r.stderr}`);
});

test('--min-score=<n> long form is accepted', () => {
  assert.strictEqual(parseArgs(['node', 'a', '--min-score=70']).minScore, 70);
  assert.strictEqual(parseArgs(['node', 'a', '--min-score', '70']).minScore, 70);
});

test('NEGATIVE CONTROL: an unsatisfiable threshold exits 1 rather than passing', () => {
  // --min-score is in points and max_score is scope-dependent (agents maxes at 4),
  // so 70 there can never be met. Silently passing would be the worst outcome.
  const r = audit('--root', REPO_ROOT, '--scope', 'agents', '--min-score', '70');
  assert.strictEqual(r.code, 1);
  assert.match(r.stderr, /unsatisfiable threshold/);
});

test('NEGATIVE CONTROL: a malformed --min-score is rejected, not ignored', () => {
  for (const bad of ['abc', '-5', 'NaN', 'Infinity']) {
    const r = audit('--root', REPO_ROOT, '--min-score', bad);
    assert.strictEqual(r.code, 1, `--min-score ${bad} must be an error, not a silent no-op`);
    assert.match(r.stderr, /Invalid --min-score/);
  }
  const missing = audit('--root', REPO_ROOT, '--min-score');
  assert.strictEqual(missing.code, 1, '--min-score with no value must be an error');
  assert.match(missing.stderr, /Invalid --min-score/);
  assert.throws(() => parseMinScore(undefined), /Invalid --min-score/);
  assert.throws(() => parseMinScore(''), /Invalid --min-score/);
});

test('--min-score 0 is enforced, not treated as absent', () => {
  // 0 is falsy; a truthiness check here would silently disable the gate.
  assert.strictEqual(parseArgs(['node', 'a', '--min-score', '0']).minScore, 0);
  const gate = evaluateGate(fakeReport({ overall_score: 0 }), { minScore: 0 });
  assert.strictEqual(gate.enforced, true, 'minScore 0 must count as a requested threshold');
  assert.strictEqual(gate.ok, true, '0 >= 0, so the permissive threshold passes');
});

// ── --fail-on-findings ────────────────────────────────────────────────────────

test('NEGATIVE CONTROL: empty root with --fail-on-findings exits 1', () => {
  withEmptyRoot(dir => {
    const r = audit('--root', dir, '--fail-on-findings');
    assert.strictEqual(r.code, 1);
    assert.match(r.stderr, /--fail-on-findings: \d+ of \d+ checks failing/);
  });
});

test('POSITIVE: --fail-on-findings passes when every check passes', () => {
  const clean = fakeReport({ checks: [{ id: 'alpha', pass: true }, { id: 'beta', pass: true }] });
  const gate = evaluateGate(clean, { failOnFindings: true });
  assert.strictEqual(gate.ok, true);
  assert.strictEqual(gate.exitCode, 0);
  assert.deepStrictEqual(gate.failures, []);
});

// ── evaluateGate contract ─────────────────────────────────────────────────────

test('evaluateGate is a no-op when no threshold is requested', () => {
  const allFailing = fakeReport({ overall_score: 0, checks: [{ id: 'alpha', pass: false }] });
  const gate = evaluateGate(allFailing, {});
  assert.strictEqual(gate.enforced, false);
  assert.strictEqual(gate.ok, true);
  assert.strictEqual(gate.exitCode, 0);
  assert.strictEqual(evaluateGate(allFailing).ok, true, 'options must be optional');
});

test('evaluateGate does not mutate the report it is given', () => {
  const report = fakeReport({ overall_score: 0 });
  const snapshot = JSON.stringify(report);
  evaluateGate(report, { minScore: 70, failOnFindings: true });
  assert.strictEqual(JSON.stringify(report), snapshot, 'report must be treated as immutable');
});

test('evaluateGate reads the report score, not a parallel scoring path', () => {
  assert.strictEqual(evaluateGate(fakeReport({ overall_score: 69 }), { minScore: 70 }).ok, false);
  assert.strictEqual(evaluateGate(fakeReport({ overall_score: 70 }), { minScore: 70 }).ok, true);
  assert.strictEqual(evaluateGate(fakeReport({ overall_score: 71 }), { minScore: 70 }).ok, true);
});

// ── Contract preservation ─────────────────────────────────────────────────────

test('stdout stays pure JSON when the gate trips', () => {
  withEmptyRoot(dir => {
    const r = audit('--root', dir, '--format', 'json', '--min-score', String(GATE_MIN_SCORE));
    assert.strictEqual(r.code, 1);
    const report = JSON.parse(r.stdout);   // throws if the gate polluted stdout
    assert.strictEqual(report.overall_score, 0);
    assert.match(r.stderr, /Gate FAIL/);
  });
});

test('the JSON contract gains no keys from the gate', () => {
  const report = buildReport('repo', { rootDir: REPO_ROOT });
  assert.deepStrictEqual(Object.keys(report), [
    'scope', 'root_dir', 'deterministic', 'rubric_version', 'overall_score',
    'max_score', 'categories', 'applicable_categories', 'category_count',
    'checks', 'top_actions',
  ], 'the ECC-derived JSON contract must stay byte-stable for dashboards/CI');
});

test('the audit writes nothing into the root it audits', () => {
  withEmptyRoot(dir => {
      // Without this the test passes when the tool never runs at all — it would
      // otherwise assert an untouched directory and prove nothing.
    audit('--root', dir, '--min-score', String(GATE_MIN_SCORE));
    audit('--root', dir, '--format', 'json', '--fail-on-findings');
    assert.deepStrictEqual(fs.readdirSync(dir), [], 'the audit must stay read-only');
  });
});

test('bin/harness-audit.js uses no write or exec APIs', () => {
  const src = fs.readFileSync(AUDIT, 'utf8');
  for (const forbidden of ['writeFileSync', 'appendFileSync', 'mkdirSync', 'rmSync',
    'unlinkSync', 'createWriteStream', 'execSync', 'spawnSync', 'child_process']) {
    assert.ok(!src.includes(forbidden), `harness-audit.js must stay side-effect free (found ${forbidden})`);
  }
});

test('--help exits 0 and documents both gate flags', () => {
  const r = audit('--help');
  assert.strictEqual(r.code, 0);
  assert.match(r.stdout, /--min-score/);
  assert.match(r.stdout, /--fail-on-findings/);
});

test('npm run harness:gate is the gateable entrypoint, and its threshold matches this test', () => {
  // Without this, package.json's threshold is a second, uncross-checked copy of
  // GATE_MIN_SCORE: someone could lower the shipped gate to 0 and every test here would
  // still pass. CI-01 will consume this script, not the flags directly.
  //
  // NOTE this registration MUST sit above the runner loop below. `test()` only pushes onto
  // `tests[]` (line 33) — a call placed after the loop registers a case that is never
  // executed, and the suite still reports all-green. That is exactly how it was first
  // written here, and it silently passed both of its own negative controls.
  const pkg = JSON.parse(fs.readFileSync(path.join(REPO_ROOT, 'package.json'), 'utf8'));
  const script = pkg.scripts && pkg.scripts['harness:gate'];
  assert.ok(script, 'package.json must define a harness:gate script for CI-01 to consume');
  const m = /--min-score[= ](\d+(?:\.\d+)?)/.exec(script);
  assert.ok(m, `harness:gate must pass --min-score; got: ${script}`);
  assert.strictEqual(Number(m[1]), GATE_MIN_SCORE,
    `package.json harness:gate threshold (${m[1]}) must equal this test's GATE_MIN_SCORE (${GATE_MIN_SCORE})`);
  assert.match(script, /--fail-on-findings/,
    'harness:gate must also pass --fail-on-findings: a score threshold alone cannot detect a check being removed');
});

(async () => {
  // Guard the harness itself: if a case is registered below this loop it would never run,
  // which is how the binding test above was originally broken.
  const registeredBeforeRun = tests.length;
  for (const { name, fn } of tests) {
    try { await fn(); console.log('  ✅  ' + name); passed++; }
    catch (e) { console.error('  ❌  ' + name + '\n      ' + e.message); failed++; }
  }
  if (tests.length !== registeredBeforeRun) {
    console.error(`  ❌  ${tests.length - registeredBeforeRun} test(s) were registered after the runner loop and never executed`);
    failed++;
  }

  console.log('\nHarness Audit Gate: ' + passed + ' passed, ' + failed + ' failed');
  if (failed > 0) process.exit(1);
})();
