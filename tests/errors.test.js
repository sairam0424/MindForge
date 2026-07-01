/**
 * MindForge — Error class tests (bin/utils/errors.js)
 * Run: node tests/errors.test.js
 */
'use strict';

const assert = require('assert');
const {
  MindForgeError,
  ConfigError,
  GovernanceError,
  SecurityError,
  ValidationError,
} = require('../bin/utils/errors');

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

// ── MindForgeError ────────────────────────────────────────────────────────────

test('MindForgeError is an instance of Error', () => {
  const err = new MindForgeError('boom', 'TEST_CODE');
  assert.ok(err instanceof Error);
  assert.ok(err instanceof MindForgeError);
});

test('MindForgeError sets message, code, and name', () => {
  const err = new MindForgeError('something broke', 'SOME_CODE');
  assert.strictEqual(err.message, 'something broke');
  assert.strictEqual(err.code, 'SOME_CODE');
  assert.strictEqual(err.name, 'MindForgeError');
});

test('MindForgeError defaults context to empty object when omitted', () => {
  const err = new MindForgeError('msg', 'CODE');
  assert.deepStrictEqual(err.context, {});
});

test('MindForgeError stores provided context object', () => {
  const ctx = { file: 'foo.js', line: 42 };
  const err = new MindForgeError('msg', 'CODE', ctx);
  assert.deepStrictEqual(err.context, ctx);
});

test('MindForgeError has a stack trace', () => {
  const err = new MindForgeError('trace test', 'CODE');
  assert.ok(typeof err.stack === 'string' && err.stack.length > 0);
});

// ── ConfigError ───────────────────────────────────────────────────────────────

test('ConfigError is an instance of MindForgeError and Error', () => {
  const err = new ConfigError('bad config');
  assert.ok(err instanceof Error);
  assert.ok(err instanceof MindForgeError);
  assert.ok(err instanceof ConfigError);
});

test('ConfigError has correct name and code', () => {
  const err = new ConfigError('missing key');
  assert.strictEqual(err.name, 'ConfigError');
  assert.strictEqual(err.code, 'CONFIG_ERROR');
  assert.strictEqual(err.message, 'missing key');
});

test('ConfigError forwards context', () => {
  const ctx = { key: 'model' };
  const err = new ConfigError('invalid value', ctx);
  assert.deepStrictEqual(err.context, ctx);
});

test('ConfigError context is empty object when omitted', () => {
  const err = new ConfigError('no ctx');
  assert.deepStrictEqual(err.context, {});
});

// ── GovernanceError ───────────────────────────────────────────────────────────

test('GovernanceError is an instance of MindForgeError and Error', () => {
  const err = new GovernanceError('policy violation');
  assert.ok(err instanceof Error);
  assert.ok(err instanceof MindForgeError);
  assert.ok(err instanceof GovernanceError);
});

test('GovernanceError has correct name and code', () => {
  const err = new GovernanceError('tier 3 denied');
  assert.strictEqual(err.name, 'GovernanceError');
  assert.strictEqual(err.code, 'GOVERNANCE_ERROR');
  assert.strictEqual(err.message, 'tier 3 denied');
});

test('GovernanceError forwards context', () => {
  const ctx = { tier: 3, action: 'deploy' };
  const err = new GovernanceError('blocked', ctx);
  assert.deepStrictEqual(err.context, ctx);
});

// ── SecurityError ─────────────────────────────────────────────────────────────

test('SecurityError is an instance of MindForgeError and Error', () => {
  const err = new SecurityError('trust boundary crossed');
  assert.ok(err instanceof Error);
  assert.ok(err instanceof MindForgeError);
  assert.ok(err instanceof SecurityError);
});

test('SecurityError has correct name and code', () => {
  const err = new SecurityError('injection detected');
  assert.strictEqual(err.name, 'SecurityError');
  assert.strictEqual(err.code, 'SECURITY_ERROR');
  assert.strictEqual(err.message, 'injection detected');
});

test('SecurityError forwards context', () => {
  const ctx = { input: '<script>', field: 'prompt' };
  const err = new SecurityError('xss attempt', ctx);
  assert.deepStrictEqual(err.context, ctx);
});

// ── ValidationError ───────────────────────────────────────────────────────────

test('ValidationError is an instance of MindForgeError and Error', () => {
  const err = new ValidationError('invalid input');
  assert.ok(err instanceof Error);
  assert.ok(err instanceof MindForgeError);
  assert.ok(err instanceof ValidationError);
});

test('ValidationError has correct name and code', () => {
  const err = new ValidationError('missing fields');
  assert.strictEqual(err.name, 'ValidationError');
  assert.strictEqual(err.code, 'VALIDATION_ERROR');
  assert.strictEqual(err.message, 'missing fields');
});

test('ValidationError stores fields array in context', () => {
  const err = new ValidationError('bad input', ['name', 'email']);
  assert.deepStrictEqual(err.context, { fields: ['name', 'email'] });
});

test('ValidationError defaults fields to empty array when omitted', () => {
  const err = new ValidationError('something wrong');
  assert.deepStrictEqual(err.context, { fields: [] });
});

test('ValidationError fields is accessible via context.fields', () => {
  const fields = ['age', 'phone'];
  const err = new ValidationError('invalid', fields);
  assert.strictEqual(err.context.fields, fields);
});

// ── Cross-class instanceof checks ─────────────────────────────────────────────

test('ConfigError is not an instance of GovernanceError', () => {
  const err = new ConfigError('x');
  assert.ok(!(err instanceof GovernanceError));
});

test('SecurityError is not an instance of ConfigError', () => {
  const err = new SecurityError('x');
  assert.ok(!(err instanceof ConfigError));
});

test('ValidationError is not an instance of SecurityError', () => {
  const err = new ValidationError('x');
  assert.ok(!(err instanceof SecurityError));
});

test('all error subclasses are throwable and catchable as Error', () => {
  const classes = [MindForgeError, ConfigError, GovernanceError, SecurityError, ValidationError];
  for (const Cls of classes) {
    let caught = null;
    try { throw new Cls('test throw'); } catch (e) { caught = e; }
    assert.ok(caught instanceof Error, `${Cls.name} must be catchable as Error`);
    assert.strictEqual(caught.message, 'test throw');
  }
});

// ── Results ───────────────────────────────────────────────────────────────────
console.log(`\n${'─'.repeat(50)}`);
console.log(`Results: ${passed} passed, ${failed} failed`);

if (failed > 0) {
  console.error(`\n❌ ${failed} test(s) failed.\n`);
  process.exit(1);
} else {
  console.log('\n✅ All errors tests passed.\n');
}
