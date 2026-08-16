// @timeout: 120000
/**
 * MindForge — CLI Router Regression Tests (CLI-01)
 * Regression tests for bin/mindforge-cli.js. Before this file no test spawned
 * the router or asserted the argv vector handed to a child, so every CLI-01
 * behaviour could regress silently. Each case is a behaviour, not a shape:
 *
 *   1. defaultArgs are PREPENDED to user args, never replaced.
 *   2. SAFETY: `health <extra flag>` keeps --check and never reaches
 *      installer-core's install(). At v11.9.1 `health --force` entered install().
 *   3. install-skill / register-skill / audit-skill / record-learning are inert
 *      now that their defaultArgs were removed — they write NOTHING. The
 *      AUDIT.jsonl line-count assertion is the forgery-prevention property.
 *   4. `subagent` is a first-class command reaching spawn-agent's subagent mode.
 *   5. security-scan declares no defaultArgs, so a user-supplied config path is
 *      not shadowed by a prepended positional (validate-config.js:13 defaults it).
 *   6. An unknown command still emits the levenshtein suggestion and exits 1.
 *
 * ISOLATION — why the mirror root exists (do not "simplify" it away):
 * bin/mindforge-cli.js spawns children with `cwd: ROOT`, and ROOT is derived from
 * the CLI file's own location. Every state writer these commands can reach
 * (bin/skill-registry.js, bin/engine/learning-manager.js) resolves its target
 * from process.cwd(). Running the repository's own bin/mindforge-cli.js would
 * therefore aim every write at this repository — appending to the hash-chained
 * .planning/AUDIT.jsonl, which is precisely the pollution these tests exist to
 * forbid. So a COPY of bin/mindforge-cli.js runs inside a throwaway mirror root
 * under os.tmpdir() whose bin/ entries are symlinks to the real scripts: ROOT,
 * and therefore the child cwd, becomes the mirror, and every write lands on a
 * fixture. `health` additionally gets --dry-run so that even a total routing
 * regression cannot perform a real install. Case 7 proves the isolation held by
 * re-measuring this repository's own state files.
 *
 * Run: node tests/cli-router.test.js
 */
'use strict';

const fs   = require('fs');
const os   = require('os');
const path = require('path');
const assert = require('assert');
const { spawnSync } = require('child_process');

let passed = 0, failed = 0;

// Register tests and run them sequentially via an async runner so that async
// bodies are awaited and their assertions are wired into pass/fail accounting.
const tests = [];
function test(name, fn) { tests.push({ name, fn }); }

const ROOT = path.resolve(__dirname, '..');

// ── Repository fingerprint (pollution guard) ─────────────────────────────────
// Captured at load time, before any child process runs, and re-checked by the
// last test. These are the tracked/appended files a regressed router can reach.
const GUARDED_PATHS = [
  '.planning/AUDIT.jsonl',
  '.mindforge/org/skills/MANIFEST.md',
  'AGENTS_LEARNING.md'
];

function fingerprintRepo() {
  const out = {};
  for (const rel of GUARDED_PATHS) {
    const abs = path.join(ROOT, rel);
    if (!fs.existsSync(abs)) { out[rel] = 'absent'; continue; }
    const st = fs.statSync(abs);
    out[rel] = `${st.size} bytes @ ${st.mtimeMs}`;
  }
  return out;
}

const REPO_FINGERPRINT_BEFORE = fingerprintRepo();

// ── Mirror root ──────────────────────────────────────────────────────────────

const CREATED_SYMLINKS = [];

function buildMirror() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'mf-cli-router-'));

  // bin/: symlink every real entry, then override the router with a real COPY,
  // so that path.resolve(__dirname, '..') inside it resolves to the mirror.
  fs.mkdirSync(path.join(dir, 'bin'));
  for (const entry of fs.readdirSync(path.join(ROOT, 'bin'))) {
    if (entry === 'mindforge-cli.js') continue;
    const link = path.join(dir, 'bin', entry);
    fs.symlinkSync(path.join(ROOT, 'bin', entry), link);
    CREATED_SYMLINKS.push(link);
  }
  fs.copyFileSync(path.join(ROOT, 'bin', 'mindforge-cli.js'),
    path.join(dir, 'bin', 'mindforge-cli.js'));
  fs.copyFileSync(path.join(ROOT, 'package.json'), path.join(dir, 'package.json'));

  // Fixtures. Each is a write target a regressed router would actually reach,
  // so a regression surfaces as a changed fixture instead of as repo damage.
  fs.mkdirSync(path.join(dir, '.planning'), { recursive: true });
  fs.mkdirSync(path.join(dir, '.mindforge', 'org', 'skills'), { recursive: true });
  fs.writeFileSync(path.join(dir, '.planning', 'AUDIT.jsonl'),
    '{"seq":1}\n{"seq":2}\n{"seq":3}\n');
  fs.writeFileSync(path.join(dir, '.mindforge', 'org', 'skills', 'MANIFEST.md'),
    '# MANIFEST\n\n## Org Skills\n\n| Name | Version | Status | Min | Path |\n|---|---|---|---|---|\n');
  // No '### [Learning Entry -' heading, so entryCount starts at exactly 0.
  fs.writeFileSync(path.join(dir, 'AGENTS_LEARNING.md'), '# Learning\n\n## Evolution Log\n');
  // A source that install-skill would copy if its 'install' action were reachable.
  fs.writeFileSync(path.join(dir, 'SKILL.md'), '---\nname: fixture-skill\n---\nbody\n');
  // A schema-invalid config: validate-config.js exits 1 on it, and exits 0 with
  // 'using all defaults' if a prepended 'MINDFORGE.md' shadows the given path.
  fs.copyFileSync(path.join(ROOT, '.mindforge', 'MINDFORGE-SCHEMA.json'),
    path.join(dir, '.mindforge', 'MINDFORGE-SCHEMA.json'));
  fs.writeFileSync(path.join(dir, 'custom-config.md'),
    '# fixture config\n\nMAX_TASKS_PER_PHASE=999\n');

  return dir;
}

