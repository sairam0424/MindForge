/**
 * Bans the test suite from writing to the developer's real home directory.
 *
 * THE DEFECT. Six suites spawned children with `env: { HOME: process.env.HOME }`, and four of those
 * children were `bin/install.js`. bin/installer-core.js:253 is
 *
 *     getRegistryPath: () => path.join(os.homedir(), '.mindforge', 'registry.json')
 *
 * and os.homedir() honours $HOME on POSIX. So every `npm test` registered its scratch tmpdirs into
 * the operator's real global registry — and `npm test` runs on every Husky pre-commit, so it
 * compounded invisibly. Measured on a real machine before the fix:
 *
 *     245 total registry entries
 *     237 test-suite tmpdir signatures  (97%)
 *       8 genuine projects
 *
 * By prefix: mf-auditinstall-* x55 (harness-audit), mf-installload-* x49 (install-module-load),
 * mf-hookgap-* x41 (plugin-packaging), mf-versinstall-* x29 (mindforge-version-source).
 *
 * It surfaced during a production dry run, where a probe group observed the real registry change
 * mid-run (18320 -> 18407 bytes) and proved by elimination it was not its own writes. Nothing in the
 * suite would ever have caught it: every affected test asserted only on its tmpdir, and the tmpdir
 * assertions all passed. The write was real, acknowledged, and outside every assertion.
 *
 * WHY A STATIC SCAN IS NOT ENOUGH ON ITS OWN. The scan below is comment-stripped, because the fix
 * commit added explanatory comments containing the very string being banned — the same trap that
 * produced four false readings elsewhere in this repo (a doc explaining a pattern satisfying the
 * grep that forbids it). And a scan cannot prove the mechanism, so the second test spawns the real
 * installer under a confined HOME and asserts the write landed there and NOT in the real registry.
 */
'use strict';

const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const REPO_ROOT = fs.realpathSync(path.join(__dirname, '..'));
const REAL_REGISTRY = path.join(os.homedir(), '.mindforge', 'registry.json');

let passed = 0;
let failed = 0;
const tests = [];
function test(name, fn) { tests.push({ name, fn }); }

/** Strip line comments and block-comment bodies so prose cannot satisfy or trip an assertion. */
function executableOnly(src) {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .split('\n')
    .filter((l) => !/^\s*(\/\/|\*)/.test(l))
    .join('\n');
}

function testFiles() {
  const out = [];
  (function walk(dir) {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      if (e.isDirectory()) {
        if (/^(node_modules|tmp-.*|\..*)$/.test(e.name)) continue;
        walk(path.join(dir, e.name));
      } else if (e.name.endsWith('.test.js')) {
        out.push(path.join(dir, e.name));
      }
    }
  })(path.join(REPO_ROOT, 'tests'));
  return out;
}

// ── The static ban ───────────────────────────────────────────────────────────

test('no test hands the real $HOME to a spawned child', () => {
  const offenders = [];
  for (const file of testFiles()) {
    if (path.basename(file) === 'no-home-leak.test.js') continue; // this file names the pattern
    const code = executableOnly(fs.readFileSync(file, 'utf8'));
    code.split('\n').forEach((line, i) => {
      if (/HOME\s*:\s*process\.env\.HOME/.test(line)) {
        offenders.push(`${path.relative(REPO_ROOT, file)}:${i + 1}`);
      }
    });
  }
  assert.deepStrictEqual(offenders, [],
    'these call sites pass the operator\'s real HOME to a child process. Any child that reaches ' +
    'os.homedir() — bin/install.js does, at installer-core.js:253 — then writes the developer\'s ' +
    'own ~/.mindforge/. Use a directory inside the test\'s own tmpdir instead. Offenders:\n  ' +
    offenders.join('\n  '));
});

test('the scan reads executed code only, not the prose that documents it', () => {
  // Non-vacuity guard for the scan itself. Several suites now carry comments quoting the banned
  // string to explain why it is banned; if executableOnly() stopped stripping comments, the test
  // above would fail on its own documentation and someone would "fix" it by deleting the docs.
  const withComment = [
    '// env: { HOME: process.env.HOME } is what we must not do',
    ' * HOME: process.env.HOME leaks the real home',
    '/* HOME: process.env.HOME */',
    'const ok = { HOME: SCRATCH_HOME };',
  ].join('\n');
  const stripped = executableOnly(withComment);
  assert.ok(!/HOME\s*:\s*process\.env\.HOME/.test(stripped),
    'executableOnly() must remove commented occurrences, or the ban trips on its own explanation');
  assert.match(stripped, /SCRATCH_HOME/,
    'and it must NOT remove real code — if it did, the ban would pass by seeing nothing at all');
});

