/**
 * MindForge SDK — Exports Smoke Test
 * Verifies that sdk/dist/index.js resolves and exposes the expected named exports.
 * Run: node tests/sdk-exports.test.js
 */
'use strict';

const assert = require('assert');
const path   = require('path');

let passed = 0, failed = 0;

function test(name, fn) {
  try   { fn(); console.log(`  ✅ ${name}`); passed++; }
  catch (e) { console.error(`  ❌ ${name}\n     ${e.message}`); failed++; }
}

console.log('\nMindForge SDK — Exports Smoke Test\n');

// ── Resolve the dist bundle ────────────────────────────────────────────────────
const distIndex = path.resolve(__dirname, '..', 'sdk', 'dist', 'index.js');

let sdk;
test('sdk/dist/index.js loads without error', () => {
  sdk = require(distIndex);
});

// ── Named exports present ──────────────────────────────────────────────────────
console.log('\nNamed exports:');

test('exports VERSION string', () => {
  assert.strictEqual(typeof sdk.VERSION, 'string', 'VERSION must be a string');
  assert.ok(sdk.VERSION.length > 0, 'VERSION must be non-empty');
});

test('exports MindForgeClient class', () => {
  assert.strictEqual(typeof sdk.MindForgeClient, 'function', 'MindForgeClient must be a constructor');
});

test('exports MindForgeEventStream class', () => {
  assert.strictEqual(typeof sdk.MindForgeEventStream, 'function', 'MindForgeEventStream must be a constructor');
});

test('exports WebSocketEventStream class', () => {
  assert.strictEqual(typeof sdk.WebSocketEventStream, 'function', 'WebSocketEventStream must be a constructor');
});

test('exports commands object', () => {
  assert.strictEqual(typeof sdk.commands, 'object', 'commands must be an object');
  assert.ok(sdk.commands !== null, 'commands must not be null');
});

test('exports batch object', () => {
  assert.ok(sdk.batch !== undefined, 'batch export must exist');
});

test('exports MindForgeMemory class', () => {
  assert.strictEqual(typeof sdk.MindForgeMemory, 'function', 'MindForgeMemory must be a constructor');
});

// ── Submodule spot-checks ──────────────────────────────────────────────────────
console.log('\nSubmodule spot-checks:');

test('sdk/dist/commands.js re-exports commands and batch', () => {
  const cmds = require(path.resolve(__dirname, '..', 'sdk', 'dist', 'commands.js'));
  assert.strictEqual(typeof cmds.commands, 'object');
  assert.ok(cmds.batch !== undefined);
});

test('sdk/dist/memory.js re-exports MindForgeMemory', () => {
  const mem = require(path.resolve(__dirname, '..', 'sdk', 'dist', 'memory.js'));
  assert.strictEqual(typeof mem.MindForgeMemory, 'function');
});

// ── Summary ────────────────────────────────────────────────────────────────────
console.log(`\n${'─'.repeat(50)}`);
console.log(`Results: ${passed} passed, ${failed} failed`);
if (failed > 0) { console.error(`\n❌ ${failed} test(s) failed.\n`); process.exit(1); }
else { console.log('\n✅ All SDK export tests passed.\n'); }
