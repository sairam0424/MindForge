/**
 * Guards bin/change-classifier.js — the input to every Tier-3 governance decision.
 *
 * THE DEFECT THIS PINS. A push is a RANGE, not a commit, but the classifier used
 * `HEAD~1..HEAD` whenever GITHUB_BASE_REF was unset, so on a push it inspected only the tip.
 * Measured on a scratch repo: two commits where the first adds auth/login.js with a hardcoded
 * password and the second is docs-only classify
 *     TIER=1  as a push        (sensitive file invisible)
 *     TIER=3  as a pull request
 * control-plane.yml triggers on `push: [main, develop]` and this repo has allow_rebase_merge
 * enabled, so a multi-commit push is the normal case. And because control-plane.yml:54 gates
 * the governance job on `if: needs.classify.outputs.tier == '3'`, a mis-scoped push did not
 * merely PASS the gate — it skipped the job entirely.
 *
 * SECOND DEFECT. SENSITIVE_PATHS listed `.mindforge/governance/` (5 markdown files) but not
 * `bin/governance/` (15 executable modules: audit-hash, audit-verifier, rbac, policy-engine,
 * approve). Editing the prose ABOUT governance tripped Tier 3; editing the code that enforces
 * it did not. `bin/security/` was likewise missed — 'security/' does not prefix-match it.
 *
 * Every exit code below is read from spawnSync().status, never through a pipe: `$?` after a
 * pipeline is the LAST command's status, which has produced false passes in this repo before.
 */
'use strict';

const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync, execFileSync } = require('node:child_process');

const REPO_ROOT = fs.realpathSync(path.join(__dirname, '..'));
const CLASSIFIER = path.join(REPO_ROOT, 'bin', 'change-classifier.js');

let passed = 0;
let failed = 0;
const tests = [];
function test(name, fn) { tests.push({ name, fn }); }

/** Run a git command in `dir`, throwing on failure. */
function git(dir, ...args) {
  return execFileSync('git', args, { cwd: dir, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
}

/**
 * A scratch repo whose history is:
 *   base            README.md
 *   sensitive       auth/login.js   <- must be classified
 *   tip             docs/notes.md   <- benign, and the only thing HEAD~1..HEAD sees
 * Returns { dir, before } where `before` is the pre-push tip.
 */
function repoWithSensitiveCommitBehindBenignTip() {
  const dir = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'mf-cls-')));
  git(dir, 'init', '-q', '.');
  git(dir, 'config', 'user.email', 'test@example.com');
  git(dir, 'config', 'user.name', 'test');
  fs.mkdirSync(path.join(dir, 'auth'), { recursive: true });
  fs.mkdirSync(path.join(dir, 'docs'), { recursive: true });

  fs.writeFileSync(path.join(dir, 'README.md'), 'readme\n');
  git(dir, 'add', '-A'); git(dir, 'commit', '-qm', 'base');
  const before = git(dir, 'rev-parse', 'HEAD').trim();

  fs.writeFileSync(path.join(dir, 'auth', 'login.js'), 'const pw = \'hunter2\';\n');
  git(dir, 'add', '-A'); git(dir, 'commit', '-qm', 'feat(auth): login');

  fs.writeFileSync(path.join(dir, 'docs', 'notes.md'), '# notes\n');
  git(dir, 'add', '-A'); git(dir, 'commit', '-qm', 'docs: notes');

  return { dir, before };
}

// A throwaway HOME for every spawned child. The classifier itself does not write to $HOME, but
// handing children the real one is the pattern that let five suites silently append to the
// developer's ~/.mindforge/registry.json (installer-core.js:253 resolves it via os.homedir()).
// Confining it here keeps this file correct if the classifier ever gains a HOME-dependent read, and
// satisfies tests/no-home-leak.test.js, which bans the pattern repo-wide rather than per-suite.
const SCRATCH_HOME = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'mf-cls-home-')));

