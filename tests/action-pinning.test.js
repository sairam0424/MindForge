/**
 * The release path is the trust anchor, so what runs there must be pinned to a commit.
 *
 * THE DEFECT. This package publishes to npm with SLSA provenance. Measured before the gate existed:
 *
 *     41 `uses:` refs across 11 workflow files
 *      0 pinned to a commit SHA
 *      1 third-party — softprops/action-gh-release@v3, sitting in the job that carries
 *                      `contents: write` and runs `npm publish --access public --provenance`
 *
 * A mutable tag is a promise from a repository nobody here controls. Moving `@v3` is a one-line change
 * over there that lands in the job holding the publish token over here.
 *
 * WHAT PINNING COST, measured: nothing. Each SHA written is the CURRENT tip of the tag it replaced —
 * resolved through the GitHub API, and for the annotated tag dereferenced to its commit:
 *
 *     actions/checkout@v4              -> 11d5960a326750d5838078e36cf38b85af677262  (also tagged v4.4.0)
 *     actions/setup-node@v6            -> 249970729cb0ef3589644e2896645e5dc5ba9c38  (also tagged v6.5.0)
 *     softprops/action-gh-release@v3   -> 3d0d9888cb7fd7b750713d6e236d1fcb99157228  (also tagged v3.0.2)
 *
 * Normalising the ref strings makes the before/after release workflow byte-identical, so this is
 * provably a zero-behaviour-change operation.
 *
 * WHAT WAS CORRECTED IN THE FINDING. It arrived claiming the release job "pins Node 20 while npm
 * trusted publishing requires >= 22.14.0, so OIDC publishing cannot work". The release job does not
 * use trusted publishing: it runs `npm publish --provenance` with
 * `NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}` — token auth plus a Sigstore attestation, which is why
 * `id-token: write` is present. Node 20's npm supports --provenance. So the Node version is NOT a
 * blocker for what this workflow actually does, and it was left alone. Migrating to real trusted
 * publishing would need both a Node bump AND registry-side configuration, which is an operator action,
 * not a repository change.
 *
 * WHY THE RATCHET IS NOT A COP-OUT. 36 first-party refs (actions/*) outside the release path remain on
 * tags. That is deliberate: GitHub's own actions are the least likely vector, .github/dependabot.yml
 * already tracks `github-actions` monthly so pins stay fresh, and pinning 36 refs in the same change
 * as the security fix buries it. The gate prints every one of those 36 with file:line on EVERY run, so
 * "0 violations" can never be misread as "everything is pinned" — and the ceiling can only fall.
 */
'use strict';

const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const REPO_ROOT = fs.realpathSync(path.join(__dirname, '..'));
const GATE = path.join(REPO_ROOT, 'scripts', 'ci', 'verify-action-pinning.js');
const WORKFLOWS = path.join(REPO_ROOT, '.github', 'workflows');
const RELEASE = path.join(WORKFLOWS, 'mindforge-release.yml');
const CI = path.join(WORKFLOWS, 'mindforge-ci.yml');

let passed = 0;
let failed = 0;
const tests = [];
function test(name, fn) { tests.push({ name, fn }); }

/** Run the REAL gate, optionally against a fixture workflow directory. */
function runGate(dir, env = {}) {
  const r = spawnSync(process.execPath, [GATE], {
    cwd: REPO_ROOT,
    encoding: 'utf8',
    env: { ...process.env, ...(dir ? { ACTION_PIN_WORKFLOW_DIR: dir } : {}), ...env },
  });
  return { status: r.status, out: `${r.stdout || ''}${r.stderr || ''}` };
}

/** A fixture workflow dir seeded from the real one, then mutated. */
function withFixture(mutate) {
  const dir = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'mf-pin-')));
  try {
    for (const f of fs.readdirSync(WORKFLOWS).filter((f) => /\.ya?ml$/.test(f))) {
      fs.copyFileSync(path.join(WORKFLOWS, f), path.join(dir, f));
    }
    mutate(dir);
    return runGate(dir);
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
}

const patch = (dir, file, from, to) => {
  const p = path.join(dir, file);
  const s = fs.readFileSync(p, 'utf8');
  assert.ok(s.includes(from), `fixture patch did not apply: ${from} absent from ${file}`);
  fs.writeFileSync(p, s.replace(from, to));
};

// ── the gate passes on the real tree, and its numbers are the measured ones ──