function destroyMirror(dir) {
  // Unlink the symlinks explicitly before the recursive remove. fs.rmSync does
  // not follow symlinks, but the blast radius of being wrong here is the real
  // bin/ tree, so this is not delegated to library behaviour.
  for (const link of CREATED_SYMLINKS) {
    try { fs.unlinkSync(link); } catch { /* already gone */ }
  }
  fs.rmSync(dir, { recursive: true, force: true });
}

const MIRROR = buildMirror();
const MIRROR_CLI = path.join(MIRROR, 'bin', 'mindforge-cli.js');

function cli(...args) {
  const r = spawnSync(process.execPath, [MIRROR_CLI, ...args], {
    encoding: 'utf8',
    cwd: os.tmpdir(),   // belt-and-braces: the router overrides this with its ROOT
    timeout: 30000,
    env: { ...process.env, NODE_ENV: 'test', CI: 'true' }
  });
  return { code: r.status, out: `${r.stdout || ''}${r.stderr || ''}` };
}

function mirrorState() {
  const audit = fs.readFileSync(path.join(MIRROR, '.planning', 'AUDIT.jsonl'), 'utf8');
  const skillsDir = path.join(MIRROR, '.mindforge', 'org', 'skills');
  return {
    auditLines:    audit.split('\n').filter(Boolean).length,
    manifestBytes: fs.statSync(path.join(skillsDir, 'MANIFEST.md')).size,
    learningBytes: fs.statSync(path.join(MIRROR, 'AGENTS_LEARNING.md')).size,
    skillEntries:  fs.readdirSync(skillsDir).sort().join(',')
  };
}

// ── 1. defaultArgs are PREPENDED, not replaced ───────────────────────────────
// v11.9.1: finalArgs = COMMAND_ARGS.length > 0 ? COMMAND_ARGS : defaultArgs.

test('hindsight 5 → temporal-cli inject mode (defaultArgs prepended, not replaced)', () => {
  const { out } = cli('hindsight', '5');
  assert.ok(/inject <auditId>/.test(out),
    `expected inject-mode usage from the prepended 'inject' token, got:\n${out}`);
  assert.ok(!/<status\|cleanup\|inject>/.test(out),
    'top-level temporal usage means MODE was the user arg — defaultArgs were REPLACED');
});

// ── 2. THE SAFETY PROPERTY ───────────────────────────────────────────────────
// At v11.9.1 `health --force` dropped '--check' and installer-core ran
// install({ force: true }). --dry-run is passed defensively so that even a total
// routing regression cannot write, and the child cwd is the mirror either way.

test('health --force --dry-run stays on installer-core --check, never reaches install()', () => {
  const { out } = cli('health', '--force', '--dry-run');
  assert.ok(/MindForge Update Check/.test(out),
    `expected installer-core's --check branch (self-update), got:\n${out.slice(-800)}`);
  assert.ok(!/PAYLOAD MANIFEST/.test(out),
    'PAYLOAD MANIFEST is printed by the install() success path — health reached install()');
  assert.ok(!fs.existsSync(path.join(MIRROR, '.claude')),
    'install() created a runtime directory in the mirror — health reached install()');
});

// ── 3. The four commands that lost defaultArgs must write NOTHING ────────────
// Both the no-args and the with-args form are exercised: at v11.9.1 the no-args
// form used defaultArgs and forged state; a naive prepend-only fix that kept
// defaultArgs makes the with-args form forge state too.

const INERT_INVOCATIONS = [
  ['audit-skill'],
  ['audit-skill', 'fake-skill', '1.0.0', 'core'],
  ['register-skill'],
  ['register-skill', 'fake-skill', '1.0.0', '2'],
  ['install-skill'],
  ['install-skill', 'fake-skill'],
  ['record-learning'],
  ['record-learning', 'ctx', 'desc']
];

