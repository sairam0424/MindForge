/**
 * MindForge Audit System Tests
 * Run: node tests/audit.test.js
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

// ── Audit utility functions to test ──────────────────────────────────────────

function validateAuditEntry(entry) {
  const required = ['id', 'timestamp', 'event', 'agent', 'session_id'];
  const missing = required.filter(f => !entry[f]);
  if (missing.length > 0) {
    throw new Error(`Missing required fields: ${missing.join(', ')}`);
  }
  const ts = new Date(entry.timestamp);
  if (isNaN(ts.getTime())) throw new Error(`Invalid timestamp: ${entry.timestamp}`);
  if (!/^[0-9a-f-]{36}$/.test(entry.id)) throw new Error(`Invalid UUID format: ${entry.id}`);
}

function parseAuditLog(content) {
  return content.trim().split('\n')
    .filter(line => line.trim())
    .map((line, index) => {
      try {
        return JSON.parse(line);
      } catch (e) {
        throw new Error(`Line ${index + 1} is not valid JSON: ${line.slice(0, 50)}...`);
      }
    });
}

// ── Tests ─────────────────────────────────────────────────────────────────────

console.log('\nMindForge Day 2 — Audit System Tests\n');

console.log('AUDIT.jsonl file:');

test('AUDIT.jsonl exists', () => {
  assert.ok(fs.existsSync('.planning/AUDIT.jsonl'), 'AUDIT.jsonl not found');
});

test('AUDIT.jsonl is valid (empty or valid JSONL)', () => {
  const content = fs.readFileSync('.planning/AUDIT.jsonl', 'utf8');
  if (content.trim().length === 0) return;
  parseAuditLog(content);
});

console.log('\nAudit entry validation:');

test('valid task_completed entry passes validation', () => {
  const entry = {
    id: '550e8400-e29b-41d4-a716-446655440000',
    timestamp: new Date().toISOString(),
    event: 'task_completed',
    agent: 'mindforge-subagent-01',
    phase: 1,
    plan: '01',
    session_id: 'sess_test',
    task_name: 'Create user model',
    commit_sha: 'abc1234',
    verify_result: 'pass'
  };
  assert.doesNotThrow(() => validateAuditEntry(entry));
});

test('entry missing required field fails validation', () => {
  const entry = {
    timestamp: new Date().toISOString(),
    event: 'task_completed',
    agent: 'mindforge-subagent-01',
  };
  assert.throws(() => validateAuditEntry(entry), /Missing required fields/);
});

test('entry with invalid timestamp fails validation', () => {
  const entry = {
    id: '550e8400-e29b-41d4-a716-446655440000',
    timestamp: 'not-a-date',
    event: 'task_completed',
    agent: 'mindforge-subagent-01',
    session_id: 'sess_test',
  };
  assert.throws(() => validateAuditEntry(entry), /Invalid timestamp/);
});

test('JSONL parser handles multi-line audit log', () => {
  const multiLine = [
    '{"id":"550e8400-e29b-41d4-a716-446655440000","timestamp":"2026-03-20T10:00:00.000Z","event":"task_started","agent":"test","session_id":"s1"}',
    '{"id":"550e8400-e29b-41d4-a716-446655440001","timestamp":"2026-03-20T10:05:00.000Z","event":"task_completed","agent":"test","session_id":"s1"}',
  ].join('\n');
  const entries = parseAuditLog(multiLine);
  assert.strictEqual(entries.length, 2);
  assert.strictEqual(entries[0].event, 'task_started');
  assert.strictEqual(entries[1].event, 'task_completed');
});

test('JSONL parser rejects malformed JSON', () => {
  const badLine = '{"id":"abc","timestamp": bad json}';
  assert.throws(() => parseAuditLog(badLine), /not valid JSON/);
});

console.log('\nAudit schema files:');

test('AUDIT-SCHEMA.md exists and has content', () => {
  const schemaPath = '.mindforge/audit/AUDIT-SCHEMA.md';
  assert.ok(fs.existsSync(schemaPath), 'AUDIT-SCHEMA.md not found');
  const content = fs.readFileSync(schemaPath, 'utf8');
  assert.ok(content.length > 500, 'AUDIT-SCHEMA.md seems too short');
  assert.ok(content.includes('task_completed'), 'Missing task_completed event type');
  assert.ok(content.includes('security_finding'), 'Missing security_finding event type');
  assert.ok(content.includes('context_compaction'), 'Missing context_compaction event type');
});

test('HANDOFF.json has _warning anti-secret field', () => {
  const handoff = JSON.parse(fs.readFileSync('.planning/HANDOFF.json', 'utf8'));
  assert.ok(handoff._warning, 'Missing _warning anti-secret field in HANDOFF.json');
  assert.ok(handoff._warning.toLowerCase().includes('secret'), 'Warning should mention secrets');
});

console.log('\nAdditional audit tests:');

test('validates security_finding event type', () => {
  const entry = {
    id: '550e8400-e29b-41d4-a716-446655440002',
    timestamp: new Date().toISOString(),
    event: 'security_finding',
    agent: 'mindforge-security-reviewer',
    phase: 1,
    session_id: 'sess_test',
    severity: 'HIGH',
    owasp_category: 'A03:Injection',
    finding: 'SQL query built by string concatenation',
    file: 'src/api/search.ts',
    line: 42,
    remediated: false
  };
  assert.doesNotThrow(() => validateAuditEntry(entry));
  assert.strictEqual(entry.event, 'security_finding');
});

test('validates context_compaction event type', () => {
  const entry = {
    id: '550e8400-e29b-41d4-a716-446655440003',
    timestamp: new Date().toISOString(),
    event: 'context_compaction',
    agent: 'mindforge-orchestrator',
    phase: 2,
    plan: '03',
    session_id: 'sess_test',
    context_usage_pct: 72,
    handoff_written: true
  };
  assert.doesNotThrow(() => validateAuditEntry(entry));
});

test('rejects entry with malformed UUID', () => {
  const entry = {
    id: 'not-a-uuid',
    timestamp: new Date().toISOString(),
    event: 'task_completed',
    agent: 'test',
    session_id: 'sess_test'
  };
  assert.throws(() => validateAuditEntry(entry), /Invalid UUID/);
});

test('AUDIT.jsonl contains no secrets', () => {
  const content = fs.readFileSync('.planning/AUDIT.jsonl', 'utf8');
  const secretPatterns = [
    /password\\s*["']?\\s*:\\s*["'][^"']{6,}/i,
    /sk-[a-zA-Z0-9]{20,}/,
    /-----BEGIN.*KEY-----/,
  ];
  secretPatterns.forEach(pattern => {
    assert.ok(!pattern.test(content), `Potential secret found in AUDIT.jsonl`);
  });
});

// ── Results ───────────────────────────────────────────────────────────────────
console.log(`\n${'─'.repeat(50)}`);
console.log(`Results: ${passed} passed, ${failed} failed`);

if (failed > 0) {
  console.error(`\n❌ ${failed} test(s) failed.\n`);
  process.exit(1);
} else {
  console.log(`\n✅ All audit tests passed.\n`);
}
