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

// ── A real bump must move EVERY channel the gates check ───────────────────────
//
// WHY A ROUND TRIP AND NOT A --check. `sync-version.js --check` on a clean tree is green whether or
// not a channel is wired, so it cannot detect a MISSING channel — only a stale one. Both channel gaps
// found in this area were invisible to it: AGENTS.md (asserted by doc-count-claims, written by
// nothing) and mcp-server/server.json (asserted by mcp-server-version.test.js:139, written by
// nothing, and per that test's own header "froze at 11.5.1 in both places while package.json moved on
// four minor versions").
//
// Deleting either channel from the script left version-consistency at 19/19 and doc-count-claims at
// 19/19. So this test performs an ACTUAL bump in a throwaway copy and asserts the files moved. It is
// the only shape that can fail when a channel is absent rather than merely stale.

test('a real version bump moves every gated channel, not just the ones --check sees', () => {
  const tmp = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'mf-bumproundtrip-')));
  try {
    // The script resolves its repo as path.resolve(__dirname, '..') and ignores cwd, so the fixture
    // must contain a COPY of it — passing `cwd` alone makes it happily rewrite the real repo instead.
    fs.mkdirSync(path.join(tmp, 'scripts'), { recursive: true });
    fs.mkdirSync(path.join(tmp, 'mcp-server'), { recursive: true });
    fs.copyFileSync(path.join(ROOT, 'scripts', 'sync-version.js'),
      path.join(tmp, 'scripts', 'sync-version.js'));

    const BUMP = '99.0.0';
    fs.writeFileSync(path.join(tmp, 'package.json'),
      JSON.stringify({ name: 'mindforge-cc', version: BUMP }, null, 2) + '\n');

    // Only the channels under test, each seeded STALE. A partial fixture is deliberate: it keeps the
    // assertion about these two files rather than about the whole 15-channel surface.
    fs.copyFileSync(path.join(ROOT, 'mcp-server', 'package.json'),
      path.join(tmp, 'mcp-server', 'package.json'));
    const mcpPkgPath = path.join(tmp, 'mcp-server', 'package.json');
    const mcpPkg = JSON.parse(fs.readFileSync(mcpPkgPath, 'utf8'));
    mcpPkg.version = '1.0.0';
    fs.writeFileSync(mcpPkgPath, JSON.stringify(mcpPkg, null, 2) + '\n');
    fs.copyFileSync(path.join(ROOT, 'mcp-server', 'server.json'),
      path.join(tmp, 'mcp-server', 'server.json'));
    fs.writeFileSync(path.join(tmp, 'AGENTS.md'),
      'MindForge v1.0.0 is an agentic intelligence framework distributed as the `mindforge-cc` npm package.\n');

    const r = spawnSync(process.execPath, [path.join(tmp, 'scripts', 'sync-version.js')],
      { cwd: tmp, encoding: 'utf8', env: { PATH: process.env.PATH, HOME: tmp } });

    const agents = fs.readFileSync(path.join(tmp, 'AGENTS.md'), 'utf8');
    assert.match(agents, new RegExp(`MindForge v${BUMP.replace(/\./g, '\\.')} is an agentic`),
      'AGENTS.md was not bumped. doc-count-claims.test.js asserts this exact sentence against '
      + 'package.json, so a missing channel makes every version bump fail npm test — and '
      + `mindforge-release.yml runs npm test.\n${r.stdout}${r.stderr}`);

    const server = JSON.parse(fs.readFileSync(path.join(tmp, 'mcp-server', 'server.json'), 'utf8'));
    assert.strictEqual(server.version, BUMP,
      `server.json .version was not bumped (got ${server.version})`);
    const entry = (server.packages || []).find((x) => x.identifier === mcpPkg.name);
    assert.ok(entry, `server.json must still carry a package entry for ${mcpPkg.name}`);
    assert.strictEqual(entry.version, BUMP,
      `server.json packages[].version was not bumped (got ${entry.version}). It carries the version `
      + 'TWICE and mcp-server-version.test.js asserts both.');
  } finally { fs.rmSync(tmp, { recursive: true, force: true }); }
});

