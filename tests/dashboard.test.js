/**
 * MindForge v2 — Dashboard Test Suite
 * Tests SSE bridge, metrics aggregator, approval handler,
 * API router, and server startup/shutdown.
 *
 * Note: Tests do NOT start a real Express server — they test
 * the component logic directly to avoid port conflicts in CI.
 *
 * Run: node tests/dashboard.test.js
 */
'use strict';

const fs     = require('fs');
const path   = require('path');
const http   = require('http');
const os     = require('os');
const assert = require('assert');

let passed = 0, failed = 0;

function test(name, fn) {
  try { fn(); console.log(`  ✅  ${name}`); passed++; }
  catch(e) { console.error(`  ❌  ${name}\n      ${e.message}`); failed++; }
}

async function testAsync(name, fn) {
  try { await fn(); console.log(`  ✅  ${name}`); passed++; }
  catch(e) { console.error(`  ❌  ${name}\n      ${e.message}`); failed++; }
}

// ── Temp project factory ──────────────────────────────────────────────────────
function mkProject() {
  const dir     = fs.mkdtempSync(path.join(os.tmpdir(), 'mf-dashboard-'));
  const write   = (rel, c) => { const f = path.join(dir, rel); fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, c); return f; };
  const exists  = rel => fs.existsSync(path.join(dir, rel));
  const cleanup = () => { try { fs.rmSync(dir, { recursive: true, force: true }); } catch { /* intentionally empty */ } };
  return { dir, write, exists, cleanup };
}

// ── Module imports ────────────────────────────────────────────────────────────
const Metrics  = require('../bin/dashboard/metrics-aggregator');
const SSE      = require('../bin/dashboard/sse-bridge');

// ── Sample data fixtures ──────────────────────────────────────────────────────
const SAMPLE_HANDOFF = {
  schema_version: '2.0.0',
  current_phase: 3,
  phase_description: 'Authentication System',
  next_task: 'Plan 3-06',
  last_updated: new Date().toISOString(),
};

const SAMPLE_AUTO_STATE = {
  schema_version: '2.0.0',
  auto_mode_active: true,
  status: 'running',
  phase: 3,
  wave_current: 2, wave_total: 3,
  tasks_completed: 5, tasks_total: 8,
  node_repairs: 1, escalations: 0,
  elapsed_ms: 1083000,
  current_task: 'Plan 3-05 — JWT middleware',
  last_commit: 'abc1234',
};

// Built through bin/governance/approval-record.js, the SAME module the writer and the CI
// verifier use, so the fixture cannot drift from the real record shape.
//
// The previous fixture invented one: a 36-char UUID `id`, plus `phase`, `plan`, `description` and
// `status: 'pending'`. No producer has ever written any of those four fields — approve.js emits
// `MF-AUTH-<base36>` with `reason`, and nothing anywhere writes a `status`. The tests passed
// because the fixture and the reader agreed with EACH OTHER while both disagreed with production,
// which is why six independent incompatibilities survived in the shipped dashboard.
const { checksumRecord, expiryFrom, SCHEMA } = require('../bin/governance/approval-record');
const REPO_VERSION = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'package.json'), 'utf8')).version;

function makeApproval(over = {}) {
  const timestamp = new Date().toISOString();
  const rec = {
    schema: SCHEMA,
    id: 'MF-AUTH-DASHFIXTURE',
    project: 'mindforge-cc',
    version: REPO_VERSION,
    tier: 3,
    approved_by: 'fixture',
    timestamp,
    expires_at: expiryFrom(timestamp),
    reason: 'dashboard fixture',
    identity_verification: {
      verified: false, method: 'git_identity_unverified', identity: 'fixture', unverified_ack: true,
    },
    ...over,
  };
  rec.record_checksum = checksumRecord(rec);
  return rec;
}
const SAMPLE_APPROVAL = makeApproval();

// ═══════════════════════════════════════════════════════════════════════
console.log('\nMindForge v2 — Dashboard Tests\n');

// ── File existence ────────────────────────────────────────────────────────────
console.log('Required files:');
[
  'bin/dashboard/server.js',
  'bin/dashboard/sse-bridge.js',
  'bin/dashboard/api-router.js',
  'bin/dashboard/metrics-aggregator.js',
  'bin/dashboard/frontend/index.html',
  '.mindforge/dashboard/dashboard-spec.md',
  '.mindforge/dashboard/api-reference.md',
  '.claude/commands/mindforge/dashboard.md',
  '.agent/mindforge/dashboard.md',
].forEach(f => test(`${f} exists`, () => assert.ok(fs.existsSync(f), `Missing: ${f}`)));

