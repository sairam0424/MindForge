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

// THE DEFECT this replaces: cloud-broker.js's mapToProviderModel() and bedrock-provider.js's
// BEDROCK_MODEL_MAP return real Bedrock-style Anthropic model ids for the 'aws' provider (three
// distinct shapes across those two files), but market_registry only has plain ids -- so every
// Bedrock-style id used to miss the exact-match lookup and silently fall to the generic
// FALLBACK_RATES (off by ~25x for Haiku: $5.0 fallback vs. its real $0.2 input rate). Each pair
// below asserts a Bedrock-style id resolves to the SAME rate as its plain-id counterpart, and
// explicitly that neither equals FALLBACK_RATES.input, so a fix that coincidentally matches by
// accident (or a future regression) is caught.
test('getPrice resolves Bedrock-style Anthropic ids to the same rate as their plain-id counterpart', () => {
  const { getPrice } = require('../bin/models/pricing-registry');
  const FALLBACK_INPUT = 5.0;
  const cases = [
    // cloud-broker.js's mapToProviderModel() shape
    ['claude-sonnet-4-6', 'anthropic.claude-sonnet-4-6-v1:0'],
    ['claude-haiku-4-5', 'anthropic.claude-haiku-4-5-v1:0'],
    // bedrock-provider.js's BEDROCK_MODEL_MAP shape (the live-path caller)
    ['claude-sonnet-4-6', 'us.anthropic.claude-sonnet-4-6'],
    ['claude-haiku-4-5', 'us.anthropic.claude-haiku-4-5-20251001-v1:0'],
  ];
  for (const [plainId, bedrockId] of cases) {
    const plainRate = getPrice(plainId, 'input');
    const bedrockRate = getPrice(bedrockId, 'input');
    assert.strictEqual(bedrockRate, plainRate,
      `getPrice('${bedrockId}', 'input') must equal getPrice('${plainId}', 'input'), got ${bedrockRate} vs ${plainRate}`);
    assert.notStrictEqual(bedrockRate, FALLBACK_INPUT,
      `getPrice('${bedrockId}', 'input') must not equal the generic fallback (${FALLBACK_INPUT}) -- `
      + 'that would mean the id was never actually recognized and matched the fallback by coincidence');
  }
});

test('getPrice does not alias claude-opus-4-8 to claude-opus-4-7 -- an unpriced model must still fall back', () => {
  // bedrock-provider.js's BEDROCK_MODEL_MAP resolves BOTH 'claude-opus-4-7' and 'claude-opus-4-8'
  // requests to the same Bedrock id (us.anthropic.claude-opus-4-8), but market_registry has no
  // entry for opus-4-8 at any id shape. The normalization must not paper over that gap by
  // accidentally matching a DIFFERENT model's rate -- honest fallback is correct here.
  const { getPrice } = require('../bin/models/pricing-registry');
  const rate = getPrice('us.anthropic.claude-opus-4-8', 'input');
  assert.strictEqual(rate, 5.0, 'an unpriced Bedrock model must hit the generic fallback, not opus-4-7\'s real rate');
});

test('getPrice leaves non-Anthropic model ids completely unaffected by Bedrock normalization', () => {
  const { getPrice } = require('../bin/models/pricing-registry');
  const before = getPrice('gemini-2.5-pro', 'input');
  assert.ok(before > 0 && before !== 5.0, 'sanity: gemini-2.5-pro must resolve to a real, non-fallback rate');
});

(async () => {
  for (const { name, fn } of tests) {
    try { await fn(); console.log(`  ✅  ${name}`); passed++; }
    catch (e) { console.error(`  ❌  ${name}\n      ${e.message}`); failed++; }
  }
  console.log(`\nPricing Registry: ${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
})();
