'use strict';
/**
 * The provenance-metadata gate must actually fail on the tree that actually failed.
 *
 * v11.9.4 published mindforge-cc and mindforge-mcp-server irreversibly and then returned 422 on
 * mindforge-sdk: `package.json: "repository.url" is ""`. Six preflight gates had passed on a manifest
 * the registry was guaranteed to reject, because the comparison happens registry-side at PUT — not in
 * `npm publish --dry-run`, and not in anything this repository ran.
 *
 * scripts/ci/verify-provenance-metadata.js closes that. These tests exist because a gate nobody
 * falsifies is the defect class this project keeps finding: each case below mutates a real tree in a
 * throwaway copy and requires the gate to exit non-zero, and one of them removes the gate's own
 * subject matter to prove it refuses to pass vacuously.
 *
 * Every mutation runs in a temp copy. Nothing here writes to the repository under test.
 */

const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { test } = require('node:test');

const ROOT = path.resolve(__dirname, '..');
const GATE_REL = path.join('scripts', 'ci', 'verify-provenance-metadata.js');
const WORKFLOW_REL = path.join('.github', 'workflows', 'mindforge-release.yml');
const MANIFESTS = ['package.json', path.join('mcp-server', 'package.json'), path.join('sdk', 'package.json')];

/**
 * A minimal tree the gate can run in: the gate itself, the workflow, the three manifests, and a git
 * remote so expectedRepo() resolves the same way it does in the real repo.
 */
function sandbox() {
  const dir = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'mf-prov-')));
  for (const rel of [GATE_REL, WORKFLOW_REL, ...MANIFESTS]) {
    const dst = path.join(dir, rel);
    fs.mkdirSync(path.dirname(dst), { recursive: true });
    fs.copyFileSync(path.join(ROOT, rel), dst);
  }
  const origin = spawnSync('git', ['config', '--get', 'remote.origin.url'], { cwd: ROOT, encoding: 'utf8' });
  assert.strictEqual(origin.status, 0, 'could not read the real remote to reproduce in the sandbox');
  for (const args of [['init', '-q'], ['remote', 'add', 'origin', origin.stdout.trim()]]) {
    const r = spawnSync('git', args, { cwd: dir, encoding: 'utf8' });
    assert.strictEqual(r.status, 0, `git ${args[0]} failed in the sandbox: ${r.stderr}`);
  }
  return dir;
}

/** Run the gate in a sandbox with HOME confined, so no child can touch the real home directory. */
function runGate(dir) {
  const home = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'mf-prov-home-')));
  try {
    const r = spawnSync(process.execPath, [GATE_REL], {
      cwd: dir, encoding: 'utf8',
      env: { ...process.env, HOME: home, GITHUB_REPOSITORY: '' },
    });
    return { status: r.status, out: `${r.stdout}${r.stderr}` };
  } finally {
    fs.rmSync(home, { recursive: true, force: true });
  }
}

function withSandbox(fn) {
  const dir = sandbox();
  try { return fn(dir); } finally { fs.rmSync(dir, { recursive: true, force: true }); }
}

const readJson = (p) => JSON.parse(fs.readFileSync(p, 'utf8'));
const writeJson = (p, v) => fs.writeFileSync(p, `${JSON.stringify(v, null, 2)}\n`);

test('the gate passes on the current tree, and discovers all three packages by itself', () => {
  withSandbox((dir) => {
    const { status, out } = runGate(dir);
    assert.strictEqual(status, 0, `the gate fails on the tree it is meant to accept:\n${out}`);
    assert.match(out, /3 package\(s\) publish with --provenance/,
      'the gate did not discover three provenance-publishing packages. It reads them out of the '
      + `workflow rather than from a hardcoded list, so a count other than 3 means the parse drifted:\n${out}`);
    for (const name of ['mindforge-cc', 'mindforge-mcp-server', 'mindforge-sdk']) {
      assert.ok(out.includes(name), `${name} was not among the discovered packages:\n${out}`);
    }
  });
});

test('a missing repository field fails — this is the v11.9.4 tree', () => {
  withSandbox((dir) => {
    const p = path.join(dir, 'sdk', 'package.json');
    const pkg = readJson(p);
    assert.ok(pkg.repository, 'sdk/package.json has no repository field to remove — the fix regressed');
    delete pkg.repository;
    writeJson(p, pkg);

    const { status, out } = runGate(dir);
    assert.notStrictEqual(status, 0,
      'removing sdk/package.json\'s repository field left the gate GREEN. That is exactly the tree that '
      + `returned 422 from the registry after two packages had already published:\n${out}`);
    assert.match(out, /mindforge-sdk/, 'the failure does not name the offending package');
    assert.match(out, /repository\.url/, 'the failure does not name the field, so it is not actionable');
  });
});