test('the Homebrew formula is internally consistent, and never AHEAD of canonical', () => {
  // WAS strict equality with package.json, which asserted something impossible. The formula's
  // sha256 is the digest of the published tarball, so it cannot be correct until AFTER the release
  // — yet .github/workflows/mindforge-release.yml runs `npm test`, so this assertion blocked the
  // publish that would have made it satisfiable. Measured on an 11.9.2 -> 11.9.3 rehearsal: five
  // test files red, of which this was the root.
  //
  // Same rule as [REQUIRED_CORE_VERSION] directly below, and for the same reason: an artifact that
  // cannot be derived offline may LAG canonical and must never EXCEED it. Leading means naming a
  // version the registry does not serve, which makes `brew install` fail hard.
  //
  // What is still strict: the formula's three version tokens must agree with EACH OTHER. A url at
  // one version and an assert_match at another is incoherent at any point in a release, not a
  // transient state.
  const pkg  = readJson(path.join(ROOT, 'package.json'));
  const text = readText(path.join(ROOT, 'Formula', 'mindforge.rb'));
  const url    = text.match(/mindforge-cc-([\d.]+)\.tgz/);
  const assertM = text.match(/assert_match "([\d.]+)"/);
  const sha    = text.match(/sha256 "([0-9a-f]+)"/);
  assert.ok(url && assertM && sha, 'formula must declare a url, a sha256 and an assert_match');

  assert.strictEqual(assertM[1], url[1],
    `formula url pins ${url[1]} but its assert_match says ${assertM[1]} — the formula contradicts `
    + 'itself, which no stage of a release makes correct');
  assert.strictEqual(sha[1].length, 64,
    `sha256 must be 64 hex chars, got ${sha[1].length} — a truncated digest fails brew install`);

  // Numeric per component, matching the [REQUIRED_CORE_VERSION] check below. A lexicographic
  // compare would read 11.10.0 as BEHIND 11.9.2 and wave through a leading formula on the first
  // bump past a .9 minor.
  const num = (v) => v.split('.').map(Number);
  const [fa, fb, fc] = num(url[1]);
  const [pa, pb, pc] = num(pkg.version);
  assert.ok(fa * 1e6 + fb * 1e3 + fc <= pa * 1e6 + pb * 1e3 + pc,
    `Formula/mindforge.rb pins ${url[1]}, which is AHEAD of package.json ${pkg.version}. The `
    + 'registry does not serve that tarball, so `brew install` would fail hard. Lagging is the '
    + 'legitimate pre-publish state; leading never is.');
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

test('sync-version.js leaves the Homebrew formula ALONE without a digest, and says so', () => {
  // A formula whose sha256 does not match its url makes `brew install` fail hard, which is worse
  // than a stale-but-installable formula. So the file must be left BYTE-IDENTICAL and the operator
  // told — never a silent skip that bumps the url and strands the digest. That is unchanged and is
  // still the load-bearing assertion here.
  //
  // WHAT CHANGED IS THE EXIT CODE, from 1 to 0. A lagging formula is the correct pre-publish state
  // (its digest cannot exist yet), and exiting non-zero on it meant `npm test` — which
  // mindforge-release.yml runs — blocked the publish that would have made the formula satisfiable.
  // Leading canonical is still exit 1, asserted in the next test. Deferring is reported, not hidden:
  // stdout carries a DEFERRED section naming the channel and the follow-up command.
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
    assert.strictEqual(r.status, 0,
      'a formula BEHIND canonical is the legitimate pre-publish state and must not fail the run — '
      + `mindforge-release.yml runs npm test, so exiting 1 here blocked the publish. stderr:\n${r.stderr}`);
    assert.match(r.stderr, /DEFERRING/, `must say why it left the formula alone. stderr:\n${r.stderr}`);
    assert.match(`${r.stdout}`, /DEFERRED/,
      `the report must list the deferred channel, or "exit 0" hides it. stdout:\n${r.stdout}`);
    assert.match(`${r.stdout}${r.stderr}`, /--fetch-sha/,
      'it must name the follow-up command, or the operator is told to wait with no instruction');
    assert.strictEqual(fs.readFileSync(path.join(tmp, 'Formula', 'mindforge.rb'), 'utf8'), stale,
      'the formula must be left BYTE-IDENTICAL — a bumped url with a stale digest is unusable, and '
      + 'this is the assertion that did not change');

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

// ── The Homebrew digest must be a real tarball digest ─────────────────────────
//
// THE DEFECT. scripts/sync-version.js --fetch-sha downloaded the tarball with `curl -sL` — no -f —
// and hashed whatever came back. npm answers an unpublished version with HTTP 404 and a 21-byte
// body `{"error":"Not found"}`, and curl exits 0. So bumping to a version that is not yet on npm
// wrote sha256 of that error text into Formula/mindforge.rb.
//
// It was worse than a refusal because it turned the GATE GREEN. Measured end to end on an 11.9.3
// bump: `sync-version.js` exits 1 (formula SKIPPED), `--check` exits 1 — then `--fetch-sha` writes
// the 404 digest and `--check` exits 0. `npm run version:check` is a CI gate
// (.github/workflows/mindforge-ci.yml:262), so CI would pass on a formula whose digest can never
// match its url, which is exactly the "makes `brew install` fail hard" outcome the REFUSING branch
// fifteen lines above it was written to prevent.
//
// The digest of the 404 body is a CONSTANT — the same for every unpublished version — which makes
// it an exact, offline, zero-cost canary for this bug specifically.

const KNOWN_NON_ARTIFACT_DIGESTS = {
  // sha256 of npm's 21-byte `{"error":"Not found"}`, i.e. what --fetch-sha wrote for any
  // unpublished version. Verified against the live registry.
  c8d3eae160a892e32837db3dcae515e843e5383fef52b8141940c8bcf8b6d59f:
    'npm\'s 404 body `{"error":"Not found"}` — the version was not published when the digest was taken',
  // sha256 of the empty string, i.e. an empty or fully-failed download.
  e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855:
    'an empty response body — the download produced no bytes',
};

test('the Homebrew formula digest is not the hash of an error body', () => {
  const rel = path.join(ROOT, 'Formula', 'mindforge.rb');
  if (!fs.existsSync(rel)) return;            // formula is optional; nothing to assert
  const src = fs.readFileSync(rel, 'utf8');
  const m = src.match(/sha256 "([0-9a-f]{64})"/);
  assert.ok(m, 'Formula/mindforge.rb must declare a 64-hex sha256; the pattern no longer matches, '
    + 'so this check would silently cover nothing.');
  const digest = m[1];
  const why = KNOWN_NON_ARTIFACT_DIGESTS[digest];
  assert.ok(!why,
    `Formula/mindforge.rb's sha256 is ${digest}, which is ${why}. \`brew install\` cannot ever `
    + 'match this against the real tarball. Run --fetch-sha only AFTER the version is published: '
    + 'a tarball digest cannot exist before the tarball does.');
});

test('--fetch-sha REFUSES an unpublished version rather than hashing the error body', async () => {
  // Behavioural, not a source grep. Network-conditional: the registry is the subject, so when it is
  // unreachable this prints why it was skipped instead of passing vacuously — a silent pass here
  // would be the same defect class the test exists to catch.
  let reachable = false;
  try {
    const r = await fetch('https://registry.npmjs.org/mindforge-cc/-/mindforge-cc-99.99.99.tgz');
    reachable = r.status === 404;             // a 404 is the exact condition under test
  } catch { /* offline */ }
  if (!reachable) {
    console.log('      ↳ skipped: npm registry unreachable, and this asserts registry behaviour');
    return;
  }

  const work = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'mf-fetchsha-')));
  try {
    // The script resolves its repo as path.resolve(__dirname, '..') and ignores cwd — correct for a
    // repo-maintenance tool, but it means a fixture must contain a COPY of the script so that
    // __dirname/.. lands inside the fixture. A first attempt passed `cwd: work` and watched it
    // cheerfully report "every derivable channel is at 11.9.2" from the real repo.
    fs.mkdirSync(path.join(work, 'scripts'));
    fs.copyFileSync(path.join(ROOT, 'scripts', 'sync-version.js'),
      path.join(work, 'scripts', 'sync-version.js'));
    fs.writeFileSync(path.join(work, 'package.json'),
      JSON.stringify({ name: 'mindforge-cc', version: '99.99.99' }, null, 2));
    fs.mkdirSync(path.join(work, 'Formula'));
    fs.writeFileSync(path.join(work, 'Formula', 'mindforge.rb'),
      'class Mindforge < Formula\n'
      + '  url "https://registry.npmjs.org/mindforge-cc/-/mindforge-cc-11.9.2.tgz"\n'
      + '  sha256 "114b512cf943ee450c79e8e2b7e71725fe79946b615e9270f56f7917804f8f1e"\n'
      + '  assert_match "11.9.2"\n'
      + 'end\n');

    const r = spawnSync(process.execPath,
      [path.join(work, 'scripts', 'sync-version.js'), '--fetch-sha'],
      { cwd: work, encoding: 'utf8', env: { PATH: process.env.PATH, HOME: work } });

    const after = fs.readFileSync(path.join(work, 'Formula', 'mindforge.rb'), 'utf8');
    for (const bad of Object.keys(KNOWN_NON_ARTIFACT_DIGESTS)) {
      assert.ok(!after.includes(bad),
        `--fetch-sha wrote ${bad} into the formula for an unpublished version. That is the digest `
        + `of ${KNOWN_NON_ARTIFACT_DIGESTS[bad]}.\n${(r.stderr || '').slice(-400)}`);
    }
    assert.ok(after.includes('114b512cf943ee450c79e8e2b7e71725fe79946b615e9270f56f7917804f8f1e'),
      `the formula's original digest was overwritten for a version that does not exist:\n${after}`);
    assert.notStrictEqual(r.status, 0,
      'refusing to write the digest must be reported as a failure, not exit 0 — a caller scripting '
      + `this needs to know the formula was left behind.\n${(r.stdout || '').slice(-300)}`);
    assert.match(`${r.stdout || ''}${r.stderr || ''}`, /REFUSING/,
      'the refusal must say so out loud');
  } finally {
    fs.rmSync(work, { recursive: true, force: true });
  }
});

// ── the two plugin artifacts a BUILD writes, which sync-version.js can only report ────────────
//
// THE DEFECT. `grep -n plugins/ scripts/sync-version.js` returned nothing, while
// tests/plugin-packaging.test.js asserts plugins/mindforge/.claude-plugin/plugin.json against
// package.json and tests/mcp-server-version.test.js spawns plugins/mindforge/mcp/dist/index.js and
// reads serverInfo.version back. Two gates demanding a value nothing wrote — the AGENTS.md and
// mcp-server/server.json shape again, but this one ANNOUNCED SUCCESS. Measured on an 11.9.2 -> 11.9.3
// bump of the merged release queue:
//
//   node scripts/sync-version.js          exit 0   "wrote 15 file(s)"
//   node scripts/sync-version.js --check  exit 0   "every channel that CAN be derived offline is at 11.9.3"
//   npm test                              exit 1   128 passed / 3 FAILED
//   npm run release:ready                 exit 1   12/14  (14/14 at 11.9.2)
//
// So a contributor following CLAUDE.md's "never bump by hand, run scripts/sync-version.js" got a green
// tool and a red suite, with nothing naming the cause.
//
// WHY A FIXTURE ROUND TRIP AND NOT AN ASSERTION ABOUT THE LIVE TREE. On a synced tree both artifacts
// already equal package.json, so nothing distinguishes a working detector from a deleted one — the same
// reason the bump round trip above exists. These seed them STALE and read the report.
//
// The pair is deliberate. The first test alone would pass against a script that printed the section
// unconditionally; the second pins that a fresh tree stays silent and exits 0.

function buildArtifactFixture(artifactVersion) {
  const tmp = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'mf-buildchan-')));
  // The script resolves its repo as path.resolve(__dirname, '..') and ignores cwd, so the fixture must
  // hold a COPY of it — passing cwd alone makes it rewrite the real repo instead.
  fs.mkdirSync(path.join(tmp, 'scripts'), { recursive: true });
  fs.mkdirSync(path.join(tmp, 'plugins', 'mindforge', '.claude-plugin'), { recursive: true });
  fs.mkdirSync(path.join(tmp, 'plugins', 'mindforge', 'mcp', 'dist'), { recursive: true });
  fs.copyFileSync(path.join(ROOT, 'scripts', 'sync-version.js'),
    path.join(tmp, 'scripts', 'sync-version.js'));
  fs.writeFileSync(path.join(tmp, 'package.json'),
    JSON.stringify({ name: 'mindforge-cc', version: '99.0.0' }, null, 2) + '\n');
  fs.writeFileSync(path.join(tmp, 'plugins', 'mindforge', '.claude-plugin', 'plugin.json'),
    JSON.stringify({ name: 'mindforge', version: artifactVersion }, null, 2) + '\n');
  // Stands in for the 769KB esbuild bundle. The version reaches it as a JSON-quoted literal because
  // mcp-server/src/index.ts imports it from package.json, so the quoted form is what must be matched —
  // the real bundle also contains 3.0.0, 1.0.12 and `127.0.0` (from 127.0.0.1), which is why a bare
  // semver scan cannot be used. Those decoys are reproduced here so a regression to a loose pattern
  // fails this test rather than passing it by luck.
  fs.writeFileSync(path.join(tmp, 'plugins', 'mindforge', 'mcp', 'dist', 'index.js'),
    'const dep="3.0.0",other="1.0.12",host="127.0.0.1";\n'
    + 'const server={name:"mindforge",version:"' + artifactVersion + '"};\n');
  return tmp;
}

