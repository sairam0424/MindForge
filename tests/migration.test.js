/**
 * MindForge Day 7 — Migration Engine Tests
 * Tests the migration logic without touching real .planning/ files.
 *
 * Run: node tests/migration.test.js
 */
'use strict';

const fs   = require('fs');
const path = require('path');
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

// simulateAuditMigration() USED TO LIVE HERE, and it is why the defect below survived.
//
// It re-implemented the migration's audit step inside the test file, so the assertions verified the
// simulation and never the shipped code. Three tests passed while asserting the mutation was CORRECT:
// "backfills missing session_id in audit entries" checked that every entry gained
// `session_id: 'migrated-from-pre-1.0'`. What the real migration did was rewrite every line of a
// SHA-256 back-linked append-only log. Measured on a 50-entry chain written by the real writer:
//
//     before  ->  audit chain valid: 50 entries                              exit 0
//     after   ->  audit chain BROKEN at entry 0: hash mismatch (entry mutated)  exit 1
//
// 50 of 50 entries mutated, integrity gone at the first entry, and the migration printed
// "backfilled session_id in 50 of 50 entries" then reported "All migrations complete". A local
// re-implementation cannot catch that, because the chain never enters the simulation. Same defect class
// as tests/governance.test.js re-implementing classifyChange(), removed in 2e1f8c7.
//
// The tests below drive the REAL migration modules against a REAL chain and assert on
// bin/verify-audit.js. That is the only arrangement in which this failure is visible.

const { appendAuditEntrySync } = require(path.join(__dirname, '..', 'bin', 'autonomous', 'audit-writer.js'));
const { spawnSync } = require('child_process');
const os = require('os');
const REPO = fs.realpathSync(path.join(__dirname, '..'));

/** Build a real chain of `n` entries in a fresh tmpdir; returns {dir, audit, lines}. */
function realChain(n = 50) {
  const dir = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'mf-migtest-')));
  const audit = path.join(dir, '.planning', 'AUDIT.jsonl');
  for (let i = 0; i < n; i++) {
    appendAuditEntrySync(audit, {
      event: `probe_${i}`, target_id: `T-${i}`, description: `entry ${i}`, agent: 'migration-test',
    });
  }
  return { dir, audit, lines: fs.readFileSync(audit, 'utf8').split('\n').filter(Boolean) };
}

/** Run bin/verify-audit.js against an explicit path. */
function verifyChain(audit) {
  const r = spawnSync(process.execPath, [path.join(REPO, 'bin', 'verify-audit.js'), audit],
    { cwd: REPO, encoding: 'utf8' });
  return { status: r.status, out: `${r.stdout || ''}${r.stderr || ''}`.trim() };
}

/**
 * Drive a real migration module's run() over a scratch project.
 *
 * Runs in a CHILD process because run() is async while this file's test() helper is synchronous —
 * spawnSync awaits it without converting every existing test in the file to async. The runner script
 * goes to a real file rather than `-e`, since the nested quoting needed to embed paths in a one-liner
 * is where these probes usually break.
 */
