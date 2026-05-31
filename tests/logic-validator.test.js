/**
 * MindForge — Logic Validator Integrity Tests (UC-22)
 * Run: node tests/logic-validator.test.js
 *
 * Audit finding #17 — false advertising: the class advertised an Ollama-backed
 * semantic model but `isModelAvailable` was hardcoded false, so the model path
 * was dead code and 100% of calls fell through to the heuristic.
 *
 * These tests pin the corrected behaviour:
 *   - A real reachability PROBE is attempted against the configured endpoint
 *     (not a hardcoded boolean).
 *   - When the model is unreachable (the default in CI), validate() returns the
 *     honest heuristic result — method 'Self-Reflective-Heuristic', NOT a
 *     fabricated 'Ollama/Llama-3-8B' / confidence 0.98.
 *   - The probe fails fast (no hang) and never throws.
 */
'use strict';

const assert = require('assert');
const net = require('node:net');

let passed = 0;
let failed = 0;
const tests = [];

function test(name, fn) {
  tests.push({ name, fn });
}

/**
 * Pick a port that is guaranteed to be closed: open an ephemeral listener,
 * read its port, then close it. Nothing is listening on that port afterwards,
 * so a connect attempt fails fast (ECONNREFUSED).
 */
function getClosedPort() {
  return new Promise((resolve, reject) => {
    const srv = net.createServer();
    srv.on('error', reject);
    srv.listen(0, '127.0.0.1', () => {
      const { port } = srv.address();
      srv.close(() => resolve(port));
    });
  });
}

function freshValidator(endpoint) {
  // Bust the singleton cache so each test gets a clean instance.
  delete require.cache[require.resolve('../bin/engine/logic-validator')];
  const validator = require('../bin/engine/logic-validator');
  if (endpoint !== undefined) {
    validator.endpoint = endpoint;
    // Reset any cached probe state so the override is honoured on next validate().
    if (typeof validator.resetProbe === 'function') {
      validator.resetProbe();
    } else {
      validator._probed = false;
      validator.isModelAvailable = false;
    }
  }
  return validator;
}

// ── Heuristic correctness (model down) ────────────────────────────────────────

test('model unavailable → heuristic method, not Ollama', async () => {
  const port = await getClosedPort();
  const v = freshValidator(`127.0.0.1:${port}`);
  const res = await v.validate('A perfectly clean and grounded plan.');

  assert.strictEqual(res.method, 'Self-Reflective-Heuristic',
    `expected heuristic method when model is down, got '${res.method}'`);
  assert.notStrictEqual(res.method, 'Ollama/Llama-3-8B',
    'must not advertise Ollama when nothing is listening');
});

test('self-doubt-laden thought scores lower than a clean one', async () => {
  const port = await getClosedPort();
  const v = freshValidator(`127.0.0.1:${port}`);

  const clean = await v.validate('Proceed with the agreed implementation plan.');
  const doubtful = await v.validate(
    'I am not sure, maybe I should wait, actually, I forgot the goal.'
  );

  assert.ok(
    doubtful.confidence < clean.confidence,
    `doubtful (${doubtful.confidence}) should score below clean (${clean.confidence})`
  );
  assert.strictEqual(clean.is_valid, true, 'clean thought should be valid');
  assert.strictEqual(doubtful.is_valid, false, 'heavily self-doubting thought should be invalid');
});

// ── Probe is real, not hardcoded ──────────────────────────────────────────────

test('confidence is never the fabricated 0.98 when model is down', async () => {
  const port = await getClosedPort();
  const v = freshValidator(`127.0.0.1:${port}`);
  const res = await v.validate('A perfectly clean and grounded plan.');
  assert.notStrictEqual(res.confidence, 0.98,
    'a fabricated fixed 0.98 must not be returned when the model is unreachable');
});

test('a real reachability probe is attempted (not a hardcoded boolean)', async () => {
  const port = await getClosedPort();
  const v = freshValidator(`127.0.0.1:${port}`);

  // The corrected implementation must expose a real probe that returns its
  // actual reachability result. Against a closed port it must resolve false
  // (probe attempted + failed), never throw, never hang.
  assert.strictEqual(typeof v.probeModel, 'function',
    'validator must expose a real probeModel() reachability check');

  const reachable = await v.probeModel();
  assert.strictEqual(reachable, false,
    'probe against a closed port must report unreachable');
  assert.strictEqual(v.isModelAvailable, false,
    'isModelAvailable must reflect the actual probe result');
});

test('probe fails fast and validate() does not hang (<1s) on unreachable endpoint', async () => {
  const port = await getClosedPort();
  const v = freshValidator(`127.0.0.1:${port}`);

  const start = Date.now();
  const res = await v.validate('Check timing on an unreachable endpoint.');
  const elapsed = Date.now() - start;

  assert.ok(elapsed < 1000, `validate() must complete fast-fail (<1s), took ${elapsed}ms`);
  assert.strictEqual(res.method, 'Self-Reflective-Heuristic',
    'fast-fail path must use the heuristic');
});

// ── Return shape stability (callers depend on these) ──────────────────────────

test('return shape stays stable: {is_valid, confidence, critique, method}', async () => {
  const port = await getClosedPort();
  const v = freshValidator(`127.0.0.1:${port}`);
  const res = await v.validate('Stable shape check.');
  for (const key of ['is_valid', 'confidence', 'critique', 'method']) {
    assert.ok(Object.prototype.hasOwnProperty.call(res, key),
      `return object must include '${key}'`);
  }
  assert.strictEqual(typeof res.is_valid, 'boolean', 'is_valid must be boolean');
  assert.strictEqual(typeof res.confidence, 'number', 'confidence must be number');
});

// ── Runner ────────────────────────────────────────────────────────────────────

(async () => {
  console.log('\nLogic Validator Integrity Tests (UC-22)\n');
  for (const { name, fn } of tests) {
    try {
      await fn();
      console.log(`  ✅  ${name}`);
      passed++;
    } catch (e) {
      console.error(`  ❌  ${name}\n      ${e.message}`);
      failed++;
    }
  }
  console.log(`\nLogic Validator: ${passed} passed, ${failed} failed\n`);
  if (failed > 0) process.exit(1);
})();