test('the scan actually covers the suites that had the defect', () => {
  // A scan that silently walked zero files, or missed the affected directory, would pass forever.
  const files = testFiles().map((f) => path.basename(f));
  assert.ok(files.length >= 100, `expected the full suite, discovered only ${files.length} files`);
  for (const known of [
    'install-module-load.test.js',
    'plugin-packaging.test.js',
    'harness-audit.test.js',
    'mindforge-version-source.test.js',
    'approval-integrity.test.js',
    'change-classifier.test.js',
  ]) {
    assert.ok(files.includes(known), `${known} carried the defect and must be in scan scope`);
  }
});

// ── The mechanism, proven by execution ───────────────────────────────────────

test('confining HOME confines the installer\'s registry write', () => {
  // The decisive test. Asserts BOTH halves: the write lands in the confined home, AND the real
  // registry is untouched. Checking only the second half would pass if the installer had simply
  // stopped writing a registry at all.
  const before = fs.existsSync(REAL_REGISTRY)
    ? require('node:crypto').createHash('sha256').update(fs.readFileSync(REAL_REGISTRY)).digest('hex')
    : null;

  const project = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'mf-nohomeleak-')));
  const homeDir = path.join(project, '.scratch-home');
  fs.mkdirSync(homeDir, { recursive: true });
  try {
    fs.writeFileSync(path.join(project, 'package.json'),
      JSON.stringify({ name: 'their-app', version: '1.0.0' }, null, 2));

    const r = spawnSync(process.execPath,
      [path.join(REPO_ROOT, 'bin', 'install.js'), '--claude', '--local'],
      { cwd: project, encoding: 'utf8', env: { PATH: process.env.PATH, HOME: homeDir, CI: '1' } });
    assert.strictEqual(r.status, 0, `install failed: ${(r.stderr || '').slice(0, 400)}`);

    const confined = path.join(homeDir, '.mindforge', 'registry.json');
    assert.ok(fs.existsSync(confined),
      'the installer must have written its registry under the CONFINED home. If this is absent the ' +
      'test proves nothing about redirection — the installer may simply not be registering at all, ' +
      'and the real-registry check below would pass vacuously.');
    const reg = JSON.parse(fs.readFileSync(confined, 'utf8'));
    assert.ok(JSON.stringify(reg).includes(project),
      `the confined registry must name this scratch project. Got: ${JSON.stringify(reg).slice(0, 200)}`);

    if (before !== null) {
      const after = require('node:crypto').createHash('sha256')
        .update(fs.readFileSync(REAL_REGISTRY)).digest('hex');
      assert.strictEqual(after, before,
        'the operator\'s real ~/.mindforge/registry.json was modified by an install that had HOME ' +
        'confined to a tmpdir. Either os.homedir() is being bypassed, or something resolves the ' +
        'registry path from a source other than $HOME.');
    }
  } finally {
    fs.rmSync(project, { recursive: true, force: true });
  }
});

test('installer-core still resolves its registry through os.homedir()', () => {
  // The premise the fix rests on. If this moved to a hardcoded path or an env var other than HOME,
  // every confined-HOME call site above would silently stop being a confinement.
  const src = fs.readFileSync(path.join(REPO_ROOT, 'bin', 'installer-core.js'), 'utf8');
  const code = executableOnly(src);
  assert.match(code, /getRegistryPath[\s\S]{0,120}os\.homedir\(\)/,
    'installer-core.js must still derive the registry from os.homedir(). If this changed, revisit ' +
    'every HOME-confining test — the confinement may no longer confine anything.');
});

(async () => {
  for (const { name, fn } of tests) {
    try { await fn(); console.log(`  ✅  ${name}`); passed++; }
    catch (e) { console.error(`  ❌  ${name}\n      ${e.message}`); failed++; }
  }
  console.log(`\nNo Home Leak: ${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
})();
