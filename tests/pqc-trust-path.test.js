/**
 * MindForge — PQC trust-path test (UC-24). Run: node tests/pqc-trust-path.test.js
 */
'use strict';
const fs = require('fs'); const path = require('path'); const assert = require('assert');
let passed = 0, failed = 0; const tests = [];
function test(name, fn) { tests.push({ name, fn }); }
const ROOT = path.resolve(__dirname, '..');

test('config: pqas_enabled is false by default (simulated PQC off the live trust path)', () => {
  const cfg = JSON.parse(fs.readFileSync(path.join(ROOT, '.mindforge', 'config.json'), 'utf8'));
  assert.strictEqual(cfg.security.pqas_enabled, false,
    'pqas_enabled must default to false until real PQC ships');
});

test('config: simulated PQC is gated behind an explicit experimental.pqc_demo flag', () => {
  const cfg = JSON.parse(fs.readFileSync(path.join(ROOT, '.mindforge', 'config.json'), 'utf8'));
  assert.ok(cfg.experimental && typeof cfg.experimental.pqc_demo === 'boolean',
    'experimental.pqc_demo flag must exist');
  assert.strictEqual(cfg.experimental.pqc_demo, false, 'pqc_demo must default to false');
});

test('quantum-crypto self-labels as simulated (no false assurance)', () => {
  const src = fs.readFileSync(path.join(ROOT, 'bin', 'governance', 'quantum-crypto.js'), 'utf8');
  assert.ok(/simulated/i.test(src), 'quantum-crypto must honestly label simulated output');
});

(async () => {
  for (const { name, fn } of tests) {
    try { await fn(); console.log(`  ✅  ${name}`); passed++; }
    catch (e) { console.error(`  ❌  ${name}\n      ${e.message}`); failed++; }
  }
  console.log(`\nPQC Trust Path: ${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
})();
