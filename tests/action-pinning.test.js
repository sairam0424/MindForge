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
  // ALL release-path refs pinned, expressed as a backreference rather than a literal count. The
  // assertion used to hardcode "3 refs, 3 pinned", which broke the moment the release workflow grew a
  // preflight job whose two actions were BOTH correctly pinned — a change that strictly improved the
  // thing being measured. `(\d+) refs, \1 pinned` cannot be satisfied by an unpinned ref and does not
  // need editing when the release path legitimately changes size. The floor below keeps it from
  // passing on an empty scan.
  const rel = r.out.match(/release path \(mindforge-release\.yml\): (\d+) refs, (\d+) pinned/);
  assert.ok(rel, `the gate must report the release-path ref counts. Output:\n${r.out}`);
  assert.strictEqual(rel[1], rel[2],
    `every release-path ref must be pinned — ${rel[1]} refs but only ${rel[2]} pinned. Output:\n${r.out}`);
  assert.ok(Number(rel[1]) >= 3,
    `only ${rel[1]} release-path ref(s) found. The release workflow uses checkout, setup-node and `
    + `gh-release at minimum, so a lower number means the scan stopped seeing the file.\n${r.out}`);
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

// ── least privilege across the whole CI surface ──────────────────────────────

/** Every permissions scope declared in a file, tagged workflow- or job-level. */
function permissionScopes(file) {
  const lines = fs.readFileSync(path.join(WORKFLOWS, file), 'utf8').split('\n');
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
  return scopes;
}

const workflowFiles = () => fs.readdirSync(WORKFLOWS).filter((f) => /\.ya?ml$/.test(f)).sort();

test('every workflow declares an explicit permissions block', () => {
  // Six workflows declared none and inherited the repository default, which is frequently write-all —
  // so a compromised action in a lint job had the same reach as the publish job. An omitted block is
  // invisible: nothing in the file says "write-all", it just happens.
  const files = workflowFiles();
  assert.ok(files.length >= 10, `expected the workflow set to be intact, found ${files.length} files`);
  const missing = files.filter((f) => !permissionScopes(f).some((s) => s.level === 'workflow'));
  assert.deepStrictEqual(missing, [],
    `${missing.length} workflow(s) declare no workflow-level permissions and inherit the repository `
    + `default: ${missing.join(', ')}. Add \`permissions:\` with the minimum the workflow needs.`);
});

test('no workflow grants write beyond what it demonstrably needs', () => {
  // WRITE is the interesting axis, and the expectations are derived from what each workflow does:
  //   contents:write + id-token:write  release only — the GitHub release and the provenance attestation
  //   pull-requests:write              only jobs that call github.rest.pulls.createReview
  // Anything else is reach a compromised action could use.
  // Each entry is justified from the workflow's own content, verified by grep, not assumed:
  const ALLOWED = {
    // The GitHub release needs contents:write; --provenance needs id-token:write.
    'mindforge-release.yml': new Set(['contents', 'id-token']),
    // github.rest.pulls.createReview, on the one job that posts the review.
    'mindforge-ai-review.yml': new Set(['pull-requests']),
    'mindforge-ci.yml': new Set(['pull-requests']),
    // github.rest.issues.createComment.
    'ai-intelligence.yml': new Set(['pull-requests']),
    // github.rest.pulls.create + pulls.list.
    //
    // contents:write is NOT justified by anything in the file — no branch, commit or tag operation
    // appears in it. Allowlisted as PRE-EXISTING rather than removed, because auto-pr.yml is how pull
    // requests get raised in this repository and breaking it to tighten a scope I have not fully
    // traced would cost more than it saves. Recorded as a follow-up, not endorsed.
    'auto-pr.yml': new Set(['contents', 'pull-requests']),
    // pull-requests:write IS justified: control-plane.yml calls ./ai-intelligence.yml as a reusable
    // workflow, and a called workflow inherits the caller's permissions, so the grant is what lets
    // createComment work one level down.
    //
    // security-events:write is NOT justified — nothing in the file uploads SARIF or touches code
    // scanning (grep for sarif|codeql|upload-sarif|code-scanning returns nothing). Same treatment as
    // above: allowlisted as pre-existing and named, so it is a known loose end rather than an
    // invisible one.
    'control-plane.yml': new Set(['pull-requests', 'security-events']),
  };
  const offenders = [];
  for (const f of workflowFiles()) {
    const allowed = ALLOWED[f] || new Set();
    for (const s of permissionScopes(f).filter((x) => x.value === 'write')) {
      if (!allowed.has(s.key)) offenders.push(`${f}:${s.line} ${s.level} ${s.key}: write`);
    }
  }
  assert.deepStrictEqual(offenders, [],
    `${offenders.length} permission grant(s) exceed what the workflow needs:\n  ${offenders.join('\n  ')}`);
});