function runRealMigration(name, dir) {
  const script = path.join(dir, 'run-migration.js');
  fs.writeFileSync(script, [
    `const mig = require(${JSON.stringify(path.join(REPO, 'bin', 'migrations', `${name}.js`))});`,
    `const d = ${JSON.stringify(dir)};`,
    'const p = require(\'path\');',
    'Promise.resolve(mig.run({',
    '  audit:       p.join(d, \'.planning\', \'AUDIT.jsonl\'),',
    '  handoff:     p.join(d, \'.planning\', \'HANDOFF.json\'),',
    '  state:       p.join(d, \'.planning\', \'STATE.md\'),',
    '  mindforgemd: p.join(d, \'MINDFORGE.md\'),',
    '})).then(() => process.exit(0)).catch((e) => { console.error(e.message); process.exit(1); });',
  ].join('\n'));
  const r = spawnSync(process.execPath, [script], { cwd: dir, encoding: 'utf8' });
  return { status: r.status, out: `${r.stdout || ''}${r.stderr || ''}` };
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

for (const name of ['0.6.0-to-1.0.0', '1.0.0-to-2.0.0']) {
  test(`${name} leaves every existing audit entry BYTE-IDENTICAL`, () => {
    // The assertion the old simulation could not make. An append-only, back-linked log admits exactly
    // one safe edit: appending. Byte-identity of the prefix is the strongest form of that statement and
    // it does not depend on the verifier's own correctness.
    const { dir, audit, lines: before } = realChain(50);
    try {
      const r = runRealMigration(name, dir);
      assert.strictEqual(r.status, 0, `migration failed: ${r.out.slice(0, 300)}`);
      const after = fs.readFileSync(audit, 'utf8').split('\n').filter(Boolean);
      assert.ok(after.length >= before.length,
        `entries went from ${before.length} to ${after.length} — a migration must never remove entries`);
      const prefix = after.slice(0, before.length);
      for (let i = 0; i < before.length; i++) {
        assert.strictEqual(prefix[i], before[i],
          `entry ${i} was REWRITTEN. Any added key changes the hash material, because `
          + 'bin/governance/audit-hash.js hashes {...entry, previous_hash}. Before:\n'
          + `  ${before[i].slice(0, 150)}\nAfter:\n  ${prefix[i].slice(0, 150)}`);
      }
    } finally { fs.rmSync(dir, { recursive: true, force: true }); }
  });

  test(`${name} leaves the hash chain VERIFIABLE`, () => {
    // Driven through the real bin/verify-audit.js, which shares the canonical hasher with the writer.
    const { dir, audit } = realChain(50);
    try {
      const control = verifyChain(audit);
      assert.strictEqual(control.status, 0,
        `the generated chain must verify before migrating, or this proves nothing: ${control.out}`);

      const r = runRealMigration(name, dir);
      assert.strictEqual(r.status, 0, `migration failed: ${r.out.slice(0, 300)}`);

      const after = verifyChain(audit);
      assert.strictEqual(after.status, 0,
        `the chain is BROKEN after ${name}. This is what the removed simulation hid: `
        + `${after.out.slice(0, 200)}`);
      assert.match(after.out, /valid: 51 entries/,
        `expected 51 entries (50 + one appended migration record), got: ${after.out.slice(0, 120)}`);
    } finally { fs.rmSync(dir, { recursive: true, force: true }); }
  });

  test(`${name} RECORDS itself, rather than migrating silently`, () => {
    // Deleting the mutation must not mean the migration leaves no trace. The record is APPENDED, so it
    // extends the chain instead of invalidating it.
    const { dir, audit, lines: before } = realChain(10);
    try {
      assert.strictEqual(runRealMigration(name, dir).status, 0);
      const after = fs.readFileSync(audit, 'utf8').split('\n').filter(Boolean);
      assert.strictEqual(after.length, before.length + 1,
        `expected exactly one appended entry, got ${after.length - before.length}`);
      const rec = JSON.parse(after[after.length - 1]);
      assert.strictEqual(rec.event, 'schema_migrated');
      assert.strictEqual(rec.target_id, 'AUDIT.jsonl');
      assert.ok(rec.previous_hash && rec._hash, 'the appended record must itself be chained');
      assert.ok(!('session_id' in rec) || typeof rec.session_id === 'string',
        'the record must not reintroduce a placeholder field on other entries');
    } finally { fs.rmSync(dir, { recursive: true, force: true }); }
  });
}

test('no migration rewrites AUDIT.jsonl in place', () => {
  // Structural backstop across the whole directory, so a NEW migration cannot reintroduce the pattern.
  // Targets writes to the audit path specifically; safeMigrate() takes content and returns replacement
  // content, which is a rewrite by construction, so applying it to paths.audit is the smell.
  const dir = path.join(REPO, 'bin', 'migrations');
  const offenders = [];
  for (const f of fs.readdirSync(dir).filter((n) => n.endsWith('.js'))) {
    const code = fs.readFileSync(path.join(dir, f), 'utf8')
      .split('\n').filter((l) => !/^\s*(\/\/|\*|\/\*)/.test(l)).join('\n');
    if (/safeMigrate\(\s*paths\.audit/.test(code)) offenders.push(`${f}: safeMigrate(paths.audit)`);
    if (/writeFileSync\(\s*paths\.audit/.test(code)) offenders.push(`${f}: writeFileSync(paths.audit)`);
  }
  assert.deepStrictEqual(offenders, [],
    `${offenders.length} migration(s) rewrite the audit log in place: ${offenders.join(', ')}. `
    + 'A SHA-256 back-linked log can only be appended to — use appendAuditEntrySync.');
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
