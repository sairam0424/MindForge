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
// explicitly that neither equals the real FALLBACK_RATES.input, so a fix that coincidentally
// matches by accident (or a future regression) is caught. Ids are derived from the real
// CloudBroker.mapToProviderModel() and BedrockProvider.resolveBedrockModelId() rather than
// hardcoded literals, so this test can't silently drift from either mapping's own source of truth.
test('getPrice resolves Bedrock-style Anthropic ids to the same rate as their plain-id counterpart', () => {
  const { getPrice, FALLBACK_RATES } = require('../bin/models/pricing-registry');
  const CloudBroker = require('../bin/models/cloud-broker');
  const BedrockProvider = require('../bin/models/bedrock-provider');
  const cloudBroker = new CloudBroker();

  const cases = [
    // cloud-broker.js's mapToProviderModel() shape
    ['claude-sonnet-4-6', cloudBroker.mapToProviderModel('aws', 'sonnet')],
    ['claude-haiku-4-5', cloudBroker.mapToProviderModel('aws', 'haiku')],
    // bedrock-provider.js's BEDROCK_MODEL_MAP shape (the live-path caller)
    ['claude-sonnet-4-6', BedrockProvider.resolveBedrockModelId('claude-sonnet-4-6')],
    ['claude-haiku-4-5', BedrockProvider.resolveBedrockModelId('claude-haiku-4-5')],
  ];
  for (const [plainId, bedrockId] of cases) {
    const plainRate = getPrice(plainId, 'input');
    const bedrockRate = getPrice(bedrockId, 'input');
    assert.strictEqual(bedrockRate, plainRate,
      `getPrice('${bedrockId}', 'input') must equal getPrice('${plainId}', 'input'), got ${bedrockRate} vs ${plainRate}`);
    assert.notStrictEqual(bedrockRate, FALLBACK_RATES.input,
      `getPrice('${bedrockId}', 'input') must not equal the generic fallback (${FALLBACK_RATES.input}) -- `
      + 'that would mean the id was never actually recognized and matched the fallback by coincidence');
  }
});

test('getPrice does not alias claude-opus-4-8 to claude-opus-4-7 -- an unpriced model must still fall back', () => {
  // bedrock-provider.js's BEDROCK_MODEL_MAP resolves BOTH 'claude-opus-4-7' and 'claude-opus-4-8'
  // requests to the same Bedrock id, but market_registry has no entry for opus-4-8 at any id
  // shape. getPrice() must not paper over that gap by accidentally matching a DIFFERENT model's
  // rate -- honest fallback is correct here. This is exactly why bedrock-provider.js's complete()
  // now prices the ORIGINAL short id, not this collapsed one -- see bedrock-provider.test.js.
  const { getPrice, FALLBACK_RATES } = require('../bin/models/pricing-registry');
  const BedrockProvider = require('../bin/models/bedrock-provider');
  const rate = getPrice(BedrockProvider.resolveBedrockModelId('claude-opus-4-8'), 'input');
  assert.strictEqual(rate, FALLBACK_RATES.input, 'an unpriced Bedrock model must hit the generic fallback');
});

// THE DEFECT this replaces: this test used 'gemini-2.5-pro' as its "non-Anthropic" case, but that
// id is ALREADY a literal market_registry key -- getPrice()'s `table[modelId] ? modelId :
// normalizeBedrockModelId(modelId)` short-circuits BEFORE normalizeBedrockModelId ever runs for
// any id that's already a direct hit, so the old test never actually exercised the function it
// claimed to cover. Testing normalizeBedrockModelId directly (now exported) proves its pass-through
// guard regardless of what is or isn't in market_registry today.
test('normalizeBedrockModelId leaves non-Anthropic ids completely unchanged', () => {
  const { normalizeBedrockModelId } = require('../bin/models/pricing-registry');
  const untouchedIds = ['gpt-4o', 'gemini-2.5-pro', 'llama-3-70b-local', 'some-totally-unknown-model-xyz'];
  for (const id of untouchedIds) {
    assert.strictEqual(normalizeBedrockModelId(id), id, `'${id}' must pass through completely unchanged`);
  }
});

test('normalizeBedrockModelId reduces every real Bedrock-style Anthropic id shape to its plain id', () => {
  const { normalizeBedrockModelId } = require('../bin/models/pricing-registry');
  const CloudBroker = require('../bin/models/cloud-broker');
  const BedrockProvider = require('../bin/models/bedrock-provider');
  const cloudBroker = new CloudBroker();
  const cases = [
    [cloudBroker.mapToProviderModel('aws', 'sonnet'), 'claude-sonnet-4-6'],
    [cloudBroker.mapToProviderModel('aws', 'haiku'), 'claude-haiku-4-5'],
    [BedrockProvider.resolveBedrockModelId('claude-sonnet-4-6'), 'claude-sonnet-4-6'],
    [BedrockProvider.resolveBedrockModelId('claude-haiku-4-5'), 'claude-haiku-4-5'],
    [BedrockProvider.resolveBedrockModelId('claude-opus-4-8'), 'claude-opus-4-8'],
  ];
  for (const [bedrockId, expectedPlainId] of cases) {
    assert.strictEqual(normalizeBedrockModelId(bedrockId), expectedPlainId,
      `normalizeBedrockModelId('${bedrockId}') must reduce to '${expectedPlainId}'`);
  }
});

(async () => {
  for (const { name, fn } of tests) {
    try { await fn(); console.log(`  ✅  ${name}`); passed++; }
    catch (e) { console.error(`  ❌  ${name}\n      ${e.message}`); failed++; }
  }
  console.log(`\nPricing Registry: ${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
})();
