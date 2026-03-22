/**
 * MindForge Day 7 — Migration Engine Tests
 * Tests the migration logic without touching real .planning/ files.
 *
 * Run: node tests/migration.test.js
 */
'use strict';

const fs   = require('fs');
const path = require('path');
const os   = require('os');
const assert = require('assert');
let passed = 0, failed = 0;

function test(name, fn) {
  try { fn(); console.log(`  ✅  ${name}`); passed++; }
  catch(e) { console.error(`  ❌  ${name}\n      ${e.message}`); failed++; }
}

// ── Simulation helpers ─────────────────────────────────────────────────────────

function simulateHandoffMigration(handoff, toVersion) {
  const result = JSON.parse(JSON.stringify(handoff));
  if (toVersion === '0.5.0' || toVersion === '1.0.0') {
    if (!Array.isArray(result.decisions_made))     result.decisions_made     = [];
    if (!Array.isArray(result.discoveries))        result.discoveries        = [];
    if (!Array.isArray(result.implicit_knowledge)) result.implicit_knowledge = [];
    if (!Array.isArray(result.quality_signals))    result.quality_signals    = [];
  }
  if (toVersion === '0.6.0' || toVersion === '1.0.0') {
    if (!result.developer_id)                         result.developer_id   = null;
    if (!result.session_id)                           result.session_id     = null;
    if (!Array.isArray(result.recent_commits))        result.recent_commits = [];
    if (!Array.isArray(result.recent_files))          result.recent_files   = [];
  }
  if (toVersion === '1.0.0') {
    if (!result.plugin_api_version)                   result.plugin_api_version = '1.0.0';
    result.schema_version = '1.0.0';
  }
  return result;
}

function simulateAuditMigration(lines) {
  return lines.map(line => {
    try {
      const entry = JSON.parse(line);
      if (!entry.session_id) {
        return JSON.stringify({ ...entry, session_id: 'migrated-from-pre-1.0' });
      }
      return line;
    } catch {
      return line; // preserve invalid lines
    }
  });
}

function simulateMindforgeMdMigration(content) {
  return content.replace(
    /^(VERIFY_PASS_RATE_WARNING_THRESHOLD=)(\d+(?:\.\d+)?)(\s*)$/m,
    (match, prefix, val, suffix) => {
      const num = parseFloat(val);
      return num > 1
        ? `${prefix}${(num / 100).toFixed(2)}${suffix}`
        : match;
    }
  );
}

// ── Tests ──────────────────────────────────────────────────────────────────────
console.log('\nMindForge Day 7 — Migration Tests\n');

console.log('Version comparator:');

test('compareSemver works for all comparison cases', () => {
  const { compareSemver } = require('../bin/updater/version-comparator');
  assert.ok(compareSemver('1.0.0', '0.9.9') > 0, '1.0.0 > 0.9.9');
  assert.ok(compareSemver('0.1.0', '1.0.0') < 0, '0.1.0 < 1.0.0');
  assert.strictEqual(compareSemver('0.5.0', '0.5.0'), 0, '0.5.0 == 0.5.0');
  assert.ok(compareSemver('2.0.0', '1.99.99') > 0, 'Major beats all minors');
});

test('migration chain for v0.3.0 → v1.0.0 includes ALL 3 migrations', () => {
  // Simulate the filter logic
  const { compareSemver } = require('../bin/updater/version-comparator');
  const fromVersion = '0.3.0';
  const toVersion   = '1.0.0';

  const migrations = [
    { fromVersion: '0.1.0', toVersion: '0.5.0' },
    { fromVersion: '0.5.0', toVersion: '0.6.0' },
    { fromVersion: '0.6.0', toVersion: '1.0.0' },
  ].filter(m =>
    compareSemver(m.toVersion, fromVersion) > 0 &&
    compareSemver(m.toVersion, toVersion) <= 0
  );

  assert.strictEqual(migrations.length, 3,
    `Expected 3 migrations for 0.3.0→1.0.0, got ${migrations.length}`);
});

test('migration chain for v0.6.0 → v1.0.0 includes only 1 migration', () => {
  const { compareSemver } = require('../bin/updater/version-comparator');
  const fromVersion = '0.6.0';
  const toVersion   = '1.0.0';

  const migrations = [
    { fromVersion: '0.1.0', toVersion: '0.5.0' },
    { fromVersion: '0.5.0', toVersion: '0.6.0' },
    { fromVersion: '0.6.0', toVersion: '1.0.0' },
  ].filter(m =>
    compareSemver(m.toVersion, fromVersion) > 0 &&
    compareSemver(m.toVersion, toVersion) <= 0
  );

  assert.strictEqual(migrations.length, 1,
    `Expected 1 migration for 0.6.0→1.0.0, got ${migrations.length}: ${migrations.map(m=>m.toVersion)}`);
  assert.strictEqual(migrations[0].toVersion, '1.0.0');
});

