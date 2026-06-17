'use strict';

/**
 * MindForge Autonomous — evaluateWavePolicy regression tests (Wave 7).
 *
 * Two bugs lived in one method (auto-runner.js evaluateWavePolicy), the 4th
 * instance of the ZTAI-singleton misuse class fixed across eis-client/rbac:
 *
 *   1. `new ztai()` / `manager.getIdentity()` — ztai-manager is a SINGLETON with
 *      no getIdentity(), so the method THREW on every call. Since the wave loop
 *      (run()) calls it without a local try/catch, the whole autonomous run
 *      crashed — the engine was dead on arrival.
 *   2. `this.policyEngine.evaluate(intent)` was called WITHOUT await, but evaluate
 *      is async. So `result` was a Promise, `result.verdict === 'DENY'` was always
 *      false, and the policy gate NEVER denied — fail-open governance theater.
 *
 * Fix: register a cached runner DID (real registerAgent API), fail CLOSED if
 * identity can't be established, and AWAIT the async policy evaluation.
 *
 * These tests run in a temp cwd so the real .planning is never touched.
 */

const assert = require('node:assert');
const { test } = require('node:test');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const AutoRunner = require(path.join(ROOT, 'bin', 'autonomous', 'auto-runner'));

// Build a runner whose cwd is an isolated temp dir with an empty .planning.
function mkRunner(opts = {}) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'mf-ar-'));
  fs.mkdirSync(path.join(dir, '.planning'), { recursive: true });
  const prevCwd = process.cwd();
  process.chdir(dir);
  const runner = new AutoRunner({ phase: '1', sessionId: 'test-sess', ...opts });
  return { runner, dir, restore: () => { process.chdir(prevCwd); fs.rmSync(dir, { recursive: true, force: true }); } };
}

test('evaluateWavePolicy no longer throws and returns a boolean', async () => {
  const { runner, restore } = mkRunner();
  try {
    const permit = await runner.evaluateWavePolicy();
    assert.strictEqual(typeof permit, 'boolean', 'must return a boolean, not throw or return a Promise-ish');
  } finally { restore(); }
});

test('evaluateWavePolicy establishes and caches one stable runner DID', async () => {
  const { runner, restore } = mkRunner();
  try {
    await runner.evaluateWavePolicy();
    assert.ok(runner._runnerIdentity && runner._runnerIdentity.did, 'a runner DID must be registered');
    const first = runner._runnerIdentity.did;
    await runner.evaluateWavePolicy();
    assert.strictEqual(runner._runnerIdentity.did, first, 'the runner identity must be cached, not re-minted');
  } finally { restore(); }
});

test('evaluateWavePolicy AWAITS the async verdict — a DENY actually denies (no fail-open)', async () => {
  const { runner, restore } = mkRunner();
  try {
    // Replace the lazy policyEngine with a stub whose async evaluate DENIES.
    // If evaluate were not awaited, `result` would be a Promise and the DENY
    // check would silently pass (return true) — this asserts it returns false.
    runner._policyEngine = { async evaluate() { return { verdict: 'DENY', reason: 'stub deny' }; } };
    const permit = await runner.evaluateWavePolicy();
    assert.strictEqual(permit, false, 'an async DENY must be honored (proves evaluate is awaited)');
  } finally { restore(); }
});

test('evaluateWavePolicy honors an async PERMIT', async () => {
  const { runner, restore } = mkRunner();
  try {
    runner._policyEngine = { async evaluate() { return { verdict: 'PERMIT', reason: 'stub permit' }; } };
    const permit = await runner.evaluateWavePolicy();
    assert.strictEqual(permit, true);
  } finally { restore(); }
});

test('evaluateWavePolicy fails CLOSED when runner identity cannot be established', async () => {
  const { runner, restore } = mkRunner();
  try {
    // Force identity resolution to fail; the gate must DENY, not proceed ungoverned.
    runner._getRunnerIdentity = async () => { throw new Error('ztai unavailable'); };
    const permit = await runner.evaluateWavePolicy();
    assert.strictEqual(permit, false, 'no identity -> fail closed (deny the wave)');
  } finally { restore(); }
});

console.log('auto-runner evaluateWavePolicy tests defined');
