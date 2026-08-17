/**
 * Regression guard: AutoRunner's pre-flight version check must run against MINDFORGE's own
 * install root, never the consumer's cwd.
 *
 * bin/autonomous/auto-runner.js passed process.cwd() to assertVersionConsistency(). That check
 * compares package.json against .mindforge/config.json, sdk/package.json and MINDFORGE.md —
 * all MindForge's own manifests. Pointed at a consumer project it takes THEIR application
 * version as canonical and reports MindForge's own config as drift. Measured before the fix,
 * with an app at 1.0.0 and MindForge at 11.9.2:
 *   [".mindforge/config.json declares 11.9.2 but canonical (package.json) is 1.0.0"]
 * A consumer with no package.json at all failed closed on a missing canonical instead. Only a
 * project whose app version coincidentally equalled MindForge's would have passed pre-flight.
 *
 * It has never fired in a shipped build because nothing constructs AutoRunner (no
 * `new AutoRunner` in bin/), so this guards a landmine rather than a live outage — it arms the
 * moment the runner is wired, which DEL-02 proposes doing.
 *
 * The test captures the ROOT the runner passes rather than asserting on source text, so it
 * still holds if the call is refactored.
 */
'use strict';

const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const REPO_ROOT = fs.realpathSync(path.join(__dirname, '..'));
const VERSION_CHECK = path.join(REPO_ROOT, 'bin', 'utils', 'version-check.js');

let passed = 0;
let failed = 0;
function test(name, fn) {
  try { fn(); console.log(`  ✅  ${name}`); passed++; }
  catch (e) { console.error(`  ❌  ${name}\n      ${e.message}`); failed++; }
}

/** Build a consumer-shaped project: their own app version, plus MindForge installed into it. */
function consumerProject(appVersion) {
  const d = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'mf-consumer-')));
  if (appVersion !== null) {
    fs.writeFileSync(path.join(d, 'package.json'), JSON.stringify({ name: 'their-app', version: appVersion }, null, 2));
  }
  fs.mkdirSync(path.join(d, '.mindforge'), { recursive: true });
  const mfVersion = JSON.parse(fs.readFileSync(path.join(REPO_ROOT, 'package.json'), 'utf8')).version;
  fs.writeFileSync(path.join(d, '.mindforge', 'config.json'), JSON.stringify({ version: mfVersion }, null, 2));
  return d;
}

/**
 * Run AutoRunner.runPreFlight() with cwd set to `dir`, capturing the root that
 * assertVersionConsistency is called with. Returns { root, threw }.
 *
 * The version check is stubbed on the live module object BEFORE auto-runner is required, so the
 * runner's `require('../utils/version-check')` resolves to the same cached instance. runPreFlight
 * does more after the check (reads HANDOFF.json, builds waves) and will throw there in a bare
 * temp dir — that is expected and irrelevant, so it is caught. What matters is the captured root.
 */
function captureVersionRoot(dir) {
  const vc = require(VERSION_CHECK);
  const original = vc.assertVersionConsistency;
  let captured;
  vc.assertVersionConsistency = (root) => { captured = root; };
  const cwd = process.cwd();
  try {
    process.chdir(dir);
    const AutoRunner = require(path.join(REPO_ROOT, 'bin', 'autonomous', 'auto-runner.js'));
    const runner = new AutoRunner({ phase: '1' });
    try { runner.runPreFlight(); } catch { /* later pre-flight steps need real state; irrelevant here */ }
  } finally {
    process.chdir(cwd);
    vc.assertVersionConsistency = original;
  }
  return captured;
}

test('the pre-flight check runs against MindForge root, not the consumer cwd', () => {
  const dir = consumerProject('1.0.0');
  const root = captureVersionRoot(dir);
  assert.ok(root, 'assertVersionConsistency was never called — the pre-flight gate has been removed');
  assert.strictEqual(fs.realpathSync(root), REPO_ROOT,
    `pre-flight must check MindForge's own root (${REPO_ROOT}), got ${root}. ` +
    'Passing process.cwd() makes a consumer\'s app version canonical and reports MindForge as drift.');
  assert.notStrictEqual(fs.realpathSync(root), fs.realpathSync(dir),
    'the checked root must not be the consumer project');
});

test('a consumer project that WOULD have tripped the old check is now clean', () => {
  // Direct proof of the defect: the same fixture still fails when checked as cwd, so this test
  // is not passing merely because the fixture is benign.
  const { assertVersionConsistency } = require(VERSION_CHECK);
  const dir = consumerProject('1.0.0');
  assert.throws(() => assertVersionConsistency(dir), /drift|canonical/i,
    'fixture precondition: checking the CONSUMER root must still throw, or this test proves nothing');
  assert.doesNotThrow(() => assertVersionConsistency(REPO_ROOT),
    'checking MindForge\'s own root must pass');
});

test('a consumer with no package.json also no longer fails closed', () => {
  const { assertVersionConsistency } = require(VERSION_CHECK);
  const dir = consumerProject(null);
  assert.throws(() => assertVersionConsistency(dir), /drift|canonical|could not/i,
    'fixture precondition: a rootless consumer must still throw when checked as cwd');
  const root = captureVersionRoot(dir);
  assert.strictEqual(fs.realpathSync(root), REPO_ROOT, 'must still check MindForge root');
});

test('the check is still a real gate — injected drift in a MindForge-shaped root throws', () => {
  // Guards against "fixing" this by pointing the check somewhere that can never fail.
  const { assertVersionConsistency } = require(VERSION_CHECK);
  const d = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'mf-drift-')));
  fs.writeFileSync(path.join(d, 'package.json'), JSON.stringify({ name: 'mindforge-cc', version: '11.9.2' }));
  fs.mkdirSync(path.join(d, 'sdk'), { recursive: true });
  fs.writeFileSync(path.join(d, 'sdk', 'package.json'), JSON.stringify({ name: 'mindforge-sdk', version: '11.0.0' }));
  assert.throws(() => assertVersionConsistency(d), /drift/i,
    'a MindForge-shaped root with a mismatched sdk/package.json must still be rejected');
});

console.log(`\nAuto-Runner Version Root: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