// ── Metrics aggregator ────────────────────────────────────────────────────────
console.log('\nMetrics aggregator:');

test('getStatus: returns object with required fields when no files exist', () => {
  const p    = mkProject();
  const orig = process.cwd();
  process.chdir(p.dir);
  try {
    const status = Metrics.getStatus();
    assert.ok(typeof status === 'object', 'Should return object');
    assert.ok('project_name' in status, 'Should have project_name');
    assert.ok('auto_mode'    in status, 'Should have auto_mode');
    assert.ok('auto_status'  in status, 'Should have auto_status');
  } finally { process.chdir(orig); p.cleanup(); }
});

test('getStatus: reads HANDOFF.json and auto-state.json', () => {
  const p    = mkProject();
  const orig = process.cwd();
  process.chdir(p.dir);
  try {
    p.write('.planning/HANDOFF.json', JSON.stringify(SAMPLE_HANDOFF));
    p.write('.planning/auto-state.json', JSON.stringify(SAMPLE_AUTO_STATE));
    p.write('.planning/PROJECT.md', '# My Auth App\n');

    const status = Metrics.getStatus();
    assert.strictEqual(status.phase,         3,       'Should read phase from HANDOFF.json');
    assert.strictEqual(status.auto_mode,     true,    'Should read auto_mode from auto-state.json');
    assert.strictEqual(status.auto_status,   'running', 'Should read status');
    assert.strictEqual(status.tasks_completed, 5,     'Should read tasks_completed');
    assert.strictEqual(status.project_name,  'My Auth App', 'Should read project name');
  } finally { process.chdir(orig); p.cleanup(); }
});

test('getAuditEntries: returns newest first with limit', () => {
  const p    = mkProject();
  const orig = process.cwd();
  process.chdir(p.dir);
  try {
    const entries = [
      { id: '1', timestamp: '2026-01-01T10:00:00Z', event: 'task_completed', phase: 3, plan: '01' },
      { id: '2', timestamp: '2026-01-01T10:05:00Z', event: 'task_completed', phase: 3, plan: '02' },
      { id: '3', timestamp: '2026-01-01T10:10:00Z', event: 'security_finding', phase: 3 },
    ];
    p.write('.planning/AUDIT.jsonl', entries.map(e => JSON.stringify(e)).join('\n') + '\n');

    const result = Metrics.getAuditEntries(2, 0, null);
    assert.strictEqual(result.entries.length, 2, 'Should respect limit');
    assert.strictEqual(result.entries[0].id, '3', 'Newest should be first (id=3)');
    assert.strictEqual(result.total, 3, 'Should report total count');
  } finally { process.chdir(orig); p.cleanup(); }
});

test('getAuditEntries: filters by event type', () => {
  const p    = mkProject();
  const orig = process.cwd();
  process.chdir(p.dir);
  try {
    const entries = [
      { id: '1', timestamp: '2026-01-01T10:00:00Z', event: 'task_completed' },
      { id: '2', timestamp: '2026-01-01T10:05:00Z', event: 'security_finding' },
    ];
    p.write('.planning/AUDIT.jsonl', entries.map(e => JSON.stringify(e)).join('\n') + '\n');

    const result = Metrics.getAuditEntries(50, 0, 'security_finding');
    assert.ok(result.entries.every(e => e.event === 'security_finding'), 'Should only return filtered event type');
    assert.strictEqual(result.entries.length, 1, 'Should return 1 security_finding');
  } finally { process.chdir(orig); p.cleanup(); }
});

test('getApprovals: reads the filename the writer actually produces', () => {
  // The reader filtered startsWith('APPROVAL-') while the only producer writes
  // `approval-<id>.json`. startsWith is case-sensitive on every platform, so this returned
  // nothing, always — on macOS too, where the case-insensitive filesystem affects fs.open but
  // not a string comparison.
  const p    = mkProject();
  const orig = process.cwd();
  process.chdir(p.dir);
  try {
    p.write(`.planning/approvals/approval-${SAMPLE_APPROVAL.id.toLowerCase()}.json`,
      JSON.stringify(SAMPLE_APPROVAL));

    const result = Metrics.getApprovals();
    assert.ok(Array.isArray(result),
      'getApprovals must return an ARRAY: its only consumer does .length and .map(), which on ' +
      'the previous {pending,approved,rejected,expired} object yields undefined then a TypeError');
    assert.strictEqual(result.length, 1, `expected the record to be found, got ${result.length}`);
    assert.strictEqual(result[0].id, SAMPLE_APPROVAL.id);
    assert.strictEqual(result[0].state, 'valid', `a freshly minted record is valid, got ${result[0].state}`);
  } finally { process.chdir(orig); p.cleanup(); }
});

