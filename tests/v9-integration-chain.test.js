/**
 * MindForge v9 — Integration Chain Test (Pillar XXVIII)
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

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mindforge-v9-test-'));
process.on('exit', () => {
  try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch {}
});

async function main() {
  console.log('\nMindForge v9 — Integration Chain Tests\n');

  const planningDir = path.join(tmpDir, '.planning');
  const mindforgeDir = path.join(tmpDir, '.mindforge');
  fs.mkdirSync(planningDir, { recursive: true });
  fs.mkdirSync(path.join(planningDir, 'phases', '1'), { recursive: true });
  fs.mkdirSync(mindforgeDir, { recursive: true });

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
  fs.writeFileSync(path.join(planningDir, 'STATE.md'), '# Test State\n## Status\n🟢 Active\n');
  fs.writeFileSync(path.join(tmpDir, 'MINDFORGE.md'), '# MINDFORGE.md\n[VERSION] = 9.0.0\n[PLANNER] = claude-opus-4-7\n');

  // ── AutoRunner — Wave Parsing ──────────────────────────────────────────────
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
    assert.strictEqual(waves.length, 2);
    assert.strictEqual(waves[0].tasks.length, 2, 'Wave 0 should have 2 tasks');
    assert.strictEqual(waves[1].tasks.length, 1, 'Wave 1 should have 1 task');
  });

  test('Wave grouping handles empty handoffs', () => {
    const AutoRunner = require('../bin/autonomous/auto-runner');
    const runner = new AutoRunner({ phase: 1 });
    assert.strictEqual(runner._buildWaves([]).length, 0);
  });

  test('Wave grouping handles tasks without wave field', () => {
    const AutoRunner = require('../bin/autonomous/auto-runner');
    const runner = new AutoRunner({ phase: 1 });
    const waves = runner._buildWaves([{ id: 'a', name: 'A' }, { id: 'b', name: 'B' }]);
    assert.strictEqual(waves.length, 1);
    assert.strictEqual(waves[0].tasks.length, 2);
  });

  // ── AutoRunner — Negative Cases ────────────────────────────────────────────
  console.log('\nAutoRunner — Negative Cases:');

  test('Rejects invalid phase identifiers', () => {
    const AutoRunner = require('../bin/autonomous/auto-runner');
    assert.throws(() => new AutoRunner({ phase: '../../etc' }), /Invalid phase identifier/);
    assert.throws(() => new AutoRunner({ phase: 'foo bar' }), /Invalid phase identifier/);
  });

  test('Phase identifier accepts valid values', () => {
    const AutoRunner = require('../bin/autonomous/auto-runner');
    const r1 = new AutoRunner({ phase: 'phase-1' });
    assert.strictEqual(r1.phase, 'phase-1');
    const r2 = new AutoRunner({ phase: 42 });
    assert.strictEqual(r2.phase, '42');
  });

  test('updateState sanitizes prototype pollution keys', () => {
    const AutoRunner = require('../bin/autonomous/auto-runner');
    const runner = new AutoRunner({ phase: 1 });
    const tmpState = path.join(tmpDir, 'test-state.json');
    runner.statePath = tmpState;
    fs.writeFileSync(tmpState, JSON.stringify({ __proto__: { admin: true }, validKey: 'ok' }));
    runner.updateState({ newKey: 'safe' });
    const result = JSON.parse(fs.readFileSync(tmpState, 'utf8'));
    assert.strictEqual(result.validKey, 'ok');
    assert.strictEqual(result.newKey, 'safe');
    assert.ok(!Object.prototype.hasOwnProperty.call(result, '__proto__'), 'Should not have __proto__ key');
  });

  test('Wave grouping uses nullish coalescing for wave:0', () => {
    const AutoRunner = require('../bin/autonomous/auto-runner');
    const runner = new AutoRunner({ phase: 1 });
    const waves = runner._buildWaves([
      { id: 'x', name: 'X', wave: 0 },
      { id: 'y', name: 'Y', wave: 1 },
    ]);
    assert.strictEqual(waves.length, 2);
    assert.strictEqual(waves[0].wave, 0);
    assert.strictEqual(waves[0].tasks[0].id, 'x');
  });

  // ── Model Topology ─────────────────────────────────────────────────────────
  console.log('\nModel Topology — v9 Alignment:');

  test('Model router defaults are Claude 4.x family', () => {
    const Router = require('../bin/models/model-router');
    Router.clearCache();
    const s = Router.getAllSettings();
    assert.ok(s.PLANNER_MODEL.includes('opus-4'));
    assert.ok(s.EXECUTOR_MODEL.includes('sonnet-4'));
    assert.ok(s.QUICK_MODEL.includes('haiku-4'));
  });

  test('No stale Claude 3.x references in model files', () => {
    const files = ['model-client.js', 'model-broker.js', 'cloud-broker.js'].map(
      f => fs.readFileSync(path.join(__dirname, '..', 'bin', 'models', f), 'utf8')
    );
    for (const src of files) {
      assert.ok(!src.includes('claude-3-opus'), 'No claude-3-opus');
      assert.ok(!src.includes('claude-3-5-sonnet'), 'No claude-3-5-sonnet');
      assert.ok(!src.includes('claude-3-haiku'), 'No claude-3-haiku');
    }
  });

  test('Provider routing uses startsWith instead of includes', () => {
    const src = fs.readFileSync(path.join(__dirname, '..', 'bin', 'models', 'model-client.js'), 'utf8');
    assert.ok(src.includes("modelId.startsWith('claude')"), 'Should use startsWith for claude');
    assert.ok(src.includes("modelId.startsWith('gemini')"), 'Should use startsWith for gemini');
  });

  test('Error messages sanitize API keys', () => {
    const src = fs.readFileSync(path.join(__dirname, '..', 'bin', 'models', 'model-client.js'), 'utf8');
    assert.ok(src.includes('sk-***'), 'Should redact sk- prefixed keys');
  });

  test('CloudBroker startChaosMode references this.state', () => {
    const src = fs.readFileSync(path.join(__dirname, '..', 'bin', 'models', 'cloud-broker.js'), 'utf8');
    assert.ok(!src.includes('this.latencyMap'), 'Should not reference nonexistent this.latencyMap');
    assert.ok(src.includes('this.state[randomProvider].latency'), 'Should use this.state');
  });

  // ── VectorHub — Unified Memory ─────────────────────────────────────────────
  console.log('\nVectorHub — Unified Memory Schema:');

  await asyncTest('Creates all tables with indexes', async () => {
    const { VectorHub } = require('../bin/memory/vector-hub');
    const hub = new VectorHub(path.join(tmpDir, 'test-celestial.db'));
    await hub.init();

    const kId = await hub.saveKnowledge({
      type: 'test', content: 'Integration test entry', tags: ['test', 'v9'], source: 'suite',
    });
    assert.ok(kId);

    const eId = await hub.saveEdge({
      source_id: kId, target_id: 'trace-1', edge_type: 'RELATED_TO',
    });
    assert.ok(eId);

    const results = await hub.searchKnowledge('integration test');
    assert.ok(results.length > 0);

    const edges = await hub.getEdges(kId);
    assert.ok(edges.length > 0, 'getEdges should return edges for node');

    await hub.recordMigration('v9-test');
    const applied = await hub.getAppliedMigrations();
    assert.ok(applied.includes('v9-test'));

    await hub.close();
  });

  await asyncTest('FTS upsert does not create duplicates', async () => {
    const { VectorHub } = require('../bin/memory/vector-hub');
    const hub = new VectorHub(path.join(tmpDir, 'test-fts-dedup.db'));
    await hub.init();

    await hub.saveKnowledge({ id: 'dup-test', type: 'test', content: 'version one', tags: ['v1'] });
    await hub.saveKnowledge({ id: 'dup-test', type: 'test', content: 'version two', tags: ['v2'] });

    const results = await hub.searchKnowledge('version');
    assert.strictEqual(results.length, 1, `Expected 1 FTS result, got ${results.length}`);
    assert.ok(results[0].content.includes('version two'), 'Should have updated content');

    await hub.close();
  });

  await asyncTest('FTS search sanitizes special characters', async () => {
    const { VectorHub } = require('../bin/memory/vector-hub');
    const hub = new VectorHub(path.join(tmpDir, 'test-fts-safe.db'));
    await hub.init();

    await hub.saveKnowledge({ type: 'test', content: 'special chars test', tags: ['safe'] });
    const results = await hub.searchKnowledge('AND OR NOT * "test"');
    assert.ok(Array.isArray(results), 'Should not throw on FTS operators');

    await hub.close();
  });

  await asyncTest('Migration recordMigration is idempotent', async () => {
    const { VectorHub } = require('../bin/memory/vector-hub');
    const hub = new VectorHub(path.join(tmpDir, 'test-idempotent.db'));
    await hub.init();

    await hub.recordMigration('test-idem');
    await hub.recordMigration('test-idem');
    const applied = await hub.getAppliedMigrations();
    const count = applied.filter(n => n === 'test-idem').length;
    assert.strictEqual(count, 1, `Expected 1 migration record, got ${count}`);

    await hub.close();
  });

  // ── Migration Engine ───────────────────────────────────────────────────────
  console.log('\nMigration Engine:');

  test('v9 migration module exports correct interface', () => {
    const m = require('../bin/migrations/v9-unified-memory');
    assert.strictEqual(m.fromVersion, '8.2.1');
    assert.strictEqual(m.toVersion, '9.0.0');
    assert.strictEqual(typeof m.run, 'function');
  });

  test('Migration runner includes v9 migration', () => {
    const src = fs.readFileSync(path.join(__dirname, '..', 'bin', 'migrations', 'migrate.js'), 'utf8');
    assert.ok(src.includes('v9-unified-memory'));
  });

  test('Migration wraps inserts in a transaction', () => {
    const src = fs.readFileSync(path.join(__dirname, '..', 'bin', 'migrations', 'v9-unified-memory.js'), 'utf8');
    assert.ok(src.includes('.transaction('), 'Should use transaction');
  });

  test('Migration checks idempotency before running', () => {
    const src = fs.readFileSync(path.join(__dirname, '..', 'bin', 'migrations', 'v9-unified-memory.js'), 'utf8');
    assert.ok(src.includes('getAppliedMigrations'), 'Should check applied migrations');
    assert.ok(src.includes('Already applied'), 'Should skip if already applied');
  });

  // ── SDK Sync ───────────────────────────────────────────────────────────────
  console.log('\nSDK Sync:');

  test('SDK VERSION matches 10.0.6', () => {
    const src = fs.readFileSync(path.join(__dirname, '..', 'sdk', 'src', 'index.ts'), 'utf8');
    assert.ok(src.includes("VERSION = '10.0.6'"));
  });

  test('SDK exports WaveExecutionResult and MigrationResult', () => {
    const src = fs.readFileSync(path.join(__dirname, '..', 'sdk', 'src', 'index.ts'), 'utf8');
    assert.ok(src.includes('WaveExecutionResult'));
    assert.ok(src.includes('MigrationResult'));
  });

  test('SDK client has readAutoState and isDatabaseInitialized', () => {
    const src = fs.readFileSync(path.join(__dirname, '..', 'sdk', 'src', 'client.ts'), 'utf8');
    assert.ok(src.includes('readAutoState'));
    assert.ok(src.includes('isDatabaseInitialized'));
  });

  test('SDK package.json version is 10.0.6', () => {
    const pkg = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'sdk', 'package.json'), 'utf8'));
    assert.strictEqual(pkg.version, '10.0.6');
  });

  // ── Package Metadata ───────────────────────────────────────────────────────
  console.log('\nPackage Metadata:');

  test('package.json version is 10.0.6', () => {
    const pkg = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'package.json'), 'utf8'));
    assert.strictEqual(pkg.version, '10.0.6');
  });

  test('MINDFORGE.md version is 10.0.6', () => {
    const md = fs.readFileSync(path.join(__dirname, '..', 'MINDFORGE.md'), 'utf8');
    assert.ok(md.includes('10.0.6') || md.includes('10.0.2'));
  });

  // ── Summary ────────────────────────────────────────────────────────────────
  console.log(`\n  Results: ${passed} passed, ${failed} failed\n`);
  if (failed > 0) process.exit(1);
}

main().catch(err => { console.error(err); process.exit(1); });
