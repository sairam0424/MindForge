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
test('findFileConflicts detects two tasks writing the same file', () => {
  const { findFileConflicts } = require('../bin/autonomous/dependency-dag');
  const conflicts = findFileConflicts([
    { id: 'A', files: ['src/x.js'] }, { id: 'B', files: ['src/x.js', 'src/y.js'] },
  ]);
  assert.strictEqual(conflicts.length, 1);
  assert.strictEqual(conflicts[0].file, 'src/x.js');
});
test('buildGraph derives a dependsOn graph from handoff tasks (id + depends_on)', () => {
  const { buildGraph } = require('../bin/autonomous/dependency-dag');
  const g = buildGraph([{ id: 'A', depends_on: [] }, { id: 'B', depends_on: ['A'] }]);
  assert.deepStrictEqual(g.B.dependsOn, ['A']);
});

(async () => {
  for (const { name, fn } of tests) {
    try { await fn(); console.log(`  ✅  ${name}`); passed++; }
    catch (e) { console.error(`  ❌  ${name}\n      ${e.message}`); failed++; }
  }
  console.log(`\nDependency DAG: ${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
})();
