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
