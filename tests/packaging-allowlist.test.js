/**
 * MindForge — Packaging Allowlist Regression Tests
 *
 * Guards the npm tarball contents against the v11.3.0 regression where a trimmed
 * package.json "files" allowlist silently dropped the product (commands, skills,
 * the entry CLAUDE.md, most of .mindforge/, .planning/ scaffolding). The installer
 * reads those via fsu.exists(src(...)) and SKIPS anything absent with no error —
 * so a broken package looks like a successful install. These tests assert the real
 * tarball (npm's own view, via `npm pack --dry-run --json`) ships what the installer
 * needs, and does NOT ship runtime state.
 *
 * Why pack for real instead of reimplementing the allowlist: npm's interaction of
 * "files" + .npmignore + glob negation + case-sensitivity is exactly what shipped
 * the bug. A static reimplementation would share the same blind spots. So we ask
 * npm what it would publish and assert against that.
 *
 * Run: node tests/packaging-allowlist.test.js
 */
'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const assert = require('assert');
const { execFileSync } = require('child_process');

let passed = 0, failed = 0, skipped = 0;
const tests = [];
function test(name, fn) { tests.push({ name, fn }); }

const ROOT = path.resolve(__dirname, '..');

// Ask npm exactly what it would publish. Returns a sorted array of tarball-relative
// paths (the "files[].path" field), or null if npm is unavailable so the suite can
// skip loudly rather than fail spuriously in a degraded environment.
function packFileList() {
  let raw;
  try {
    raw = execFileSync('npm', ['pack', '--dry-run', '--json', '--ignore-scripts'], {
      cwd: ROOT, encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'], maxBuffer: 64 * 1024 * 1024,
    });
  } catch (err) {
    return { ok: false, reason: (err.stderr || err.message || 'npm pack failed').toString().trim() };
  }
  let parsed;
  try { parsed = JSON.parse(raw); }
  catch { return { ok: false, reason: 'npm pack --json returned unparseable output' }; }
  const entry = Array.isArray(parsed) ? parsed[0] : parsed;
  const files = (entry && entry.files ? entry.files : []).map(f => f.path);
  return { ok: true, files };
}

// Resolve the file list once for the whole suite (the slow part — one pack).
const pack = packFileList();
const FILES = pack.ok ? pack.files : [];
const hasPrefix = (p) => FILES.some(f => f === p || f.startsWith(p));
const countUnder = (p, suffix = '.md') =>
  FILES.filter(f => f.startsWith(p) && f.endsWith(suffix)).length;

// ── 1. Commands ship (the "no slash commands" symptom) ────────────────────────
test('ships >=150 Claude slash commands under .claude/commands/mindforge/', () => {
  const n = countUnder('.claude/commands/mindforge/');
  assert.ok(n >= 150, `expected >=150 claude commands in tarball, got ${n}`);
});

test('ships .agent command sets (mindforge + forge namespaces)', () => {
  assert.ok(countUnder('.agent/mindforge/') >= 150,
    `expected >=150 .agent/mindforge commands, got ${countUnder('.agent/mindforge/')}`);
  assert.ok(hasPrefix('.agent/forge/'), 'missing .agent/forge/ command namespace');
});

test('.claude/commands/mindforge/ and .agent/mindforge/ ship the same command count', () => {
  // A prior gap (34 files, mostly wf-* workflow commands, silently untracked
  // under .claude/ due to a blanket gitignore rule) passed the >=150 checks
  // above undetected because both counts already exceeded 150 independently.
  // This mirrors what tests/version-consistency.test.js does for versions:
  // catch drift between the two command trees, not just an absolute floor.
  const claudeCount = countUnder('.claude/commands/mindforge/');
  const agentCount = countUnder('.agent/mindforge/');
  assert.strictEqual(claudeCount, agentCount,
    `.claude/commands/mindforge/ (${claudeCount}) and .agent/mindforge/ (${agentCount}) command counts must match — a mismatch usually means one tree is missing files that were added to the other`);
});