const CHAIN = [
  'npm --prefix mcp-server install',
  'npm --prefix mcp-server run build',
  'node scripts/build-mindforge-plugin.js',
];

test('sync-version.js reports the plugin build artifacts it cannot write, and refuses to exit 0', () => {
  const tmp = buildArtifactFixture('1.2.3');
  try {
    const pluginRel = path.join('plugins', 'mindforge', '.claude-plugin', 'plugin.json');
    const bundleRel = path.join('plugins', 'mindforge', 'mcp', 'dist', 'index.js');
    const beforePlugin = fs.readFileSync(path.join(tmp, pluginRel), 'utf8');
    const beforeBundle = fs.readFileSync(path.join(tmp, bundleRel), 'utf8');

    const r = spawnSync(process.execPath, [path.join(tmp, 'scripts', 'sync-version.js')],
      { cwd: tmp, encoding: 'utf8', env: { PATH: process.env.PATH, HOME: tmp, TMPDIR: tmp } });
    const out = `${r.stdout || ''}${r.stderr || ''}`;

    assert.match(out, /REQUIRE A BUILD/,
      'a stale plugin.json and mcp bundle must be reported as their own category. Collapsing them into '
      + `the derivable channels is how a bump reported success over a red npm test.\n${out}`);
    assert.match(out, /plugins\/mindforge\/\.claude-plugin\/plugin\.json: 1\.2\.3 -> 99\.0\.0/,
      `the report must name plugin.json and both versions.\n${out}`);
    // The bundle line states ABSENCE of the canonical token, not "the bundle is at version X" — a
    // 769KB esbuild bundle has no single soundly-identifiable version field, and naming one would be
    // a guess. Absence is what the check establishes and all it may claim.
    assert.match(out, /plugins\/mindforge\/mcp\/dist\/index\.js: no "99\.0\.0" token/,
      `the report must name the mcp bundle and say what it looked for.\n${out}`);
    // REGRESSION GUARD for a loose detector. The fixture seeds 3.0.0, 1.0.12 and 127.0.0.1 as decoys,
    // exactly as the real bundle contains them. A "first semver token wins" implementation would print
    // one of those as the bundle's version, which is how an IP address gets reported as a release.
    for (const decoy of ['3.0.0 -> 99.0.0', '1.0.12 -> 99.0.0', '127.0.0 -> 99.0.0']) {
      assert.ok(!out.includes(decoy),
        `the bundle detector matched the decoy "${decoy.split(' ')[0]}" — it must key on the quoted `
        + `canonical token, not on the first semver-shaped string in the file.\n${out}`);
    }

    // The runbook, not just the complaint. The obvious single command does not work from a clean
    // checkout: build-mindforge-plugin.js refuses without mcp-server/dist/index.js, and mcp-server/dist
    // is gitignored, so it is absent on every fresh clone. All three steps, in order, or the operator is
    // handed a command that exits 1.
    for (const step of CHAIN) {
      assert.ok(out.includes(step),
        `the report must print the remedy step "${step}" — without the full chain the documented `
        + `remedy exits 1 on a fresh clone.\n${out}`);
    }
    assert.ok(out.indexOf(CHAIN[0]) < out.indexOf(CHAIN[1])
      && out.indexOf(CHAIN[1]) < out.indexOf(CHAIN[2]),
      `the remedy steps must be printed in runnable order.\n${out}`);

    assert.notStrictEqual(r.status, 0,
      'a tree whose gated build artifacts are stale is not releasable, so this must not exit 0. '
      + `Exiting 0 here is the original defect.\n${out}`);

    // MUST NOT FORGE A PASSING GATE. plugin.json is plain JSON this script could trivially edit, but
    // tests/plugin-packaging.test.js asserts no generator drift across the WHOLE plugin surface, so
    // writing the version alone would turn that gate green while every other generated field stayed
    // stale — a partial write announced as a complete one.
    assert.strictEqual(fs.readFileSync(path.join(tmp, pluginRel), 'utf8'), beforePlugin,
      'sync-version.js must LEAVE plugin.json alone; build-mindforge-plugin.js is its only writer');
    assert.strictEqual(fs.readFileSync(path.join(tmp, bundleRel), 'utf8'), beforeBundle,
      'sync-version.js must LEAVE the mcp bundle alone — it is compiler output');
  } finally { fs.rmSync(tmp, { recursive: true, force: true }); }
});

