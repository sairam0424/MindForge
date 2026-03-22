'use strict';

const fs = require('fs');
const assert = require('assert');

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`  ✅ ${name}`);
    passed += 1;
  } catch (err) {
    console.error(`  ❌ ${name}`);
    console.error(`     ${err.message}`);
    failed += 1;
  }
}

function read(p) {
  return fs.existsSync(p) ? fs.readFileSync(p, 'utf8') : '';
}

console.log('\nMindForge Multi-Model Intelligence Layer Tests\n');

console.log('Files:');
[
  '.mindforge/intelligence/health-engine.md',
  '.mindforge/intelligence/difficulty-scorer.md',
  '.mindforge/intelligence/antipattern-detector.md',
  '.mindforge/intelligence/skill-gap-analyser.md',
  '.mindforge/intelligence/smart-compaction.md',
  '.mindforge/team/TEAM-PROFILE.md',
  '.mindforge/team/profiles/README.md',
  'MINDFORGE.md',
  'bin/wizard/setup-wizard.js',
  'bin/wizard/environment-detector.js',
  'bin/wizard/config-generator.js',
  '.claude/commands/mindforge/health.md',
  '.claude/commands/mindforge/retrospective.md',
  '.claude/commands/mindforge/profile-team.md',
  '.claude/commands/mindforge/metrics.md',
].forEach((p) => test(`${p} exists`, () => assert.ok(fs.existsSync(p), `Missing: ${p}`)));

console.log('\nReview/hardening checks:');

test('health engine required list includes Functional command files', () => {
  const c = read('.mindforge/intelligence/health-engine.md');
  assert.ok(c.includes('health.md'));
  assert.ok(c.includes('retrospective.md'));
  assert.ok(c.includes('profile-team.md'));
  assert.ok(c.includes('metrics.md'));
});

test('health engine includes audit quarantine approach', () => {
  const c = read('.mindforge/intelligence/health-engine.md');
  assert.ok(c.includes('AUDIT.jsonl.quarantine'));
  assert.ok(c.toLowerCase().includes('never delete lines'));
});

test('antipattern detector excludes test files for C01', () => {
  const c = read('.mindforge/intelligence/antipattern-detector.md');
  assert.ok(c.includes('*.test.ts'));
  assert.ok(c.includes('*.spec.ts'));
  assert.ok(c.includes('type-guard'));
});

test('antipattern detector includes cursor pagination exception', () => {
  const c = read('.mindforge/intelligence/antipattern-detector.md');
  assert.ok(c.includes('cursor:'));
  assert.ok(c.includes('B03'));
});

test('smart compaction includes Level 1/2/3 and inconsistency file display', () => {
  const c = read('.mindforge/intelligence/smart-compaction.md');
  assert.ok(c.includes('Level 1'));
  assert.ok(c.includes('Level 2'));
  assert.ok(c.includes('Level 3'));
  assert.ok(c.includes('first 50 lines'));
});

test('difficulty scorer includes migration context handling and split recommendation', () => {
  const c = read('.mindforge/intelligence/difficulty-scorer.md');
  assert.ok(c.includes('migration'));
  assert.ok(c.includes('/mindforge:discuss-phase [N] --split'));
});

test('MINDFORGE has non-overridable section', () => {
  const c = read('MINDFORGE.md');
  assert.ok(c.includes('NON-OVERRIDABLE'));
});

test('retrospective command includes MINDFORGE feedback step', () => {
  const c = read('.claude/commands/mindforge/retrospective.md');
  assert.ok(c.includes('MINDFORGE.md'));
  assert.ok(c.toLowerCase().includes('apply learnings'));
});

test('wizard checks stdin tty for interactivity', () => {
  const c = read('bin/wizard/setup-wizard.js');
  assert.ok(c.includes('process.stdin.isTTY'));
});

test('environment detector checks devDependencies', () => {
  const c = read('bin/wizard/environment-detector.js');
  assert.ok(c.includes('devDependencies'));
});

test('config generator uses idempotent already configured behavior', () => {
  const c = read('bin/wizard/config-generator.js');
  assert.ok(c.includes('already configured'));
});

console.log(`\n${'─'.repeat(50)}`);
console.log(`Results: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
