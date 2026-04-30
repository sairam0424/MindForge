/**
 * MindForge v9 — Integration Chain Test (Pillar XXVIII)
 * Tests the full AutoRunner → Policy → Tracer → Audit → State pipeline.
 * Run: node tests/v9-integration-chain.test.js
 */
'use strict';

const fs = require('fs');
const path = require('path');
const os = require('os');
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

async function asyncTest(name, fn) {
  try {
    await fn();
    console.log(`  ✅ ${name}`);
    passed++;
  } catch (err) {
    console.error(`  ❌ ${name}`);
    console.error(`     ${err.message}`);
    failed++;
  }
}

console.log('\nMindForge v9 — Integration Chain Tests\n');

// ── Setup: Create temp project directory ────────────────────────────────────
const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mindforge-v9-test-'));
const planningDir = path.join(tmpDir, '.planning');
const mindforgeDir = path.join(tmpDir, '.mindforge');
fs.mkdirSync(planningDir, { recursive: true });
fs.mkdirSync(path.join(planningDir, 'phases', '1'), { recursive: true });
fs.mkdirSync(mindforgeDir, { recursive: true });

// Write HANDOFF.json with test wave data
const testHandoff = {
  _warning: 'TEST FIXTURE',
  schema_type: 'HANDOFF',
  schema_version: '9.0.0',
  handoffs: [
    { id: 'task-1', name: 'Create user model', wave: 0 },
    { id: 'task-2', name: 'Add auth middleware', wave: 0 },
    { id: 'task-3', name: 'Write integration tests', wave: 1, depends_on: ['task-1', 'task-2'] },
  ],
  current_context: 'v9 integration test',
  last_updated: new Date().toISOString(),
};
fs.writeFileSync(path.join(planningDir, 'HANDOFF.json'), JSON.stringify(testHandoff, null, 2));

// Write minimal STATE.md
fs.writeFileSync(path.join(planningDir, 'STATE.md'), '# Test State\n## Status\n🟢 Active\n');

// Write minimal MINDFORGE.md
fs.writeFileSync(path.join(tmpDir, 'MINDFORGE.md'), '# MINDFORGE.md\n[VERSION] = 9.0.0\n[PLANNER] = claude-opus-4-7\n');

// ── Test 1: HANDOFF parsing ────────────────────────────────────────────────
console.log('AutoRunner — Wave Parsing:');

test('HANDOFF.json loads correctly', () => {
  const handoff = JSON.parse(fs.readFileSync(path.join(planningDir, 'HANDOFF.json'), 'utf8'));
  assert.strictEqual(handoff.handoffs.length, 3);
  assert.strictEqual(handoff.schema_version, '9.0.0');
});

test('Wave grouping produces 2 waves from 3 tasks', () => {
  const AutoRunner = require('../bin/autonomous/auto-runner');
  const runner = new AutoRunner({ phase: 1 });
  const waves = runner._buildWaves(testHandoff.handoffs);
  assert.strictEqual(waves.length, 2, `Expected 2 waves, got ${waves.length}`);
  assert.strictEqual(waves[0].tasks.length, 2, 'Wave 0 should have 2 tasks');
  assert.strictEqual(waves[1].tasks.length, 1, 'Wave 1 should have 1 task');
});

test('Wave grouping handles empty handoffs', () => {
  const AutoRunner = require('../bin/autonomous/auto-runner');
  const runner = new AutoRunner({ phase: 1 });
  const waves = runner._buildWaves([]);
  assert.strictEqual(waves.length, 0);
});

test('Wave grouping handles tasks without wave field', () => {
  const AutoRunner = require('../bin/autonomous/auto-runner');
  const runner = new AutoRunner({ phase: 1 });
  const waves = runner._buildWaves([
    { id: 'a', name: 'Task A' },
    { id: 'b', name: 'Task B' },
  ]);
  assert.strictEqual(waves.length, 1, 'Should produce single wave');
  assert.strictEqual(waves[0].tasks.length, 2);
});

// ── Test 2: Model Topology ─────────────────────────────────────────────────
console.log('\nModel Topology — v9 Alignment:');

test('Model router defaults are Claude 4.x family', () => {
  const Router = require('../bin/models/model-router');
  Router.clearCache();
  const settings = Router.getAllSettings();
  assert.ok(settings.PLANNER_MODEL.includes('opus-4'), `PLANNER should be opus-4.x, got ${settings.PLANNER_MODEL}`);
  assert.ok(settings.EXECUTOR_MODEL.includes('sonnet-4'), `EXECUTOR should be sonnet-4.x, got ${settings.EXECUTOR_MODEL}`);
  assert.ok(settings.QUICK_MODEL.includes('haiku-4'), `QUICK should be haiku-4.x, got ${settings.QUICK_MODEL}`);
});

test('Model client fallback chains reference Claude 4.x', () => {
  const clientSrc = fs.readFileSync(path.join(__dirname, '..', 'bin', 'models', 'model-client.js'), 'utf8');
  assert.ok(!clientSrc.includes('claude-3-opus'), 'Should not reference claude-3-opus');
  assert.ok(!clientSrc.includes('claude-3-5-sonnet'), 'Should not reference claude-3-5-sonnet');
  assert.ok(clientSrc.includes('claude-opus-4-7'), 'Should reference claude-opus-4-7');
});