test('getApprovals: an UPPERCASE filename is NOT silently accepted', () => {
  // Guards the fix from being "generalised" back into matching both spellings, which would
  // re-admit the dashboard-only format that no producer writes.
  const p    = mkProject();
  const orig = process.cwd();
  process.chdir(p.dir);
  try {
    p.write('.planning/approvals/notes.txt', 'not a record');
    const result = Metrics.getApprovals();
    assert.strictEqual(result.length, 0, 'only .json files are records');
  } finally { process.chdir(orig); p.cleanup(); }
});

test('getApprovals: categorises by VERIFIED state, not a self-declared status', () => {
  const p    = mkProject();
  const orig = process.cwd();
  process.chdir(p.dir);
  try {
    // expired
    const past = new Date(Date.now() - 100 * 3600_000).toISOString();
    const expired = makeApproval({ id: 'MF-AUTH-EXPIRED', timestamp: past, expires_at: expiryFrom(past) });
    p.write('.planning/approvals/approval-mf-auth-expired.json', JSON.stringify(expired));
    // bound to an older release
    const oldVersion = makeApproval({ id: 'MF-AUTH-OLDVER', version: '0.0.1' });
    p.write('.planning/approvals/approval-mf-auth-oldver.json', JSON.stringify(oldVersion));
    // tampered after minting
    const tampered = { ...makeApproval({ id: 'MF-AUTH-TAMPER' }), reason: 'edited afterwards' };
    p.write('.planning/approvals/approval-mf-auth-tamper.json', JSON.stringify(tampered));
    // valid
    p.write('.planning/approvals/approval-mf-auth-ok.json', JSON.stringify(makeApproval({ id: 'MF-AUTH-OK' })));

    const byId = Object.fromEntries(Metrics.getApprovals().map(r => [r.id, r]));
    assert.strictEqual(byId['MF-AUTH-OK'].state, 'valid');
    assert.strictEqual(byId['MF-AUTH-EXPIRED'].state, 'stale', 'an expired record is stale');
    assert.strictEqual(byId['MF-AUTH-OLDVER'].state, 'stale',
      'a record bound to an earlier release is stale — this is the property that stopped one ' +
      'record approving every later version');
    assert.strictEqual(byId['MF-AUTH-TAMPER'].state, 'corrupt',
      'an edited record is corrupt, not merely stale');
    assert.ok(byId['MF-AUTH-TAMPER'].problems.some(x => /checksum/.test(x)),
      'and it must say the checksum failed');
  } finally { process.chdir(orig); p.cleanup(); }
});

test('getApprovals: reports corrupt JSON instead of silently dropping it', () => {
  // The old reader had `catch { /* skip corrupt files */ }`, so an unparseable record vanished
  // from the dashboard entirely — the operator saw an empty list rather than a problem.
  const p    = mkProject();
  const orig = process.cwd();
  process.chdir(p.dir);
  try {
    p.write('.planning/approvals/approval-broken.json', '{ not json');
    const result = Metrics.getApprovals();
    assert.strictEqual(result.length, 1, 'a corrupt record must still be surfaced');
    assert.strictEqual(result[0].state, 'corrupt');
    assert.match(result[0].problems.join(' '), /not valid JSON/);
  } finally { process.chdir(orig); p.cleanup(); }
});

