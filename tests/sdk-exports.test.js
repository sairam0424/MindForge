/**
 * MindForge SDK — Exports Smoke Test
 * Verifies that sdk/dist/index.js resolves and exposes the expected named exports.
 * Run: node tests/sdk-exports.test.js
 */
'use strict';

const assert = require('assert');
const path   = require('path');

let passed = 0, failed = 0;

function test(name, fn) {
  try   { fn(); console.log(`  ✅ ${name}`); passed++; }
  catch (e) { console.error(`  ❌ ${name}\n     ${e.message}`); failed++; }
}

console.log('\nMindForge SDK — Exports Smoke Test\n');

// ── Resolve the dist bundle ────────────────────────────────────────────────────
const distIndex = path.resolve(__dirname, '..', 'sdk', 'dist', 'index.js');
const fs = require('fs');

// ── The name the docs tell people to install must be the name that exists ─────
//
// Deliberately placed ABOVE the dist check below: that check exits 0 when sdk/dist is absent, so
// anything after it is silently skipped in a fresh clone. This assertion needs no build — it reads
// sdk/package.json and the docs — and a fresh clone is exactly where a wrong install command matters.
//
// THE DEFECT. `@mindforge/sdk` was never published: `npm view @mindforge/sdk version` returns E404,
// while `npm view mindforge-sdk` returns 11.8.0 (created 2026-05-26). sdk/README.md:8 nonetheless
// instructed `npm install @mindforge/sdk` — a command that cannot succeed — and 17 other places
// imported from it. It was not even internally consistent: the same README used the real name in its
// "New in v11.9.2" section and the nonexistent one at the top.
//
// The expected value is DERIVED from sdk/package.json, not written here. A test that hardcoded the
// name would go stale the moment the package were renamed, and would then be asserting its own memory.
test('no doc instructs installing or importing a package name that does not exist', () => {
  const { execFileSync } = require('child_process');
  const REPO = path.resolve(__dirname, '..');
  const REAL = require(path.join(REPO, 'sdk', 'package.json')).name;
  const WRONG = '@mindforge/sdk';

  assert.notStrictEqual(REAL, WRONG,
    'sdk/package.json now declares the scoped name, so this whole assertion is inverted — rewrite it '
    + 'rather than deleting it.');

  // changelogs/ are RECORDS of past releases. The name in them was wrong when written, but nobody
  // acts on a changelog line, so correcting it would rewrite history to no one's benefit. The
  // distinction that matters is not old-versus-new, it is whether a reader ACTS on the text:
  // RELEASENOTES migration notes say "import from X", so those were corrected.
  const RECORDS_ONLY = /^changelogs\//;

  const tracked = execFileSync('git', ['ls-files', '-z', '*.md', '*.ts'], { cwd: REPO, maxBuffer: 1 << 28 })
    .toString('utf8').split('\0').filter(Boolean);

  // NON-VACUITY FLOOR, first. If git ls-files fails or the pathspec stops matching, the loop below
  // scans nothing and the deepStrictEqual passes green having read no files at all.
  assert.ok(tracked.length >= 200,
    `only ${tracked.length} tracked .md/.ts files enumerated (measured well over 200). The SCAN is `
    + 'broken, not the docs clean. Do not lower this floor to make it pass.');

  const instructional = [];
  const records = [];
  for (const rel of tracked) {
    let body;
    try { body = fs.readFileSync(path.join(REPO, rel), 'utf8'); } catch { continue; }
    if (!body.includes(WRONG)) continue;
    (RECORDS_ONLY.test(rel) ? records : instructional).push(rel);
  }

  assert.deepStrictEqual(instructional, [],
    `${instructional.length} file(s) still name "${WRONG}", which 404s on npm. The published package `
    + `is "${REAL}". Files: ${instructional.join(', ')}`);

  // BIDIRECTIONAL: if the changelogs are ever corrected too, this fails and tells you to delete the
  // allowlist. An allowlist covering an empty set is a permanent exemption nobody remembers granting.
  assert.ok(records.length > 0,
    `the ${RECORDS_ONLY} allowlist now covers nothing — the changelogs were corrected, so delete the `
    + 'allowlist and this assertion rather than leaving a dead exemption in place.');
});

// If SDK has not been built (CI fresh clone, no dist/), skip gracefully
if (!fs.existsSync(distIndex)) {
  console.log('  ⚠️  sdk/dist/index.js not found — run `cd sdk && npm run build` first');
  console.log('\nResults: 0 passed, 0 failed (skipped — SDK not built)\n');
  process.exit(0);
}

let sdk;
test('sdk/dist/index.js loads without error', () => {
  sdk = require(distIndex);
});

// ── Named exports present ──────────────────────────────────────────────────────
console.log('\nNamed exports:');

test('exports VERSION string', () => {
  assert.strictEqual(typeof sdk.VERSION, 'string', 'VERSION must be a string');
  assert.ok(sdk.VERSION.length > 0, 'VERSION must be non-empty');
});

test('exports MindForgeClient class', () => {
  assert.strictEqual(typeof sdk.MindForgeClient, 'function', 'MindForgeClient must be a constructor');
});

test('exports MindForgeEventStream class', () => {
  assert.strictEqual(typeof sdk.MindForgeEventStream, 'function', 'MindForgeEventStream must be a constructor');
});

test('exports WebSocketEventStream class', () => {
  assert.strictEqual(typeof sdk.WebSocketEventStream, 'function', 'WebSocketEventStream must be a constructor');
});

test('exports commands object', () => {
  assert.strictEqual(typeof sdk.commands, 'object', 'commands must be an object');
  assert.ok(sdk.commands !== null, 'commands must not be null');
});

test('exports batch object', () => {
  assert.ok(sdk.batch !== undefined, 'batch export must exist');
});

test('exports MindForgeMemory class', () => {
  assert.strictEqual(typeof sdk.MindForgeMemory, 'function', 'MindForgeMemory must be a constructor');
});

// ── Submodule spot-checks ──────────────────────────────────────────────────────
console.log('\nSubmodule spot-checks:');

test('sdk/dist/commands.js re-exports commands and batch', () => {
  const cmds = require(path.resolve(__dirname, '..', 'sdk', 'dist', 'commands.js'));
  assert.strictEqual(typeof cmds.commands, 'object');
  assert.ok(cmds.batch !== undefined);
});

test('sdk/dist/memory.js re-exports MindForgeMemory', () => {
  const mem = require(path.resolve(__dirname, '..', 'sdk', 'dist', 'memory.js'));
  assert.strictEqual(typeof mem.MindForgeMemory, 'function');
});

// ── Summary ────────────────────────────────────────────────────────────────────
console.log(`\n${'─'.repeat(50)}`);
console.log(`Results: ${passed} passed, ${failed} failed`);
if (failed > 0) { console.error(`\n❌ ${failed} test(s) failed.\n`); process.exit(1); }
else { console.log('\n✅ All SDK export tests passed.\n'); }