test('the gate passes on this repository', () => {
  const r = runGate();
  assert.strictEqual(r.status, 0, `verify:pinning failed:\n${r.out}`);
  assert.match(r.out, /third-party: *1 \(1 pinned\)/,
    `expected exactly one third-party action, pinned. Output:\n${r.out}`);
  assert.match(r.out, /release path \(mindforge-release\.yml\): 3 refs, 3 pinned/,
    `every release-path ref must be pinned. Output:\n${r.out}`);
});

test('the gate NAMES every unpinned ref, never just a count', () => {
  // A ratchet reported as a bare number invites reading "0 violations" as "all pinned". Each of the 36
  // remaining refs must appear with file:line on every run, so the gap is visible without digging.
  const r = runGate();
  const named = (r.out.match(/^ {6}\S+\.ya?ml:\d+ {2}\S+@\S+$/gm) || []);
  assert.ok(named.length >= 30,
    `expected the gate to list each unpinned ref with file:line; found ${named.length} such lines. `
    + 'A gate that prints only a total lets a silent regression hide inside the number.');
  assert.match(r.out, /these are NOT pinned:/,
    'the listing must be labelled as unpinned, not presented as neutral inventory');
});

// ── it can fail, in each way that matters ────────────────────────────────────

test('an unpinned THIRD-PARTY action fails the gate', () => {
  const r = withFixture((d) => patch(d, 'mindforge-release.yml',
    'softprops/action-gh-release@3d0d9888cb7fd7b750713d6e236d1fcb99157228 # v3.0.2',
    'softprops/action-gh-release@v3'));
  assert.strictEqual(r.status, 1, `an unpinned third-party action must fail. Output:\n${r.out}`);
  assert.match(r.out, /THIRD-PARTY not pinned/, `wrong reason:\n${r.out}`);
});

test('an unpinned FIRST-PARTY action in the release path fails the gate', () => {
  // The release path holds first-party actions to the same standard, because that is the workflow
  // whose compromise reaches published artifacts.
  const r = withFixture((d) => patch(d, 'mindforge-release.yml',
    'actions/checkout@11d5960a326750d5838078e36cf38b85af677262 # v4.4.0',
    'actions/checkout@v4'));
  assert.strictEqual(r.status, 1, `an unpinned release-path ref must fail. Output:\n${r.out}`);
  assert.match(r.out, /RELEASE PATH not pinned/, `wrong reason:\n${r.out}`);
});

test('a NEW unpinned first-party ref elsewhere fails the ratchet', () => {
  // The ceiling only turns one way. Adding an unpinned ref must fail rather than quietly raise it.
  const r = withFixture((d) => patch(d, 'mindforge-ci.yml',
    '      - uses: actions/checkout@v4',
    '      - uses: actions/checkout@v4\n      - uses: actions/cache@v4'));
  assert.strictEqual(r.status, 1, `exceeding the ceiling must fail. Output:\n${r.out}`);
  assert.match(r.out, /ratchet only turns one way|rose to 37/, `wrong reason:\n${r.out}`);
});

test('a short or malformed SHA is NOT accepted as a pin', () => {
  // 7-hex abbreviations are ambiguous and can be forged far more cheaply than a full SHA.
  for (const bogus of ['3d0d988', '3d0d9888cb7fd7b750713d6e236d1fcb9915722', 'ZZZ0d9888cb7fd7b750713d6e236d1fcb99157228']) {
    const r = withFixture((d) => patch(d, 'mindforge-release.yml',
      'softprops/action-gh-release@3d0d9888cb7fd7b750713d6e236d1fcb99157228 # v3.0.2',
      `softprops/action-gh-release@${bogus} # v3.0.2`));
    assert.strictEqual(r.status, 1,
      `"${bogus}" must not count as a pin (it is ${bogus.length} chars). Output:\n${r.out}`);
  }
});