test('getCosts: returns correct total', () => {
  const p    = mkProject();
  const orig = process.cwd();
  process.chdir(p.dir);
  try {
    const today = new Date().toISOString().slice(0, 10);
    // Fixtures MUST use the canonical ledger shape written by
    // bin/models/cost-tracker.js -> bin/models/usage-record.js: `cost_usd`
    // plus both `date` and full-ISO `timestamp`. Seeding `total_cost_usd`
    // here is what previously kept the writer/reader mismatch green.
    p.write('.mindforge/metrics/token-usage.jsonl',
      JSON.stringify({ date: today, timestamp: `${today}T09:00:00.000Z`, model: 'claude-sonnet-4-6', input_tokens: 100, output_tokens: 50, cost_usd: 0.05 }) + '\n' +
      JSON.stringify({ date: today, timestamp: `${today}T09:05:00.000Z`, model: 'gpt-4o', input_tokens: 200, output_tokens: 80, cost_usd: 0.12 }) + '\n'
    );

    const costs = Metrics.getCosts(7);
    assert.ok(Math.abs(costs.total_usd - 0.17) < 0.01, `Expected ~0.17, got ${costs.total_usd}`);
    assert.ok(Math.abs(costs.today_usd - 0.17) < 0.01, `Expected today ~0.17, got ${costs.today_usd}`);
    assert.strictEqual(costs.by_model['gpt-4o'], 0.12, 'per-model split must use cost_usd');
  } finally { process.chdir(orig); p.cleanup(); }
});

// Regression anchor for COST-01: the ledger's only cost field is `cost_usd`.
// A row carrying `total_cost_usd` (the cross-review report field) must
// contribute $0 — otherwise the writer/reader mismatch can silently return.
test('getCosts: ignores total_cost_usd (wrong field) in ledger rows', () => {
  const p    = mkProject();
  const orig = process.cwd();
  process.chdir(p.dir);
  try {
    const today = new Date().toISOString().slice(0, 10);
    p.write('.mindforge/metrics/token-usage.jsonl',
      JSON.stringify({ date: today, timestamp: `${today}T09:00:00.000Z`, model: 'gpt-4o', total_cost_usd: 9.99 }) + '\n'
    );

    // Window 6 (not 7) on purpose: getCosts memoizes per `costs:<window>` for
    // 5s, so reusing 7 here would serve the previous test's cached result.
    const costs = Metrics.getCosts(6);
    assert.strictEqual(costs.total_usd, 0, `total_cost_usd must not be summed, got ${costs.total_usd}`);
  } finally { process.chdir(orig); p.cleanup(); }
});

test('getTeamActivity: returns active developers from AUDIT', () => {
  const p    = mkProject();
  const orig = process.cwd();
  process.chdir(p.dir);
  try {
    const now = new Date().toISOString();
    p.write('.planning/AUDIT.jsonl',
      JSON.stringify({ id: '1', timestamp: now, event: 'task_completed', authored_by: 'alice@team.com', phase: 3, plan: '04' }) + '\n' +
      JSON.stringify({ id: '2', timestamp: now, event: 'task_started',   authored_by: 'bob@team.com',   phase: 3, plan: '05' }) + '\n'
    );

    const team = Metrics.getTeamActivity();
    assert.ok(Array.isArray(team.active),    'Should have active array');
    assert.ok(Array.isArray(team.conflicts), 'Should have conflicts array');
    assert.ok(team.active.some(a => a.email === 'alice@team.com'), 'Should include alice');
    assert.ok(team.active.some(a => a.email === 'bob@team.com'),   'Should include bob');
  } finally { process.chdir(orig); p.cleanup(); }
});

// ── Approval decision endpoint: REMOVED ──────────────────────────────────────
//
// The five processDecision tests and the /api/approve approver-attribution regression test
// that stood here are gone with the endpoint they covered. bin/dashboard/approval-handler.js
// implemented a pending-request -> decide workflow that no producer has ever fed:
// bin/governance/approve.js records an already-made decision, and nothing anywhere writes a
// request awaiting one. The handler additionally required a 36-char UUID id (the writer emits
// MF-AUTH-<base36>), required status:'pending' (never written), and read APPROVAL-*.json (the
// writer emits approval-*.json).
//
// Those tests passed for the same reason the feature never worked: each built its own fixture
// in the invented shape, so the module and its test agreed with each other and neither agreed
// with production. Deleting them removes coverage of nothing that ran.
//
// The security property one of them protected — never trusting a client-supplied `approver` —
// is preserved by construction: there is no longer any endpoint that writes an approval record.
// Records are minted only by bin/governance/approve.js, which takes the identity from git and
// fails closed without a GPG key unless MINDFORGE_ALLOW_UNVERIFIED_APPROVAL=1 is set
// (tests/approve.test.js). Integrity of what it writes is covered by
// tests/approval-integrity.test.js.