// ── 2. Skills ship (the "no skills" symptom) ──────────────────────────────────
test('ships >=70 skill files under .agent/skills/', () => {
  const n = countUnder('.agent/skills/', 'SKILL.md');
  assert.ok(n >= 70, `expected >=70 SKILL.md files in tarball, got ${n}`);
});

// ── 3. Entry files ship ───────────────────────────────────────────────────────
test('ships the entry CLAUDE.md (.claude/CLAUDE.md and .agent/CLAUDE.md)', () => {
  assert.ok(FILES.includes('.claude/CLAUDE.md'), 'missing .claude/CLAUDE.md (Claude runtime entry)');
  assert.ok(FILES.includes('.agent/CLAUDE.md'), 'missing .agent/CLAUDE.md');
});

// ── 4. Subagents + index ship ─────────────────────────────────────────────────
test('ships 164 subagents and the imported-agents index', () => {
  const n = FILES.filter(f =>
    f.startsWith('subagents/categories/') && f.endsWith('.md') && !f.endsWith('README.md')).length;
  assert.strictEqual(n, 164, `expected 164 subagent .md files in tarball, got ${n}`);
  assert.ok(FILES.includes('.mindforge/imported-agents.jsonl'),
    'missing .mindforge/imported-agents.jsonl — the subagent loader index');
});

// ── 5. Framework subdirs ship (the ".mindforge had only 3 folders" symptom) ───
test('ships the full .mindforge framework (governance, integrations, org, team, ...)', () => {
  for (const sub of ['engine', 'personas', 'skills', 'governance', 'integrations',
    'intelligence', 'memory', 'metrics', 'models', 'org', 'plugins', 'team']) {
    assert.ok(hasPrefix(`.mindforge/${sub}/`), `missing .mindforge/${sub}/ in tarball`);
  }
});

// ── 6. Planning scaffolding ships (autonomous engine needs it) ────────────────
test('ships clean .planning/ templates via examples/starter-project', () => {
  for (const f of ['STATE.md', 'HANDOFF.json', 'PROJECT.md', 'ROADMAP.md',
    'REQUIREMENTS.md', 'ARCHITECTURE.md', 'RELEASE-CHECKLIST.md']) {
    assert.ok(FILES.includes(`examples/starter-project/.planning/${f}`),
      `missing planning template: examples/starter-project/.planning/${f}`);
  }
});

// ── 7. Docs References/Templates ship with correct case (REFERENCES/TEMPLATES 0)
test('ships docs/References and docs/Templates (case-correct for Linux)', () => {
  assert.ok(countUnder('docs/References/') >= 10,
    `expected >=10 docs/References files, got ${countUnder('docs/References/')}`);
  assert.ok(hasPrefix('docs/Templates/'), 'missing docs/Templates/ in tarball');
});

// ── 8. Runtime state must NOT ship (privacy + bloat) ──────────────────────────
test('does NOT ship runtime databases or telemetry', () => {
  const leaks = FILES.filter(f =>
    f.endsWith('.db') ||
    f === '.mindforge/metrics/token-usage.jsonl' ||
    f === '.mindforge/memory/pattern-library.jsonl' ||
    /audit\.jsonl$/i.test(f.replace('examples/', '')) && f.startsWith('.mindforge/') ||
    f.endsWith('slack-threads.json') ||
    f.endsWith('jira-sync.json'));
  assert.deepStrictEqual(leaks, [],
    `runtime/telemetry/state files must not ship: ${leaks.join(', ')}`);
});

// ── 9. Installer source paths agree with what ships (case-sensitivity guard) ──
// The installer reads docs via capitalized dir names; assert the on-disk repo
// uses that exact case so the lookup can't silently miss on a case-sensitive FS.
test('installer-read docs dirs exist on disk with the exact case the installer uses', () => {
  for (const dir of ['References', 'Templates']) {
    const abs = path.join(ROOT, 'docs', dir);
    assert.ok(fs.existsSync(abs), `docs/${dir} missing on disk`);
    // readdir of the parent must contain the exact-cased name (case-sensitive check)
    const siblings = fs.readdirSync(path.join(ROOT, 'docs'));
    assert.ok(siblings.includes(dir),
      `docs/ has no exact-case "${dir}" entry — installer src('docs','${dir}') will miss on Linux`);
  }
});

