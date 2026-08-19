'use strict';
const assert = require('assert');
let passed = 0, failed = 0;
const tests = [];
function test(name, fn) { tests.push({ name, fn }); }

test('runVerification returns structured result with all stages', async () => {
  const { runVerification } = require('../bin/engine/verification-runner');
  const result = await runVerification({ cwd: process.cwd(), stages: ['tests', 'lint', 'audit'] });
  assert.ok(result.stages, 'must have stages array');
  assert.ok(result.stages.length >= 3, 'at least 3 stages');
  for (const s of result.stages) {
    assert.ok(['pass', 'fail', 'skip'].includes(s.status), `stage ${s.name} has valid status`);
    assert.ok(typeof s.durationMs === 'number');
  }
});

test('runVerification produces summary with pass/fail/skip counts', async () => {
  const { runVerification } = require('../bin/engine/verification-runner');
  const result = await runVerification({ cwd: process.cwd(), stages: ['tests'] });
  assert.ok(typeof result.summary.passed === 'number');
  assert.ok(typeof result.summary.failed === 'number');
  assert.ok(typeof result.summary.totalDurationMs === 'number');
});

test('runVerification skips unavailable stages gracefully', async () => {
  const { runVerification } = require('../bin/engine/verification-runner');
  const result = await runVerification({ cwd: process.cwd(), stages: ['tests', 'typecheck'] });
  const tc = result.stages.find(s => s.name === 'typecheck');
  assert.strictEqual(tc.status, 'skip', 'typecheck should skip when no tsconfig');
});

test('formatReport produces markdown with heading and stage info', async () => {
  const { runVerification, formatReport } = require('../bin/engine/verification-runner');
  const result = await runVerification({ cwd: process.cwd(), stages: ['tests'] });
  const md = formatReport(result);
  assert.ok(md.includes('# Verification Report'), 'must have heading');
  assert.ok(md.includes('tests'), 'must mention test stage');
});

// ── The lint stage must be achievable ────────────────────────────────────────
//
// It ran `npx eslint . --max-warnings=0` while this repo reports 199 warnings / 0 errors, so the stage
// could NEVER pass here and `mindforge verify` reported a lint failure on a tree the project itself
// considers clean. A stage that cannot pass is not a check, it is a permanent false alarm.

test('the lint stage is not stricter than the project\'s own lint script', () => {
  const fs = require('fs');
  const path = require('path');
  const { STAGE_DEFS } = require('../bin/engine/verification-runner');

  // Derived, not transcribed: the expectation comes from package.json, so a project that genuinely
  // adopts a zero-warning policy makes this assertion follow along instead of going stale.
  const pkg = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'package.json'), 'utf8'));
  const projectLint = String(pkg.scripts && pkg.scripts.lint ? pkg.scripts.lint : '');
  assert.ok(projectLint.length > 0, 'package.json must declare a lint script for this to compare against');

  const stageCommand = STAGE_DEFS && STAGE_DEFS.lint ? String(STAGE_DEFS.lint.command) : '';
  assert.ok(stageCommand.length > 0,
    'the lint stage must expose its command — if STAGE_DEFS stopped being exported this assertion '
    + 'silently checks an empty string, so it is asserted before use');

  const zeroWarnings = /--max-warnings[= ]0\b/;
  if (!zeroWarnings.test(projectLint)) {
    assert.ok(!zeroWarnings.test(stageCommand),
      `the verify stage runs "${stageCommand}" while package.json's lint is "${projectLint}". A `
      + 'repo-wide zero-warning gate that the project does not itself apply makes this stage '
      + 'permanently red — measured: 199 warnings, 0 errors.');
  }
});

test('the lint stage actually passes on this repository', async () => {
  const { runVerification } = require('../bin/engine/verification-runner');
  const result = await runVerification({ cwd: process.cwd(), stages: ['lint'] });
  const lint = result.stages.find((s) => s.name === 'lint');

  // NON-VACUITY: if the stage were skipped, 'not failed' would be trivially true. Require a verdict.
  assert.strictEqual(lint.status, 'pass',
    `the lint stage reported "${lint.status}". Either an eslint ERROR was introduced (fix the code) `
    + 'or a warning threshold came back (fix the stage). Output: '
    + String(lint.output || '').slice(-300));
});

// ── The report must not dirty a tracked file ─────────────────────────────────
//
// verify-cli.js overwrote .planning/VERIFICATION.md on every run, and that file is TRACKED — so
// running the project's own verification left the working tree dirty. Nothing reads the root report
// (tests/e2e.test.js:399 reads a per-phase fixture, not this file) and it was already printed to
// stdout, so the write is now opt-in.

test('verify-cli writes the report only with --write', async () => {
  const fs = require('fs');
  const os = require('os');
  const path = require('path');
  const { spawnSync } = require('child_process');

  const CLI = path.join(__dirname, '..', 'bin', 'engine', 'verify-cli.js');
  // A throwaway MINDFORGE_ROOT, so this test can never write into the repository it is testing —
  // which is the very failure mode under examination.
  const root = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'mf-verify-')));
  const home = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'mf-verify-home-')));
  const reportPath = path.join(root, '.planning', 'VERIFICATION.md');

  const run = (args) => spawnSync(process.execPath, [CLI, ...args], {
    encoding: 'utf8',
    env: {
      PATH: process.env.PATH,
      HOME: home,
      MINDFORGE_ROOT: root,
      // Skip the tests stage: without this the runner would recurse into the whole suite.
      MINDFORGE_VERIFICATION_ACTIVE: '1',
    },
  });

  try {
    const bare = run([]);
    assert.strictEqual(fs.existsSync(reportPath), false,
      'a bare `verify` wrote .planning/VERIFICATION.md. That file is tracked in this repo, so an '
      + 'unconditional write dirties the working tree on every run.');
    // Non-vacuity: the run must have produced a report at all, or "no file" proves nothing.
    assert.match(String(bare.stdout || ''), /Verification Report/,
      'the bare run printed no report, so this test cannot distinguish "did not write" from "did not '
      + `run". stdout: ${String(bare.stdout || '').slice(0, 200)} stderr: ${String(bare.stderr || '').slice(0, 200)}`);

    const written = run(['--write']);
    assert.strictEqual(fs.existsSync(reportPath), true,
      `--write must still produce the report. stderr: ${String(written.stderr || '').slice(0, 300)}`);
    assert.match(fs.readFileSync(reportPath, 'utf8'), /Verification Report/,
      'the written file must contain the report, not an empty or partial write');
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
    fs.rmSync(home, { recursive: true, force: true });
  }
});

(async () => {
  for (const { name, fn } of tests) {
    try { await fn(); console.log('  ✅  ' + name); passed++; }
    catch (e) { console.error('  ❌  ' + name + '\n      ' + e.message); failed++; }
  }
  console.log('\nVerification Runner: ' + passed + ' passed, ' + failed + ' failed');
  if (failed > 0) process.exit(1);
})();