test('a case-only mismatch fails, because npm matches case-sensitively', () => {
  withSandbox((dir) => {
    const p = path.join(dir, 'sdk', 'package.json');
    const pkg = readJson(p);
    const flipped = pkg.repository.url.replace('sairam0424', 'Sairam0424');
    assert.notStrictEqual(flipped, pkg.repository.url, 'the case mutation did not change the URL');
    writeJson(p, { ...pkg, repository: { ...pkg.repository, url: flipped } });

    const { status, out } = runGate(dir);
    assert.notStrictEqual(status, 0,
      `a case-only owner mismatch passed. npm documents the match as case-sensitive:\n${out}`);
    assert.match(out, /CASE ONLY/,
      'the gate rejected it but did not say the difference is case, which is the one difference a '
      + 'reader comparing two URLs by eye will not notice');
  });
});

test('the gate refuses to pass vacuously when no provenance publish is discovered', () => {
  withSandbox((dir) => {
    const p = path.join(dir, WORKFLOW_REL);
    const before = fs.readFileSync(p, 'utf8');
    const after = before.split('--provenance').join('');
    assert.notStrictEqual(after, before, 'the workflow contains no --provenance to strip');
    fs.writeFileSync(p, after);

    const { status, out } = runGate(dir);
    assert.notStrictEqual(status, 0,
      'with every --provenance removed from the workflow the gate reported SUCCESS. A check that '
      + 'examined nothing must not be green: that is how a shape change in the file being scanned turns '
      + `a gate into a decoration:\n${out}`);
    assert.match(out, /no "npm publish --provenance" step/,
      'the failure does not explain that nothing was found, so a maintainer would look for a bad '
      + 'manifest instead of a bad parse');
  });
});

test('a newly added provenance package is covered without editing the gate', () => {
  withSandbox((dir) => {
    // A fourth package, published with provenance from a directory whose manifest lacks a repository.
    fs.mkdirSync(path.join(dir, 'extra'), { recursive: true });
    writeJson(path.join(dir, 'extra', 'package.json'), { name: 'mindforge-extra', version: '0.0.1' });

    const p = path.join(dir, WORKFLOW_REL);
    const text = fs.readFileSync(p, 'utf8');
    const step = [
      '      - name: Publish the extra package to npm',
      '        working-directory: extra',
      '        run: |',
      '          npm publish --access public --provenance',
      '',
    ].join('\n');
    fs.writeFileSync(p, `${text.replace(/\n$/, '')}\n\n${step}`);

    const { status, out } = runGate(dir);
    assert.notStrictEqual(status, 0,
      'a fourth provenance-published package with no repository field passed. The gate is supposed to '
      + `discover publish steps from the workflow, not check a fixed list of three:\n${out}`);
    assert.match(out, /mindforge-extra|extra\/package\.json/,
      `the failure does not mention the newly added package:\n${out}`);
    assert.match(out, /4 package\(s\) publish with --provenance/,
      `the gate did not discover the fourth step at all:\n${out}`);
  });
});

test('the gate is wired into the release preflight, ahead of every publish', () => {
  const wf = fs.readFileSync(path.join(ROOT, WORKFLOW_REL), 'utf8');
  const code = wf.split('\n').filter((l) => !/^\s*#/.test(l)).join('\n');

  assert.match(code, /npm run provenance:check/,
    'nothing runs the provenance gate. Written and unwired, it is worth nothing — which was the state '
    + 'of harness:audit, harness:compliance and release:ready before CI-01.');

  const iGate = code.indexOf('npm run provenance:check');
  const iPublish = code.indexOf('npm publish');
  assert.ok(iGate > 0 && iPublish > 0, 'could not locate the gate or the first publish');
  assert.ok(iGate < iPublish,
    'the provenance gate runs AFTER a publish. Its entire purpose is to fail before anything reaches '
    + 'npm irreversibly; downstream of a publish it can only describe damage already done.');

  const scripts = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8')).scripts;
  assert.strictEqual(scripts['provenance:check'], 'node scripts/ci/verify-provenance-metadata.js',
    'package.json has no provenance:check script pointing at the gate');
});