test('an EMPTY scan fails rather than reporting success', () => {
  // The gitleaks lesson, one directory over: a checker that finds nothing must not say "all clear".
  // If the parser breaks or the workflows move, 0 refs is a broken instrument, not a clean repo.
  const dir = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'mf-pin-empty-')));
  try {
    const r = runGate(dir);
    assert.strictEqual(r.status, 1, `an empty scan must fail. Output:\n${r.out}`);
    assert.match(r.out, /found NO `uses:` references|Refusing to report success/,
      `wrong reason:\n${r.out}`);
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

// ── the pins themselves are well-formed and reviewable ───────────────────────

test('every release-path pin is a full 40-hex SHA with a version comment', () => {
  const lines = fs.readFileSync(RELEASE, 'utf8').split('\n');
  const uses = lines.map((l, i) => ({ l, n: i + 1 })).filter(({ l }) => /^\s*(?:-\s*)?uses:/.test(l));
  assert.ok(uses.length >= 3, `expected at least 3 refs in the release workflow, found ${uses.length}`);
  for (const { l, n } of uses) {
    assert.match(l, /@[0-9a-f]{40}\b/,
      `mindforge-release.yml:${n} is not pinned to a full commit SHA: ${l.trim()}`);
    assert.match(l, /#\s*v[0-9]/,
      `mindforge-release.yml:${n} has no \`# vX.Y.Z\` comment, so the pin is unreviewable: ${l.trim()}`);
  }
});

// ── wiring: a gate nobody runs is not a gate ─────────────────────────────────

test('the gate is wired into package.json and executed by CI', () => {
  const pkg = JSON.parse(fs.readFileSync(path.join(REPO_ROOT, 'package.json'), 'utf8'));
  assert.strictEqual(pkg.scripts['verify:pinning'], 'node scripts/ci/verify-action-pinning.js',
    'package.json must expose the gate as `verify:pinning`');

  // SCOPED TO THE STEP that runs it, not the whole file. A whole-file substring match is how an
  // assertion ends up satisfied by an unrelated step — that exact mistake let a neutered `exit 1`
  // pass earlier today.
  const ci = fs.readFileSync(CI, 'utf8');
  const runLines = ci.split('\n').map((l) => l.trim())
    .filter((l) => l.startsWith('run:') || l.startsWith('- run:') || /^(npm |node )/.test(l));
  assert.ok(runLines.some((l) => l.includes('npm run verify:pinning')),
    'CI must invoke `npm run verify:pinning` from a run: line, not merely mention it in a comment');
});

// ── the release workflow's privilege shape, including JOB level ──────────────

test('the release workflow grants no MORE than contents+id-token, at either level', () => {
  // Covers WORKFLOW-level and JOB-level blocks. Reading only the column-0 mapping is a real blind
  // spot: a job block can widen privileges invisibly to a workflow-level-only check, and GitHub
  // resolves the job block as an override rather than an intersection.
  const text = fs.readFileSync(RELEASE, 'utf8');
  const lines = text.split('\n');

  const scopes = [];
  lines.forEach((line, i) => {
    if (!/^\s*permissions:\s*$/.test(line)) return;
    const indent = line.match(/^\s*/)[0].length;
    for (let j = i + 1; j < lines.length; j++) {
      const m = lines[j].match(/^(\s*)([a-z-]+):\s*(read|write|none)\s*$/);
      if (!m || m[1].length <= indent) break;
      scopes.push({ level: indent === 0 ? 'workflow' : 'job', key: m[2], value: m[3], line: j + 1 });
    }
  });

  assert.ok(scopes.length > 0,
    'the release workflow must declare an explicit permissions block — inheriting the repository '
    + 'default gives the publish job whatever the org default is, which is frequently write-all');

  const ALLOWED_WRITE = new Set(['contents', 'id-token']);
  const overreach = scopes.filter((s) => s.value === 'write' && !ALLOWED_WRITE.has(s.key));
  assert.deepStrictEqual(overreach.map((s) => `${s.level} ${s.key}: write @${s.line}`), [],
    'the release workflow grants write on a scope it does not need. contents:write is for the GitHub '
    + 'release, id-token:write for the provenance attestation; anything else widens what a compromised '
    + 'action could reach.');

  // And it must still HAVE what it needs, or the publish silently loses provenance.
  const keys = new Set(scopes.filter((s) => s.value === 'write').map((s) => s.key));
  for (const need of ['contents', 'id-token']) {
    assert.ok(keys.has(need),
      `the release workflow must keep ${need}: write — without id-token the --provenance attestation `
      + 'cannot be produced, and npm publishes WITHOUT provenance rather than failing');
  }
});

test('the release job still publishes with provenance', () => {
  // The point of the whole exercise. If --provenance were dropped, pinning would guard a supply chain
  // that no longer attests anything.
  const text = fs.readFileSync(RELEASE, 'utf8');
  assert.match(text, /npm publish[^\n]*--provenance/,
    'the release must publish with --provenance; pinning protects an attested artifact');
});

(async () => {
  for (const { name, fn } of tests) {
    try { await fn(); console.log(`  ✅  ${name}`); passed++; }
    catch (e) { console.error(`  ❌  ${name}\n      ${e.message}`); failed++; }
  }
  console.log(`\nAction Pinning: ${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
})();