/** Spawn the classifier in `dir` with `env` overrides. Returns {status, tier, reasons, out}. */
function runClassifier(dir, env = {}) {
  const r = spawnSync(process.execPath, [CLASSIFIER], {
    cwd: dir,
    encoding: 'utf8',
    // A clean env: inheriting a real GitHub Actions env would silently change the code path.
    env: {
      PATH: process.env.PATH, HOME: SCRATCH_HOME,
      GIT_CONFIG_GLOBAL: '/dev/null', GIT_CONFIG_SYSTEM: '/dev/null',
      ...env,
    },
  });
  const out = `${r.stdout || ''}${r.stderr || ''}`;
  const tier = (r.stdout || '').match(/^TIER=(\d)$/m);
  const reasons = (r.stdout || '').match(/^REASONS=(.*)$/m);
  return { status: r.status, tier: tier ? tier[1] : null, reasons: reasons ? reasons[1] : null, out };
}

// ── The push-range bypass ────────────────────────────────────────────────────

test('a push whose TIP is benign still classifies the sensitive commit behind it', () => {
  const { dir, before } = repoWithSensitiveCommitBehindBenignTip();
  try {
    const r = runClassifier(dir, { GITHUB_EVENT_NAME: 'push', MINDFORGE_PUSH_BEFORE: before });
    assert.strictEqual(r.tier, '3',
      `expected TIER=3 for a push containing auth/login.js. Got tier=${r.tier}. Output:\n${r.out}`);
    assert.match(r.reasons, /auth\/login\.js/,
      `the reason must name the sensitive file, got: ${r.reasons}`);
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test('the OLD tip-only range genuinely missed it (proves the test is not vacuous)', () => {
  // Without this, the case above could pass because the fixture is trivially Tier 3 by some
  // other route. HEAD~1..HEAD is still reachable as the LOCAL developer path, so running with
  // no GITHUB_EVENT_NAME reproduces exactly the window the old code used on a push.
  const { dir } = repoWithSensitiveCommitBehindBenignTip();
  try {
    const r = runClassifier(dir, {});
    assert.strictEqual(r.tier, '1',
      'fixture precondition: the tip-only window must see ONLY docs/notes.md and score tier 1. ' +
      `Got tier=${r.tier}; the fixture no longer demonstrates the defect.\n${r.out}`);
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test('`before` is read from the push event payload, needing no workflow wiring', () => {
  // control-plane.yml runs `node bin/change-classifier.js` with no env: block. A fix that
  // required threading `${{ github.event.before }}` through would revert the first time a
  // workflow was copied, so the payload is the load-bearing input.
  const { dir, before } = repoWithSensitiveCommitBehindBenignTip();
  try {
    const evPath = path.join(dir, 'event.json');
    fs.writeFileSync(evPath, JSON.stringify({ before, after: git(dir, 'rev-parse', 'HEAD').trim() }));
    const r = runClassifier(dir, { GITHUB_EVENT_NAME: 'push', GITHUB_EVENT_PATH: evPath });
    assert.strictEqual(r.tier, '3',
      `payload-derived range must classify the sensitive file. Got tier=${r.tier}.\n${r.out}`);
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test('the reason names EVERY matched sensitive path, not just the first', () => {
  // `find` short-circuited, so a change touching both .github/workflows/ and bin/governance/ was
  // attributed only to the workflow. Measured consequence: PR #178's CI log showed
  //   REASONS=Sensitive path modified: .github/workflows/control-plane.yml
  // which was a path the OLD list already covered, so the log could not show that the
  // newly-added framework paths were doing any work — and it hid the more interesting match from
  // whoever reads the governance summary.
  const dir = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'mf-cls-multi-')));
  try {
    git(dir, 'init', '-q', '.');
    git(dir, 'config', 'user.email', 'test@example.com');
    git(dir, 'config', 'user.name', 'test');
    fs.writeFileSync(path.join(dir, 'README.md'), 'readme\n');
    git(dir, 'add', '-A'); git(dir, 'commit', '-qm', 'base');
    const before = git(dir, 'rev-parse', 'HEAD').trim();

    for (const rel of ['.github/workflows/ci.yml', 'bin/governance/policy.js', 'bin/security/gate.js']) {
      const f = path.join(dir, rel);
      fs.mkdirSync(path.dirname(f), { recursive: true });
      fs.writeFileSync(f, '// x\n');
    }
    git(dir, 'add', '-A'); git(dir, 'commit', '-qm', 'touch three sensitive paths');

    const r = runClassifier(dir, { GITHUB_EVENT_NAME: 'push', MINDFORGE_PUSH_BEFORE: before });
    assert.strictEqual(r.tier, '3');
    for (const expected of ['.github/workflows/ci.yml', 'bin/governance/policy.js', 'bin/security/gate.js']) {
      assert.ok(r.reasons.includes(expected),
        `the reason must name ${expected}; a single-match reason cannot show which rule fired. ` +
        `Got: ${r.reasons}`);
    }
    assert.match(r.reasons, /Sensitive paths modified/,
      'plural when more than one matched, so the message reads correctly');
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test('a single match stays singular, and is capped for very wide changes', () => {
  const dir = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'mf-cls-one-')));
  try {
    git(dir, 'init', '-q', '.');
    git(dir, 'config', 'user.email', 'test@example.com');
    git(dir, 'config', 'user.name', 'test');
    fs.writeFileSync(path.join(dir, 'README.md'), 'readme\n');
    git(dir, 'add', '-A'); git(dir, 'commit', '-qm', 'base');
    const before = git(dir, 'rev-parse', 'HEAD').trim();

    fs.mkdirSync(path.join(dir, 'bin', 'governance'), { recursive: true });
    for (let i = 0; i < 9; i++) fs.writeFileSync(path.join(dir, 'bin', 'governance', `m${i}.js`), '// x\n');
    git(dir, 'add', '-A'); git(dir, 'commit', '-qm', 'nine sensitive files');

    const r = runClassifier(dir, { GITHUB_EVENT_NAME: 'push', MINDFORGE_PUSH_BEFORE: before });
    assert.strictEqual(r.tier, '3');
    assert.match(r.reasons, /\(\+4 more\)/,
      `nine matches must be summarised rather than dumped whole. Got: ${r.reasons}`);
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

// ── Fail-closed behaviour ────────────────────────────────────────────────────

const FAIL_CLOSED = [
  ['branch creation (before is all-zeros)', { MINDFORGE_PUSH_BEFORE: '0'.repeat(40) }, /all-zeros|branch creation/i],
  ['before missing from the clone (shallow fetch)', { MINDFORGE_PUSH_BEFORE: 'dead'.repeat(10) }, /not present in this clone|shallow/i],
  ['no before available at all', {}, /no `before`|payload/i],
];

for (const [label, env, reasonRe] of FAIL_CLOSED) {
  test(`fails CLOSED to tier 3: ${label}`, () => {
    const { dir } = repoWithSensitiveCommitBehindBenignTip();
    try {
      const r = runClassifier(dir, { GITHUB_EVENT_NAME: 'push', ...env });
      assert.strictEqual(r.tier, '3',
        `an unscopeable push must be tier 3, not silently narrowed. Got tier=${r.tier}.\n${r.out}`);
      assert.match(r.reasons, /Fail-closed/,
        `the reason must say it failed closed, got: ${r.reasons}`);
      assert.match(r.reasons, reasonRe,
        `the reason must explain WHY it could not scope. Got: ${r.reasons}`);
      assert.strictEqual(r.status, 0,
        'exit 0 is the deliberate contract: this step REPORTS a tier and the downstream job ' +
        'gates on it. Exiting non-zero would fail the run before the gate can annotate why.');
    } finally { fs.rmSync(dir, { recursive: true, force: true }); }
  });
}

test('fail-closed writes TIER= to STDOUT, not only to GITHUB_OUTPUT', () => {
  // The old catch block appended tier=3 to GITHUB_OUTPUT and printed no TIER= line, so
  // anything parsing stdout saw no tier at all on failure.
  const { dir } = repoWithSensitiveCommitBehindBenignTip();
  try {
    const outFile = path.join(dir, 'gh-output');
    fs.writeFileSync(outFile, '');
    const r = runClassifier(dir, { GITHUB_EVENT_NAME: 'push', GITHUB_OUTPUT: outFile });
    assert.match(r.out, /^TIER=3$/m, `stdout must carry TIER=3. Output:\n${r.out}`);
    assert.match(fs.readFileSync(outFile, 'utf8'), /tier=3/,
      'GITHUB_OUTPUT must also receive tier=3 so the dependent job condition sees it');
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

// ── Pull-request scoping must not regress ────────────────────────────────────

test('a PR branch merely BEHIND its base does not inherit base-only changes', () => {
  // The three-dot merge-base diff exists to stop this false positive. A two-dot range here
  // would pull in the base's own sensitive commits and score every PR tier 3.
  const dir = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'mf-cls-pr-')));
  try {
    git(dir, 'init', '-q', '.');
    git(dir, 'config', 'user.email', 'test@example.com');
    git(dir, 'config', 'user.name', 'test');
    fs.writeFileSync(path.join(dir, 'README.md'), 'readme\n');
    git(dir, 'add', '-A'); git(dir, 'commit', '-qm', 'base');
    const fork = git(dir, 'rev-parse', 'HEAD').trim();

    // The BASE advances with a sensitive change the feature branch never touched.
    fs.mkdirSync(path.join(dir, 'auth'), { recursive: true });
    fs.writeFileSync(path.join(dir, 'auth', 'base-only.js'), 'module.exports = 1;\n');
    git(dir, 'add', '-A'); git(dir, 'commit', '-qm', 'base: unrelated auth change');
    git(dir, 'update-ref', 'refs/remotes/origin/main', git(dir, 'rev-parse', 'HEAD').trim());

    // The feature branch forks from BEFORE that and changes only a doc.
    git(dir, 'checkout', '-q', '-b', 'feature', fork);
    fs.writeFileSync(path.join(dir, 'CHANGELOG.md'), '# changes\n');
    git(dir, 'add', '-A'); git(dir, 'commit', '-qm', 'docs: changelog');

    const r = runClassifier(dir, { GITHUB_BASE_REF: 'main' });
    assert.strictEqual(r.tier, '1',
      'a docs-only PR must not be tier 3 because its BASE contains an auth change. ' +
      `Got tier=${r.tier} reasons=${r.reasons}\n${r.out}`);
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

// ── Sensitive path coverage ──────────────────────────────────────────────────

test('MindForge\'s own trust surface is classified sensitive', () => {
  const { SENSITIVE_PATHS } = require('../bin/change-classifier.js');
  // Each of these exists in this repo and was previously unclassified.
  const required = [
    'bin/governance/',       // audit-hash, audit-verifier, rbac, policy-engine, approve
    'bin/security/',         // NOT matched by 'security/' — startsWith, not substring
    'bin/hooks/',
    '.claude/settings.json', // hook registration
    '.planning/approvals/',  // the approval records themselves
  ];
  for (const p of required) {
    assert.ok(SENSITIVE_PATHS.includes(p),
      `SENSITIVE_PATHS must include ${p} — it holds part of the trust root and a change to it ` +
      'must reach Tier-3 review');
  }
});

test('the generic consumer paths are RETAINED, because this file ships', () => {
  // bin/change-classifier.js is in the published tarball, so it also runs against consumer
  // projects. auth/ payment/ security/ match zero files in MindForge's own tree — that is
  // correct, not dead config, and deleting them would silently stop classifying consumers.
  const { SENSITIVE_PATHS } = require('../bin/change-classifier.js');
  for (const p of ['auth/', 'payment/', 'security/']) {
    assert.ok(SENSITIVE_PATHS.includes(p),
      `${p} must stay: this module ships and classifies consumer repos, where it does match`);
  }
  const pkg = JSON.parse(fs.readFileSync(path.join(REPO_ROOT, 'package.json'), 'utf8'));
  assert.ok(pkg.files.some((f) => f === 'bin' || f === 'bin/' || f.startsWith('bin/')),
    'the premise above holds only while bin/ ships — if that changed, revisit the consumer paths');
});

test('every sensitive path uses a prefix that startsWith can actually match', () => {
  // 'security/' silently failed to cover bin/security/ because the match is a prefix test, not
  // a substring search. Anything here that matches nothing in this repo must be one of the
  // documented consumer paths, so a typo cannot hide as intentional.
  const { SENSITIVE_PATHS } = require('../bin/change-classifier.js');
  const CONSUMER_ONLY = new Set(['auth/', 'payment/', 'security/']);
  const tracked = execFileSync('git', ['ls-files'], { cwd: REPO_ROOT, encoding: 'utf8' })
    .split('\n').filter(Boolean);
  for (const p of SENSITIVE_PATHS) {
    if (CONSUMER_ONLY.has(p)) continue;
    assert.ok(tracked.some((f) => f.startsWith(p)),
      `SENSITIVE_PATHS entry ${JSON.stringify(p)} matches no tracked file. Either it is a typo, ` +
      'or it is consumer-only and belongs in the documented consumer group.');
  }
});

// ── Signal B: patterns in the diff, not just the path ───────────────────────
//
// Measured before these tests existed: replacing the whole SENSITIVE_PATTERNS loop with
// `for (const pattern of [])` left this file at 14/14 passing and tests/governance.test.js green.
// Every path test above sets tier 3 at step 1, so `if (tier < 3)` skipped the pattern block
// entirely — Signal B, the doc's headline protection, could have been deleted from the shipping
// classifier with CI green. governance.test.js appeared to cover it but asserted on a local
// re-implementation of classifyChange() living in the test file, which no longer exists.

/**
 * A scratch repo whose ONLY change is one line in a file that is neither a sensitive path nor a
 * test/doc file. Without Signal B this classifies tier 2 (a .ts file changed); with it, tier 3.
 * That 3-vs-2 gap is the discriminator — a repo where both answers were 3 would prove nothing.
 */
function repoWithLineInInnocuousPath(line, rel = 'src/utils/helper.ts') {
  const dir = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'mf-sigb-')));
  git(dir, 'init', '-q', '.');
  git(dir, 'config', 'user.email', 'test@example.com');
  git(dir, 'config', 'user.name', 'test');
  fs.writeFileSync(path.join(dir, 'README.md'), 'readme\n');
  git(dir, 'add', '-A'); git(dir, 'commit', '-qm', 'base');

  fs.mkdirSync(path.join(dir, path.dirname(rel)), { recursive: true });
  fs.writeFileSync(path.join(dir, rel), `${line}\n`);
  git(dir, 'add', '-A'); git(dir, 'commit', '-qm', 'chore: edit');
  return dir;
}

test('a sensitive PATTERN in an innocuous path reaches tier 3', () => {
  // The doc's own worked example: "protects against security-critical code being added to
  // innocuous filenames like src/utils/helper.ts".
  const dir = repoWithLineInInnocuousPath('const token = jwt.sign(payload, secret);');
  try {
    const r = runClassifier(dir);
    assert.strictEqual(r.tier, '3',
      `a jwt.sign in src/utils/helper.ts must be tier 3, got ${r.tier}. ${r.out}`);
    assert.match(r.reasons, /Sensitive pattern detected/,
      `the reason must attribute this to the pattern signal, got: ${r.reasons}`);
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test('the SAME file without the pattern is tier 2 — proving the above is not vacuous', () => {
  const dir = repoWithLineInInnocuousPath('export const noop = true;');
  try {
    const r = runClassifier(dir);
    assert.strictEqual(r.tier, '2',
      `an innocuous .ts edit must be tier 2, got ${r.tier}. If this is also 3, the test above ` +
      `proves nothing. ${r.out}`);
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test('a pattern inside a DOC file is still excluded from the scan', () => {
  // The exclusion exists so a doc mentioning secrets, or a test asserting on them, does not trip
  // Tier 3. That carve-out is only safe while it is deliberate, so it is pinned rather than
  // discovered later as a hole.
  const dir = repoWithLineInInnocuousPath('call jwt.sign like this', 'docs/guide.md');
  try {
    const r = runClassifier(dir);
    assert.notStrictEqual(r.tier, '3',
      `a jwt.sign inside docs/guide.md must NOT reach tier 3, got ${r.tier}. ${r.out}`);
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test('every pattern the governance doc lists in Signal B is actually detected', () => {
  // The doc listed 19 patterns; measured, the live set detected 6. argon2, the jose pair, paypal.,
  // createCipheriv/createDecipheriv, crypto.subtle, encrypt(/decrypt(, role.*permission,
  // hasPermission, SET ROLE and GRANT were specified and absent. A doc that names a protection the
  // code does not implement is the same defect class as a gate that cannot fail.
  const { SENSITIVE_PATTERNS } = require('../bin/change-classifier.js');

  // Realistic diff lines, not bare tokens: /\bGRANT\b/ cannot match inside "GRANTfoo", so probing
  // with concatenated tokens reports false gaps. This mistake was made and caught while writing it.
  const CASES = {
    'bcrypt':           '+ const h = await bcrypt.hash(pw, 12);',
    'argon2':           '+ const h = await argon2.hash(pw);',
    'jwt.sign':         '+ const t = jwt.sign(payload, secret);',
    'jwt.verify':       '+ const c = jwt.verify(t, secret);',
    'jose.sign':        '+ const t = await jose.sign(payload);',
    'jose.verify':      '+ const c = await jose.verify(t);',
    'stripe.':          '+ await stripe.charges.create(args);',
    'paypal.':          '+ await paypal.orders.create(order);',
    'createCipheriv':   '+ const c = crypto.createCipheriv(alg, key, iv);',
    'createDecipheriv': '+ const d = crypto.createDecipheriv(alg, key, iv);',
    'crypto.subtle':    '+ await crypto.subtle.importKey(fmt, raw);',
    'hashPassword':     '+ const h = hashPassword(pw);',
    'verifyPassword':   '+ if (!verifyPassword(pw, h)) return;',
    'encrypt(':         '+ const blob = encrypt(payload);',
    'decrypt(':         '+ const raw = decrypt(blob);',
    'role.*permission': '+ if (role.canEditPermission) grantAccess();',
    'hasPermission':    '+ if (!hasPermission(user, action)) return;',
    'SET ROLE':         '+ await db.query(\'SET ROLE readonly\');',
    'GRANT':            '+ await db.query(\'GRANT SELECT ON t TO u\');',
  };

  // The case table must stay equal to what the doc claims — otherwise a pattern added to the doc
  // could go untested, which is how the original 13-pattern gap survived.
  const doc = fs.readFileSync(
    path.join(REPO_ROOT, '.mindforge', 'governance', 'change-classifier.md'), 'utf8');
  const section = doc.match(/### Signal B[\s\S]*?(?=This protects)/);
  assert.ok(section, 'could not locate the Signal B pattern list in change-classifier.md');
  const documented = [...section[0].matchAll(/`([^`]+)`/g)].map((m) => m[1]);
  assert.deepStrictEqual(documented.slice().sort(), Object.keys(CASES).sort(),
    'the doc\'s Signal B list and this test\'s case table have drifted apart. Add the new pattern ' +
    'to BOTH, or remove it from the doc.');

  const missed = documented.filter((tok) => !SENSITIVE_PATTERNS.some((p) => p.test(CASES[tok])));
  assert.deepStrictEqual(missed, [],
    `the governance doc specifies these patterns but SENSITIVE_PATTERNS does not detect them: ${missed.join(', ')}`);
});

test('the pattern set is not a rubber stamp — ordinary code matches nothing', () => {
  // Without this, the test above would pass just as well against /.*/ .
  const { SENSITIVE_PATTERNS } = require('../bin/change-classifier.js');
  for (const line of [
    '+ const total = items.reduce((a, b) => a + b, 0);',
    '+ export function formatDate(d) { return d.toISOString(); }',
    '+ log.info(`processed ${n} rows`);',
  ]) {
    const hit = SENSITIVE_PATTERNS.find((p) => p.test(line));
    assert.ok(!hit, `ordinary code must not trip Tier 3, but ${hit} matched: ${line}`);
  }
});

// ── The exit-0 contract depends on a real tier-3 consumer ───────────────────

test('a tier-3 consumer exists, which is what makes the classifier exit 0 honest', () => {
  // The catch block returns tier 3 and exits 0 on the grounds that a downstream job gates on
  // it. If that consumer disappeared, failing closed would become failing OPEN.
  const cp = fs.readFileSync(path.join(REPO_ROOT, '.github', 'workflows', 'control-plane.yml'), 'utf8');
  // Asserts the tier output is CONSUMED, not that it is consumed by one particular syntax. It was
  // originally a step-level `if: needs.classify.outputs.tier == '3'`; it is now passed to
  // bin/governance/verify-approvals.js via env so the integrity half runs at every tier while the
  // Tier-3 half only discloses. Pinning the old spelling made this test fail on an improvement.
  assert.match(cp, /needs\.classify\.outputs\.tier/,
    'control-plane.yml must still consume the classifier tier somewhere; without a consumer, the ' +
    'classifier reporting tier 3 and exiting 0 means nothing happens at all');
  assert.match(cp, /verify-approvals\.js/,
    'the tier must reach a step that acts on it');
  assert.match(cp, /fetch-depth:\s*0/,
    'the classify job must keep fetch-depth: 0 — on a shallow clone `before` is unreachable and ' +
    'every push would fail closed to tier 3, which is the documented precursor to a gate being deleted');
});

(async () => {
  for (const { name, fn } of tests) {
    try { await fn(); console.log(`  ✅  ${name}`); passed++; }
    catch (e) { console.error(`  ❌  ${name}\n      ${e.message}`); failed++; }
  }
  console.log(`\nChange Classifier: ${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
})();
