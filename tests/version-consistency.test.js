/**
 * MindForge v11.0.1 — Version Consistency Tests
 * Asserts every declared version agrees, and that the migration writes the live config.
 * Run: node tests/version-consistency.test.js
 */
'use strict';

const fs   = require('fs');
const path = require('path');
const os   = require('os');
const assert = require('assert');
let passed = 0, failed = 0;

// Register tests and run them sequentially via an async runner so that test
// bodies returning promises (e.g. the async migration test) are awaited and
// their assertions are wired into pass/fail accounting. Sync bodies are fine —
// awaiting a non-promise resolves immediately.
const tests = [];
function test(name, fn) { tests.push({ name, fn }); }

const ROOT = path.resolve(__dirname, '..');

function readJson(p)  { return JSON.parse(fs.readFileSync(p, 'utf8')); }
function readText(p)  { return fs.readFileSync(p, 'utf8'); }

// ── 1. All version sources agree ────────────────────────────────────────────
test('package.json and .mindforge/config.json declare the same version', () => {
  const pkg    = readJson(path.join(ROOT, 'package.json'));
  const config = readJson(path.join(ROOT, '.mindforge', 'config.json'));
  assert.strictEqual(
    config.version, pkg.version,
    `config.json (${config.version}) must equal package.json (${pkg.version})`
  );
});

test('sdk/package.json matches root package.json version', () => {
  const pkg = readJson(path.join(ROOT, 'package.json'));
  const sdk = readJson(path.join(ROOT, 'sdk', 'package.json'));
  assert.strictEqual(sdk.version, pkg.version,
    `sdk (${sdk.version}) must equal root (${pkg.version})`);
});

test('MINDFORGE.md [VERSION] matches package.json', () => {
  const pkg  = readJson(path.join(ROOT, 'package.json'));
  const text = readText(path.join(ROOT, 'MINDFORGE.md'));
  const m = text.match(/\[VERSION\]\s*=\s*([\d.]+)/);
  assert.ok(m, 'MINDFORGE.md must contain [VERSION] = X.Y.Z');
  assert.strictEqual(m[1], pkg.version,
    `MINDFORGE.md VERSION (${m[1]}) must equal package.json (${pkg.version})`);
});

test('RELEASENOTES.md contains no stale 10.0.1 version example', () => {
  const text = readText(path.join(ROOT, 'RELEASENOTES.md'));
  assert.ok(!/Should print 10\.0\.1/.test(text),
    'RELEASENOTES.md still references the stale "Should print 10.0.1" example');
});

// ── 2. Migration writes the live config (root-cause regression) ─────────────
test('10.7.0-to-11.0.0 migration sets config.version to target in a temp project', async () => {
  const { migrate, TARGET_VERSION } = require('../bin/migrations/10.7.0-to-11.0.0');
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'mf-migr-'));
  try {
    fs.mkdirSync(path.join(tmp, '.mindforge'), { recursive: true });
    const cfgPath = path.join(tmp, '.mindforge', 'config.json');
    fs.writeFileSync(cfgPath, JSON.stringify({ version: '10.7.0' }, null, 2));
    // await the migration so the assertion runs INSIDE the awaited flow and is
    // accounted for in pass/fail; cleanup in finally runs only after it settles.
    await migrate(tmp);
    const after = readJson(cfgPath);
    assert.strictEqual(after.version, TARGET_VERSION,
      `migration must set config.version to ${TARGET_VERSION}, got ${after.version}`);
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

// ── 3. version-check module behavior ────────────────────────────────────────
test('checkVersionConsistency reports no drift on the live repo', () => {
  const { checkVersionConsistency } = require('../bin/utils/version-check');
  const { drift } = checkVersionConsistency(ROOT);
  assert.strictEqual(drift.length, 0, `unexpected drift: ${drift.join('; ')}`);
});

test('assertVersionConsistency throws on a synthetic drift fixture', () => {
  const { assertVersionConsistency } = require('../bin/utils/version-check');
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'mf-drift-'));
  try {
    fs.writeFileSync(path.join(tmp, 'package.json'), JSON.stringify({ version: '11.0.1' }));
    fs.mkdirSync(path.join(tmp, '.mindforge'), { recursive: true });
    fs.writeFileSync(path.join(tmp, '.mindforge', 'config.json'), JSON.stringify({ version: '10.7.0' }));
    assert.throws(() => assertVersionConsistency(tmp), /Version drift detected/);
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

test('assertVersionConsistency fails closed when canonical version is missing', () => {
  const { assertVersionConsistency } = require('../bin/utils/version-check');
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'mf-nocanon-'));
  try {
    // No package.json at all → canonical cannot be established
    fs.mkdirSync(path.join(tmp, '.mindforge'), { recursive: true });
    fs.writeFileSync(path.join(tmp, '.mindforge', 'config.json'), JSON.stringify({ version: '11.0.0' }));
    assert.throws(() => assertVersionConsistency(tmp), /drift|canonical|could not/i);
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

(async () => {
  for (const { name, fn } of tests) {
    try { await fn(); console.log(`  ✅  ${name}`); passed++; }
    catch (e) { console.error(`  ❌  ${name}\n      ${e.message}`); failed++; }
  }
  console.log(`\nVersion Consistency: ${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
})();