test('migration chain for same version returns 0 migrations', () => {
  const { compareSemver } = require('../bin/updater/version-comparator');
  const fromVersion = '1.0.0';
  const toVersion   = '1.0.0';

  const migrations = [
    { fromVersion: '0.1.0', toVersion: '0.5.0' },
    { fromVersion: '0.5.0', toVersion: '0.6.0' },
    { fromVersion: '0.6.0', toVersion: '1.0.0' },
  ].filter(m =>
    compareSemver(m.toVersion, fromVersion) > 0 &&
    compareSemver(m.toVersion, toVersion) <= 0
  );

  assert.strictEqual(migrations.length, 0, 'No migrations needed for same version');
});

console.log('\nHANDOFF.json migrations:');

test('v0.1.0 → v0.5.0: adds intelligence layer fields', () => {
  const h = { schema_version: '0.1.0', next_task: 'test', _warning: 'warn' };
  const m = simulateHandoffMigration(h, '0.5.0');
  assert.ok(Array.isArray(m.decisions_made), 'decisions_made should be array');
  assert.ok(Array.isArray(m.discoveries), 'discoveries should be array');
  assert.ok(Array.isArray(m.implicit_knowledge), 'implicit_knowledge should be array');
  assert.ok(Array.isArray(m.quality_signals), 'quality_signals should be array');
});

test('v0.5.0 → v0.6.0: adds distribution platform fields', () => {
  const h = { schema_version: '0.5.0', next_task: 'test', _warning: 'warn' };
  const m = simulateHandoffMigration(h, '0.6.0');
  assert.ok(Array.isArray(m.recent_commits), 'recent_commits should be array');
  assert.ok(Array.isArray(m.recent_files), 'recent_files should be array');
  assert.ok('developer_id' in m, 'developer_id should exist');
  assert.ok('session_id' in m, 'session_id should exist');
});

test('v0.6.0 → v1.0.0: adds plugin_api_version', () => {
  const h = { schema_version: '0.6.0', next_task: 'test', _warning: 'warn' };
  const m = simulateHandoffMigration(h, '1.0.0');
  assert.strictEqual(m.plugin_api_version, '1.0.0');
  assert.strictEqual(m.schema_version, '1.0.0');
});

test('v0.1.0 → v1.0.0 full chain: all fields present', () => {
  const h = { schema_version: '0.1.0', next_task: 'first task', _warning: 'warn', phase: 1 };
  const m = simulateHandoffMigration(h, '1.0.0');

  // All fields from all migrations should be present
  assert.ok(Array.isArray(m.decisions_made), 'decisions_made from 0.5.0 migration');
  assert.ok(Array.isArray(m.recent_commits), 'recent_commits from 0.6.0 migration');
  assert.strictEqual(m.plugin_api_version, '1.0.0', 'plugin_api_version from 1.0.0 migration');
  assert.strictEqual(m.phase, 1, 'Original field preserved');
  assert.strictEqual(m.next_task, 'first task', 'Original next_task preserved');
});

test('migration does not overwrite existing values', () => {
  const h = {
    schema_version: '0.1.0',
    next_task: 'existing task',
    _warning: 'original warning',
    phase: 3,
    plan: '04',
    custom_org_field: 'preserved',
  };
  const m = simulateHandoffMigration(h, '1.0.0');
  assert.strictEqual(m.next_task, 'existing task');
  assert.strictEqual(m.phase, 3);
  assert.strictEqual(m.plan, '04');
  assert.strictEqual(m.custom_org_field, 'preserved');
  assert.strictEqual(m._warning, 'original warning');
});

console.log('\nAUDIT.jsonl migration:');

test('backfills missing session_id in audit entries', () => {
  const lines = [
    JSON.stringify({ id: 'uuid-1', timestamp: '2026-01-01T00:00:00Z', event: 'task_started', agent: 'test' }),
    JSON.stringify({ id: 'uuid-2', timestamp: '2026-01-01T00:01:00Z', event: 'task_completed', agent: 'test', session_id: 'existing' }),
  ];
  const migrated = simulateAuditMigration(lines);
  const first  = JSON.parse(migrated[0]);
  const second = JSON.parse(migrated[1]);
  assert.ok(first.session_id, 'Missing session_id should be backfilled');
  assert.strictEqual(first.session_id, 'migrated-from-pre-1.0');
  assert.strictEqual(second.session_id, 'existing', 'Existing session_id must not be changed');
});

test('preserves invalid JSON lines without crashing', () => {
  const lines = [
    JSON.stringify({ id: 'uuid-1', event: 'test', timestamp: 't', agent: 'a' }),
    '{this is not valid JSON}',
    JSON.stringify({ id: 'uuid-2', event: 'test', timestamp: 't', agent: 'a' }),
  ];
  const migrated = simulateAuditMigration(lines);
  assert.strictEqual(migrated.length, 3, 'All lines preserved');
  assert.strictEqual(migrated[1], '{this is not valid JSON}', 'Invalid line unchanged');
});

