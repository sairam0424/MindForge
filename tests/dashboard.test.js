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

// ── Summary ───────────────────────────────────────────────────────────────────
console.log(`\nTests finished: ${passed} passed, ${failed} failed\n`);
if (failed > 0) process.exit(1);
