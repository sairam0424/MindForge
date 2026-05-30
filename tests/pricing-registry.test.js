'use strict';
const assert = require('assert');
let passed = 0, failed = 0; const tests = [];
function test(name, fn) { tests.push({ name, fn }); }

test('getPrice returns per-1M-token price for a known model+bucket', () => {
  const { getPrice } = require('../bin/models/pricing-registry');
  const input = getPrice('claude-sonnet-4-6', 'input');
  assert.strictEqual(typeof input, 'number');
  assert.ok(input > 0, 'price must be positive');
});

test('priceCall computes total USD from usage (input + output)', () => {
  const { priceCall } = require('../bin/models/pricing-registry');
  const cost = priceCall('claude-sonnet-4-6', { input_tokens: 1000000, output_tokens: 0 });
  const inputPrice = require('../bin/models/pricing-registry').getPrice('claude-sonnet-4-6', 'input');
  assert.strictEqual(cost, inputPrice, '1M input tokens should cost exactly the per-1M rate');
});

test('priceCall accounts for cache_read (cheaper than input) and cache_creation', () => {
  const { priceCall } = require('../bin/models/pricing-registry');
  const withCache = priceCall('claude-sonnet-4-6', {
    input_tokens: 100, output_tokens: 50,
    cache_read_input_tokens: 900, cache_creation_input_tokens: 100
  });
  const withoutCache = priceCall('claude-sonnet-4-6', {
    input_tokens: 1100, output_tokens: 50
  });
  assert.ok(withCache < withoutCache, 'cache reads must be cheaper than full input');
});

test('unknown model returns a fallback price with warning (not throws)', () => {
  const { priceCall } = require('../bin/models/pricing-registry');
  const cost = priceCall('unknown-model-xyz', { input_tokens: 1000, output_tokens: 500 });
  assert.ok(cost >= 0, 'must return a number, not throw');
});

(async () => {
  for (const { name, fn } of tests) {
    try { await fn(); console.log(`  ✅  ${name}`); passed++; }
    catch (e) { console.error(`  ❌  ${name}\n      ${e.message}`); failed++; }
  }
  console.log(`\nPricing Registry: ${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
})();
