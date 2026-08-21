/**
 * Guards bin/utils/mindforge-version.js: MindForge's version must come from MindForge.
 *
 * THE DEFECT. Three modules read `require('../../package.json').version`:
 *
 *     bin/updater/self-update.js:13         const CURRENT_VERSION = ...
 *     bin/updater/version-comparator.js:47  User-Agent: `mindforge-cc/${...}`
 *     bin/wizard/setup-wizard.js:9          const VERSION = ...
 *
 * In the repo that path IS MindForge's manifest, so it looked correct. But the installer copies
 * bin/updater/ and bin/wizard/ into the consumer's project, where `../../package.json` is the
 * CONSUMER's. Measured on a clean `--claude --local` into an app at 1.0.0:
 *
 *     ../../package.json from bin/updater/  -> <project>/package.json, version 1.0.0
 *     MindForge actual                      -> 11.9.2
 *
 * Not cosmetic: self-update.js:89 classifies the upgrade with upgradeType(CURRENT_VERSION, latest),
 * so 1.0.0 -> 11.9.x reads as MAJOR, and :133 uses `readHandoffSchemaVersion() || CURRENT_VERSION`
 * as the "from" version driving MIGRATIONS.
 *
 * Same family as ed977e9, where AutoRunner passed process.cwd() to a check that compares
 * MindForge's own manifests. Both mistake "the directory I am running in" for "the package I am
 * part of". The fix in both cases is to identify the package rather than trust a relative path —
 * here by matching package.json's NAME, which is the one thing a consumer's manifest cannot fake
 * without claiming to BE mindforge-cc.
 */
'use strict';

const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const REPO_ROOT = fs.realpathSync(path.join(__dirname, '..'));
const { resolveMindforgeVersion, PACKAGE_NAME } =
  require(path.join(REPO_ROOT, 'bin', 'utils', 'mindforge-version.js'));
const REPO_VERSION = JSON.parse(fs.readFileSync(path.join(REPO_ROOT, 'package.json'), 'utf8')).version;

let passed = 0;
let failed = 0;
const tests = [];
function test(name, fn) { tests.push({ name, fn }); }

function withDir(fn) {
  const dir = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'mf-verssrc-')));
  try { return fn(dir); } finally { fs.rmSync(dir, { recursive: true, force: true }); }
}

// ── Repo context ─────────────────────────────────────────────────────────────

test('in the repo, resolves from MindForge\'s own package.json', () => {
  const r = resolveMindforgeVersion({ fromDir: path.join(REPO_ROOT, 'bin', 'updater') });
  assert.strictEqual(r.version, REPO_VERSION, `expected ${REPO_VERSION}, got ${r.version}`);
  assert.match(r.source, /package\.json$/, `source should be a package.json, got ${r.source}`);
});

test('the ancestor walk is keyed on the package NAME, not on depth', () => {
  // A fixed `../../package.json` cannot tell whose manifest it found. The name can, and it is what
  // makes the same code correct in the repo, in node_modules, and in a consumer project.
  const nested = path.join(REPO_ROOT, 'bin', 'updater');
  const shallow = path.join(REPO_ROOT, 'bin');
  assert.strictEqual(resolveMindforgeVersion({ fromDir: nested }).version, REPO_VERSION);
  assert.strictEqual(resolveMindforgeVersion({ fromDir: shallow }).version, REPO_VERSION,
    'a different depth must still find the same manifest');
});

// ── Installed context ────────────────────────────────────────────────────────

test('a CONSUMER package.json is never mistaken for MindForge\'s', () => {
  // The whole defect, isolated: an app manifest two levels up must be ignored.
  withDir((dir) => {
    fs.writeFileSync(path.join(dir, 'package.json'),
      JSON.stringify({ name: 'their-app', version: '1.0.0' }, null, 2));
    fs.mkdirSync(path.join(dir, '.mindforge'), { recursive: true });
    fs.writeFileSync(path.join(dir, '.mindforge', 'config.json'),
      JSON.stringify({ version: '11.9.2' }, null, 2));
    fs.mkdirSync(path.join(dir, 'bin', 'updater'), { recursive: true });

    const r = resolveMindforgeVersion({ fromDir: path.join(dir, 'bin', 'updater'), cwd: dir });
    assert.strictEqual(r.version, '11.9.2',
      `must report MindForge's version, not the host app's. Got ${r.version} from ${r.source}`);
    assert.notStrictEqual(r.version, '1.0.0', 'the consumer app version must never be reported');
    assert.match(r.source, /config\.json$/, `expected the config fallback, got ${r.source}`);
  });
});