test('the jobs that post a PR review keep pull-requests: write', () => {
  // The converse, and it matters more than it looks: without this grant createReview fails at RUNTIME.
  // mindforge-ai-review.yml's step carries `continue-on-error: true`, so the job would go GREEN while
  // silently never posting a review — an instrument reporting success while doing nothing, produced by
  // over-tightening a permission.
  for (const [file, job] of [['mindforge-ai-review.yml', 'ai-reviewer'], ['mindforge-ci.yml', 'mindforge-ai-review']]) {
    const text = fs.readFileSync(path.join(WORKFLOWS, file), 'utf8');
    assert.match(text, /github\.rest\.pulls\.createReview/,
      `${file} no longer posts a review — drop the pull-requests: write grant with it`);
    const jobScopes = permissionScopes(file).filter((s) => s.level === 'job');
    assert.ok(jobScopes.some((s) => s.key === 'pull-requests' && s.value === 'write'),
      `${file} job "${job}" calls createReview but has no pull-requests: write, so the review will fail `
      + 'at runtime — and with continue-on-error the job still reports success');
    assert.ok(jobScopes.some((s) => s.key === 'contents' && s.value === 'read'),
      `${file} job "${job}" overrides permissions without restating contents: read. GitHub treats a job `
      + 'block as an OVERRIDE, not an intersection, so the checkout would lose repo read access.');
  }
});

test('the release job still publishes with provenance', () => {
  // The point of the whole exercise. If --provenance were dropped, pinning would guard a supply chain
  // that no longer attests anything.
  const text = fs.readFileSync(RELEASE, 'utf8');
  assert.match(text, /npm publish[^\n]*--provenance/,
    'the release must publish with --provenance; pinning protects an attested artifact');
});

// ── the publishing path is gated, and stays gated ─────────────────────────────
//
// WHY THIS EXISTS. A preflight job was added to mindforge-release.yml to close a real hole: publishing
// is triggered ONLY by a `v*` tag push, and the repo's single ruleset is target=branch, so its six
// required checks never applied to the publishing event — and GitHub cannot attach required checks to a
// tag, so no ruleset can fix it. An adversarial review of that change pointed out the obvious gap: the
// gate had NO test, so deleting the entire preflight job would have left the suite green. A gate nobody
// asserts is the defect class this repo keeps finding.
//
// ON ASSERTING TEXT. Elsewhere in this suite, matching source text is the wrong shape — a comment can
// satisfy it, and the real question is behaviour. Here the subject IS text: a workflow file is a
// declarative spec that GitHub reads, so its content is the behaviour. There is no runtime to exercise
// locally, and the alternative (trusting a review) is what let the hole exist for the whole project's
// life. These assertions are deliberately structural, and each names what breaks if it fails.
/**
 * The workflow with full-line `#` comments stripped.
 *
 * CAUGHT BY FALSIFYING MY OWN ASSERTION. The first version of the monotonicity check was
 * `assert.match(rel, /sort -V/)` against the raw file. Removing `| sort -V | tail -1` from the actual
 * command left the suite GREEN, because the comment above it explains why `sort -V` is used — so the
 * prose satisfied the assertion for the code. That is precisely the "a comment satisfies the test"
 * defect this suite exists to eliminate, reproduced by me in the test written to prevent it.
 *
 * Only FULL-LINE comments are removed. Trailing `# vX.Y.Z` pin comments are load-bearing for the
 * pinning assertions above, which deliberately keep reading the raw file.
 */