test('sync-version.js stays silent about the build artifacts when they are already current', () => {
  // The complement, and the reason the test above means anything: a script that printed the section
  // unconditionally would satisfy it. Both artifacts at canonical must produce NO build section and
  // exit 0, so the detector has to actually compare rather than always complain.
  const tmp = buildArtifactFixture('99.0.0');
  try {
    const r = spawnSync(process.execPath, [path.join(tmp, 'scripts', 'sync-version.js')],
      { cwd: tmp, encoding: 'utf8', env: { PATH: process.env.PATH, HOME: tmp, TMPDIR: tmp } });
    const out = `${r.stdout || ''}${r.stderr || ''}`;
    assert.ok(!/REQUIRE A BUILD/.test(out),
      `current artifacts must not be reported as needing a build.\n${out}`);
    assert.strictEqual(r.status, 0,
      `a tree whose artifacts are all current must exit 0.\n${out}`);
  } finally { fs.rmSync(tmp, { recursive: true, force: true }); }
});

// ── a bump must move structural version markers and NOTHING adjacent ──────────────────────────
//
// The shipped-docs channels were added because no channel covered a file a user receives: measured
// against the tarball at canonical 11.9.2, SECURITY.md said "Current version: 11.9.0" and five docs
// titled themselves v11.9.0 — three releases stale, invisible to --check, because a channel that does
// not exist cannot drift.
//
// The danger a doc channel introduces is the opposite one. The shipped set contains 40+ version strings
// that are CORRECT while differing from canonical, and a greedy pattern destroys all of them silently:
//   32 × `min_mindforge_version:` floors in .mindforge/skills/*/SKILL.md
//   MINDFORGE.md `[REQUIRED_CORE_VERSION]` — the same idea, and a documented exclusion
//   `(v11.0.0+)` since-markers — "available from", not "current"
//   CHANGELOG.md headings — frozen historical records
// Corrupting a floor is worse than the staleness being fixed: it makes a skill demand a core version
// that did not exist when it was written, and no version assertion would notice, because every value
// would agree with package.json. That is what this test exists to prevent.

