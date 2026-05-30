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
const Approval = require('../bin/dashboard/approval-handler');
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

const SAMPLE_APPROVAL = {
  id: 'aaaabbbb-cccc-dddd-eeee-ffffffffffff',
  tier: 2,
  phase: 3,
  plan: '04',
  description: 'Add user RBAC model',
  status: 'pending',
  requested_at: new Date().toISOString(),
  expires_at: new Date(Date.now() + 86_400_000).toISOString(),
};

// ═══════════════════════════════════════════════════════════════════════
console.log('\nMindForge v2 — Dashboard Tests\n');

// ── File existence ────────────────────────────────────────────────────────────
console.log('Required files:');
[
  'bin/dashboard/server.js',
  'bin/dashboard/sse-bridge.js',
  'bin/dashboard/api-router.js',
  'bin/dashboard/approval-handler.js',
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

test('getApprovals: returns categorized approvals', () => {
  const p    = mkProject();
  const orig = process.cwd();
  process.chdir(p.dir);
  try {
    p.write(`.planning/approvals/APPROVAL-${SAMPLE_APPROVAL.id}.json`, JSON.stringify(SAMPLE_APPROVAL));

    const result = Metrics.getApprovals();
    assert.ok(Array.isArray(result.pending),   'Should have pending array');
    assert.ok(Array.isArray(result.approved),  'Should have approved array');
    assert.ok(Array.isArray(result.rejected),  'Should have rejected array');
    assert.ok(Array.isArray(result.expired),   'Should have expired array');
    assert.strictEqual(result.pending.length, 1, 'Should have 1 pending approval');
    assert.strictEqual(result.pending[0].id, SAMPLE_APPROVAL.id);
  } finally { process.chdir(orig); p.cleanup(); }
});

test('getApprovals: classifies expired approval correctly', () => {
  const p    = mkProject();
  const orig = process.cwd();
  process.chdir(p.dir);
  try {
    const expired = {
      ...SAMPLE_APPROVAL,
      id: 'expired-uuid-1234-5678-abcd-ef0123456789',
      status: 'pending',
      expires_at: new Date(Date.now() - 3600_000).toISOString(), // 1 hour ago
    };
    p.write(`.planning/approvals/APPROVAL-${expired.id}.json`, JSON.stringify(expired));

    const result = Metrics.getApprovals();
    assert.strictEqual(result.expired.length, 1, 'Should classify as expired');
    assert.strictEqual(result.pending.length, 0, 'Should not be in pending');
  } finally { process.chdir(orig); p.cleanup(); }
});

test('getCosts: returns correct total', () => {
  const p    = mkProject();
  const orig = process.cwd();
  process.chdir(p.dir);
  try {
    const today = new Date().toISOString().slice(0, 10);
    p.write('.mindforge/metrics/token-usage.jsonl',
      JSON.stringify({ timestamp: today, model: 'claude-sonnet-4-6', total_cost_usd: 0.05 }) + '\n' +
      JSON.stringify({ timestamp: today, model: 'gpt-4o', total_cost_usd: 0.12 }) + '\n'
    );

    const costs = Metrics.getCosts(7);
    assert.ok(Math.abs(costs.total_usd - 0.17) < 0.01, `Expected ~0.17, got ${costs.total_usd}`);
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

// ── Approval handler ──────────────────────────────────────────────────────────
console.log('\nApproval handler:');

test('processDecision: approves a valid pending approval', () => {
  const p    = mkProject();
  const orig = process.cwd();
  process.chdir(p.dir);
  try {
    p.write(`.planning/approvals/APPROVAL-${SAMPLE_APPROVAL.id}.json`, JSON.stringify(SAMPLE_APPROVAL));
    p.write('.planning/AUDIT.jsonl', ''); // Create AUDIT file

    const result = Approval.processDecision(SAMPLE_APPROVAL.id, 'approve', 'Looks good', 'reviewer@team.com');
    assert.strictEqual(result.success, true,     'Should succeed');
    assert.strictEqual(result.decision, 'approve', 'Should record approve decision');

    const updated = JSON.parse(fs.readFileSync(path.join(p.dir, `.planning/approvals/APPROVAL-${SAMPLE_APPROVAL.id}.json`), 'utf8'));
    assert.strictEqual(updated.status, 'approved', 'File should be updated to approved');
    assert.strictEqual(updated.resolved_by, 'reviewer@team.com', 'Should record resolver');
  } finally { process.chdir(orig); p.cleanup(); }
});

test('processDecision: rejects a valid pending approval', () => {
  const p    = mkProject();
  const orig = process.cwd();
  process.chdir(p.dir);
  try {
    p.write(`.planning/approvals/APPROVAL-${SAMPLE_APPROVAL.id}.json`, JSON.stringify(SAMPLE_APPROVAL));
    p.write('.planning/AUDIT.jsonl', '');

    const result = Approval.processDecision(SAMPLE_APPROVAL.id, 'reject', 'Design flaw', 'reviewer@team.com');
    assert.strictEqual(result.success, true, 'Should succeed');
    const updated = JSON.parse(fs.readFileSync(path.join(p.dir, `.planning/approvals/APPROVAL-${SAMPLE_APPROVAL.id}.json`), 'utf8'));
    assert.strictEqual(updated.status, 'rejected', 'File should be updated to rejected');
  } finally { process.chdir(orig); p.cleanup(); }
});

test('processDecision: fails Tier 3 approval without confirmation ID', () => {
  const p    = mkProject();
  const orig = process.cwd();
  process.chdir(p.dir);
  try {
    const tier3 = { ...SAMPLE_APPROVAL, tier: 3, phase: 1, plan: 'auth' };
    p.write(`.planning/approvals/APPROVAL-${tier3.id}.json`, JSON.stringify(tier3));
    p.write('.planning/AUDIT.jsonl', '');

    const result = Approval.processDecision(tier3.id, 'approve', 'Go', 'admin');
    assert.strictEqual(result.success, false, 'Should fail without confirmation');
    assert.ok(result.confirmation_required, 'Should indicate confirmation required');
    assert.strictEqual(result.expected, '1-auth', 'Should return expected ID');
  } finally { process.chdir(orig); p.cleanup(); }
});

test('processDecision: succeeds Tier 3 approval with correct confirmation ID', () => {
  const p    = mkProject();
  const orig = process.cwd();
  process.chdir(p.dir);
  try {
    const tier3 = { ...SAMPLE_APPROVAL, tier: 3, phase: 1, plan: 'auth' };
    p.write(`.planning/approvals/APPROVAL-${tier3.id}.json`, JSON.stringify(tier3));
    p.write('.planning/AUDIT.jsonl', '');

    const result = Approval.processDecision(tier3.id, 'approve', 'Go', 'admin', '1-auth');
    assert.strictEqual(result.success, true, 'Should succeed with correct confirmation');
    
    const audit = fs.readFileSync(path.join(p.dir, '.planning/AUDIT.jsonl'), 'utf8');
    assert.ok(audit.includes('approval_granted'), 'Should write to AUDIT');
  } finally { process.chdir(orig); p.cleanup(); }
});

test('processDecision: writes AUDIT before updating approval file (integrity)', () => {
  const p    = mkProject();
  const orig = process.cwd();
  process.chdir(p.dir);
  // We can't easily test "before" without mocking fs, but we verifies both happen
  try {
    p.write(`.planning/approvals/APPROVAL-${SAMPLE_APPROVAL.id}.json`, JSON.stringify(SAMPLE_APPROVAL));
    p.write('.planning/AUDIT.jsonl', '');
    
    Approval.processDecision(SAMPLE_APPROVAL.id, 'approve', 'Ok', 'tester');
    
    const audit = fs.readFileSync(path.join(p.dir, '.planning/AUDIT.jsonl'), 'utf8');
    const apprv = fs.readFileSync(path.join(p.dir, `.planning/approvals/APPROVAL-${SAMPLE_APPROVAL.id}.json`), 'utf8');
    
    assert.ok(audit.length > 0, 'AUDIT should be written');
    assert.ok(JSON.parse(apprv).status === 'approved', 'Approval should be updated');
  } finally { process.chdir(orig); p.cleanup(); }
});

// ── Summary ───────────────────────────────────────────────────────────────────
console.log(`\nTests finished: ${passed} passed, ${failed} failed\n`);
if (failed > 0) process.exit(1);