test('falls back to node_modules/mindforge-cc when there is no .mindforge/', () => {
  // A consumer that installed the package but has not run the installer yet.
  withDir((dir) => {
    fs.writeFileSync(path.join(dir, 'package.json'),
      JSON.stringify({ name: 'their-app', version: '2.3.4' }, null, 2));
    const dep = path.join(dir, 'node_modules', PACKAGE_NAME);
    fs.mkdirSync(dep, { recursive: true });
    fs.writeFileSync(path.join(dep, 'package.json'),
      JSON.stringify({ name: PACKAGE_NAME, version: '9.9.9' }, null, 2));

    const r = resolveMindforgeVersion({ fromDir: path.join(dir, 'nowhere'), cwd: dir });
    assert.strictEqual(r.version, '9.9.9', `got ${r.version} from ${r.source}`);
  });
});

test('a manifest CLAIMING the MindForge name is honoured — and that is intended', () => {
  // Documents the trust boundary rather than pretending there is none. Anything that can place a
  // package.json named mindforge-cc above these modules can already replace the modules
  // themselves, so the name is not a security control; it is a disambiguator.
  withDir((dir) => {
    fs.writeFileSync(path.join(dir, 'package.json'),
      JSON.stringify({ name: PACKAGE_NAME, version: '0.0.7' }, null, 2));
    fs.mkdirSync(path.join(dir, 'deep', 'deeper'), { recursive: true });
    const r = resolveMindforgeVersion({ fromDir: path.join(dir, 'deep', 'deeper'), cwd: dir });
    assert.strictEqual(r.version, '0.0.7');
  });
});

// ── It must fail loudly rather than guess ────────────────────────────────────

test('THROWS when no source can establish the version', () => {
  // A wrong version here produces a confident, incorrect upgrade classification. An error is
  // strictly better than a guess, and this is the assertion that stops a future "default to
  // 0.0.0" from creeping in.
  withDir((dir) => {
    fs.writeFileSync(path.join(dir, 'package.json'),
      JSON.stringify({ name: 'unrelated', version: '5.0.0' }, null, 2));
    assert.throws(
      () => resolveMindforgeVersion({ fromDir: path.join(dir, 'x', 'y'), cwd: dir }),
      /Cannot determine the MindForge version/,
      'must refuse to guess');
  });
});

test('the error names every place it looked', () => {
  withDir((dir) => {
    let message = '';
    try { resolveMindforgeVersion({ fromDir: dir, cwd: dir }); }
    catch (e) { message = e.message; }
    assert.match(message, new RegExp(PACKAGE_NAME), 'must name the package it searched for');
    assert.match(message, /config\.json/, 'must name the config fallback');
    assert.match(message, /node_modules/, 'must name the dependency fallback');
  });
});

// ── The call sites are actually rewired ──────────────────────────────────────

