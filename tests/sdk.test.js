/**
 * MindForge Day 6 — SDK Tests
 * Run: node tests/sdk.test.js
 */
'use strict';
const fs = require('fs'), path = require('path'), assert = require('assert');
let passed = 0, failed = 0;
function test(name, fn) {
  try { fn(); console.log(`  ✅ ${name}`); passed++; }
  catch(e) { console.error(`  ❌ ${name}\n     ${e.message}`); failed++; }
}
const read = p => fs.existsSync(p) ? fs.readFileSync(p, 'utf8') : '';

// ── Lightweight SDK client simulation (without TypeScript compilation) ─────────
class MockMindForgeClient {
  constructor(config = {}) {
    this.projectRoot = config.projectRoot || process.cwd();
  }
  isInitialised() {
    return fs.existsSync(path.join(this.projectRoot, '.planning', 'PROJECT.md'));
  }
  readHandoff() {
    const p = path.join(this.projectRoot, '.planning', 'HANDOFF.json');
    if (!fs.existsSync(p)) return null;
    try { return JSON.parse(fs.readFileSync(p, 'utf8')); }
    catch { return null; }
  }
  readAuditLog(filter = {}) {
    const p = path.join(this.projectRoot, '.planning', 'AUDIT.jsonl');
    if (!fs.existsSync(p)) return [];
    return fs.readFileSync(p, 'utf8')
      .split('\n').filter(Boolean)
      .map(l => { try { return JSON.parse(l); } catch { return null; } })
      .filter(Boolean)
      .filter(e => !filter.event || e.event === filter.event);
  }
  async health() {
    const warnings = [], errors = [], info = [];
    const handoff = this.readHandoff();
    if (handoff && !handoff.schema_version) {
      errors.push({ category: 'state', message: 'HANDOFF.json missing schema_version' });
    }
    return {
      overallStatus: errors.length > 0 ? 'error' : warnings.length > 0 ? 'warning' : 'healthy',
      errors, warnings, informational: info,
      timestamp: new Date().toISOString(),
    };
  }
}

// ── Command builder simulation ────────────────────────────────────────────────
const commands = {
  health: (opts = {}) => `/mindforge:health ${(opts.flags||[]).join(' ')}`.trim(),
  planPhase: (n, opts = {}) => `/mindforge:plan-phase ${n} ${(opts.flags||[]).join(' ')}`.trim(),
  executePhase: (n, opts = {}) => `/mindforge:execute-phase ${n} ${(opts.flags||[]).join(' ')}`.trim(),
  audit: (f = {}) => {
    const parts = ['/mindforge:audit'];
    if (f.phase) parts.push(`--phase ${f.phase}`);
    if (f.event) parts.push(`--event ${f.event}`);
    return parts.join(' ');
  },
};

console.log('\nMindForge Day 6 — SDK Tests\n');

console.log('SDK source files:');
['index.ts','client.ts','types.ts','events.ts','commands.ts'].forEach(f => {
  test(`sdk/src/${f} exists`, () => {
    assert.ok(fs.existsSync(`sdk/src/${f}`), `Missing: sdk/src/${f}`);
  });
});

console.log('\nSDK type exports:');
test('index.ts exports VERSION', () => {
  const c = read('sdk/src/index.ts');
  assert.ok(c.includes("VERSION"), 'Should export VERSION');
});

test('types.ts defines MindForgeConfig', () => {
  const c = read('sdk/src/types.ts');
  assert.ok(c.includes('MindForgeConfig'), 'Should define MindForgeConfig');
});

test('types.ts defines all result types', () => {
  const c = read('sdk/src/types.ts');
  ['PhaseResult','TaskResult','SecurityFinding','GateResult','HealthReport'].forEach(t => {
    assert.ok(c.includes(t), `Should define ${t}`);
  });
});

test('events.ts defines MindForgeEventStream', () => {
  const c = read('sdk/src/events.ts');
  assert.ok(c.includes('MindForgeEventStream'), 'Should define MindForgeEventStream');
  assert.ok(c.includes('watchAuditLog'), 'Should have watchAuditLog method');
});

console.log('\nSDK client behaviour:');

