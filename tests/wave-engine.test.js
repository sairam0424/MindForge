/**
 * MindForge Wave Engine Tests
 * Tests: dependency parsing, wave grouping, and execution planning
 * Run: node tests/wave-engine.test.js
 */

const fs = require('fs');
const path = require('path');
const assert = require('assert');

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`  ✅ ${name}`);
    passed++;
  } catch (err) {
    console.error(`  ❌ ${name}`);
    console.error(`     ${err.message}`);
    failed++;
  }
}

// ── Simulate the dependency parser and wave grouper ───────────────────────────

/**
 * Simulates parsing a PLAN file's dependency field
 * In real execution, this reads from the actual XML PLAN files
 */
function parseDependencies(depString) {
  if (!depString || depString.trim().toLowerCase() === 'none') return [];
  return depString.split(',').map(d => d.trim()).filter(Boolean);
}

/**
 * Simulates the wave grouping algorithm (Kahn's topological sort)
 * Input: { "01": { dependsOn: [] }, "02": { dependsOn: ["01"] }, ... }
 * Output: [["01"], ["02"], ...]
 */
function groupIntoWaves(graph) {
  const remaining = new Set(Object.keys(graph));
  const completed = new Set();
  const waves = [];

  while (remaining.size > 0) {
    const wave = [];
    for (const id of remaining) {
      const deps = graph[id].dependsOn;
      if (deps.every(d => completed.has(d))) {
        wave.push(id);
      }
    }

    if (wave.length === 0 && remaining.size > 0) {
      throw new Error(`Circular dependency detected among: ${[...remaining].join(', ')}`);
    }

    waves.push(wave.sort());
    wave.forEach(id => { completed.add(id); remaining.delete(id); });
  }

  return waves;
}

/**
 * Detects circular dependencies
 */
function hasCircularDependency(graph) {
  try {
    groupIntoWaves(graph);
    return false;
  } catch {
    return true;
  }
}

/**
 * Detects file conflicts between plans
 */
function findFileConflicts(plans) {
  const fileMap = {};
  const conflicts = [];

  plans.forEach(({ id, files }) => {
    files.forEach(file => {
      if (fileMap[file]) {
        conflicts.push({ file, plans: [fileMap[file], id] });
      } else {
        fileMap[file] = id;
      }
    });
  });

  return conflicts;
}

// ── Tests ─────────────────────────────────────────────────────────────────────

console.log('\nMindForge Day 2 — Wave Engine Tests\n');

console.log('Dependency parsing:');

test('parses "none" as empty dependencies', () => {
  assert.deepStrictEqual(parseDependencies('none'), []);
  assert.deepStrictEqual(parseDependencies('None'), []);
  assert.deepStrictEqual(parseDependencies('NONE'), []);
});

test('parses single dependency', () => {
  assert.deepStrictEqual(parseDependencies('01'), ['01']);
});

test('parses multiple dependencies', () => {
  assert.deepStrictEqual(parseDependencies('01, 02, 03'), ['01', '02', '03']);
});

test('handles whitespace in dependency list', () => {
  assert.deepStrictEqual(parseDependencies('01,02,  03'), ['01', '02', '03']);
});

test('parses empty string as no dependencies', () => {
  assert.deepStrictEqual(parseDependencies(''), []);
});

console.log('\nWave grouping algorithm:');

test('single task with no dependencies → 1 wave', () => {
  const graph = { '01': { dependsOn: [] } };
  const waves = groupIntoWaves(graph);
  assert.deepStrictEqual(waves, [['01']]);
});

test('two independent tasks → 1 wave with both', () => {
  const graph = {
    '01': { dependsOn: [] },
    '02': { dependsOn: [] },
  };
  const waves = groupIntoWaves(graph);
  assert.strictEqual(waves.length, 1);
  assert.deepStrictEqual(waves[0].sort(), ['01', '02']);
});

