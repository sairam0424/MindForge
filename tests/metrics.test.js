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

function calcScore(opts = {}) {
  const {
    tasksFailed = 0,
    qualityGatesFailed = 0,
    critical = 0,
    high = 0,
    medium = 0,
  } = opts;
  let s = 100;
  s -= tasksFailed * 15;
  s -= qualityGatesFailed * 10;
  s -= critical * 30;
  s -= high * 15;
  s -= medium * 5;
  if (!qualityGatesFailed) s += 5;
  if (!critical && !high) s += 5;
  return Math.max(0, Math.min(100, s));
}

console.log('\nMindForge Day 5 — Metrics Tests\n');

console.log('Files:');
[
  '.mindforge/metrics/METRICS-SCHEMA.md',
  '.mindforge/metrics/quality-tracker.md',
  '.mindforge/team/TEAM-PROFILE.md',
].forEach((p) => test(`${p} exists`, () => assert.ok(fs.existsSync(p), `Missing: ${p}`)));

console.log('\nSchema checks:');

test('metrics schema defines compaction-quality.jsonl', () => {
  const c = read('.mindforge/metrics/METRICS-SCHEMA.md');
  assert.ok(c.includes('compaction-quality.jsonl'));
});

test('metrics schema defines trigger_type in skill usage', () => {
  const c = read('.mindforge/metrics/METRICS-SCHEMA.md');
  assert.ok(c.includes('trigger_type'));
});

test('metrics schema defines session_quality_score', () => {
  const c = read('.mindforge/metrics/METRICS-SCHEMA.md');
  assert.ok(c.includes('session_quality_score'));
});

test('quality tracker includes automatic adjustments', () => {
  const c = read('.mindforge/metrics/quality-tracker.md').toLowerCase();
  assert.ok(c.includes('automatic adjustments'));
});

test('team profile includes non-evaluative metrics policy', () => {
  const c = read('.mindforge/team/TEAM-PROFILE.md').toLowerCase();
  assert.ok(c.includes('not developer performance'));
});

console.log('\nScore behavior:');

test('perfect score clamps to 100', () => {
  assert.strictEqual(calcScore({}), 100);
});

test('heavy failure scenario clamps to 0', () => {
  assert.strictEqual(calcScore({ tasksFailed: 10, qualityGatesFailed: 5, critical: 3 }), 0);
});

test('one task failure lowers score below 100', () => {
  assert.ok(calcScore({ tasksFailed: 1 }) < 100);
});

console.log(`\n${'─'.repeat(50)}`);
console.log(`Results: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