// ── 10. Advisory lockfiles must NOT ship (LOCK-01) ────────────────────────────
// bin/utils/file-lock.js writes "<target>.lock" beside the file it protects and unlinks
// it in a finally, but a SIGKILL leaves one on disk until the 10s stale reclaim. Several
// protected targets live under files[]-allowlisted dirs (e.g. .mindforge/memory/), and
// package.json files[] OVERRIDES .npmignore — so without an explicit negation a leftover
// lockfile ships. Proven below rather than asserted, because a bare "no .lock in FILES"
// check is vacuous whenever no lockfile happens to exist at pack time.
test('package.json files[] carries the !**/*.lock negation', () => {
  const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
  assert.ok(Array.isArray(pkg.files) && pkg.files.includes('!**/*.lock'),
    'package.json files[] must include "!**/*.lock" or an orphaned advisory lockfile ships');
});

test('no .lock file is present in the real tarball', () => {
  const locks = FILES.filter(f => f.endsWith('.lock'));
  assert.deepStrictEqual(locks, [], `advisory lockfiles must not ship: ${locks.join(', ')}`);
});

test('the !**/*.lock negation demonstrably excludes a lockfile (with negative control)', () => {
  // Synthetic 2-file package in a temp dir, packed twice with this same npm: once WITHOUT
  // the negation (negative control — the .lock MUST ship, proving the gate can fail) and
  // once WITH it (the .lock MUST be gone, proving the pattern works on this npm version).
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'mf-packlock-'));
  try {
    fs.mkdirSync(path.join(tmp, '.mindforge', 'memory'), { recursive: true });
    fs.writeFileSync(path.join(tmp, '.mindforge', 'memory', 'graph-edges.jsonl.lock'), '');
    fs.writeFileSync(path.join(tmp, '.mindforge', 'memory', 'keep.md'), '# keep\n');

    const packIn = (files) => {
      fs.writeFileSync(path.join(tmp, 'package.json'),
        JSON.stringify({ name: 'mf-packlock-probe', version: '1.0.0', files }, null, 2));
      const raw = execFileSync('npm', ['pack', '--dry-run', '--json', '--ignore-scripts'], {
        cwd: tmp, encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'], maxBuffer: 8 * 1024 * 1024,
      });
      const parsed = JSON.parse(raw);
      const entry = Array.isArray(parsed) ? parsed[0] : parsed;
      return (entry.files || []).map(f => f.path);
    };

    const without = packIn(['.mindforge/memory/']);
    assert.ok(without.includes('.mindforge/memory/graph-edges.jsonl.lock'),
      'NEGATIVE CONTROL FAILED: npm did not ship the .lock even without the negation, so ' +
      'this test cannot prove the negation is what keeps it out');

    const withNeg = packIn(['.mindforge/memory/', '!**/*.lock']);
    assert.ok(!withNeg.includes('.mindforge/memory/graph-edges.jsonl.lock'),
      '"!**/*.lock" did not exclude the lockfile on this npm version');
    assert.ok(withNeg.includes('.mindforge/memory/keep.md'),
      '"!**/*.lock" must not exclude anything else');
  } finally { fs.rmSync(tmp, { recursive: true, force: true }); }
});

// ── 11. Shipped config must carry no test-fixture identity (CONF-A) ───────────
// .mindforge/config.json is in files[], so it IS the config every consumer installs.
// tests/v8-mesh-sync.test.js used to call configManager.set('mesh.node_id', ...) against
// that TRACKED file, so whatever value its last write left behind shipped as every
// install's federation identity. The same suite wrote governance.active_did, and a shipped
// DID is worse than none: ztai-manager keeps key material in an in-process Map, so
// mesh-syncer.exportBundle() fails with the opaque "Agent not registered: <did>" instead
// of its designed, actionable "No active DID found for signing. Secure identity required."
// That suite is now isolated to a temp mirror; these assertions guard the artifact itself.
const FIXTURE_NODE_IDS = ['alpha-node', 'beta-node'];