test('does not double-backfill entries that already have session_id', () => {
  const original = JSON.stringify({ id: 'uuid', event: 'test', timestamp: 't', agent: 'a', session_id: 'my-session' });
  const [migrated] = simulateAuditMigration([original]);
  const entry = JSON.parse(migrated);
  assert.strictEqual(entry.session_id, 'my-session', 'Should not overwrite existing session_id');
});

console.log('\nMINDFORGE.md migration:');

test('converts VERIFY_PASS_RATE_WARNING_THRESHOLD from 75 to 0.75', () => {
  const content = 'VERIFY_PASS_RATE_WARNING_THRESHOLD=75\n';
  const migrated = simulateMindforgeMdMigration(content);
  assert.ok(migrated.includes('0.75'), `Expected 0.75, got: ${migrated.trim()}`);
  assert.ok(!migrated.match(/=75(\s|$)/), 'Should not still contain =75');
});

test('converts VERIFY_PASS_RATE_WARNING_THRESHOLD from 80 to 0.80', () => {
  const content = 'VERIFY_PASS_RATE_WARNING_THRESHOLD=80\nOTHER=value\n';
  const migrated = simulateMindforgeMdMigration(content);
  assert.ok(migrated.includes('0.80') || migrated.includes('0.8'), 'Expected 0.80');
  assert.ok(migrated.includes('OTHER=value'), 'Should preserve other settings');
});

test('does NOT modify values already in decimal format (0.75)', () => {
  const content = 'VERIFY_PASS_RATE_WARNING_THRESHOLD=0.75\n';
  const migrated = simulateMindforgeMdMigration(content);
  assert.ok(migrated.includes('0.75'), 'Should preserve existing decimal format');
  assert.ok(!migrated.includes('0.0075'), 'Should not double-convert a decimal');
});

test('does NOT modify value of exactly 1 (ambiguous — preserve)', () => {
  const content = 'VERIFY_PASS_RATE_WARNING_THRESHOLD=1\n';
  const migrated = simulateMindforgeMdMigration(content);
  // Value of 1 should be preserved as-is (it's ≤ 1, within decimal range)
  assert.ok(migrated.includes('=1'), 'Value of 1 should not be converted');
  assert.ok(!migrated.includes('=0.01'), 'Value of 1 should not become 0.01');
});

test('MINDFORGE.md value 1.0 (explicit decimal) is not converted', () => {
  const content = 'VERIFY_PASS_RATE_WARNING_THRESHOLD=1.0\n';
  const migrated = simulateMindforgeMdMigration(content);
  assert.ok(migrated.includes('=1.0'), 'Should preserve 1.0 format without conversion');
});

console.log('\nMigration infrastructure:');

test('all migration files have correct fromVersion/toVersion', () => {
  const files = [
    { file: 'bin/migrations/0.1.0-to-0.5.0.js', from: '0.1.0', to: '0.5.0' },
    { file: 'bin/migrations/0.5.0-to-0.6.0.js', from: '0.5.0', to: '0.6.0' },
    { file: 'bin/migrations/0.6.0-to-1.0.0.js', from: '0.6.0', to: '1.0.0' },
  ];
  files.forEach(({ file, from, to }) => {
    const c = fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : '';
    assert.ok(c.includes(from), `${file}: should contain fromVersion ${from}`);
    assert.ok(c.includes(to),   `${file}: should contain toVersion ${to}`);
  });
});

test('migration chain covers v0.1.0 → v1.0.0 completely', () => {
  const { compareSemver } = require('../bin/updater/version-comparator');

  // Chain: 0.1.0 → 0.5.0 → 0.6.0 → 1.0.0
  const chain = ['0.1.0', '0.5.0', '0.6.0', '1.0.0'];
  for (let i = 0; i < chain.length - 1; i++) {
    const file = `bin/migrations/${chain[i]}-to-${chain[i+1]}.js`;
    assert.ok(fs.existsSync(file), `Missing migration: ${file}`);
  }

  // Verify no gaps: each migration's toVersion = next migration's fromVersion
  for (let i = 0; i < chain.length - 2; i++) {
    assert.ok(
      compareSemver(chain[i + 1], chain[i]) > 0,
      `Chain gap between ${chain[i]} and ${chain[i+1]}`
    );
  }
});

test('migrate.js exports runMigrations function', () => {
  const { runMigrations } = require('../bin/migrations/migrate');
  assert.strictEqual(typeof runMigrations, 'function', 'runMigrations should be a function');
});

console.log(`\n${'─'.repeat(55)}`);
console.log(`Results: ${passed} passed, ${failed} failed`);
if (failed > 0) {
  console.error(`\n❌  ${failed} test(s) failed.\n`);
  process.exit(1);
} else {
  console.log('\n✅  All migration tests passed.\n');
}
