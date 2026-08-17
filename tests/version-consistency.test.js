/**
 * MindForge v11.1.0 — Version Consistency Tests
 * Asserts every declared version agrees, and that the migration writes the live config.
 * Run: node tests/version-consistency.test.js
 */
'use strict';

const fs   = require('fs');
const path = require('path');
const os   = require('os');
const assert = require('assert');
const { spawnSync } = require('child_process');
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

test('sdk/README.md VERSION comment + heading match package.json (no stale drift)', () => {
  const pkg  = readJson(path.join(ROOT, 'package.json'));
  const text = readText(path.join(ROOT, 'sdk', 'README.md'));
  // The `VERSION, // 'X.Y.Z'` export comment must not lag the canonical version.
  const verComment = text.match(/VERSION,\s*\/\/\s*'([\d.]+)'/);
  if (verComment) {
    assert.strictEqual(verComment[1], pkg.version,
      `sdk/README.md VERSION comment (${verComment[1]}) must equal package.json (${pkg.version})`);
  }
  // The "New in vX.Y.Z" heading should reference the current version, not an old one.
  const heading = text.match(/##\s*New in v([\d.]+)/);
  if (heading) {
    assert.strictEqual(heading[1], pkg.version,
      `sdk/README.md "New in v${heading[1]}" heading must equal package.json (${pkg.version})`);
  }
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
    fs.writeFileSync(path.join(tmp, 'package.json'), JSON.stringify({ version: '11.1.0' }));
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

// ── 4. Distribution channels beyond npm (VER-01) ────────────────────────────
// Three channels were left FOUR releases behind while the 12 npm-relevant locations stayed
// in sync, because nothing asserted them: the Homebrew formula and the Dockerfile both
// pinned 11.5.1 and the plugin marketplace entry 11.4.0. `docker build .` with no
// --build-arg therefore installed mindforge-mcp-server@11.5.1.

test('the marketplace mindforge entry matches package.json', () => {
  const pkg = readJson(path.join(ROOT, 'package.json'));
  const mkt = readJson(path.join(ROOT, '.claude-plugin', 'marketplace.json'));
  const entry = (mkt.plugins || []).find((p) => p.name === 'mindforge');
  assert.ok(entry, 'marketplace.json must still carry a `mindforge` plugin entry');
  assert.strictEqual(entry.version, pkg.version,
    `marketplace mindforge entry (${entry.version}) must equal package.json (${pkg.version})`);
});

test('the 10 subagent marketplace entries are NOT swept to the core version', () => {
  // The failure signature of a naive regex sweep over marketplace.json: all 11 entries land
  // on the core version, silently republishing 10 independently-versioned plugins. They
  // version on their own 1.x line, so a major of 1 is the invariant — not a pinned literal,
  // which would break on every legitimate subagent bump.
  const pkg = readJson(path.join(ROOT, 'package.json'));
  const mkt = readJson(path.join(ROOT, '.claude-plugin', 'marketplace.json'));
  const subagents = (mkt.plugins || []).filter((p) => p.name !== 'mindforge');
  assert.strictEqual(subagents.length, 10,
    `expected 10 subagent category entries, found ${subagents.length} — ` +
    'if a category was added or removed, update this count deliberately');
  for (const p of subagents) {
    assert.notStrictEqual(p.version, pkg.version,
      `${p.name} is at the core version (${p.version}) — a version sweep has corrupted it`);
    assert.strictEqual(p.version.split('.')[0], '1',
      `${p.name} must stay on its own 1.x line, got ${p.version}`);
  }
});

test('the Dockerfile ARG default matches package.json', () => {
  // The ARG DEFAULT is what `docker build .` uses with no --build-arg, so a stale default
  // ships an image with none of the release's fixes. The doc comment above it is checked too
  // because it is the value a reader copies.
  const pkg  = readJson(path.join(ROOT, 'package.json'));
  const text = readText(path.join(ROOT, 'Dockerfile'));
  const hits = [...text.matchAll(/MINDFORGE_MCP_VERSION=([\d.]+)/g)].map((m) => m[1]);
  assert.ok(hits.length >= 2,
    `expected the ARG default and its doc example, found ${hits.length} occurrence(s)`);
  for (const v of hits) {
    assert.strictEqual(v, pkg.version,
      `Dockerfile MINDFORGE_MCP_VERSION (${v}) must equal package.json (${pkg.version})`);
  }
});

test('the Homebrew formula url, digest and test assertion agree with package.json', () => {
  const pkg  = readJson(path.join(ROOT, 'package.json'));
  const text = readText(path.join(ROOT, 'Formula', 'mindforge.rb'));
  const url    = text.match(/mindforge-cc-([\d.]+)\.tgz/);
  const assertM = text.match(/assert_match "([\d.]+)"/);
  const sha    = text.match(/sha256 "([0-9a-f]+)"/);
  assert.ok(url && assertM && sha, 'formula must declare a url, a sha256 and an assert_match');
  assert.strictEqual(url[1], pkg.version,
    `formula url pins ${url[1]}, package.json is ${pkg.version}`);
  assert.strictEqual(assertM[1], pkg.version,
    `formula test asserts ${assertM[1]}, package.json is ${pkg.version}`);
  assert.strictEqual(sha[1].length, 64,
    `sha256 must be 64 hex chars, got ${sha[1].length} — a truncated digest fails brew install`);
});

test('MINDFORGE.md [REQUIRED_CORE_VERSION] is a floor, never ahead of canonical', () => {
  // Deliberately NOT swept by scripts/sync-version.js: the schema defines it as the MINIMUM
  // core version a project requires, and it has zero code readers. Lagging is truthful;
  // EXCEEDING canonical would mean the release requires a version that does not exist.
  const pkg  = readJson(path.join(ROOT, 'package.json'));
  const text = readText(path.join(ROOT, 'MINDFORGE.md'));
  const m = text.match(/\[REQUIRED_CORE_VERSION\]\s*=\s*([\d.]+)/);
  assert.ok(m, 'MINDFORGE.md must declare [REQUIRED_CORE_VERSION]');
  const num = (v) => v.split('.').map(Number);
  const [fa, fb, fc] = num(m[1]);
  const [pa, pb, pc] = num(pkg.version);
  const floor = fa * 1e6 + fb * 1e3 + fc;
  const canon = pa * 1e6 + pb * 1e3 + pc;
  assert.ok(floor <= canon,
    `[REQUIRED_CORE_VERSION] ${m[1]} exceeds package.json ${pkg.version} — ` +
    'the release would demand a core version that does not exist');
});

// ── 5. sync-version.js is the gate, and it can actually fail ─────────────────
// Making the script itself the assertion means every channel it knows about is covered
// without restating the list here, so adding a channel to the script extends this test.

test('scripts/sync-version.js --check reports the live repo clean', () => {
  const r = spawnSync(process.execPath, [path.join(ROOT, 'scripts', 'sync-version.js'), '--check'],
    { encoding: 'utf8' });
  assert.strictEqual(r.status, 0,
    `--check must exit 0 on a synced tree. Output:\n${r.stdout}${r.stderr}`);
});

test('sync-version.js --check FAILS on a drifted tree (negative control)', () => {
  // Without this the test above could pass because the script always exits 0. The script
  // resolves everything from its own __dirname/.., so a scratch copy makes a fake repo the
  // canonical root; missing channels are skipped by its exists() guards.
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'mf-syncver-'));
  try {
    fs.mkdirSync(path.join(tmp, 'scripts'), { recursive: true });
    fs.copyFileSync(path.join(ROOT, 'scripts', 'sync-version.js'),
      path.join(tmp, 'scripts', 'sync-version.js'));
    fs.writeFileSync(path.join(tmp, 'package.json'), JSON.stringify({ version: '99.0.0' }));
    fs.writeFileSync(path.join(tmp, 'Dockerfile'), 'ARG MINDFORGE_MCP_VERSION=1.2.3\n');

    const drifted = spawnSync(process.execPath,
      [path.join(tmp, 'scripts', 'sync-version.js'), '--check'], { encoding: 'utf8' });
    assert.strictEqual(drifted.status, 1,
      `--check must exit 1 on drift, got ${drifted.status}. Output:\n${drifted.stdout}${drifted.stderr}`);
    assert.match(drifted.stdout, /Dockerfile: 1\.2\.3 -> 99\.0\.0/,
      `--check must name the drifted channel and both versions. Output:\n${drifted.stdout}`);

    // And it must go clean after a write — proving the writer fixes what the checker reports.
    const fixed = spawnSync(process.execPath, [path.join(tmp, 'scripts', 'sync-version.js')],
      { encoding: 'utf8' });
    assert.strictEqual(fixed.status, 0, `write mode failed:\n${fixed.stdout}${fixed.stderr}`);
    assert.match(fs.readFileSync(path.join(tmp, 'Dockerfile'), 'utf8'),
      /MINDFORGE_MCP_VERSION=99\.0\.0/, 'write mode did not update the Dockerfile');
    const after = spawnSync(process.execPath,
      [path.join(tmp, 'scripts', 'sync-version.js'), '--check'], { encoding: 'utf8' });
    assert.strictEqual(after.status, 0,
      `--check must be clean after a write. Output:\n${after.stdout}${after.stderr}`);
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

test('sync-version.js refuses to bump the Homebrew formula without a digest', () => {
  // A formula whose sha256 does not match its url makes `brew install` fail hard, which is
  // worse than a stale-but-installable formula. The refusal must be an error, not a silent
  // skip that leaves the url bumped and the digest stale.
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'mf-syncsha-'));
  try {
    fs.mkdirSync(path.join(tmp, 'scripts'), { recursive: true });
    fs.mkdirSync(path.join(tmp, 'Formula'), { recursive: true });
    fs.copyFileSync(path.join(ROOT, 'scripts', 'sync-version.js'),
      path.join(tmp, 'scripts', 'sync-version.js'));
    fs.writeFileSync(path.join(tmp, 'package.json'), JSON.stringify({ version: '99.0.0' }));
    const stale = 'url "https://registry.npmjs.org/mindforge-cc/-/mindforge-cc-1.2.3.tgz"\n' +
                  `  sha256 "${'a'.repeat(64)}"\n  assert_match "1.2.3"\n`;
    fs.writeFileSync(path.join(tmp, 'Formula', 'mindforge.rb'), stale);

    const r = spawnSync(process.execPath, [path.join(tmp, 'scripts', 'sync-version.js')],
      { encoding: 'utf8' });
    assert.strictEqual(r.status, 1, 'must exit non-zero when it cannot complete the formula');
    assert.match(r.stderr, /REFUSING/, `must say why. stderr:\n${r.stderr}`);
    assert.strictEqual(fs.readFileSync(path.join(tmp, 'Formula', 'mindforge.rb'), 'utf8'), stale,
      'the formula must be left untouched — a bumped url with a stale digest is unusable');

    // With a digest supplied it completes.
    const ok = spawnSync(process.execPath,
      [path.join(tmp, 'scripts', 'sync-version.js'), '--sha256', 'b'.repeat(64)],
      { encoding: 'utf8' });
    assert.strictEqual(ok.status, 0, `should succeed with --sha256:\n${ok.stdout}${ok.stderr}`);
    const written = fs.readFileSync(path.join(tmp, 'Formula', 'mindforge.rb'), 'utf8');
    assert.match(written, /mindforge-cc-99\.0\.0\.tgz/, 'url not bumped');
    assert.match(written, new RegExp(`sha256 "${'b'.repeat(64)}"`), 'digest not written');
    assert.match(written, /assert_match "99\.0\.0"/, 'test assertion not bumped');
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
