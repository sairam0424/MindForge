/**
 * Guards the install-root harness gate: CI must score what a CONSUMER receives, not this checkout.
 *
 * THE DEFECT. `npm run harness:gate` runs `node bin/harness-audit.js --min-score 76
 * --fail-on-findings` with no --root, so it audits the cwd. bin/harness-audit.js:426-431 requires
 * trust-gate wired into BOTH .claude/settings.json and .agent/settings.json, with command paths that
 * resolve from the audited root. Both files are tracked in this repo and hand-maintained; NEITHER is
 * in package.json `files`, so no consumer receives either. Measured on the same tree:
 *
 *     repo checkout              76/76
 *     fresh --claude --local     36/76   Security Guardrails 1/10, 17 of 31 checks failing
 *
 * The gate was genuine, wired into CI, and green — while asking the one directory that could pass.
 * A production dry run then found 15 open critical findings behind that green pipeline, including
 * "0 of 6 harnesses register any hook". This is the detection fix: make the gate measure the shipped
 * artifact, so enforcement defects become visible and STAY visible.
 *
 * WHAT THIS FILE PINS, and why each assertion can fail:
 *   1. the script and npm alias exist, and CI runs them — un-wiring turns the gate back into theatre
 *   2. the ratchet floor still matches what a real install scores — a floor left behind while the
 *      product improves is a gate that stopped measuring, so a stale floor FAILS here
 *   3. the repo score and the install score genuinely DIFFER — if someone "fixes" the red by
 *      pointing the install gate at the repo, the numbers converge and this fails
 *   4. the header distinguishes an external root — the original printed "(repo)" for both, which is
 *      how two very different numbers hid under one label
 */
'use strict';

const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const REPO_ROOT = fs.realpathSync(path.join(__dirname, '..'));
const AUDIT = path.join(REPO_ROOT, 'bin', 'harness-audit.js');
const GATE_SCRIPT = path.join(REPO_ROOT, 'scripts', 'ci', 'harness-gate-install.js');
const { INSTALL_SCORE_FLOOR } = require(GATE_SCRIPT);

/** How far the floor may lag reality before it counts as stale. */
const MAX_FLOOR_LAG = 8;

let passed = 0;
let failed = 0;
const tests = [];
function test(name, fn) { tests.push({ name, fn }); }

/** Install into a throwaway project with HOME confined, and return {project, cleanup}. */
function freshInstall() {
  const scratch = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'mf-gateinst-')));
  const project = path.join(scratch, 'project');
  const home = path.join(scratch, 'home');
  fs.mkdirSync(project, { recursive: true });
  fs.mkdirSync(home, { recursive: true });
  fs.writeFileSync(path.join(project, 'package.json'),
    JSON.stringify({ name: 'probe', version: '1.0.0' }, null, 2));
  const r = spawnSync(process.execPath, [path.join(REPO_ROOT, 'bin', 'install.js'), '--claude', '--local'], {
    cwd: project, encoding: 'utf8',
    env: { PATH: process.env.PATH, HOME: home, CI: '1' },
  });
  assert.strictEqual(r.status, 0, `install failed: ${(r.stderr || '').slice(0, 400)}`);
  return { project, home, cleanup: () => fs.rmSync(scratch, { recursive: true, force: true }) };
}

function scoreOf(stdout) {
  const m = stdout.match(/Harness Audit \([^)]*\):\s*(\d+)\/(\d+)/);
  assert.ok(m, `could not parse a score from:\n${stdout.slice(0, 300)}`);
  return { score: Number(m[1]), max: Number(m[2]) };
}

// ── 1. the wiring exists ─────────────────────────────────────────────────────

test('the install-root gate is wired into package.json and CI', () => {
  const pkg = JSON.parse(fs.readFileSync(path.join(REPO_ROOT, 'package.json'), 'utf8'));
  assert.strictEqual(pkg.scripts['harness:gate:install'], 'node scripts/ci/harness-gate-install.js',
    'the npm alias must exist and point at the gate script');

  const ci = fs.readFileSync(path.join(REPO_ROOT, '.github', 'workflows', 'mindforge-ci.yml'), 'utf8');
  // Comments explaining the gate are expected; only a real `run:` counts as wiring.
  const runLines = ci.split('\n').filter((l) => /^\s*run:/.test(l)).join('\n');
  assert.match(runLines, /harness:gate:install/,
    'mindforge-ci.yml must RUN harness:gate:install. Without it the only harness gate is the one ' +
    'that audits this checkout, which cannot see what a consumer receives.');
  assert.match(runLines, /npm run harness:gate\b/,
    'the repo-scope gate must remain too — it measures the maintainer wiring, which is a different ' +
    'and still-useful signal');
});

// ── 2. the ratchet floor still measures something ────────────────────────────