// Both predicates are named so the negative controls below can feed them known-bad
// input. A check that only ever sees good input cannot be shown to work at all.
function isShippableNodeId(nodeId) {
  return typeof nodeId === 'string' && nodeId.length > 0 && !FIXTURE_NODE_IDS.includes(nodeId);
}
function isShippableActiveDid(did) {
  return did === undefined || did === null || did === '';
}
function readShippedConfig() {
  return JSON.parse(fs.readFileSync(path.join(ROOT, '.mindforge', 'config.json'), 'utf8'));
}

test('.mindforge/config.json ships a real default mesh.node_id, not a test fixture', () => {
  assert.ok(FILES.includes('.mindforge/config.json'),
    '.mindforge/config.json must ship — consumer config is seeded from it');

  // NEGATIVE CONTROLS FIRST: prove the predicate rejects the exact values the suite
  // writes. Without these the assertion below would have passed on the shipped bug.
  for (const fixture of FIXTURE_NODE_IDS) {
    assert.ok(!isShippableNodeId(fixture),
      `NEGATIVE CONTROL FAILED: isShippableNodeId('${fixture}') returned true, so this ` +
      'test cannot detect a test fixture leaking into the shipped config');
  }
  assert.ok(!isShippableNodeId(''), 'NEGATIVE CONTROL FAILED: an empty node_id must be rejected');
  assert.ok(isShippableNodeId('auto'), 'the documented default "auto" must be accepted');

  const mesh = readShippedConfig().mesh || {};
  assert.ok(isShippableNodeId(mesh.node_id),
    `shipped mesh.node_id is ${JSON.stringify(mesh.node_id)} — a test fixture or empty. ` +
    'Every install would federate under that one identity. Reset it to "auto".');

  // The sibling note is the only place the default is documented. If it stops saying
  // "auto", then "auto" is no longer the correct committed value and this needs revisiting.
  assert.match(String(mesh._node_id_note), /auto = hostname-derived/,
    'mesh._node_id_note must keep documenting "auto = hostname-derived"');
});

test('.mindforge/config.json ships no pre-baked governance.active_did', () => {
  // NEGATIVE CONTROL: a concrete DID must be rejected, or this assertion is vacuous.
  assert.ok(!isShippableActiveDid('did:mindforge:e630e005-7b55-4779-9f4f-92aac356c52b'),
    'NEGATIVE CONTROL FAILED: a concrete DID must not be considered shippable');
  assert.ok(isShippableActiveDid(''), 'an empty active_did must be accepted');

  const did = (readShippedConfig().governance || {}).active_did;
  assert.ok(isShippableActiveDid(did),
    `shipped governance.active_did is ${JSON.stringify(did)} — an identity whose private key ` +
    'is not (and must not be) shipped. Leave it "" so mesh-syncer raises its designed ' +
    '"No active DID found for signing" error instead of "Agent not registered".');
});

(async () => {
  if (!pack.ok) {
    // No silent caps: announce the skip loudly. This test gates releases, so a
    // skipped run in CI should be visible, not invisible.
    console.warn(`\n  ⚠️  Packaging tests SKIPPED — could not run npm pack: ${pack.reason}`);
    console.warn('      (These guard the tarball contents; ensure they run before publishing.)\n');
    for (const { name } of tests) { console.log(`  ⏭️   ${name} (skipped)`); skipped++; }
    console.log(`\nPackaging Allowlist: ${skipped} skipped (npm unavailable)`);
    return; // exit 0 — degraded env, not a product failure
  }
  for (const { name, fn } of tests) {
    try { await fn(); console.log(`  ✅  ${name}`); passed++; }
    catch (e) { console.error(`  ❌  ${name}\n      ${e.message}`); failed++; }
  }
  console.log(`\nPackaging Allowlist: ${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
})();