test('sequential dependency chain → 3 waves, 1 task each', () => {
  const graph = {
    '01': { dependsOn: [] },
    '02': { dependsOn: ['01'] },
    '03': { dependsOn: ['02'] },
  };
  const waves = groupIntoWaves(graph);
  assert.strictEqual(waves.length, 3);
  assert.deepStrictEqual(waves[0], ['01']);
  assert.deepStrictEqual(waves[1], ['02']);
  assert.deepStrictEqual(waves[2], ['03']);
});

test('diamond dependency (fan-out then fan-in)', () => {
  const graph = {
    '01': { dependsOn: [] },
    '02': { dependsOn: ['01'] },
    '03': { dependsOn: ['01'] },
    '04': { dependsOn: ['02', '03'] },
  };
  const waves = groupIntoWaves(graph);
  assert.strictEqual(waves.length, 3);
  assert.deepStrictEqual(waves[0], ['01']);
  assert.deepStrictEqual(waves[1].sort(), ['02', '03']);
  assert.deepStrictEqual(waves[2], ['04']);
});

test('5-plan realistic example (user model → api → checkout)', () => {
  const graph = {
    '01': { dependsOn: [] },
    '02': { dependsOn: [] },
    '03': { dependsOn: ['01'] },
    '04': { dependsOn: ['02'] },
    '05': { dependsOn: ['03', '04'] },
  };
  const waves = groupIntoWaves(graph);
  assert.strictEqual(waves.length, 3);
  assert.deepStrictEqual(waves[0].sort(), ['01', '02']);
  assert.deepStrictEqual(waves[1].sort(), ['03', '04']);
  assert.deepStrictEqual(waves[2], ['05']);
});

console.log('\nCircular dependency detection:');

test('detects direct circular dependency (A → B → A)', () => {
  const graph = {
    '01': { dependsOn: ['02'] },
    '02': { dependsOn: ['01'] },
  };
  assert.strictEqual(hasCircularDependency(graph), true);
});

test('detects indirect circular dependency (A → B → C → A)', () => {
  const graph = {
    '01': { dependsOn: ['03'] },
    '02': { dependsOn: ['01'] },
    '03': { dependsOn: ['02'] },
  };
  assert.strictEqual(hasCircularDependency(graph), true);
});

test('does not false-positive on valid DAG', () => {
  const graph = {
    '01': { dependsOn: [] },
    '02': { dependsOn: ['01'] },
    '03': { dependsOn: ['01'] },
    '04': { dependsOn: ['02', '03'] },
  };
  assert.strictEqual(hasCircularDependency(graph), false);
});

console.log('\nFile conflict detection:');

test('detects conflict when two plans modify the same file', () => {
  const plans = [
    { id: '01', files: ['src/models/user.ts', 'src/models/user.test.ts'] },
    { id: '02', files: ['src/models/product.ts'] },
    { id: '03', files: ['src/models/user.ts'] },
  ];
  const conflicts = findFileConflicts(plans);
  assert.strictEqual(conflicts.length, 1);
  assert.strictEqual(conflicts[0].file, 'src/models/user.ts');
  assert.deepStrictEqual(conflicts[0].plans.sort(), ['01', '03']);
});

test('no conflicts when all plans touch different files', () => {
  const plans = [
    { id: '01', files: ['src/models/user.ts'] },
    { id: '02', files: ['src/models/product.ts'] },
    { id: '03', files: ['src/api/orders.ts'] },
  ];
  const conflicts = findFileConflicts(plans);
  assert.strictEqual(conflicts.length, 0);
});

// ── Results ───────────────────────────────────────────────────────────────────
console.log(`\n${'─'.repeat(50)}`);
console.log(`Results: ${passed} passed, ${failed} failed`);

if (failed > 0) {
  console.error(`\n❌ ${failed} test(s) failed.\n`);
  process.exit(1);
} else {
  console.log(`\n✅ All wave engine tests passed.\n`);
}