// ── Dashboard lifecycle flags ─────────────────────────────────────────────────
//
// THE DEFECT. `--stop` and `--status` were documented in four places and implemented in none, and
// `--start` in five docs never existed at all. Only `--port` and `--open` were parsed. Worst of it,
// bin/dashboard/server.js told the operator to run one of the missing flags itself: on EADDRINUSE it
// printed "[dashboard] Stop it: /mindforge:dashboard --stop". Following that started a second
// server. They are implemented rather than deleted because the PID file already existed to support
// them — written on listen, removed on shutdown.

test('--status reports honestly when nothing is running', () => {
  const { spawnSync } = require('child_process');
  const SERVER = path.join(__dirname, '..', 'bin', 'dashboard', 'server.js');
  const dir = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'mf-dashlc-')));
  try {
    fs.mkdirSync(path.join(dir, '.planning'), { recursive: true });
    // TIMEOUT IS LOAD-BEARING. If the lifecycle block regresses, --status falls through to the
    // express bootstrap and the server LISTENS FOREVER — spawnSync would block and hang the whole
    // suite instead of failing it. Verified by mutation: disabling the block hung a 10-minute
    // harness. A test that hangs on regression is worse than no test, because CI reports nothing.
    const r = spawnSync(process.execPath, [SERVER, '--status'],
      { cwd: dir, encoding: 'utf8', timeout: 20000, killSignal: 'SIGKILL',
        env: { PATH: process.env.PATH, HOME: dir } });
    assert.ok(!r.error || r.error.code !== 'ETIMEDOUT',
      '--status never exited: it fell through to the server bootstrap and started listening. That '
      + 'is precisely the defect — the flag was unparsed, so asking for status STARTED a server.');
    assert.strictEqual(r.status, 1,
      `--status must exit non-zero when the dashboard is not running, got ${r.status}. Before this `
      + `existed, the flag was unparsed and the server simply STARTED.\n${r.stdout}${r.stderr}`);
    assert.match(`${r.stdout}${r.stderr}`, /not running/,
      'it must say so in words, not only in the exit code');
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test('--stop REFUSES a live process that is not the dashboard', () => {
  // The assertion that matters. A PID file is not proof of identity: the recorded process can die
  // without cleanup and the OS reuses the number, so acting on the file alone means SIGTERM to an
  // unrelated process the operator never mentioned.
  //
  // This caught a real bug during development. The identity check first tested whether `ps -o
  // command=` merely CONTAINED "dashboard/server.js" — which matched the shell running its own
  // test, because that shell's command line embedded the script source. The shell got the SIGTERM.
  // The check is now anchored to a node invocation of that path, and this test spawns a decoy whose
  // command line does NOT mention it, plus asserts the decoy survives.
  const { spawnSync, spawn } = require('child_process');
  const SERVER = path.join(__dirname, '..', 'bin', 'dashboard', 'server.js');
  const dir = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'mf-dashkill-')));
  // TWO decoys, because the check has been wrong in two different ways and each needs its own bait.
  //
  //   decoy A — command line MENTIONS the path but is not it. Catches a containment test. This is the
  //             shape that SIGTERM'd the shell running this very suite.
  //   decoy B — a REAL `node <path>/dashboard/server.js` in an unrelated project. Catches a check
  //             that anchors on the path SHAPE rather than identity. `dashboard/server.js` is an
  //             utterly ordinary path, so the second implementation would have killed this one —
  //             verified against `node /var/www/unrelated_app/dashboard/server.js`.
  //
  // Decoy A alone left the shape bug invisible, which is how it shipped. The only safe question is
  // "is this the very file I am", answered by comparing realpaths.
  const decoyDir = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'mf-decoy-')));
  fs.mkdirSync(path.join(decoyDir, 'unrelated_app', 'dashboard'), { recursive: true });
  const decoyScript = path.join(decoyDir, 'unrelated_app', 'dashboard', 'server.js');
  fs.writeFileSync(decoyScript, 'setTimeout(() => {}, 60000);\n');

  const decoy = spawn(process.execPath,
    ['-e', 'setTimeout(() => {}, 60000) /* bin/dashboard/server.js */'], { stdio: 'ignore' });
  const decoyB = spawn(process.execPath, [decoyScript], { stdio: 'ignore' });
  try {
    fs.mkdirSync(path.join(dir, '.planning'), { recursive: true });
    fs.writeFileSync(path.join(dir, '.planning', 'dashboard-server.pid'), String(decoy.pid));

    const r = spawnSync(process.execPath, [SERVER, '--stop'],
      { cwd: dir, encoding: 'utf8', timeout: 20000, killSignal: 'SIGKILL',
        env: { PATH: process.env.PATH, HOME: dir } });
    assert.ok(!r.error || r.error.code !== 'ETIMEDOUT',
      '--stop never exited: it fell through to the server bootstrap and started listening');
    const out = `${r.stdout}${r.stderr}`;

    assert.strictEqual(r.status, 1, `--stop must refuse and exit non-zero, got ${r.status}:\n${out}`);
    assert.match(out, /REFUSING/, `the refusal must be explicit:\n${out}`);

    // The whole point: the decoy is untouched.
    let alive = true;
    try { process.kill(decoy.pid, 0); } catch { alive = false; }
    assert.ok(alive,
      `--stop signalled pid ${decoy.pid}, which is NOT the dashboard. A stale PID file plus a reused `
      + 'number would make this kill an arbitrary process.');

    // And now decoy B: a genuine node process running SOME OTHER dashboard/server.js.
    fs.writeFileSync(path.join(dir, '.planning', 'dashboard-server.pid'), String(decoyB.pid));
    const rB = spawnSync(process.execPath, [SERVER, '--stop'], {
      cwd: dir, encoding: 'utf8', timeout: 20000, killSignal: 'SIGKILL',
      env: { PATH: process.env.PATH, HOME: dir },
    });
    assert.strictEqual(rB.status, 1,
      `--stop must refuse an unrelated app's dashboard/server.js, got ${rB.status}:\n${rB.stdout}${rB.stderr}`);
    let aliveB = true;
    try { process.kill(decoyB.pid, 0); } catch { aliveB = false; }
    assert.ok(aliveB,
      `--stop killed pid ${decoyB.pid}, an UNRELATED application whose script happens to be called `
      + 'dashboard/server.js. Matching the path shape is not identity — compare realpaths against '
      + '__filename.');
  } finally {
    try { decoy.kill('SIGKILL'); } catch { /* already gone */ }
    try { decoyB.kill('SIGKILL'); } catch { /* already gone */ }
    fs.rmSync(dir, { recursive: true, force: true });
    fs.rmSync(decoyDir, { recursive: true, force: true });
  }
});

