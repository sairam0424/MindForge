/**
 * MindForge — Browser Daemon Auth (pure logic, no Chromium required).
 * Run: node tests/daemon-auth.test.js
 */
'use strict';

const assert = require('assert');
const crypto = require('crypto');
const {
  requiresAuth,
  isAuthValid,
  AUTH_REQUIRED_PATHS,
} = require('../bin/browser/daemon-auth');

let passed = 0,
  failed = 0;
const tests = [];
function test(name, fn) {
  tests.push({ name, fn });
}

test('requiresAuth is true for every mutating/eval endpoint', () => {
  for (const p of [
    '/navigate',
    '/click',
    '/type',
    '/screenshot',
    '/evaluate',
    '/assert',
  ]) {
    assert.strictEqual(requiresAuth(p), true, `${p} must require auth`);
  }
});

test('requiresAuth is false for the unauthenticated /status liveness probe', () => {
  assert.strictEqual(requiresAuth('/status'), false);
});

test('isAuthValid accepts a correct Bearer token', () => {
  const token = crypto.randomBytes(32).toString('hex');
  assert.strictEqual(isAuthValid(`Bearer ${token}`, token), true);
});

test('isAuthValid rejects a missing Authorization header', () => {
  const token = crypto.randomBytes(32).toString('hex');
  assert.strictEqual(isAuthValid(undefined, token), false);
});

test('isAuthValid rejects a non-Bearer scheme', () => {
  const token = crypto.randomBytes(32).toString('hex');
  assert.strictEqual(isAuthValid(`Basic ${token}`, token), false);
});

test('isAuthValid rejects a wrong-length token without throwing', () => {
  const token = crypto.randomBytes(32).toString('hex');
  assert.strictEqual(isAuthValid('Bearer short', token), false);
});

test('isAuthValid rejects a same-length but incorrect token', () => {
  const token = crypto.randomBytes(32).toString('hex');
  const wrong = crypto.randomBytes(32).toString('hex');
  assert.strictEqual(isAuthValid(`Bearer ${wrong}`, token), false);
});

test('AUTH_REQUIRED_PATHS has exactly the 6-endpoint mutating + eval surface', () => {
  assert.strictEqual(AUTH_REQUIRED_PATHS.size, 6);
});

for (const { name, fn } of tests) {
  try {
    fn();
    console.log(`  PASS  ${name}`);
    passed++;
  } catch (e) {
    console.error(`  FAIL  ${name}\n      ${e.message}`);
    failed++;
  }
}
console.log(`\nDaemon Auth: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