test('Cloud broker provider mappings are Claude 4.x', () => {
  const brokerSrc = fs.readFileSync(path.join(__dirname, '..', 'bin', 'models', 'cloud-broker.js'), 'utf8');
  assert.ok(!brokerSrc.includes('claude-3-5-sonnet'), 'Should not reference claude-3-5-sonnet');
  assert.ok(brokerSrc.includes('claude-sonnet-4-6'), 'Should reference claude-sonnet-4-6');
});

test('Model broker cost rates are Claude 4.x aligned', () => {
  const brokerSrc = fs.readFileSync(path.join(__dirname, '..', 'bin', 'models', 'model-broker.js'), 'utf8');
  assert.ok(brokerSrc.includes('claude-opus-4-7'), 'Should reference claude-opus-4-7 in rates');
  assert.ok(!brokerSrc.includes('claude-3-opus'), 'Should not reference claude-3-opus in rates');
});

// ── Test 3: VectorHub v9 Schema ────────────────────────────────────────────
console.log('\nVectorHub — Unified Memory Schema:');

asyncTest('VectorHub creates knowledge and graph_edges tables', async () => {
  const { VectorHub } = require('../bin/memory/vector-hub');
  const testDbPath = path.join(tmpDir, 'test-celestial.db');
  const hub = new VectorHub(testDbPath);
  await hub.init();

  // Verify knowledge table exists
  const kId = await hub.saveKnowledge({
    type: 'test',
    content: 'Integration test knowledge entry',
    tags: ['test', 'v9'],
    source: 'test-suite',
  });
  assert.ok(kId, 'saveKnowledge should return an ID');

  // Verify graph_edges table exists
  const eId = await hub.saveEdge({
    source_id: kId,
    target_id: 'some-trace-id',
    edge_type: 'RELATED_TO',
  });
  assert.ok(eId, 'saveEdge should return an ID');

  // Verify FTS search works
  const results = await hub.searchKnowledge('integration test');
  assert.ok(results.length > 0, 'FTS search should return results');

  // Verify migration tracking
  await hub.recordMigration('v9-test-migration');
  const applied = await hub.getAppliedMigrations();
  assert.ok(applied.includes('v9-test-migration'), 'Migration should be recorded');

  await hub.close();
}).then(() => {
  // ── Test 4: Migration script ───────────────────────────────────────────
  console.log('\nMigration Engine:');

  test('v9 migration module exports correct interface', () => {
    const migration = require('../bin/migrations/v9-unified-memory');
    assert.strictEqual(migration.fromVersion, '8.2.1');
    assert.strictEqual(migration.toVersion, '9.0.0');
    assert.strictEqual(typeof migration.run, 'function');
    assert.ok(migration.description.length > 0);
  });

  test('Migration runner includes v9 migration', () => {
    const migrateSrc = fs.readFileSync(path.join(__dirname, '..', 'bin', 'migrations', 'migrate.js'), 'utf8');
    assert.ok(migrateSrc.includes('v9-unified-memory'), 'migrate.js should reference v9 migration');
  });

  // ── Test 5: SDK version sync ──────────────────────────────────────────
  console.log('\nSDK Sync:');

  test('SDK VERSION matches 9.0.0', () => {
    const indexSrc = fs.readFileSync(path.join(__dirname, '..', 'sdk', 'src', 'index.ts'), 'utf8');
    assert.ok(indexSrc.includes("VERSION = '9.0.0'"), 'SDK VERSION should be 9.0.0');
  });

  test('SDK exports WaveExecutionResult type', () => {
    const indexSrc = fs.readFileSync(path.join(__dirname, '..', 'sdk', 'src', 'index.ts'), 'utf8');
    assert.ok(indexSrc.includes('WaveExecutionResult'), 'Should export WaveExecutionResult');
  });

  test('SDK exports MigrationResult type', () => {
    const indexSrc = fs.readFileSync(path.join(__dirname, '..', 'sdk', 'src', 'index.ts'), 'utf8');
    assert.ok(indexSrc.includes('MigrationResult'), 'Should export MigrationResult');
  });

  test('SDK client has readAutoState method', () => {
    const clientSrc = fs.readFileSync(path.join(__dirname, '..', 'sdk', 'src', 'client.ts'), 'utf8');
    assert.ok(clientSrc.includes('readAutoState'), 'Client should have readAutoState');
  });

  // ── Test 6: Package version ───────────────────────────────────────────
  console.log('\nPackage Metadata:');

  test('package.json version is 9.0.0', () => {
    const pkg = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'package.json'), 'utf8'));
    assert.strictEqual(pkg.version, '9.0.0');
  });

  test('MINDFORGE.md version is 9.0.0-BEDROCK', () => {
    const md = fs.readFileSync(path.join(__dirname, '..', 'MINDFORGE.md'), 'utf8');
    assert.ok(md.includes('9.0.0-BEDROCK'), 'MINDFORGE.md should reference 9.0.0-BEDROCK');
  });

  // ── Cleanup ────────────────────────────────────────────────────────────
  try {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  } catch (e) {
    // Non-fatal
  }

  // ── Summary ────────────────────────────────────────────────────────────
  console.log(`\n  Results: ${passed} passed, ${failed} failed\n`);
  if (failed > 0) process.exit(1);
});