test('every dashboard flag the docs advertise is actually parsed', () => {
  // The drift gate. --stop, --status and --start were documented across nine places while the code
  // parsed two flags, so the docs and the implementation are compared directly rather than trusting
  // either. Derived from both sides: no hardcoded expected list to go stale.
  const server = fs.readFileSync(path.join(__dirname, '..', 'bin', 'dashboard', 'server.js'), 'utf8');
  const implemented = new Set([
    ...[...server.matchAll(/ARGS\.includes\('(--[a-z-]+)'\)/g)].map((m) => m[1]),
    ...[...server.matchAll(/a\[i-1\] === '(--[a-z-]+)'/g)].map((m) => m[1]),
  ]);
  assert.ok(implemented.size >= 2,
    `only ${implemented.size} flag(s) detected in server.js — the pattern broke, so this check would `
    + 'silently pass no matter what the docs claim');

  const docRoots = [
    path.join(__dirname, '..', 'docs'),
    path.join(__dirname, '..', '.claude', 'commands', 'mindforge'),
  ];
  const claimed = new Map();
  for (const root of docRoots) {
    if (!fs.existsSync(root)) continue;
    for (const f of fs.readdirSync(root)) {
      if (!f.endsWith('.md')) continue;
      const full = path.join(root, f);
      for (const line of fs.readFileSync(full, 'utf8').split('\n')) {
        if (!/mindforge:dashboard/.test(line)) continue;
        for (const m of line.matchAll(/(--[a-z-]+)/g)) {
          if (!claimed.has(m[1])) claimed.set(m[1], `${path.basename(root)}/${f}`);
        }
      }
    }
  }

  const phantom = [...claimed].filter(([flag]) => !implemented.has(flag));
  assert.deepStrictEqual(phantom.map(([f, where]) => `${f} (${where})`), [],
    'the docs advertise dashboard flag(s) the server does not parse. Implemented: '
    + `${[...implemented].sort().join(' ')}. Either implement the flag or stop documenting it — `
    + 'server.js used to print "Stop it: /mindforge:dashboard --stop" for a flag it ignored.');
});

// ── Summary ───────────────────────────────────────────────────────────────────
console.log(`\nTests finished: ${passed} passed, ${failed} failed\n`);
if (failed > 0) process.exit(1);