test('a bump moves structural version markers and leaves floors, since-markers and history alone', () => {
  const tmp = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'mf-docchan-')));
  try {
    fs.mkdirSync(path.join(tmp, 'scripts'), { recursive: true });
    fs.mkdirSync(path.join(tmp, 'docs'), { recursive: true });
    fs.mkdirSync(path.join(tmp, '.mindforge', 'skills', 'probe'), { recursive: true });
    // Copied from ROOT, not from git, so an uncommitted channel is covered too.
    fs.copyFileSync(path.join(ROOT, 'scripts', 'sync-version.js'),
      path.join(tmp, 'scripts', 'sync-version.js'));

    const BUMP = '99.0.0';
    const OLD = '11.9.0';
    fs.writeFileSync(path.join(tmp, 'package.json'),
      JSON.stringify({ name: 'mindforge-cc', version: BUMP }, null, 2) + '\n');

    // MUST MOVE — structural markers, byte-identical to the real files' shapes.
    const w = (rel, text) => fs.writeFileSync(path.join(tmp, rel), text);
    w('SECURITY.md',
      `> **Current version:** ${OLD} | **npm audit:** 0 vulnerabilities\n\n`
      + '## Security Features (v11.0.0+)\n');
    w('docs/getting-started.md',
      `# MindForge — Getting Started (v${OLD})\n\n`
      + `2. **Check version:** \`node bin/mindforge-cli.js --version\` (should print \`${OLD}\`)\n`);
    w('docs/faq.md', `# MindForge FAQ (v${OLD})\n\n${OLD ? 'v' + OLD : ''} — verify with \`x\`\n`);
    w('docs/troubleshooting.md',
      `# MindForge Troubleshooting (v${OLD})\n\n**Fix:** Upgrade to v${OLD}: \`npx x\`\n`);
    w('docs/user-guide.md',
      `# MindForge User Guide (v${OLD})\n\n> **v${OLD} Stats:** 35 workflows\n\n`
      + `mindforge --version       # Print installed version (e.g. ${OLD}) and exit 0\n\n`
      + '> **Authentication (v11.0.0+):** requires a bearer token\n');
    w('docs/sdk-reference.md',
      `Current SDK version: \`${OLD}\`\n\n## SDK Exports (v${OLD})\n\n`
      + `  VERSION                 // '${OLD}'\n\n`
      + `The SDK achieves **0 typecheck errors** in v${OLD}.\n`);
    w('MINDFORGE.md',
      `# MINDFORGE.md — Parameter Registry (v${OLD})\n\n`
      + `[VERSION] = ${OLD}\n[REQUIRED_CORE_VERSION] = 11.9.1\n`);

    // MUST NOT MOVE.
    w(path.join('.mindforge', 'skills', 'probe', 'SKILL.md'),
      'name: probe\nmin_mindforge_version: 11.4.0\n');
    w('CHANGELOG.md', '## [11.9.1] — 2026-07-29 — Packaging Fix\n\n- fixed in v11.9.0\n');

    const r = spawnSync(process.execPath, [path.join(tmp, 'scripts', 'sync-version.js')],
      { cwd: tmp, encoding: 'utf8', env: { PATH: process.env.PATH, HOME: tmp, TMPDIR: tmp } });
    const out = `${r.stdout || ''}${r.stderr || ''}`;
    const read = (rel) => fs.readFileSync(path.join(tmp, rel), 'utf8');

    // ── moved
    const moved = {
      'SECURITY.md': `> **Current version:** ${BUMP}`,
      'docs/getting-started.md': `# MindForge — Getting Started (v${BUMP})`,
      'docs/faq.md': `# MindForge FAQ (v${BUMP})`,
      'docs/troubleshooting.md': `# MindForge Troubleshooting (v${BUMP})`,
      'docs/user-guide.md': `> **v${BUMP} Stats:**`,
      'docs/sdk-reference.md': `Current SDK version: \`${BUMP}\``,
    };
    for (const [rel, want] of Object.entries(moved)) {
      assert.ok(read(rel).includes(want),
        `${rel} was not bumped — expected to find "${want}". A shipped doc that titles itself with an `
        + `old release is what a new user reads first.\n${out}`);
    }
    assert.ok(read('docs/getting-started.md').includes(`should print \`${BUMP}\``),
      'the documented --version output must track, or a user compares it and concludes the install is broken');
    assert.ok(read('docs/user-guide.md').includes(`(e.g. ${BUMP})`),
      'the user-guide --version example must track');
    assert.ok(read('docs/sdk-reference.md').includes(`VERSION                 // '${BUMP}'`),
      'sdk-reference mirrors sdk/src/index.ts, which IS a channel — leaving it out guarantees the doc '
      + 'and the code it documents disagree on every bump');

    // ── untouched, and each with the specific damage spelled out
    assert.ok(read(path.join('.mindforge', 'skills', 'probe', 'SKILL.md'))
      .includes('min_mindforge_version: 11.4.0'),
      'a greedy doc channel rewrote a skill\'s min_mindforge_version. That is a FLOOR: bumping it makes '
      + 'the skill demand a core version that did not exist when it was written, and no version '
      + `assertion catches it because every value then agrees with package.json.\n${out}`);
    assert.ok(read('MINDFORGE.md').includes('[REQUIRED_CORE_VERSION] = 11.9.1'),
      `[REQUIRED_CORE_VERSION] is a minimum floor and a documented exclusion — it may lag, never lead.\n${out}`);
    assert.ok(read('SECURITY.md').includes('## Security Features (v11.0.0+)'),
      `a "(v11.0.0+)" since-marker means "available from", not "current" — sweeping it is a lie.\n${out}`);
    assert.ok(read('docs/user-guide.md').includes('(v11.0.0+):**'),
      `the user-guide since-marker must survive.\n${out}`);
    assert.ok(read('CHANGELOG.md').includes('## [11.9.1] —'),
      `CHANGELOG.md is a frozen historical record.\n${out}`);
    // Narrative measurements stay put: rewriting them asserts a measurement was taken on a release it
    // was not. A stale true statement beats a fresh false one.
    assert.ok(read('docs/sdk-reference.md').includes(`0 typecheck errors** in v${OLD}`),
      `a narrative measurement was rewritten — that manufactures a claim nobody verified.\n${out}`);
    assert.ok(read('docs/troubleshooting.md').includes(`Upgrade to v${OLD}`),
      `"Upgrade to vX" names a historical boundary, not the current release.\n${out}`);
  } finally { fs.rmSync(tmp, { recursive: true, force: true }); }
});

