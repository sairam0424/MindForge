/**
 * MindForge — Skill Registry Install Integrity Tests (UC-22)
 * Run: node tests/run-all.js --filter=skill
 *
 * Guards audit finding #26: `install-skill` must NOT write a fake
 * "placeholder"/"mock" SKILL.md masquerading as a real installed skill when
 * no local source exists and there is no remote registry backend. It must
 * refuse honestly (non-zero exit) and leave no installed-skill artifact.
 */
'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const assert = require('assert');
const { spawnSync } = require('child_process');

let passed = 0, failed = 0;

function test(name, fn) {
  try { fn(); console.log(`  ✅ ${name}`); passed++; }
  catch (e) { console.error(`  ❌ ${name}\n     ${e.message}`); failed++; }
}

const REGISTRY = path.join(__dirname, '..', 'bin', 'skill-registry.js');

// Run skill-registry.js inside an isolated temp cwd so we never touch the repo.
function runInstall(skillName, tier) {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'mf-skill-install-'));
  const args = ['install', skillName];
  if (tier) args.push('--tier', tier);
  const result = spawnSync('node', [REGISTRY, ...args], {
    cwd: tmp,
    encoding: 'utf8',
    env: { ...process.env, NODE_ENV: 'test' }
  });
  return { tmp, result };
}

function tierDirFor(tmp, tier, skillName) {
  const base = tier === '1' ? '.mindforge/skills'
    : tier === '3' ? '.mindforge/project-skills'
      : '.mindforge/org/skills';
  return path.join(tmp, base, skillName);
}

function cleanup(tmp) {
  fs.rmSync(tmp, { recursive: true, force: true });
}

console.log('\nSkill Registry — install integrity (UC-22):\n');

// ── No local source → honest refusal, NON-zero exit ──────────────────────────
test('installing a non-existent skill exits non-zero', () => {
  const { tmp, result } = runInstall('totally-made-up-skill');
  cleanup(tmp);
  assert.notStrictEqual(result.status, 0,
    `Expected non-zero exit, got ${result.status}`);
});

// ── No fake installed-skill artifact left behind ─────────────────────────────
test('installing a non-existent skill does NOT create a fake SKILL.md', () => {
  const skill = 'totally-made-up-skill';
  const { tmp, result } = runInstall(skill);
  const tierDir = tierDirFor(tmp, '2', skill);
  const skillFile = path.join(tierDir, 'SKILL.md');
  const exists = fs.existsSync(skillFile);
  cleanup(tmp);
  assert.ok(!exists,
    `A SKILL.md was written at ${skillFile} despite no real source ` +
    `(exit ${result.status}). No file may masquerade as an installed skill.`);
});

// ── Output must be honest: no "mock"/"placeholder" success wording ───────────
test('output does not claim a mock/placeholder skill was created', () => {
  const { tmp, result } = runInstall('totally-made-up-skill');
  cleanup(tmp);
  const out = `${result.stdout || ''}\n${result.stderr || ''}`.toLowerCase();
  assert.ok(!out.includes('created mock'),
    'Output must not log "Created mock SKILL.md"');
  assert.ok(!out.includes('placeholder for'),
    'Output must not pretend a placeholder skill is installed');
});

// ── Honest failure must explain WHY (not found / no registry) ────────────────
test('refusal message explains the skill was not found / no registry', () => {
  const { tmp, result } = runInstall('totally-made-up-skill');
  cleanup(tmp);
  const out = `${result.stdout || ''}\n${result.stderr || ''}`.toLowerCase();
  assert.ok(
    out.includes('not found') || out.includes('no remote registry') ||
    out.includes('nothing installed'),
    `Refusal must be explicit. Got:\n${result.stdout}\n${result.stderr}`
  );
});

// ── Real install path preserved: local SKILL.md source still installs ────────
test('a real local SKILL.md source still installs successfully', () => {
  const skill = 'real-local-skill';
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'mf-skill-install-'));
  const localSrc = path.join(tmp, 'SKILL.md');
  fs.writeFileSync(localSrc,
    '---\nname: real-local-skill\nversion: 1.0.0\n---\n# Real skill\nReal content.\n');

  const result = spawnSync('node', [REGISTRY, 'install', skill], {
    cwd: tmp, encoding: 'utf8', env: { ...process.env, NODE_ENV: 'test' }
  });

  const skillFile = path.join(tierDirFor(tmp, '2', skill), 'SKILL.md');
  const installed = fs.existsSync(skillFile);
  const content = installed ? fs.readFileSync(skillFile, 'utf8') : '';
  cleanup(tmp);

  assert.strictEqual(result.status, 0,
    `Real install should exit 0, got ${result.status}: ${result.stderr}`);
  assert.ok(installed, 'Real install must write SKILL.md to the tier dir');
  assert.ok(content.includes('Real content'),
    'Installed SKILL.md must contain the real source content');
});

// ── Summary ──────────────────────────────────────────────────────────────────
console.log(`\n  ${passed} passed, ${failed} failed\n`);
if (failed > 0) process.exit(1);