// Matches ANY number of parent hops. The first version of this gate pinned exactly `../../`, which
// is why it never caught bin/mindforge-cli.js, bin/install.js or bin/installer-core.js — those sit
// one level down and read `../package.json`. Same defect, one hop instead of two, and the assertion
// was written narrowly enough to miss it.
const RAW_PARENT_READ = /require\(['"](?:\.\.\/)+package\.json['"]\)/;

// SECOND SHAPE, and it is why this gate missed a live defect twice. The pattern above only matches a
// bare `require('../package.json')`. installer-core.js read the same manifest as
// `JSON.parse(fsu.read(path.join(SOURCE_ROOT, 'package.json')))` — different syntax, identical bug —
// and was recorded here as needing NO version because the only read anyone found was the dead
// `const VERSION`. Measured on the published 11.9.3 tarball: `mindforge health` printed the banner
// `RELEASE v0.4.2` in a project declaring 0.4.2, then `Current : v11.9.3` twenty-six lines later.
//
// Two more of the same shape surfaced once this pattern existed, both feeding
// verifyRecord({ currentVersion }): metrics-aggregator.js (`path.join(__dirname,'..','..')`, try/caught
// so it bound the WRONG version silently) and verify-approvals.js (`path.join(ROOT, …)`, unguarded, so
// it died with ENOENT on any project without a manifest). A wrong version binding on an approval record
// is worse than a missing one, because the check still returns a verdict.
//
// Anchored on the MODULE's own location — SOURCE_ROOT, ROOT, __dirname — never on cwd. Reading
// `<cwd>/package.json` is legitimate: that is how you deliberately inspect the CONSUMER's manifest
// (bin/wizard/environment-detector.js does exactly that, correctly).
const MODULE_ANCHORED_READ =
  /path\.join\(\s*(?:SOURCE_ROOT|ROOT|__dirname)\b[^)]*['"]package\.json['"]\s*\)/;

// Must not read raw, AND must resolve by package name.
const REWIRED = [
  'bin/updater/self-update.js',
  'bin/updater/version-comparator.js',
  'bin/wizard/setup-wizard.js',
  'bin/mindforge-cli.js',   // answers `--version`; printed the host app's version
  'bin/install.js',         // banner + `--version`
  // MOVED FROM NO_VERSION_READ, which is what that entry's own failure message instructed. It does
  // need a version: Theme.printHeader() displays it, so `mindforge health` was printing the consumer's.
  'bin/installer-core.js',
  // Both bind an approval record's version via verifyRecord({ currentVersion }).
  'bin/dashboard/metrics-aggregator.js',
  'bin/governance/verify-approvals.js',
];

// Must not read raw, and needs no version at all.
//
// EMPTY, and deliberately kept rather than deleted. installer-core.js used to be the sole entry, on the
// grounds that its `const VERSION = require('../package.json').version` was dead code. That was true of
// THAT read and false of the module: a second read fed the banner, in a syntax the pattern above did not
// match. The category is still meaningful — a module that needs no version should not acquire one — so
// the list stays as the place to record the next such case. The floor below is asserted on REWIRED so an
// empty list here cannot make the gate vacuous.
const NO_VERSION_READ = [];

const codeOf = (rel) => {
  const src = fs.readFileSync(path.join(REPO_ROOT, rel), 'utf8');
  // Comments explaining the old pattern are expected; only code matters.
  return src.split('\n').filter((l) => !/^\s*(\/\/|\*|\/\*)/.test(l)).join('\n');
};

test('no module reads a parent package.json for MindForge\'s version any more', () => {
  // Non-vacuity floor: if the list is emptied or the paths rot, the loop below asserts nothing and
  // passes green. Pin the count so a shrinking list reds instead of quietly covering less.
  assert.ok(REWIRED.length >= 8,
    `only ${REWIRED.length} rewired file(s) are checked (8 at the time of writing) — the list shrank, `
    + 'so this gate now covers less than it did. Do not remove entries to make it pass.');

  for (const rel of [...REWIRED, ...NO_VERSION_READ]) {
    assert.ok(fs.existsSync(path.join(REPO_ROOT, rel)), `${rel} does not exist — the path rotted`);
    const code = codeOf(rel);
    assert.ok(!RAW_PARENT_READ.test(code),
      `${rel} still requires a parent package.json. In an install that is the CONSUMER's manifest: `
      + 'present and wrong (their app version), or absent and fatal.');
    assert.ok(!MODULE_ANCHORED_READ.test(code),
      `${rel} still reads package.json relative to its OWN location (SOURCE_ROOT / ROOT / __dirname). `
      + 'In an install that resolves to the CONSUMER\'s manifest just as surely as `../package.json` '
      + 'does — this is the shape that escaped the narrower pattern and shipped in 11.9.3. Resolve by '
      + 'package NAME with resolveMindforgeVersion(), or read <cwd>/package.json if you genuinely want '
      + 'the consumer\'s.');
  }

  for (const rel of REWIRED) {
    assert.match(codeOf(rel), /resolveMindforgeVersion/,
      `${rel} must resolve the version by package NAME, which is the only thing that distinguishes `
      + 'MindForge\'s manifest from a consumer\'s');
  }

  for (const rel of NO_VERSION_READ) {
    assert.ok(!/resolveMindforgeVersion/.test(codeOf(rel)),
      `${rel} needs no version at all — its read was dead code. If something here now genuinely `
      + 'needs the version, move this entry into REWIRED rather than loosening the assertion.');
  }
});

test('`--version` reports MindForge\'s version from an INSTALLED layout, not the host app\'s', () => {
  // The behavioural half, and the gap the existing end-to-end test could not close: that one calls
  // resolveMindforgeVersion() directly, so it proved the HELPER worked while bin/mindforge-cli.js
  // still answered --version with a raw relative read. This runs the real CLI.
  //
  // Builds the install layout directly instead of running the installer: deterministic, ~50ms
  // instead of ~10s, and it isolates the resolution context, which is the thing under test.
  const proj = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'mf-verscli-')));
  const home = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'mf-vershome-')));
  try {
    fs.mkdirSync(path.join(proj, 'bin', 'utils'), { recursive: true });
    fs.mkdirSync(path.join(proj, '.mindforge'), { recursive: true });
    fs.copyFileSync(path.join(REPO_ROOT, 'bin', 'mindforge-cli.js'), path.join(proj, 'bin', 'mindforge-cli.js'));
    fs.copyFileSync(path.join(REPO_ROOT, 'bin', 'utils', 'mindforge-version.js'),
      path.join(proj, 'bin', 'utils', 'mindforge-version.js'));

    // The host app's manifest, one directory above the CLI — exactly what '../package.json' hit.
    fs.writeFileSync(path.join(proj, 'package.json'),
      JSON.stringify({ name: 'their-app', version: '1.0.0' }, null, 2));
    // What the installer writes, and the source the resolver must fall back to.
    fs.writeFileSync(path.join(proj, '.mindforge', 'config.json'),
      JSON.stringify({ version: REPO_VERSION }, null, 2));

    const r = spawnSync(process.execPath, [path.join(proj, 'bin', 'mindforge-cli.js'), '--version'],
      { cwd: proj, encoding: 'utf8', env: { PATH: process.env.PATH, HOME: home, CI: '1' } });

    assert.strictEqual(r.status, 0, `--version exited ${r.status}: ${(r.stderr || '').slice(0, 300)}`);
    const printed = (r.stdout || '').trim();
    assert.strictEqual(printed, REPO_VERSION,
      `--version printed ${JSON.stringify(printed)}, expected ${REPO_VERSION}`);
    assert.notStrictEqual(printed, '1.0.0',
      'the host app\'s version surfaced as MindForge\'s — the raw relative read is back');
  } finally {
    fs.rmSync(proj, { recursive: true, force: true });
    fs.rmSync(home, { recursive: true, force: true });
  }
});

