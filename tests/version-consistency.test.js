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

function test(name, fn) {
  try { fn(); console.log(`  ✅  ${name}`); passed++; }
  catch (e) { console.error(`  ❌  ${name}\n      ${e.message}`); failed++; }
}

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
test('10.7.0-to-11.0.0 migration sets config.version to target in a temp project', () => {
  const { migrate, TARGET_VERSION } = require('../bin/migrations/10.7.0-to-11.0.0');
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'mf-migr-'));
  try {
    fs.mkdirSync(path.join(tmp, '.mindforge'), { recursive: true });
    const cfgPath = path.join(tmp, '.mindforge', 'config.json');
    fs.writeFileSync(cfgPath, JSON.stringify({ version: '10.7.0' }, null, 2));

    return migrate(tmp).then(() => {
      const after = readJson(cfgPath);
      assert.strictEqual(after.version, TARGET_VERSION,
        `migration must set config.version to ${TARGET_VERSION}, got ${after.version}`);
    });
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

console.log(`\nVersion Consistency: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