function releaseCode() {
  return fs.readFileSync(RELEASE, 'utf8')
    .split('\n')
    .filter((l) => !/^\s*#/.test(l))
    .join('\n');
}

test('the release workflow gates publishing behind preflight, and cannot be silently ungated', () => {
  const rel = releaseCode();

  assert.match(rel, /^\s{2}preflight:$/m,
    'mindforge-release.yml has no `preflight:` job. Publishing is triggered only by a v* tag push and '
    + 'the branch ruleset cannot cover a tag, so without this job a tag reaches npm having passed '
    + 'nothing but the publish job\'s own `npm test`.');
  assert.match(rel, /^\s{4}needs:\s*preflight$/m,
    'the `release:` job does not declare `needs: preflight`. Without it the gate exists but does not '
    + 'block, which is worse than having no gate — it reads as protection while providing none.');

  // The publish job must come AFTER the gate in the file's job order too, so a future reader is not
  // misled about sequencing. Index comparison, not a regex, so it cannot pass on a coincidence.
  assert.ok(rel.indexOf('\n  preflight:') < rel.indexOf('\n  release:'),
    'the preflight job must be declared before the release job for readability');

  assert.match(rel, /merge-base --is-ancestor/,
    'preflight no longer asserts the tagged commit is an ancestor of main. Without it any commit — a '
    + 'feature branch, an unmerged experiment, a reverted commit — can be tagged and published, with '
    + 'provenance attesting to that tree.');

  // Every gate the branch ruleset enforces on a PR and a tag push never sees.
  for (const gate of ['harness:audit', 'harness:gate', 'harness:compliance',
    'validate:assets', 'version:check', 'release:ready']) {
    assert.ok(rel.includes(`npm run ${gate}`),
      `preflight no longer runs \`npm run ${gate}\`. That gate runs on every branch push and pull `
      + 'request and never on a tag, so dropping it here means it does not run on the release path at all.'
      + (gate === 'release:ready'
        ? ' release:ready is the check that fails when CHANGELOG.md has no entry for the version being published.'
        : ''));
  }
});

test('the release job installs everything the suite needs, matching the CI job that runs it', () => {
  // THE DEFECT. `npm test` runs in two places: mindforge-ci.yml's Code Quality Gates job, and
  // mindforge-release.yml's publish job. Code Quality Gates has always installed the SDK's
  // devDependencies; the release job did root `npm ci` only, and nothing asserted the two agreed.
  //
  // That gap cost a release. `npx eslint .` from the repo root discovers sdk/eslint.config.mjs, which
  // imports `typescript-eslint` from the SDK's devDependencies — so with a root-only install ESLint
  // cannot LOAD, exits 2, and tests/verification-runner.test.js fails. The v11.9.3 tag push failed at
  // "Run Full Test Suite" for exactly that reason. It failed SAFELY, before any publish step, but it
  // failed for an environment difference that a one-line assertion would have caught.
  //
  // Asserts the PROPERTY (the release job installs at least what the suite-running CI job does), not a
  // literal command, so a future change to how the SDK is installed does not need this edited — only a
  // change that drops it.
  const rel = releaseCode();
  const ci = fs.readFileSync(CI, 'utf8').split('\n').filter((l) => !/^\s*#/.test(l)).join('\n');

  const ciInstallsSdk = /(?:--prefix\s+sdk|cd\s+sdk)\b/.test(ci);
  assert.ok(ciInstallsSdk,
    'mindforge-ci.yml no longer installs the SDK anywhere. If the suite stopped needing it, delete this '
    + 'test; if the install merely moved, this check needs updating rather than deleting.');

  assert.match(rel, /(?:--prefix\s+sdk|cd\s+sdk)\b/,
    'mindforge-release.yml does not install the SDK\'s dependencies, but mindforge-ci.yml does and both '
    + 'run `npm test`. Root `npm ci` alone makes `npx eslint .` fail to LOAD — the root config discovers '
    + 'sdk/eslint.config.mjs, which imports typescript-eslint — so verification-runner.test.js fails and '
    + 'the release aborts at the test step. This is what happened on the first v11.9.3 tag push.');

  // And it must happen BEFORE the suite runs, or it does not help.
  const instIdx = rel.search(/(?:--prefix\s+sdk|cd\s+sdk)\b/);
  const testIdx = rel.indexOf('run: npm test');
  assert.ok(testIdx > 0, 'the release job no longer runs `npm test`');
  assert.ok(instIdx < testIdx,
    'the SDK install must come BEFORE `npm test` in the release job; installing after it is decoration');
});

test('the stable dist-tag step is monotonic, verified on the uncached endpoint, and cannot block the release', () => {
  const rel = releaseCode();
  const distIdx = rel.indexOf('- name: Point the stable dist-tag at this release');
  const ghIdx = rel.indexOf('- name: Create GitHub Release');
  assert.ok(distIdx > 0, 'the stable dist-tag step is gone — `stable` drifted four releases behind '
    + '`latest` (11.8.3 vs 11.9.2) precisely because nothing automated it');
  assert.ok(ghIdx > 0, 'the Create GitHub Release step is gone');

  // ORDERING. Moving a dist-tag is cosmetic and always retryable; the GitHub Release carries the notes
  // and the .tgz. With the dist-tag step first, any dist-tag hiccup cost the release its artifacts on a
  // run whose npm publishes had already succeeded and cannot be undone.
  assert.ok(distIdx > ghIdx,
    'the dist-tag step must come AFTER Create GitHub Release, so a dist-tag failure cannot suppress the '
    + 'release notes and tarball for a release that already published to npm.');

  // MONOTONICITY. `npm dist-tag add` is idempotent per (package, version, tag) but never version-aware,
  // so re-running an older tag's workflow after a newer release moves `stable` BACKWARD — and a
  // read-back confirms the downgrade as success.
  // The whole pipeline, not the bare token: `sort -V` alone also appears in the comment explaining it,
  // and matching that is what made the first version of this assertion vacuous.
  assert.match(rel, /\|\s*sort -V\s*\|\s*tail -1/,
    'the dist-tag step lost its monotonicity guard. Re-running a published-but-failed older release — '
    + 'the normal thing to re-run, and 6 of the last 12 release runs were failures — would silently '
    + 'downgrade every `mindforge-cc@stable` consumer, and the read-back would confirm it as success.');
  assert.match(rel, /refusing to move it backward/,
    'the backward-move refusal message is gone; the guard must say why it declined');

  // ENDPOINT. `npm view <pkg> dist-tags.stable` reads the CDN-backed packument (measured
  // cache-control: public, max-age=300). `npm dist-tag ls` reads /-/package/<pkg>/dist-tags, which is
  // DYNAMIC and is the same path the write PUTs to. Verifying an uncached write via the cached aggregate
  // is how a correct move reads back stale and fails a perfect release.
  assert.match(rel, /npm dist-tag ls mindforge-cc/,
    'the dist-tag read must use `npm dist-tag ls` (uncached /-/package/<pkg>/dist-tags), not `npm view`');
  assert.ok(!/npm view mindforge-cc dist-tags\.stable/.test(rel),
    'the dist-tag step reads `npm view mindforge-cc dist-tags.stable`, which hits the CDN-cached '
    + 'packument (max-age=300). A correct write can read back stale there and fail the release.');
});

(async () => {
  for (const { name, fn } of tests) {
    try { await fn(); console.log(`  ✅  ${name}`); passed++; }
    catch (e) { console.error(`  ❌  ${name}\n      ${e.message}`); failed++; }
  }
  console.log(`\nAction Pinning: ${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
})();