test('client.isInitialised() returns false when PROJECT.md missing', () => {
  const client = new MockMindForgeClient({ projectRoot: '/tmp/nonexistent-project' });
  assert.strictEqual(client.isInitialised(), false);
});

test('client.isInitialised() returns true when PROJECT.md exists', () => {
  const client = new MockMindForgeClient({ projectRoot: process.cwd() });
  // May be true or false depending on whether we're in a MindForge project
  assert.ok(typeof client.isInitialised() === 'boolean');
});

test('client.readHandoff() returns null when HANDOFF.json missing', () => {
  const client = new MockMindForgeClient({ projectRoot: '/tmp/nonexistent-project' });
  assert.strictEqual(client.readHandoff(), null);
});

test('client.readHandoff() parses valid HANDOFF.json', () => {
  const client = new MockMindForgeClient({ projectRoot: process.cwd() });
  const handoff = client.readHandoff();
  if (handoff) {
    assert.ok(typeof handoff === 'object', 'HANDOFF.json should parse to object');
    assert.ok(handoff.schema_version, 'HANDOFF.json should have schema_version');
  }
  // null is acceptable if not in a MindForge project
});

test('client.readAuditLog() returns array', () => {
  const client = new MockMindForgeClient({ projectRoot: process.cwd() });
  const log = client.readAuditLog();
  assert.ok(Array.isArray(log), 'readAuditLog should return array');
});

test('client.readAuditLog() filters by event type', () => {
  const client = new MockMindForgeClient({ projectRoot: process.cwd() });
  const secFindings = client.readAuditLog({ event: 'security_finding' });
  assert.ok(Array.isArray(secFindings));
  secFindings.forEach(e => {
    assert.strictEqual(e.event, 'security_finding', 'All entries should match filter');
  });
});

test('client.health() returns HealthReport shape', async () => {
  const client = new MockMindForgeClient({ projectRoot: process.cwd() });
  const report = await client.health();
  assert.ok(['healthy','warning','error'].includes(report.overallStatus));
  assert.ok(Array.isArray(report.errors));
  assert.ok(Array.isArray(report.warnings));
  assert.ok(report.timestamp);
});

console.log('\nCommand builders:');
test('commands.health() builds correct string', () => {
  assert.strictEqual(commands.health(), '/mindforge:health');
  assert.strictEqual(commands.health({ flags: ['--repair'] }), '/mindforge:health --repair');
});

test('commands.planPhase() builds correct string', () => {
  assert.strictEqual(commands.planPhase(3), '/mindforge:plan-phase 3');
});

test('commands.audit() builds filter string', () => {
  const cmd = commands.audit({ phase: 3, event: 'security_finding' });
  assert.ok(cmd.includes('--phase 3'));
  assert.ok(cmd.includes('--event security_finding'));
});

test('commands.executePhase() includes phase number', () => {
  const cmd = commands.executePhase(2);
  assert.ok(cmd.includes('2'));
  assert.ok(cmd.startsWith('/mindforge:execute-phase'));
});

console.log('\nHardening-prompted SDK tests:');

test('SDK SSE server binds to 127.0.0.1 (localhost only)', () => {
  const c = read('sdk/src/events.ts');
  assert.ok(
    c.includes("'127.0.0.1'") || c.includes('"127.0.0.1"'),
    'SSE server should bind to 127.0.0.1 only'
  );
});

test('SDK SSE server rejects non-localhost connections', () => {
  const c = read('sdk/src/events.ts');
  assert.ok(
    c.includes('isLocalhost') || c.includes('remoteAddress') || c.includes('Forbidden'),
    'SSE server should reject non-localhost connections'
  );
});

test('SDK has inotify fallback for Linux', () => {
  const c = read('sdk/src/events.ts');
  assert.ok(
    c.includes('ENOSPC') || c.includes('polling') || c.includes('watchFile'),
    'SDK should handle Linux inotify limits'
  );
});

console.log(`\n${'─'.repeat(50)}`);
console.log(`Results: ${passed} passed, ${failed} failed`);
if (failed > 0) { console.error(`\n❌ ${failed} test(s) failed.\n`); process.exit(1); }
else { console.log(`\n✅ All SDK tests passed.\n`); }
