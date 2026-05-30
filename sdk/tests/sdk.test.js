/**
 * MindForge SDK — Unit Tests
 */

const path = require('path');
const assert = require('assert');

// Build must exist — run `npm run build` first
const { MindForgeClient, MindForgeEventStream, VERSION } = require('../dist/index.js');

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    passed++;
    console.log(`  PASS  ${name}`);
  } catch (err) {
    failed++;
    console.log(`  FAIL  ${name}`);
    console.log(`        ${err.message}`);
  }
}

console.log('\nMindForge SDK Tests\n');

// ── Version ──────────────────────────────────────────────────────────────────
test('VERSION exports correctly', () => {
  assert.strictEqual(VERSION, '11.1.0');
});

// ── Client instantiation ─────────────────────────────────────────────────────
test('MindForgeClient instantiates with defaults', () => {
  const client = new MindForgeClient();
  assert.ok(client instanceof MindForgeClient);
});

test('MindForgeClient accepts custom projectRoot', () => {
  const client = new MindForgeClient({ projectRoot: '/tmp/nonexistent' });
  assert.ok(client);
});

// ── EventStream export ───────────────────────────────────────────────────────
test('MindForgeEventStream is exported', () => {
  assert.ok(MindForgeEventStream);
  assert.strictEqual(typeof MindForgeEventStream, 'function');
});

// ── validateConfig ───────────────────────────────────────────────────────────
test('validateConfig returns error when MINDFORGE.md missing', () => {
  const client = new MindForgeClient({ projectRoot: '/tmp/nonexistent-project' });
  const result = client.validateConfig();
  assert.strictEqual(result.valid, false);
  assert.ok(result.errors.length > 0);
  assert.ok(result.errors[0].includes('MINDFORGE.md not found'));
});

test('validateConfig succeeds for real project root', () => {
  const repoRoot = path.resolve(__dirname, '..');
  // The repo root has MINDFORGE.md one level up from sdk/
  const client = new MindForgeClient({ projectRoot: path.resolve(repoRoot, '..') });
  const result = client.validateConfig();
  assert.strictEqual(result.valid, true, `Unexpected errors: ${result.errors.join(', ')}`);
});

// ── readState ────────────────────────────────────────────────────────────────
test('readState returns null for non-existent path', () => {
  const client = new MindForgeClient({ projectRoot: '/tmp/nonexistent-project' });
  const state = client.readState();
  assert.strictEqual(state, null);
});

// ── readAuditLog ─────────────────────────────────────────────────────────────
test('readAuditLog returns empty array for non-existent path', () => {
  const client = new MindForgeClient({ projectRoot: '/tmp/nonexistent-project' });
  const entries = client.readAuditLog();
  assert.ok(Array.isArray(entries));
  assert.strictEqual(entries.length, 0);
});

// ── isInitialised ────────────────────────────────────────────────────────────
test('isInitialised returns false for non-existent project', () => {
  const client = new MindForgeClient({ projectRoot: '/tmp/nonexistent-project' });
  assert.strictEqual(client.isInitialised(), false);
});

// ── Summary ──────────────────────────────────────────────────────────────────
console.log(`\nResults: ${passed} passed, ${failed} failed\n`);
if (failed > 0) process.exit(1);
