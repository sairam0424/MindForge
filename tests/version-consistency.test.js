'use strict';

/**
 * Version Consistency Test
 *
 * Guards against version drift across every version-bearing source in the
 * repo. The canonical version is the root package.json `version`; all other
 * sources must agree on the core semver.
 *
 * Sources covered:
 *   - package.json            (canonical)
 *   - sdk/package.json
 *   - .mindforge/config.json
 *   - MINDFORGE.md            ([VERSION] = X)
 *   - sdk/src/index.ts        (export const VERSION = '...')
 *   - sdk/README.md           (VERSION comment + "New in vX" heading)
 *
 * The sdk/README.md guard (audit #49) is intentionally robust: it asserts the
 * README does NOT advertise a stale older VERSION/heading and DOES reference
 * the current core version, without pinning to exact whitespace/formatting.
 */

const fs = require('fs');
const path = require('path');
const assert = require('assert');

const {
  checkVersionConsistency,
  normalizeVersion,
} = require('../bin/utils/version-check');

const ROOT = path.join(__dirname, '..');

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`  ✅ ${name}`);
    passed += 1;
  } catch (err) {
    console.error(`  ❌ ${name}`);
    console.error(`     ${err.message}`);
    failed += 1;
  }
}

function read(relPath) {
  return fs.readFileSync(path.join(ROOT, relPath), 'utf8');
}

const CANONICAL = JSON.parse(read('package.json')).version;
const CANONICAL_CORE = normalizeVersion(CANONICAL);

console.log('\nMindForge Version Consistency Tests\n');
console.log(`Canonical version (package.json): ${CANONICAL}\n`);

// ── All sources agree (via the runtime checker) ──────────────────────────────

console.log('Source agreement:');

test('runtime checker reports all sources consistent', () => {
  const report = checkVersionConsistency(ROOT);
  const detail = report.drift
    .map((d) => `${d.name}=${d.version} (expected ${d.expected})`)
    .join(', ');
  assert.ok(report.consistent, `Version drift detected: ${detail}`);
});

test('canonical version is a valid semver core', () => {
  assert.ok(CANONICAL_CORE, `package.json version is not valid semver: ${CANONICAL}`);
});

[
  ['sdk/package.json', () => JSON.parse(read('sdk/package.json')).version],
  ['.mindforge/config.json', () => JSON.parse(read('.mindforge/config.json')).version],
].forEach(([name, getter]) => {
  test(`${name} matches canonical core`, () => {
    assert.strictEqual(normalizeVersion(getter()), CANONICAL_CORE,
      `${name} disagrees with canonical ${CANONICAL}`);
  });
});

test('MINDFORGE.md [VERSION] matches canonical core', () => {
  const m = read('MINDFORGE.md').match(/^\[VERSION\]\s*=\s*(.+)$/m);
  assert.ok(m, 'MINDFORGE.md is missing a [VERSION] line');
  assert.strictEqual(normalizeVersion(m[1]), CANONICAL_CORE,
    `MINDFORGE.md [VERSION] disagrees with canonical ${CANONICAL}`);
});

test('sdk/src/index.ts VERSION const matches canonical core', () => {
  const m = read('sdk/src/index.ts').match(/VERSION\s*=\s*['"]([^'"]+)['"]/);
  assert.ok(m, 'sdk/src/index.ts is missing a VERSION export');
  assert.strictEqual(normalizeVersion(m[1]), CANONICAL_CORE,
    `sdk/src/index.ts VERSION disagrees with canonical ${CANONICAL}`);
});

// ── SDK README guard (audit #49) ──────────────────────────────────────────────

console.log('\nSDK README VERSION guard:');

test('sdk/README.md references the current core version', () => {
  const readme = read('sdk/README.md');
  assert.ok(readme.includes(CANONICAL_CORE),
    `sdk/README.md does not reference current version ${CANONICAL_CORE}`);
});

test('sdk/README.md has no stale older VERSION comment / heading', () => {
  const readme = read('sdk/README.md');

  // The VERSION export comment, e.g. `VERSION, // '10.7.0'`.
  const commentMatch = readme.match(/VERSION\s*,?\s*\/\/\s*'([^']+)'/);
  assert.ok(commentMatch, 'sdk/README.md is missing the VERSION export comment');
  assert.strictEqual(normalizeVersion(commentMatch[1]), CANONICAL_CORE,
    `sdk/README.md VERSION comment is stale: '${commentMatch[1]}' (expected ${CANONICAL_CORE})`);

  // The "New in vX" feature heading should advertise the current core version.
  const headingMatch = readme.match(/^##\s+New in v([0-9][^\s]*)/m);
  assert.ok(headingMatch, 'sdk/README.md is missing a "New in vX" heading');
  assert.strictEqual(normalizeVersion(headingMatch[1]), CANONICAL_CORE,
    `sdk/README.md "New in v${headingMatch[1]}" heading is stale (expected ${CANONICAL_CORE})`);
});

// ── Summary ───────────────────────────────────────────────────────────────────

console.log(`\n${'─'.repeat(50)}`);
console.log(`Results: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
