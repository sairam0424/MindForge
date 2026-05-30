/**
 * MindForge — Dependency DAG tests (UC-03). Run: node tests/dependency-dag.test.js
 */
'use strict';
const assert = require('assert');
let passed = 0, failed = 0; const tests = [];
function test(name, fn) { tests.push({ name, fn }); }

test('groupIntoWaves orders independent tasks first, dependents after', () => {
  const { groupIntoWaves } = require('../bin/autonomous/dependency-dag');
  const graph = { A: { dependsOn: [] }, B: { dependsOn: [] }, C: { dependsOn: ['A'] }, D: { dependsOn: ['B', 'C'] } };
  const waves = groupIntoWaves(graph);
  assert.ok(waves[0].includes('A') && waves[0].includes('B'), 'wave0 = independents A,B');
  assert.ok(waves[1].includes('C'), 'wave1 = C (after A)');
  assert.ok(waves[2].includes('D'), 'wave2 = D (after B,C)');
});
test('groupIntoWaves throws (HALT) on a circular dependency', () => {
  const { groupIntoWaves } = require('../bin/autonomous/dependency-dag');
  const graph = { X: { dependsOn: ['Y'] }, Y: { dependsOn: ['X'] } };
  assert.throws(() => groupIntoWaves(graph), /[Cc]ircular/);
});
test('hasCircularDependency returns true for a cycle, false for a DAG', () => {
  const { hasCircularDependency } = require('../bin/autonomous/dependency-dag');
  assert.strictEqual(hasCircularDependency({ X: { dependsOn: ['Y'] }, Y: { dependsOn: ['X'] } }), true);
  assert.strictEqual(hasCircularDependency({ A: { dependsOn: [] }, B: { dependsOn: ['A'] } }), false);
});
test('buildGraph derives a dependsOn graph from handoff tasks (id + depends_on)', () => {
  const { buildGraph } = require('../bin/autonomous/dependency-dag');
  const g = buildGraph([{ id: 'A', depends_on: [] }, { id: 'B', depends_on: ['A'] }]);
  assert.deepStrictEqual(g.B.dependsOn, ['A']);
});
test('groupIntoWaves throws DISTINCT unknown-dep error (not "circular") for a dangling dep', () => {
  // FIX 4: standalone self-defense — a dependsOn target missing from the graph
  // must throw an "Unknown dependency" error, NOT the misleading "Circular" one.
  const { groupIntoWaves } = require('../bin/autonomous/dependency-dag');
  const graph = { A: { dependsOn: [] }, B: { dependsOn: ['GHOST'] } };
  assert.throws(() => groupIntoWaves(graph), /Unknown dependency "GHOST" referenced by "B"/);
  assert.throws(() => groupIntoWaves(graph), (err) => !/[Cc]ircular/.test(err.message));
});

test('planWaves({useDag:true}) orders by depends_on when no explicit .wave field', () => {
  const { createWaveExecutor } = require('../bin/autonomous/wave-executor');
  const ex = createWaveExecutor();
  const waves = ex.planWaves(
    [{ id: 'A', depends_on: [] }, { id: 'B', depends_on: ['A'] }, { id: 'C', depends_on: ['A'] }],
    { useDag: true }
  );
  assert.strictEqual(waves[0].tasks.length, 1, 'wave0 = A only');
  assert.strictEqual(waves[0].tasks[0].id, 'A');
  assert.strictEqual(waves[1].tasks.length, 2, 'wave1 = B,C');
});
test('planWaves preserves explicit .wave field as override even with useDag:true', () => {
  const { createWaveExecutor } = require('../bin/autonomous/wave-executor');
  const ex = createWaveExecutor();
  const waves = ex.planWaves(
    [{ id: 'A', wave: 5, depends_on: [] }, { id: 'B', wave: 1, depends_on: ['A'] }],
    { useDag: true }
  );
  assert.strictEqual(waves[0].wave, 1);
  assert.strictEqual(waves[0].tasks[0].id, 'B');
});
test('planWaves without useDag is unchanged (single wave when no .wave field)', () => {
  const { createWaveExecutor } = require('../bin/autonomous/wave-executor');
  const ex = createWaveExecutor();
  const waves = ex.planWaves([{ id: 'A', depends_on: [] }, { id: 'B', depends_on: ['A'] }]);
  assert.strictEqual(waves.length, 1, 'legacy default: one wave');
  assert.strictEqual(waves[0].tasks.length, 2);
});

(async () => {
  for (const { name, fn } of tests) {
    try { await fn(); console.log(`  ✅  ${name}`); passed++; }
    catch (e) { console.error(`  ❌  ${name}\n      ${e.message}`); failed++; }
  }
  console.log(`\nDependency DAG: ${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
})();
