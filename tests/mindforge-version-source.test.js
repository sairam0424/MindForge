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

test('no module reads ../../package.json for MindForge\'s version any more', () => {
  for (const rel of [
    'bin/updater/self-update.js',
    'bin/updater/version-comparator.js',
    'bin/wizard/setup-wizard.js',
  ]) {
    const src = fs.readFileSync(path.join(REPO_ROOT, rel), 'utf8');
    // Comments explaining the old pattern are expected; only code matters.
    const code = src.split('\n').filter((l) => !/^\s*(\/\/|\*|\/\*)/.test(l)).join('\n');
    assert.ok(!/require\(['"]\.\.\/\.\.\/package\.json['"]\)/.test(code),
      `${rel} still requires ../../package.json, which is the CONSUMER's manifest in an install`);
    assert.match(code, /resolveMindforgeVersion/,
      `${rel} must resolve the version by package name`);
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
    const inst = spawnSync(process.execPath,
      [path.join(REPO_ROOT, 'bin', 'install.js'), '--claude', '--local'],
      { cwd: project, encoding: 'utf8', env: { PATH: process.env.PATH, HOME: process.env.HOME, CI: '1' } });
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