test('the ratchet floor matches what a real install actually scores', () => {
  const { project, home, cleanup } = freshInstall();
  try {
    const r = spawnSync(process.execPath, [AUDIT, '--root', project], {
      cwd: REPO_ROOT, encoding: 'utf8', env: { PATH: process.env.PATH, HOME: home },
    });
    assert.strictEqual(r.status, 0, `audit failed: ${(r.stderr || '').slice(0, 300)}`);
    const { score, max } = scoreOf(r.stdout);

    assert.ok(score >= INSTALL_SCORE_FLOOR,
      `a real install now scores ${score}/${max}, BELOW the ratchet floor of ${INSTALL_SCORE_FLOOR}. ` +
      'Something a consumer receives got worse. Note a green `npm run harness:gate` does not ' +
      'contradict this — that one audits the repo checkout.');

    assert.ok(score - INSTALL_SCORE_FLOOR <= MAX_FLOOR_LAG,
      `a real install scores ${score}/${max} but INSTALL_SCORE_FLOOR is still ${INSTALL_SCORE_FLOOR}, ` +
      `a lag of ${score - INSTALL_SCORE_FLOOR}. The gate has stopped measuring: raise the floor in ` +
      'scripts/ci/harness-gate-install.js to lock in the improvement.');
  } finally { cleanup(); }
});

test('the floor is a real number below the achievable max, not a disabled gate', () => {
  // A floor of 0 would make the gate unfailable; a floor above max_score is unsatisfiable, which
  // harness-audit itself reports as a failure. Both are ways to neutralise this check.
  assert.ok(Number.isInteger(INSTALL_SCORE_FLOOR) && INSTALL_SCORE_FLOOR > 0,
    `INSTALL_SCORE_FLOOR must be a positive integer, got ${INSTALL_SCORE_FLOOR}`);
  const r = spawnSync(process.execPath, [AUDIT], { cwd: REPO_ROOT, encoding: 'utf8' });
  const { max } = scoreOf(r.stdout);
  assert.ok(INSTALL_SCORE_FLOOR <= max,
    `INSTALL_SCORE_FLOOR ${INSTALL_SCORE_FLOOR} exceeds max_score ${max} — unsatisfiable`);
});

// ── 3. the two roots must not converge silently ──────────────────────────────

test('the repo score and the install score are still materially different', () => {
  // This is the assertion that stops the red being "fixed" by pointing the install gate at the repo.
  // If installer-side registration lands and the numbers genuinely converge, THIS TEST SHOULD FAIL —
  // that is the milestone, and the right response is to raise the floor and rewrite this test to
  // assert the opposite.
  const { project, home, cleanup } = freshInstall();
  try {
    const repo = spawnSync(process.execPath, [AUDIT], { cwd: REPO_ROOT, encoding: 'utf8' });
    const inst = spawnSync(process.execPath, [AUDIT, '--root', project], {
      cwd: REPO_ROOT, encoding: 'utf8', env: { PATH: process.env.PATH, HOME: home },
    });
    const repoScore = scoreOf(repo.stdout).score;
    const instScore = scoreOf(inst.stdout).score;

    assert.ok(repoScore > instScore,
      `the repo (${repoScore}) must still outscore a fresh install (${instScore}). If they are equal, ` +
      'the install gate is probably auditing the repo rather than an install root.');
    assert.ok(repoScore - instScore >= 20,
      `the gap is now only ${repoScore - instScore} points (repo ${repoScore}, install ${instScore}). ` +
      'If installer-side hook registration has landed, that is GOOD — raise INSTALL_SCORE_FLOOR and ' +
      'invert this assertion. If it has not, the install audit is measuring the wrong tree.');
  } finally { cleanup(); }
});

// ── 4. the header cannot hide which tree was scored ──────────────────────────

test('an external root is labelled as such in the header', () => {
  const { project, home, cleanup } = freshInstall();
  try {
    const inst = spawnSync(process.execPath, [AUDIT, '--root', project], {
      cwd: REPO_ROOT, encoding: 'utf8', env: { PATH: process.env.PATH, HOME: home },
    });
    assert.match(inst.stdout, /Harness Audit \(repo, external root\)/,
      'auditing --root <elsewhere> must NOT print a bare "(repo)" header. Two very different scores ' +
      `under one identical label is how the enforcement gap stayed invisible. Got:\n${inst.stdout.slice(0, 200)}`);

    const repo = spawnSync(process.execPath, [AUDIT], { cwd: REPO_ROOT, encoding: 'utf8' });
    assert.match(repo.stdout, /Harness Audit \(repo\):/,
      'auditing the cwd must keep the plain "(repo)" header, or the label carries no information');
    assert.ok(!/external root/.test(repo.stdout),
      'a cwd audit must not claim an external root');
  } finally { cleanup(); }
});

// ── 5. the gate script itself behaves ────────────────────────────────────────

test('the gate script exits 0 today and leaves no scratch directory behind', () => {
  const before = fs.readdirSync(os.tmpdir()).filter((f) => f.startsWith('mf-gate-install-')).length;
  const r = spawnSync(process.execPath, [GATE_SCRIPT], { cwd: REPO_ROOT, encoding: 'utf8' });
  assert.strictEqual(r.status, 0,
    `harness:gate:install must pass at the current floor. stdout:\n${(r.stdout || '').slice(0, 500)}`);
  assert.match(r.stdout, /install root/i, 'it must say which root it scored');
  const after = fs.readdirSync(os.tmpdir()).filter((f) => f.startsWith('mf-gate-install-')).length;
  assert.strictEqual(after, before,
    `the gate leaked ${after - before} scratch dir(s) under ${os.tmpdir()} — it installs ~1800 files ` +
    'per run, so a leak compounds fast');
});

(async () => {
  for (const { name, fn } of tests) {
    try { await fn(); console.log(`  ✅  ${name}`); passed++; }
    catch (e) { console.error(`  ❌  ${name}\n      ${e.message}`); failed++; }
  }
  console.log(`\nHarness Gate (install root): ${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
})();