let inertRun = null;
function runInertCommands() {
  if (!inertRun) {
    const before = mirrorState();
    const results = INERT_INVOCATIONS.map(argv => ({ argv, ...cli(...argv) }));
    inertRun = { before, after: mirrorState(), results };
  }
  return inertRun;
}

test('audit-skill writes NO entry: AUDIT.jsonl line count is unchanged (3)', () => {
  const { before, after } = runInertCommands();
  assert.strictEqual(after.auditLines, before.auditLines,
    'a skill life-cycle entry was appended to the hash chain for a skill that does not exist');
  assert.strictEqual(after.auditLines, 3, 'fixture chain must still be its original 3 lines');
});

test('register-skill writes NO row: MANIFEST.md is byte-identical', () => {
  const { before, after } = runInertCommands();
  assert.strictEqual(after.manifestBytes, before.manifestBytes);
});

test('install-skill installs nothing: no new entry under .mindforge/org/skills', () => {
  const { before, after } = runInertCommands();
  assert.strictEqual(after.skillEntries, before.skillEntries);
  assert.strictEqual(after.skillEntries, 'MANIFEST.md');
});

test('record-learning appends nothing: AGENTS_LEARNING.md is byte-identical', () => {
  const { before, after } = runInertCommands();
  assert.strictEqual(after.learningBytes, before.learningBytes);
});

test('install-skill / register-skill / audit-skill refuse with a non-zero exit', () => {
  for (const { argv, code, out } of runInertCommands().results) {
    if (argv.length === 1 || argv[0] === 'record-learning') continue;
    assert.notStrictEqual(code, 0, `${argv.join(' ')} exited 0 — it did not refuse`);
    assert.ok(/Invalid or missing action|not found locally|MANIFEST\.md not found/.test(out),
      `${argv.join(' ')} exited non-zero for an unexpected reason:\n${out}`);
  }
});

// record-learning is inert but NOT a refusal: learning-manager.js's CLI falls
// through to an `else` branch that prints a read-only status and exits 0. The
// asserted contract is therefore "never enters record mode", not "exits 1".
test('record-learning never enters record mode (reports entryCount: 0)', () => {
  for (const { argv, out } of runInertCommands().results) {
    if (argv[0] !== 'record-learning') continue;
    assert.ok(!/SOVEREIGN INTELLIGENCE v8\.2\.0/.test(out),
      `${argv.join(' ')} printed the record-mode banner — the 'record' action was reached`);
    assert.ok(/entryCount: 0/.test(out),
      `${argv.join(' ')} should report entryCount: 0, got:\n${out}`);
  }
});

// ── 4. 'subagent' is a first-class command ───────────────────────────────────
// Prepending 'spawn' shadowed `spawn subagent <name>`, which was the only way to
// reach spawn-agent's only implemented mode before it got its own router entry.

test('subagent code-reviewer → spawn-agent subagent mode', () => {
  const { out } = cli('subagent', 'code-reviewer');
  assert.ok(!/Unknown command/.test(out),
    `'subagent' is not registered in the router:\n${out}`);
  assert.ok(/Loading imported subagent: code-reviewer/.test(out),
    `expected spawn-agent's subagent branch, got:\n${out}`);
  assert.ok(!/Spawning persona essence/.test(out),
    'MODE resolved to spawn — the subagent mode is being shadowed');
});

// ── 5. security-scan carries no defaultArgs ──────────────────────────────────

test('security-scan custom-config.md validates that path, not a prepended MINDFORGE.md', () => {
  const { code, out } = cli('security-scan', 'custom-config.md');
  assert.ok(!/using all defaults/.test(out),
    `argv[2] was not the user path — a defaultArgs positional shadowed it:\n${out}`);
  assert.ok(/MAX_TASKS_PER_PHASE: 999 exceeds maximum 50/.test(out),
    `expected the fixture config to be validated, got:\n${out}`);
  assert.strictEqual(code, 1, 'a config with a schema error must exit 1');
});

// ── 6. Unknown command ───────────────────────────────────────────────────────

test('unknown command helth → levenshtein suggestion naming health, exit 1', () => {
  const { code, out } = cli('helth');
  assert.ok(/Unknown command: helth/.test(out), out);
  assert.ok(/Did you mean: .*health/.test(out),
    `expected a levenshtein suggestion naming 'health', got:\n${out}`);
  assert.strictEqual(code, 1, 'an unknown command must exit 1');
});

// ── 7. Isolation proof (must be registered last) ─────────────────────────────

test('this repository was not mutated by any spawned child', () => {
  assert.deepStrictEqual(fingerprintRepo(), REPO_FINGERPRINT_BEFORE,
    'a child process wrote into the repository — the mirror isolation is broken');
});

(async () => {
  try {
    for (const { name, fn } of tests) {
      try { await fn(); console.log(`  ✅  ${name}`); passed++; }
      catch (e) { console.error(`  ❌  ${name}\n      ${e.message}`); failed++; }
    }
  } finally {
    destroyMirror(MIRROR);
  }
  console.log(`\nCLI Router: ${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
})();
