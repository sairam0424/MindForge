/**
 * MindForge Day 7 — Migration Engine Tests
 * Tests the migration logic without touching real .planning/ files.
 *
 * Run: node tests/migration.test.js
 */
'use strict';

const fs = require('fs');
const path = require('path');
const assert = require('assert');
let passed = 0,
  failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`  ✅  ${name}`);
    passed++;
  } catch (e) {
    console.error(`  ❌  ${name}\n      ${e.message}`);
    failed++;
  }
}

// ── Simulation helpers ─────────────────────────────────────────────────────────

function simulateHandoffMigration(handoff, toVersion) {
  const result = JSON.parse(JSON.stringify(handoff));
  if (toVersion === '0.5.0' || toVersion === '1.0.0') {
    if (!Array.isArray(result.decisions_made)) result.decisions_made = [];
    if (!Array.isArray(result.discoveries)) result.discoveries = [];
    if (!Array.isArray(result.implicit_knowledge))
      result.implicit_knowledge = [];
    if (!Array.isArray(result.quality_signals)) result.quality_signals = [];
  }
  if (toVersion === '0.6.0' || toVersion === '1.0.0') {
    if (!result.developer_id) result.developer_id = null;
    if (!result.session_id) result.session_id = null;
    if (!Array.isArray(result.recent_commits)) result.recent_commits = [];
    if (!Array.isArray(result.recent_files)) result.recent_files = [];
  }
  if (toVersion === '1.0.0') {
    if (!result.plugin_api_version) result.plugin_api_version = '1.0.0';
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

const { appendAuditEntrySync } = require(
  path.join(__dirname, '..', 'bin', 'autonomous', 'audit-writer.js'),
);
const { spawnSync } = require('child_process');
const os = require('os');
const REPO = fs.realpathSync(path.join(__dirname, '..'));

/** Build a real chain of `n` entries in a fresh tmpdir; returns {dir, audit, lines}. */
function realChain(n = 50) {
  const dir = fs.realpathSync(
    fs.mkdtempSync(path.join(os.tmpdir(), 'mf-migtest-')),
  );
  const audit = path.join(dir, '.planning', 'AUDIT.jsonl');
  for (let i = 0; i < n; i++) {
    appendAuditEntrySync(audit, {
      event: `probe_${i}`,
      target_id: `T-${i}`,
      description: `entry ${i}`,
      agent: 'migration-test',
    });
  }
  return {
    dir,
    audit,
    lines: fs.readFileSync(audit, 'utf8').split('\n').filter(Boolean),
  };
}

/** Run bin/verify-audit.js against an explicit path. */
function verifyChain(audit) {
  const r = spawnSync(
    process.execPath,
    [path.join(REPO, 'bin', 'verify-audit.js'), audit],
    { cwd: REPO, encoding: 'utf8' },
  );
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
  fs.writeFileSync(
    script,
    [
      `const mig = require(${JSON.stringify(path.join(REPO, 'bin', 'migrations', `${name}.js`))});`,
      `const d = ${JSON.stringify(dir)};`,
      'const p = require(\'path\');',
      'Promise.resolve(mig.run({',
      '  audit:       p.join(d, \'.planning\', \'AUDIT.jsonl\'),',
      '  handoff:     p.join(d, \'.planning\', \'HANDOFF.json\'),',
      '  state:       p.join(d, \'.planning\', \'STATE.md\'),',
      '  mindforgemd: p.join(d, \'MINDFORGE.md\'),',
      '})).then(() => process.exit(0)).catch((e) => { console.error(e.message); process.exit(1); });',
    ].join('\n'),
  );
  const r = spawnSync(process.execPath, [script], {
    cwd: dir,
    encoding: 'utf8',
  });
  return { status: r.status, out: `${r.stdout || ''}${r.stderr || ''}` };
}

function simulateMindforgeMdMigration(content) {
  return content.replace(
    /^(VERIFY_PASS_RATE_WARNING_THRESHOLD=)(\d+(?:\.\d+)?)(\s*)$/m,
    (match, prefix, val, suffix) => {
      const num = parseFloat(val);
      return num > 1 ? `${prefix}${(num / 100).toFixed(2)}${suffix}` : match;
    },
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
  const toVersion = '1.0.0';

  const migrations = [
    { fromVersion: '0.1.0', toVersion: '0.5.0' },
    { fromVersion: '0.5.0', toVersion: '0.6.0' },
    { fromVersion: '0.6.0', toVersion: '1.0.0' },
  ].filter(
    (m) =>
      compareSemver(m.toVersion, fromVersion) > 0 &&
      compareSemver(m.toVersion, toVersion) <= 0,
  );

  assert.strictEqual(
    migrations.length,
    3,
    `Expected 3 migrations for 0.3.0→1.0.0, got ${migrations.length}`,
  );
});

test('migration chain for v0.6.0 → v1.0.0 includes only 1 migration', () => {
  const { compareSemver } = require('../bin/updater/version-comparator');
  const fromVersion = '0.6.0';
  const toVersion = '1.0.0';

  const migrations = [
    { fromVersion: '0.1.0', toVersion: '0.5.0' },
    { fromVersion: '0.5.0', toVersion: '0.6.0' },
    { fromVersion: '0.6.0', toVersion: '1.0.0' },
  ].filter(
    (m) =>
      compareSemver(m.toVersion, fromVersion) > 0 &&
      compareSemver(m.toVersion, toVersion) <= 0,
  );

  assert.strictEqual(
    migrations.length,
    1,
    `Expected 1 migration for 0.6.0→1.0.0, got ${migrations.length}: ${migrations.map((m) => m.toVersion)}`,
  );
  assert.strictEqual(migrations[0].toVersion, '1.0.0');
});

test('migration chain for same version returns 0 migrations', () => {
  const { compareSemver } = require('../bin/updater/version-comparator');
  const fromVersion = '1.0.0';
  const toVersion = '1.0.0';

  const migrations = [
    { fromVersion: '0.1.0', toVersion: '0.5.0' },
    { fromVersion: '0.5.0', toVersion: '0.6.0' },
    { fromVersion: '0.6.0', toVersion: '1.0.0' },
  ].filter(
    (m) =>
      compareSemver(m.toVersion, fromVersion) > 0 &&
      compareSemver(m.toVersion, toVersion) <= 0,
  );

  assert.strictEqual(
    migrations.length,
    0,
    'No migrations needed for same version',
  );
});

console.log('\nHANDOFF.json migrations:');

test('v0.1.0 → v0.5.0: adds intelligence layer fields', () => {
  const h = { schema_version: '0.1.0', next_task: 'test', _warning: 'warn' };
  const m = simulateHandoffMigration(h, '0.5.0');
  assert.ok(Array.isArray(m.decisions_made), 'decisions_made should be array');
  assert.ok(Array.isArray(m.discoveries), 'discoveries should be array');
  assert.ok(
    Array.isArray(m.implicit_knowledge),
    'implicit_knowledge should be array',
  );
  assert.ok(
    Array.isArray(m.quality_signals),
    'quality_signals should be array',
  );
});

test('0.1.0-to-0.5.0.js real run() adds ITS OWN fields, not 0.5.0-to-0.6.0.js\'s', () => {
  // The simulate-based test above only exercises simulateHandoffMigration(), a re-implementation
  // that never touches the real module -- it could not have caught the duplicate-export bug. This
  // drives the REAL bin/migrations/0.1.0-to-0.5.0.js module via runRealMigration(), the same
  // pattern already used for 0.6.0-to-1.0.0 and 1.0.0-to-2.0.0 above.
  const os = require('os');
  const dir = fs.realpathSync(
    fs.mkdtempSync(path.join(os.tmpdir(), 'mf-migtest-010to050-')),
  );
  try {
    fs.mkdirSync(path.join(dir, '.planning'), { recursive: true });
    fs.writeFileSync(
      path.join(dir, '.planning', 'HANDOFF.json'),
      JSON.stringify({ schema_version: '0.1.0' }),
    );
    const r = runRealMigration('0.1.0-to-0.5.0', dir);
    assert.strictEqual(r.status, 0, `migration failed: ${r.out.slice(0, 300)}`);
    const handoff = JSON.parse(
      fs.readFileSync(path.join(dir, '.planning', 'HANDOFF.json'), 'utf8'),
    );
    assert.ok(
      Array.isArray(handoff.decisions_made),
      'the real 0.1.0->0.5.0 fields must be added',
    );
    assert.ok(Array.isArray(handoff.discoveries));
    assert.ok(Array.isArray(handoff.implicit_knowledge));
    assert.ok(Array.isArray(handoff.quality_signals));
    assert.ok(
      !('developer_id' in handoff),
      'the 0.5.0->0.6.0 fields must NOT appear -- their presence would mean the duplicate export bug is back',
    );
    assert.ok(!('recent_commits' in handoff));
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
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
  const h = {
    schema_version: '0.1.0',
    next_task: 'first task',
    _warning: 'warn',
    phase: 1,
  };
  const m = simulateHandoffMigration(h, '1.0.0');

  // All fields from all migrations should be present
  assert.ok(
    Array.isArray(m.decisions_made),
    'decisions_made from 0.5.0 migration',
  );
  assert.ok(
    Array.isArray(m.recent_commits),
    'recent_commits from 0.6.0 migration',
  );
  assert.strictEqual(
    m.plugin_api_version,
    '1.0.0',
    'plugin_api_version from 1.0.0 migration',
  );
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
      assert.strictEqual(
        r.status,
        0,
        `migration failed: ${r.out.slice(0, 300)}`,
      );
      const after = fs.readFileSync(audit, 'utf8').split('\n').filter(Boolean);
      assert.ok(
        after.length >= before.length,
        `entries went from ${before.length} to ${after.length} — a migration must never remove entries`,
      );
      const prefix = after.slice(0, before.length);
      for (let i = 0; i < before.length; i++) {
        assert.strictEqual(
          prefix[i],
          before[i],
          `entry ${i} was REWRITTEN. Any added key changes the hash material, because ` +
            'bin/governance/audit-hash.js hashes {...entry, previous_hash}. Before:\n' +
            `  ${before[i].slice(0, 150)}\nAfter:\n  ${prefix[i].slice(0, 150)}`,
        );
      }
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  test(`${name} leaves the hash chain VERIFIABLE`, () => {
    // Driven through the real bin/verify-audit.js, which shares the canonical hasher with the writer.
    const { dir, audit } = realChain(50);
    try {
      const control = verifyChain(audit);
      assert.strictEqual(
        control.status,
        0,
        `the generated chain must verify before migrating, or this proves nothing: ${control.out}`,
      );

      const r = runRealMigration(name, dir);
      assert.strictEqual(
        r.status,
        0,
        `migration failed: ${r.out.slice(0, 300)}`,
      );

      const after = verifyChain(audit);
      assert.strictEqual(
        after.status,
        0,
        `the chain is BROKEN after ${name}. This is what the removed simulation hid: ` +
          `${after.out.slice(0, 200)}`,
      );
      assert.match(
        after.out,
        /valid: 51 entries/,
        `expected 51 entries (50 + one appended migration record), got: ${after.out.slice(0, 120)}`,
      );
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  test(`${name} RECORDS itself, rather than migrating silently`, () => {
    // Deleting the mutation must not mean the migration leaves no trace. The record is APPENDED, so it
    // extends the chain instead of invalidating it.
    const { dir, audit, lines: before } = realChain(10);
    try {
      assert.strictEqual(runRealMigration(name, dir).status, 0);
      const after = fs.readFileSync(audit, 'utf8').split('\n').filter(Boolean);
      assert.strictEqual(
        after.length,
        before.length + 1,
        `expected exactly one appended entry, got ${after.length - before.length}`,
      );
      const rec = JSON.parse(after[after.length - 1]);
      assert.strictEqual(rec.event, 'schema_migrated');
      assert.strictEqual(rec.target_id, 'AUDIT.jsonl');
      assert.ok(
        rec.previous_hash && rec._hash,
        'the appended record must itself be chained',
      );
      assert.ok(
        !('session_id' in rec) || typeof rec.session_id === 'string',
        'the record must not reintroduce a placeholder field on other entries',
      );
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });
}

test('no migration rewrites AUDIT.jsonl in place', () => {
  // Structural backstop across the whole directory, so a NEW migration cannot reintroduce the pattern.
  // Targets writes to the audit path specifically; safeMigrate() takes content and returns replacement
  // content, which is a rewrite by construction, so applying it to paths.audit is the smell.
  const dir = path.join(REPO, 'bin', 'migrations');
  const offenders = [];
  for (const f of fs.readdirSync(dir).filter((n) => n.endsWith('.js'))) {
    const code = fs
      .readFileSync(path.join(dir, f), 'utf8')
      .split('\n')
      .filter((l) => !/^\s*(\/\/|\*|\/\*)/.test(l))
      .join('\n');
    if (/safeMigrate\(\s*paths\.audit/.test(code))
      offenders.push(`${f}: safeMigrate(paths.audit)`);
    if (/writeFileSync\(\s*paths\.audit/.test(code))
      offenders.push(`${f}: writeFileSync(paths.audit)`);
  }
  assert.deepStrictEqual(
    offenders,
    [],
    `${offenders.length} migration(s) rewrite the audit log in place: ${offenders.join(', ')}. ` +
      'A SHA-256 back-linked log can only be appended to — use appendAuditEntrySync.',
  );
});

console.log('\nMINDFORGE.md migration:');

test('converts VERIFY_PASS_RATE_WARNING_THRESHOLD from 75 to 0.75', () => {
  const content = 'VERIFY_PASS_RATE_WARNING_THRESHOLD=75\n';
  const migrated = simulateMindforgeMdMigration(content);
  assert.ok(
    migrated.includes('0.75'),
    `Expected 0.75, got: ${migrated.trim()}`,
  );
  assert.ok(!migrated.match(/=75(\s|$)/), 'Should not still contain =75');
});

test('converts VERIFY_PASS_RATE_WARNING_THRESHOLD from 80 to 0.80', () => {
  const content = 'VERIFY_PASS_RATE_WARNING_THRESHOLD=80\nOTHER=value\n';
  const migrated = simulateMindforgeMdMigration(content);
  assert.ok(
    migrated.includes('0.80') || migrated.includes('0.8'),
    'Expected 0.80',
  );
  assert.ok(migrated.includes('OTHER=value'), 'Should preserve other settings');
});

test('does NOT modify values already in decimal format (0.75)', () => {
  const content = 'VERIFY_PASS_RATE_WARNING_THRESHOLD=0.75\n';
  const migrated = simulateMindforgeMdMigration(content);
  assert.ok(
    migrated.includes('0.75'),
    'Should preserve existing decimal format',
  );
  assert.ok(
    !migrated.includes('0.0075'),
    'Should not double-convert a decimal',
  );
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
  assert.ok(
    migrated.includes('=1.0'),
    'Should preserve 1.0 format without conversion',
  );
});

console.log('\nMigration infrastructure:');

test('all migration files have correct fromVersion/toVersion', () => {
  // THE DEFECT this replaces: a raw substring grep against file TEXT can't tell which of two
  // module.exports assignments in the same file actually wins at require() time -- exactly how
  // bin/migrations/0.1.0-to-0.5.0.js's real export was silently shadowed by a duplicate block for
  // an unknown period, undetected, because both fromVersion/toVersion strings still appeared
  // somewhere in the file's text regardless. require() each module and assert on what it actually
  // exports, the same way a real caller (migrate.js's allMigrations()) sees it.
  const files = [
    { file: '../bin/migrations/0.1.0-to-0.5.0', from: '0.1.0', to: '0.5.0' },
    { file: '../bin/migrations/0.5.0-to-0.6.0', from: '0.5.0', to: '0.6.0' },
    { file: '../bin/migrations/0.6.0-to-1.0.0', from: '0.6.0', to: '1.0.0' },
  ];
  files.forEach(({ file, from, to }) => {
    const modPath = require.resolve(file);
    delete require.cache[modPath];
    const mig = require(modPath);
    assert.strictEqual(
      mig.fromVersion,
      from,
      `${file}: require() must export fromVersion ${from}`,
    );
    assert.strictEqual(
      mig.toVersion,
      to,
      `${file}: require() must export toVersion ${to}`,
    );
  });
});

test('migration chain covers v0.1.0 → v1.0.0 completely', () => {
  const { compareSemver } = require('../bin/updater/version-comparator');

  // Chain: 0.1.0 → 0.5.0 → 0.6.0 → 1.0.0
  const chain = ['0.1.0', '0.5.0', '0.6.0', '1.0.0'];
  for (let i = 0; i < chain.length - 1; i++) {
    const file = `bin/migrations/${chain[i]}-to-${chain[i + 1]}.js`;
    assert.ok(fs.existsSync(file), `Missing migration: ${file}`);
  }

  // Verify no gaps: each migration's toVersion = next migration's fromVersion
  for (let i = 0; i < chain.length - 2; i++) {
    assert.ok(
      compareSemver(chain[i + 1], chain[i]) > 0,
      `Chain gap between ${chain[i]} and ${chain[i + 1]}`,
    );
  }
});

test('migrate.js exports runMigrations function', () => {
  const { runMigrations } = require('../bin/migrations/migrate');
  assert.strictEqual(
    typeof runMigrations,
    'function',
    'runMigrations should be a function',
  );
});

test('migrate.js exports getMigrationsToRun function', () => {
  const { getMigrationsToRun } = require('../bin/migrations/migrate');
  assert.strictEqual(
    typeof getMigrationsToRun,
    'function',
    'getMigrationsToRun should be a function',
  );
  const plan = getMigrationsToRun('8.2.1', '9.0.0');
  assert.strictEqual(
    plan.length,
    1,
    'v8.2.1 -> v9.0.0 should select exactly the v9-unified-memory migration',
  );
  assert.strictEqual(plan[0].toVersion, '9.0.0');
});

test('getMigrationsToRun(0.1.0, 1.0.0) selects all three distinct migrations, not a duplicate', () => {
  // THE DEFECT this replaces (HIGH-impact, caught by deep research): bin/migrations/0.1.0-to-0.5.0.js
  // used to have a second module.exports block that shadowed its real one, so allMigrations()'s
  // two separate require() calls (for './0.1.0-to-0.5.0' and './0.5.0-to-0.6.0') both resolved to
  // the SAME 0.5.0->0.6.0 object. A real 0.1.0 install upgrading through migrate.js got two
  // redundant copies of the 0.5.0->0.6.0 migration and NEVER the real 0.1.0->0.5.0 one -- exit 0,
  // "status: migrated", no error, no warning, decisions_made/discoveries/implicit_knowledge/
  // quality_signals silently never backfilled. This goes through the REAL allMigrations(), not a
  // simulated array, so it fails before the fix and passes after.
  const { getMigrationsToRun } = require('../bin/migrations/migrate');
  const plan = getMigrationsToRun('0.1.0', '1.0.0');
  const toVersions = plan.map((m) => m.toVersion).sort();
  assert.deepStrictEqual(
    toVersions,
    ['0.5.0', '0.6.0', '1.0.0'],
    `expected the three distinct migrations 0.1.0->0.5.0, 0.5.0->0.6.0, 0.6.0->1.0.0 in some order, got toVersions: ${JSON.stringify(toVersions)}`,
  );
});

test('getMigrationsToRun(1.5.0, 2.0.0) selects 1.0.0-to-2.0.0.js', () => {
  // THE DEFECT this replaces: allMigrations() used to omit this file entirely, so any upgrade
  // range crossing 2.0.0 silently skipped it -- exit 0, "status: migrated", the AUDIT.jsonl
  // schema-migration record and HANDOFF.json plugin_api_version bump it provides just never
  // happened.
  const { getMigrationsToRun } = require('../bin/migrations/migrate');
  const plan = getMigrationsToRun('1.5.0', '2.0.0');
  assert.strictEqual(
    plan.length,
    1,
    `expected exactly 1.0.0-to-2.0.0, got: ${JSON.stringify(plan.map((m) => m.toVersion))}`,
  );
  assert.strictEqual(plan[0].toVersion, '2.0.0');
  assert.strictEqual(
    typeof plan[0].run,
    'function',
    'the selected migration must have a real run(paths) function',
  );
});

test('getMigrationsToRun(10.6.0, 11.0.0) selects the adapted 10.7.0-to-11.0.0 migration', () => {
  // THE DEFECT this replaces: bin/migrations/10.7.0-to-11.0.0.js exports a different shape
  // ({MIGRATION_ID, TARGET_VERSION, migrate(projectRoot)}) than every other registered migration
  // ({fromVersion, toVersion, description, run(paths)}). allMigrations() used to omit it entirely
  // rather than wire it in broken; this proves the inline adapter in migrate.js exposes the
  // standard shape with a real fromVersion/toVersion/run, so getMigrationsToRun()'s
  // compareSemver(m.toVersion, ...) and the runner's migration.run(paths) call both work.
  const { getMigrationsToRun } = require('../bin/migrations/migrate');
  const plan = getMigrationsToRun('10.6.0', '11.0.0');
  assert.strictEqual(
    plan.length,
    1,
    `expected exactly the adapted 10.7.0-to-11.0.0 entry, got: ${JSON.stringify(plan.map((m) => m.toVersion))}`,
  );
  assert.strictEqual(plan[0].fromVersion, '10.7.0');
  assert.strictEqual(plan[0].toVersion, '11.0.0');
  assert.strictEqual(
    typeof plan[0].run,
    'function',
    'the adapter must expose a real run(paths) function',
  );
});

test('1.0.0-to-2.0.0 migration runs end-to-end through the real CLI wiring, not just direct invocation', () => {
  // THE DEFECT this replaces (MEDIUM, caught by review): the byte-identical/hash-chain/records-itself
  // tests above already prove 1.0.0-to-2.0.0.js's own run() logic is correct, but every one of them
  // calls runRealMigration(), which require()s the module directly and invokes mig.run(paths) --
  // bypassing allMigrations()/getMigrationsToRun()/runMigrations() entirely, the exact integration
  // surface this PR changes by adding this migration to allMigrations(). The other new test above
  // (getMigrationsToRun(1.5.0, 2.0.0) selects 1.0.0-to-2.0.0.js) only checks `typeof run === 'function'`
  // without ever calling it, so it would pass even if the wired-in entry were subtly broken. This
  // test drives the migration through the REAL CLI end to end, closing that gap the same way the
  // 10.7.0-to-11.0.0 test above does for the adapter.
  const { spawnSync } = require('child_process');
  const os = require('os');
  const REPO_ROOT = path.join(__dirname, '..');
  const project = fs.realpathSync(
    fs.mkdtempSync(path.join(os.tmpdir(), 'mf-migtest-1000to200-')),
  );
  try {
    fs.mkdirSync(path.join(project, '.planning'), { recursive: true });

    fs.writeFileSync(
      path.join(project, '.planning', 'HANDOFF.json'),
      JSON.stringify({ schema_version: '1.0.0', plugin_api_version: '1.0.0' }),
    );
    const auditBefore =
      JSON.stringify({
        event: 'pre-existing',
        _hash: 'seed-hash',
        previous_hash: null,
      }) + '\n';
    fs.writeFileSync(
      path.join(project, '.planning', 'AUDIT.jsonl'),
      auditBefore,
    );
    fs.writeFileSync(
      path.join(project, '.planning', 'token-usage.jsonl'),
      JSON.stringify({ model: 'claude-sonnet-4-6', tokens: 100 }) + '\n',
    );

    const run = spawnSync(
      process.execPath,
      [
        path.join(REPO_ROOT, 'bin', 'migrations', 'migrate.js'),
        '--from',
        '1.0.0',
        '--to',
        '2.0.0',
      ],
      { cwd: project, encoding: 'utf8', timeout: 30000 },
    );
    assert.strictEqual(
      run.status,
      0,
      `migration failed: ${run.stderr}\n${run.stdout}`,
    );
    assert.match(
      run.stdout,
      /"status": "migrated"/,
      `expected a migrated result, got: ${run.stdout}`,
    );

    const handoff = JSON.parse(
      fs.readFileSync(path.join(project, '.planning', 'HANDOFF.json'), 'utf8'),
    );
    assert.strictEqual(
      handoff.plugin_api_version,
      '2.0.0',
      'plugin_api_version must be bumped when reached through the real wiring, not just via direct invocation',
    );

    const auditAfter = fs.readFileSync(
      path.join(project, '.planning', 'AUDIT.jsonl'),
      'utf8',
    );
    assert.ok(
      auditAfter.startsWith(auditBefore),
      'the pre-existing audit entry must survive byte-identical as the prefix -- append-only, not rewritten',
    );
    const auditLines = auditAfter.split('\n').filter(Boolean);
    assert.strictEqual(
      auditLines.length,
      2,
      `expected exactly one appended entry, got: ${auditAfter}`,
    );
    const appended = JSON.parse(auditLines[1]);
    assert.strictEqual(appended.event, 'schema_migrated');

    const tokenUsage = fs.readFileSync(
      path.join(project, '.planning', 'token-usage.jsonl'),
      'utf8',
    );
    const tokenEntry = JSON.parse(tokenUsage.trim());
    assert.strictEqual(
      tokenEntry.model_group,
      'unknown',
      'model_group must be backfilled onto the pre-existing token-usage.jsonl entry when reached through the real wiring',
    );
  } finally {
    fs.rmSync(project, { recursive: true, force: true });
  }
});

test('10.7.0-to-11.0.0 migration runs end-to-end through the real CLI and does NOT touch AUDIT.jsonl', () => {
  // Drives the adapted migration through the REAL migrate.js CLI (not a direct migrate(dir) call),
  // proving both the adapter wiring AND the removed audit-truncation step at once: a fixture with
  // a real .mindforge/config.json at schema 10.7.0 selects and runs this migration for real, and
  // its AUDIT.jsonl (present here specifically to prove the archive-and-truncate step is gone) must
  // come out byte-identical -- there is no longer any step that reads, archives, or rewrites it.
  //
  // THE DEFECT this replaces (HIGH, caught by review): the removed step only ever fired when
  // `lines.length > 5000` -- below that it was already a documented no-op
  // (`status: 'skipped', reason: 'under_threshold'`). An earlier version of this test seeded
  // AUDIT.jsonl with exactly ONE line, so the byte-identical assertion below would have passed
  // IDENTICALLY whether Step 3 was truly deleted or merely reintroduced-but-dormant -- proven by
  // reinserting the exact deleted code into a scratch copy and confirming this test still passed.
  // Seeding >5000 lines is what actually exercises the old code's threshold gate, so this
  // assertion can tell "removed" apart from "present but not yet triggered".
  const { spawnSync } = require('child_process');
  const os = require('os');
  const REPO_ROOT = path.join(__dirname, '..');
  const project = fs.realpathSync(
    fs.mkdtempSync(path.join(os.tmpdir(), 'mf-migtest-1070to110-')),
  );
  try {
    fs.mkdirSync(path.join(project, '.mindforge'), { recursive: true });
    fs.mkdirSync(path.join(project, '.planning'), { recursive: true });

    fs.writeFileSync(
      path.join(project, '.mindforge', 'config.json'),
      JSON.stringify({ version: '10.7.0', revops: {} }),
    );
    fs.writeFileSync(
      path.join(project, '.planning', 'HANDOFF.json'),
      JSON.stringify({ schema_version: '10.7.0' }),
    );
    fs.writeFileSync(
      path.join(project, 'MINDFORGE.md'),
      '# MINDFORGE.md\nVERSION = 10.7.0\n',
    );
    // 5001 lines: one over the removed code's own `> 5000` gate, so this fixture is exactly the
    // case that used to trigger archiving -- not merely under a threshold that never engages.
    const auditLines = [];
    for (let i = 0; i < 5001; i++) {
      auditLines.push(
        JSON.stringify({
          event: 'test',
          seq: i,
          _hash: `hash-${i}`,
          previous_hash: i === 0 ? null : `hash-${i - 1}`,
        }),
      );
    }
    const auditContent = auditLines.join('\n') + '\n';
    fs.writeFileSync(
      path.join(project, '.planning', 'AUDIT.jsonl'),
      auditContent,
    );

    const run = spawnSync(
      process.execPath,
      [
        path.join(REPO_ROOT, 'bin', 'migrations', 'migrate.js'),
        '--from',
        '10.7.0',
        '--to',
        '11.0.0',
      ],
      { cwd: project, encoding: 'utf8', timeout: 30000 },
    );
    assert.strictEqual(
      run.status,
      0,
      `migration failed: ${run.stderr}\n${run.stdout}`,
    );
    assert.match(
      run.stdout,
      /"status": "migrated"/,
      `expected a migrated result, got: ${run.stdout}`,
    );

    const config = JSON.parse(
      fs.readFileSync(path.join(project, '.mindforge', 'config.json'), 'utf8'),
    );
    assert.strictEqual(config.version, '11.0.0');
    assert.ok(
      config.temporal &&
        config.rate_limiting &&
        config.session &&
        config.wave_execution,
      `expected all four new config sections, got: ${JSON.stringify(config)}`,
    );

    const handoff = JSON.parse(
      fs.readFileSync(path.join(project, '.planning', 'HANDOFF.json'), 'utf8'),
    );
    assert.strictEqual(handoff.schema_version, '11.0.0');

    const mindforgeMd = fs.readFileSync(
      path.join(project, 'MINDFORGE.md'),
      'utf8',
    );
    assert.match(mindforgeMd, /VERSION = 11\.0\.0/);

    const auditAfter = fs.readFileSync(
      path.join(project, '.planning', 'AUDIT.jsonl'),
      'utf8',
    );
    assert.strictEqual(
      auditAfter,
      auditContent,
      'AUDIT.jsonl (5001 lines -- one over the removed archive-and-truncate step\'s own > 5000 ' +
        'gate) must be byte-identical: if that step still existed, it would have fired here and ' +
        'truncated this exact file to its last 500 lines',
    );
    assert.ok(
      !fs.existsSync(path.join(project, '.planning', 'audit-archive')),
      'no audit-archive directory should ever be created -- that mechanism was removed entirely, not just skipped',
    );
  } finally {
    fs.rmSync(project, { recursive: true, force: true });
  }
});

// -- CLI entrypoint end-to-end, including the global-path fix ------------------------
//
// THE DEFECT this replaces: `node bin/migrations/migrate.js` had no entrypoint at all (defined
// exports and exited 0 doing nothing) -- the ONLY real caller of runMigrations() anywhere in this
// codebase was self-update.js's internal version-bump flow. Separately, v9-unified-memory.js's
// "global" knowledge path was hardcoded to process.cwd()/.mindforge/memory/global-knowledge-base.jsonl,
// which can never be the real global path (knowledge-store.js's own getPaths() puts it at
// os.homedir()/.mindforge/global-knowledge-base.jsonl, no /memory/ nesting) -- so global entries were
// silently skipped by every run, forever. This test seeds one LOCAL entry and one entry at the REAL
// global path with distinct, checkable content, spawns the real CLI end to end, and queries the
// resulting SQLite DB directly -- proving both the entrypoint wiring and the path fix together,
// the same way a real operator's migration would actually need both to work.
test('migrate.js CLI runs end-to-end: entrypoint works, echoes target, and migrates BOTH KB entries and a graph edge', () => {
  const { spawnSync } = require('child_process');
  const os = require('os');
  const REPO_ROOT = path.join(__dirname, '..');
  const project = fs.realpathSync(
    fs.mkdtempSync(path.join(os.tmpdir(), 'mf-migtest-')),
  );
  const homeDir = path.join(project, '.scratch-home');
  try {
    fs.mkdirSync(path.join(homeDir, '.mindforge'), { recursive: true });
    fs.mkdirSync(path.join(project, '.mindforge', 'memory'), {
      recursive: true,
    });
    fs.mkdirSync(path.join(project, '.planning'), { recursive: true });

    fs.writeFileSync(
      path.join(project, '.mindforge', 'memory', 'knowledge-base.jsonl'),
      JSON.stringify({
        id: 'local-1',
        type: 'insight',
        content: 'local test entry',
        confidence: 0.9,
      }) + '\n',
    );
    // The REAL global path -- os.homedir()/.mindforge/global-knowledge-base.jsonl, NOT nested under
    // memory/. Writing here (not under the old wrong nested path) is what proves the fix: if the
    // path bug ever reappears, this entry silently fails to migrate and the assertion below catches it.
    fs.writeFileSync(
      path.join(homeDir, '.mindforge', 'global-knowledge-base.jsonl'),
      JSON.stringify({
        id: 'global-1',
        type: 'insight',
        content: 'global test entry',
        confidence: 0.8,
      }) + '\n',
    );
    // Graph edges: previously untested entirely, and previously read via a second hardcoded path
    // expression rather than knowledge-graph.js's own getPaths().EDGES_PATH.
    fs.writeFileSync(
      path.join(project, '.mindforge', 'memory', 'graph-edges.jsonl'),
      JSON.stringify({
        id: 'edge-1',
        source_id: 'local-1',
        target_id: 'global-1',
        edge_type: 'RELATED_TO',
      }) + '\n',
    );
    fs.writeFileSync(
      path.join(project, '.planning', 'HANDOFF.json'),
      JSON.stringify({ schema_version: '8.2.1' }),
    );

    const run = (args) =>
      spawnSync(
        process.execPath,
        [path.join(REPO_ROOT, 'bin', 'migrations', 'migrate.js'), ...args],
        {
          cwd: project,
          encoding: 'utf8',
          timeout: 60000,
          env: { PATH: process.env.PATH, HOME: homeDir },
        },
      );

    const dry = run(['--dry-run']);
    assert.strictEqual(dry.status, 0, `dry-run failed: ${dry.stderr}`);
    assert.match(
      dry.stdout,
      new RegExp(`Target: ${project.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`),
      `dry-run must echo the resolved target directory so an operator can confirm it, got: ${dry.stdout}`,
    );
    assert.match(
      dry.stdout,
      /Dry run/,
      `expected dry-run output, got: ${dry.stdout}`,
    );
    assert.match(
      dry.stdout,
      /v9-unified-memory|Unified Memory/i,
      `dry-run should name the pending migration, got: ${dry.stdout}`,
    );
    assert.ok(
      !fs.existsSync(path.join(project, '.mindforge', 'celestial.db')),
      '--dry-run must not create the database -- it should make NO changes',
    );

    const real = run([]);
    assert.strictEqual(
      real.status,
      0,
      `real run failed: ${real.stderr}\n${real.stdout}`,
    );
    assert.match(
      real.stdout,
      /"status": "migrated"/,
      `expected a migrated result, got: ${real.stdout}`,
    );

    // vector-hub.js resolves its DB path from process.cwd() at require time, so querying it directly
    // in THIS process (whose cwd is the test runner's, not the scratch project) would open the wrong
    // database. Spawn a query child with cwd/HOME matching the migration run instead.
    const marker = '__ROWS__:';
    const query = spawnSync(
      process.execPath,
      [
        '-e',
        `
      const vectorHub = require(${JSON.stringify(path.join(REPO_ROOT, 'bin', 'memory', 'vector-hub'))});
      vectorHub.init().then(() => {
        const knowledge = vectorHub.query('SELECT id, content, source FROM knowledge ORDER BY id');
        const edges = vectorHub.query('SELECT id, source_id, target_id FROM graph_edges ORDER BY id');
        console.log(${JSON.stringify('__ROWS__:')} + JSON.stringify({ knowledge, edges }));
      });
    `,
      ],
      {
        cwd: project,
        encoding: 'utf8',
        timeout: 30000,
        env: { PATH: process.env.PATH, HOME: homeDir },
      },
    );
    assert.strictEqual(query.status, 0, `query child failed: ${query.stderr}`);
    // VectorHub.init() logs its own "[VectorHub] Initialized..." line to stdout, so the marker
    // isolates the actual payload from that unrelated diagnostic output rather than assuming stdout
    // is pure JSON.
    const markerLine = query.stdout
      .split('\n')
      .find((l) => l.startsWith(marker));
    assert.ok(
      markerLine,
      `expected a marked JSON line in query output, got: ${query.stdout}`,
    );
    const { knowledge, edges } = JSON.parse(markerLine.slice(marker.length));
    assert.deepStrictEqual(
      knowledge.map((r) => r.id),
      ['global-1', 'local-1'],
      `expected BOTH the local and the real-global entry to have migrated, got: ${query.stdout}`,
    );
    assert.strictEqual(
      knowledge.find((r) => r.id === 'global-1').source,
      'global',
    );
    assert.strictEqual(
      knowledge.find((r) => r.id === 'local-1').source,
      'project',
    );
    assert.strictEqual(
      edges.length,
      1,
      `expected the graph edge to have migrated via knowledge-graph.js's getPaths(), got: ${query.stdout}`,
    );
    assert.strictEqual(edges[0].id, 'edge-1');
  } finally {
    fs.rmSync(project, { recursive: true, force: true });
  }
});

test('migrate.js CLI warns and skips rather than silently no-opping when schema_version is missing', () => {
  // THE DEFECT this replaces: fromVersion fell back to frameworkVersion (read fresh from disk) when
  // schema_version was absent, which -- in the exact recovery scenario this entrypoint's own doc
  // comment says it exists for (run AFTER self-update.js's npx apply step already bumped the local
  // install to the NEW version) -- collapsed fromVersion and toVersion to the same value and made
  // runMigrations() report "no-migration-needed" with zero indication anything was skipped.
  const { spawnSync } = require('child_process');
  const os = require('os');
  const REPO_ROOT = path.join(__dirname, '..');
  const project = fs.realpathSync(
    fs.mkdtempSync(path.join(os.tmpdir(), 'mf-migtest-noschema-')),
  );
  try {
    fs.mkdirSync(path.join(project, '.planning'), { recursive: true });
    // No HANDOFF.json at all -- the most common real case (fresh install, or one that predates
    // schema_version tracking), not just an empty/malformed one.
    const run = spawnSync(
      process.execPath,
      [path.join(REPO_ROOT, 'bin', 'migrations', 'migrate.js')],
      { cwd: project, encoding: 'utf8', timeout: 30000 },
    );
    assert.strictEqual(
      run.status,
      0,
      `expected a clean exit even when skipping, got: ${run.stderr}`,
    );
    // The warning is console.warn (stderr), while the rest of this tool's routine output is
    // console.log (stdout) -- check both, the way a real terminal shows them interleaved.
    const combined = run.stdout + run.stderr;
    assert.match(
      combined,
      /No schema_version found.*no --from given/s,
      `expected an explicit warning explaining why nothing will run, got stdout: ${run.stdout}\nstderr: ${run.stderr}`,
    );
    assert.match(
      combined,
      /--from/,
      `warning must tell the operator the escape hatch, got stdout: ${run.stdout}\nstderr: ${run.stderr}`,
    );
  } finally {
    fs.rmSync(project, { recursive: true, force: true });
  }
});

test('migrate.js PATHS never includes a memory JSONL path', () => {
  // THE DEFECT this replaces (HIGH severity, caught by a second review round): the isolation test
  // below proves memory files survive one specific unrelated-migration-failure scenario, but its
  // byte-identical assertions don't actually discriminate "fixed" from "reverted" -- backing up and
  // then restoring UNCHANGED content looks identical to never backing it up at all, since nothing in
  // that scenario ever mutates the memory files between backup and restore. This test is the direct,
  // static discriminator: it fails immediately if the memory paths are ever reintroduced into PATHS,
  // with no dependency on a specific migration's failure mode or execution tracing.
  const { PATHS } = require('../bin/migrations/migrate');
  const memoryFileNames = [
    'knowledge-base.jsonl',
    'global-knowledge-base.jsonl',
    'graph-edges.jsonl',
  ];
  for (const [key, filePath] of Object.entries(PATHS)) {
    for (const name of memoryFileNames) {
      assert.ok(
        !filePath.includes(name),
        `PATHS.${key} (${filePath}) must never reference a memory JSONL file (${name}) -- ` +
          'v9-unified-memory only reads these, and backing them up protects nothing while risking ' +
          'a stale restore clobbering a concurrent write from another project/session',
      );
    }
  }
});

test('an unrelated migration failure does NOT touch memory JSONL files -- they carry no backup/restore of their own', () => {
  // THE DEFECT this replaces (HIGH severity, caught by review): an earlier revision of this fix
  // added the memory JSONL paths (including the home-directory-scoped global file, shared across
  // every MindForge project on the machine) to migrate.js's shared PATHS backup/restore set. Since
  // runMigrations() restores EVERY backed-up file on ANY migration failure in the batch -- not just
  // files the failing migration touched -- an unrelated schema-migration failure (triggered here by
  // a genuinely malformed HANDOFF.json, not a mock) would silently overwrite the
  // shared global memory file with a stale pre-run snapshot, discarding any real concurrent write to
  // it from a different project/session. The byte-identical checks below are a basic sanity check
  // (no unexpected mutation happened); they do NOT by themselves prove the fix, since backup+restore
  // of UNCHANGED content is indistinguishable from never backing it up at all in this
  // no-concurrent-write scenario. The real proof is the backupDirs listing check further down, plus
  // the direct PATHS assertion in the test above -- both fail immediately if the memory paths are
  // ever reintroduced.
  const { spawnSync } = require('child_process');
  const os = require('os');
  const REPO_ROOT = path.join(__dirname, '..');
  const project = fs.realpathSync(
    fs.mkdtempSync(path.join(os.tmpdir(), 'mf-migtest-isolation-')),
  );
  const homeDir = path.join(project, '.scratch-home');
  try {
    fs.mkdirSync(path.join(homeDir, '.mindforge'), { recursive: true });
    fs.mkdirSync(path.join(project, '.mindforge', 'memory'), {
      recursive: true,
    });
    fs.mkdirSync(path.join(project, '.planning'), { recursive: true });

    const localKbContent =
      JSON.stringify({ id: 'local-1', content: 'must survive' }) + '\n';
    const globalKbContent =
      JSON.stringify({ id: 'global-1', content: 'must survive too' }) + '\n';
    const localKbPath = path.join(
      project,
      '.mindforge',
      'memory',
      'knowledge-base.jsonl',
    );
    const globalKbPath = path.join(
      homeDir,
      '.mindforge',
      'global-knowledge-base.jsonl',
    );
    fs.writeFileSync(localKbPath, localKbContent);
    fs.writeFileSync(globalKbPath, globalKbContent);

    // Genuinely malformed -- whichever migration module runs first for this --from/--to range does
    // JSON.parse(readFileSync(paths.handoff)) and will throw a real SyntaxError on this exact file.
    // Not a mock: this is a real migration module, failing for a real reason, exercising the real
    // restore-on-failure path in runMigrations().
    fs.writeFileSync(
      path.join(project, '.planning', 'HANDOFF.json'),
      '{not valid json',
    );

    const run = spawnSync(
      process.execPath,
      [
        path.join(REPO_ROOT, 'bin', 'migrations', 'migrate.js'),
        '--from',
        '0.1.0',
        '--to',
        '9.0.0',
      ],
      {
        cwd: project,
        encoding: 'utf8',
        timeout: 30000,
        env: { PATH: process.env.PATH, HOME: homeDir },
      },
    );

    assert.notStrictEqual(
      run.status,
      0,
      `expected the migration to fail on malformed HANDOFF.json, got exit 0: ${run.stdout}`,
    );

    assert.strictEqual(
      fs.readFileSync(localKbPath, 'utf8'),
      localKbContent,
      'local knowledge-base.jsonl must be untouched by an unrelated migration failure',
    );
    assert.strictEqual(
      fs.readFileSync(globalKbPath, 'utf8'),
      globalKbContent,
      'global knowledge-base.jsonl (shared across every project on the machine) must be untouched by ' +
        'an unrelated migration failure in THIS project -- this is the exact cross-project data-loss ' +
        'scenario the fix closes',
    );

    // The backup that DOES get created (for the 4 real schema files this migration batch touches)
    // must contain none of the memory filenames -- confirming they were never swept into it at all.
    const backupDirs = fs
      .readdirSync(path.join(project, '.planning'))
      .filter((f) => f.startsWith('migration-backup-'));
    assert.ok(
      backupDirs.length > 0,
      'expected a backup directory to have been created for the 4 real schema files this batch ' +
        'touches -- if this is empty, the checks below run zero times and silently prove nothing',
    );
    for (const dir of backupDirs) {
      const backed = fs.readdirSync(path.join(project, '.planning', dir));
      assert.ok(
        !backed.includes('knowledge-base.jsonl') &&
          !backed.includes('global-knowledge-base.jsonl'),
        `migration backup must not contain memory JSONL files, found: ${backed.join(', ')}`,
      );
    }
  } finally {
    fs.rmSync(project, { recursive: true, force: true });
  }
});

console.log(`\n${'─'.repeat(55)}`);
console.log(`Results: ${passed} passed, ${failed} failed`);
if (failed > 0) {
  console.error(`\n❌  ${failed} test(s) failed.\n`);
  process.exit(1);
} else {
  console.log('\n✅  All migration tests passed.\n');
}