(async () => {
  for (const { name, fn } of tests) {
    try { await fn(); console.log(`  ✅  ${name}`); passed++; }
    catch (e) { console.error(`  ❌  ${name}\n      ${e.message}`); failed++; }
  }
  console.log(`\nVersion Consistency: ${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
})();

// ── README's "Latest release" is a shipped surface and must name canonical ────
//
// WHY THIS IS A TEST AND NOT A SYNC CHANNEL. scripts/sync-version.js could trivially rewrite the
// `**v11.9.3**` token to canonical, and that would be worse than leaving it alone: the section is a
// version followed by a paragraph describing what that version changed. Auto-bumping the number
// produces the right version attached to the wrong description — a more convincing falsehood than an
// obviously stale one. Same distinction #211 drew when it added the shipped-doc channels: structural
// markers track canonical, narrative measurements deliberately do not. So this FAILS and makes a
// human write the paragraph.
//
// WHY IT EXISTS AT ALL. This surface has shipped stale twice in consecutive releases. The immutable
// 11.9.3 tarball said "Latest release v11.9.2"; the immutable 11.9.4 tarball says "v11.9.3" and
// credits hook registration to 11.9.3 — the release that registers 0 hooks. That is the page
// npmjs.com renders for the version being installed, so it is the first thing a new user reads. It
// was corrected by hand in 348a3a2c one release earlier, with no gate added, and promptly recurred.
test('README.md\'s "Latest release" section names the canonical version', () => {
  const pkgVersion = JSON.parse(readText(path.join(ROOT, 'package.json'))).version;
  const readme = readText(path.join(ROOT, 'README.md'));

  const idx = readme.indexOf('## Latest release');
  assert.ok(idx > 0,
    'README.md has no "## Latest release" section. If it was renamed, update this assertion '
    + 'deliberately — an anchor that matches nothing silently covers nothing.');

  // Bounded by the next heading, so a version mentioned further down the file cannot satisfy this.
  const after = readme.slice(idx + '## Latest release'.length);
  const end = after.search(/\n#{2,3} /);
  const section = end === -1 ? after : after.slice(0, end);

  const versions = [...section.matchAll(/\bv?(\d+\.\d+\.\d+)\b/g)].map((m) => m[1]);
  assert.ok(versions.length > 0,
    `README.md's "Latest release" section names no version at all:\n${section.slice(0, 200)}`);
  assert.strictEqual(versions[0], pkgVersion,
    `README.md's "Latest release" leads with v${versions[0]} but package.json is ${pkgVersion}. This `
    + 'section is what npmjs.com renders for the published package, so a stale version here is the '
    + 'first thing a new user reads. Write the new summary — it is deliberately not auto-generated, '
    + 'because a synced number on a previous release\'s description is a better-disguised falsehood '
    + 'than a visibly old one.');
});

// The sibling gate. RELEASENOTES.md is offered by the README as the human-readable route to the
// BREAKING notes, and the 11.9.4 tarball shipped with no 11.9.4 entry in it — the same recurrence,
// on the same pair of files, for the same reason: bin/utils/readiness-gate.js checks only that
// RELEASENOTES.md EXISTS, while its changelog sibling checks that the version appears in it.
test('RELEASENOTES.md carries an entry for the canonical version', () => {
  const pkgVersion = JSON.parse(readText(path.join(ROOT, 'package.json'))).version;
  const notes = readText(path.join(ROOT, 'RELEASENOTES.md'));
  // Anchored at line start and bounded on the right. A plain `includes('## v11.9.4')` was the first
  // version, and falsification killed it: `## v11.9.4-notyet` and `## v11.9.40` both contain that
  // substring, so the check passed on headings for versions that are not this one.
  const heading = new RegExp(`^## v${pkgVersion.replace(/\./g, '\\.')}(?![\\d.\\w-])`, 'm');
  assert.match(notes, heading,
    `RELEASENOTES.md has no "## v${pkgVersion}" heading. README.md links to it as the human-readable `
    + 'route to the BREAKING notes, so shipping a release without one sends readers to a file whose '
    + 'newest entry describes something else. bin/utils/readiness-gate.js only checks this file '
    + 'EXISTS; its changelog sibling checks the version is in it, and that asymmetry is why both '
    + 'prose surfaces shipped stale in 11.9.3 and again in 11.9.4.');
});