test('version-comparator degrades to "unknown" instead of throwing', () => {
  // Its header documents it as pure and offline-capable, and an unresolvable version is no reason
  // to break an update check. self-update throws in the same situation, correctly — there a wrong
  // version would misclassify the upgrade. The asymmetry is deliberate, so it is asserted.
  const src = fs.readFileSync(path.join(REPO_ROOT, 'bin', 'updater', 'version-comparator.js'), 'utf8');
  assert.match(src, /catch\s*\{[\s\S]{0,80}?return 'unknown'/,
    'the User-Agent lookup must swallow a resolution failure');
  const selfUpdate = fs.readFileSync(path.join(REPO_ROOT, 'bin', 'updater', 'self-update.js'), 'utf8');
  const suCode = selfUpdate.split('\n').filter((l) => !/^\s*(\/\/|\*|\/\*)/.test(l)).join('\n');
  assert.ok(!/catch[\s\S]{0,60}unknown/.test(suCode),
    'self-update must NOT swallow it — a wrong version there misclassifies the upgrade');
});

// ── End to end, against a real install ───────────────────────────────────────

test('a real install resolves MindForge\'s version, not the host app\'s', () => {
  const project = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'mf-versinstall-')));
  try {
    fs.writeFileSync(path.join(project, 'package.json'),
      JSON.stringify({ name: 'their-app', version: '1.0.0' }, null, 2));
    // HOME is confined to the scratch project, NOT the operator's. installer-core.js:253 resolves
    // its registry via os.homedir(), which honours $HOME, so passing the real one made every run of
    // this test append a mf-versinstall-* path to ~/.mindforge/registry.json — 29 such entries were
    // measured in a real registry. See tests/no-home-leak.test.js, which now bans the pattern.
    const homeDir = path.join(project, '.scratch-home');
    fs.mkdirSync(homeDir, { recursive: true });
    const inst = spawnSync(process.execPath,
      [path.join(REPO_ROOT, 'bin', 'install.js'), '--claude', '--local'],
      { cwd: project, encoding: 'utf8', env: { PATH: process.env.PATH, HOME: homeDir, CI: '1' } });
    assert.strictEqual(inst.status, 0, `install failed: ${(inst.stderr || '').slice(0, 400)}`);

    const helper = path.join(project, 'bin', 'utils', 'mindforge-version.js');
    assert.ok(fs.existsSync(helper),
      'bin/utils/mindforge-version.js must be installed — the rewired modules require it, so an ' +
      'install without it would crash on load');

    const r = spawnSync(process.execPath, ['-e',
      `const {resolveMindforgeVersion}=require(${JSON.stringify(helper)});` +
      'const v=resolveMindforgeVersion({fromDir:process.cwd()+"/bin/updater",cwd:process.cwd()});' +
      'process.stdout.write(v.version);'],
      { cwd: project, encoding: 'utf8' });
    assert.strictEqual(r.status, 0, `resolution failed in the install: ${r.stderr}`);
    assert.strictEqual(r.stdout.trim(), REPO_VERSION,
      `an install must report MindForge ${REPO_VERSION}, got ${r.stdout.trim()}`);
    assert.notStrictEqual(r.stdout.trim(), '1.0.0', 'the host app version must never surface');
  } finally { fs.rmSync(project, { recursive: true, force: true }); }
});

(async () => {
  const registeredBeforeRun = tests.length;
  for (const { name, fn } of tests) {
    try { await fn(); console.log(`  ✅  ${name}`); passed++; }
    catch (e) { console.error(`  ❌  ${name}\n      ${e.message}`); failed++; }
  }
  if (tests.length !== registeredBeforeRun) {
    console.error(`  ❌  ${tests.length - registeredBeforeRun} test(s) registered after the runner and never ran`);
    failed++;
  }
  console.log(`\nMindForge Version Source: ${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
})();
