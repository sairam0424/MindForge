'use strict';
/**
 * UC-22 — Mesh Self-Healer Honest Contract (audit finding #16)
 *
 * The MeshSelfHealer (Pillar XII) is live-wired into auto-runner.js. Previously
 * it FABRICATED a multi-agent consensus: hardcoded fake peers, a canned
 * confidence:94, and a "100% agreement" log — none of it backed by a real peer
 * mesh at runtime. This test pins the HONEST contract: when no live peer mesh is
 * available, homeIn() must emit a clearly-labelled DEGRADED advisory with NO
 * fabricated high confidence and NO consensus claim, while remaining
 * backward-compatible with the caller (a truthy object on qualifying drift).
 */
const assert = require('node:assert');
const meshSelfHealer = require('../bin/autonomous/mesh-self-healer');

let passed = 0, failed = 0;
const tests = [];
function test(name, fn) { tests.push({ name, fn }); }

test('homeIn returns null below the drift threshold (unchanged gate)', async () => {
  const result = await meshSelfHealer.homeIn('did:mindforge:calm-agent', 50);
  assert.strictEqual(result, null, 'must not home in on minor drift (<80)');
});

test('homeIn on critical drift with NO live peers returns an honest degraded advisory', async () => {
  // No agents are registered for this session, so there is no live peer mesh.
  const result = await meshSelfHealer.homeIn('did:mindforge:drifting-agent', 90);

  assert.ok(result, 'must return a truthy object on qualifying drift (caller checks truthiness)');

  // KEY: explicit degraded / mesh-availability flag.
  assert.strictEqual(result.degraded, true, 'degraded flag must be true when no live peers exist');
  assert.strictEqual(result.mesh_available, false, 'mesh_available must be false with no live peers');
});

test('homeIn does NOT fabricate a high confidence (no canned 94)', async () => {
  const result = await meshSelfHealer.homeIn('did:mindforge:drifting-agent', 90);

  // Honest value: null (preferred) or 0 — but NEVER the fabricated 94.
  assert.notStrictEqual(result.confidence, 94, 'must not emit the fabricated confidence:94');
  assert.ok(
    result.confidence === null || result.confidence === 0,
    `confidence must be honest (null or 0) in degraded mode, got: ${result.confidence}`
  );
});

test('homeIn does NOT claim consensus when there is no real multi-agent agreement', async () => {
  const result = await meshSelfHealer.homeIn('did:mindforge:drifting-agent', 90);

  assert.strictEqual(result.consensus, null, 'consensus must be null in degraded single-source mode');

  // No "100% agreement" claim may leak into any string field.
  const serialized = JSON.stringify(result).toLowerCase();
  assert.ok(!serialized.includes('100% agreement'), 'must not claim "100% agreement"');
  assert.ok(!serialized.includes('consensus acheived'), 'must not carry the old "acheived" typo claim');
});

test('honest advisory is explicitly labelled and provides a heuristic recommendation', async () => {
  const result = await meshSelfHealer.homeIn('did:mindforge:drifting-agent', 90);

  assert.strictEqual(result.type, 'advisory', 'type must be honest advisory, not collective_repair');
  assert.ok(typeof result.source === 'string' && /degraded/i.test(result.source),
    'source must disclose the degraded mode');
  assert.ok(typeof result.recommendation === 'string' && result.recommendation.length > 0,
    'must provide a generic heuristic steering recommendation');
});

(async () => {
  for (const { name, fn } of tests) {
    try { await fn(); console.log('  ✅  ' + name); passed++; }
    catch (e) { console.error('  ❌  ' + name + '\n      ' + e.message); failed++; }
  }
  console.log('\nMesh Self-Healer Honest Contract: ' + passed + ' passed, ' + failed + ' failed');
  if (failed > 0) process.exit(1);
})();
