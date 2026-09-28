'use strict';
const assert = require('assert');
let passed = 0,
  failed = 0;
const tests = [];
function test(name, fn) {
  tests.push({ name, fn });
}

// THE DEFECT this replaces: BedrockProvider.complete() used to price every call by the
// ALREADY-RESOLVED Bedrock inference-profile id (bedrockModelId), not the original short model id
// it was actually asked to run. Since BEDROCK_MODEL_MAP collapses BOTH 'claude-opus-4-7' and
// 'claude-opus-4-8' to the identical Bedrock id, a genuine, correctly-priced-in-market_registry
// opus-4-7 request was silently billed at pricing-registry.js's generic fallback rate instead --
// which market_registry has no entry for the resolved id under any shape. Fixed by pricing the
// original short model id directly. This test drives the real complete() method end to end
// (mocking only the AWS network call itself, via _getClient()) and asserts the exact modelId
// priceCall() receives.

/**
 * Stub out BedrockProvider's AWS client so complete() can run for real with no network access.
 * Returns the constructed provider instance and a restore() to undo the monkey-patch.
 */
function stubBedrockClient(BedrockProvider, { inputTokens, outputTokens }) {
  const original = BedrockProvider.prototype._getClient;
  BedrockProvider.prototype._getClient = function stubbedGetClient() {
    this._AWS = {
      ConverseCommand: class ConverseCommandStub {
        constructor(req) {
          this.req = req;
        }
      },
    };
    return {
      send: async () => ({
        output: { message: { content: [{ text: 'stubbed response' }] } },
        usage: { inputTokens, outputTokens },
      }),
    };
  };
  return () => {
    BedrockProvider.prototype._getClient = original;
  };
}

test('complete() prices the ORIGINAL short model id, not the resolved Bedrock id', async () => {
  const BedrockProvider = require('../bin/models/bedrock-provider');
  const pricingRegistry = require('../bin/models/pricing-registry');
  const originalPriceCall = pricingRegistry.priceCall;
  const calls = [];
  pricingRegistry.priceCall = (modelId, usage) => {
    calls.push({ modelId, usage });
    return 424242;
  };
  const restoreClient = stubBedrockClient(BedrockProvider, {
    inputTokens: 100,
    outputTokens: 50,
  });
  try {
    const provider = new BedrockProvider({
      accessKey: 'fake',
      secretKey: 'fake',
    });
    const result = await provider.complete({
      model: 'claude-sonnet-4-6',
      userMessage: 'hi',
    });
    assert.strictEqual(
      calls.length,
      1,
      'priceCall must be invoked exactly once',
    );
    assert.strictEqual(
      calls[0].modelId,
      'claude-sonnet-4-6',
      `priceCall must receive the original short id 'claude-sonnet-4-6', not a resolved Bedrock id, got '${calls[0].modelId}'`,
    );
    assert.deepStrictEqual(calls[0].usage, {
      input_tokens: 100,
      output_tokens: 50,
    });
    assert.strictEqual(
      result.cost_usd,
      424242,
      'complete() must use whatever priceCall computes',
    );
    // The RETURNED model field intentionally still reports the resolved Bedrock id -- that's
    // "which model Bedrock actually ran", a real observability fact distinct from what to price by.
    assert.strictEqual(result.model, 'us.anthropic.claude-sonnet-4-6');
  } finally {
    pricingRegistry.priceCall = originalPriceCall;
    restoreClient();
  }
});

test('complete() prices opus-4-7 correctly even though bedrock-provider.js collapses it to the same Bedrock id as opus-4-8', () => {
  // Static proof of the exact defect scenario, without needing the AWS mock: confirm the
  // many-to-one collapse is real, then confirm pricing the ORIGINAL ids (as complete() now does)
  // gives each its own correct, distinct rate -- rather than both falling through the SAME
  // resolved id to the SAME (wrong, for opus-4-7) generic fallback.
  const BedrockProvider = require('../bin/models/bedrock-provider');
  const {
    getPrice,
    FALLBACK_RATES,
  } = require('../bin/models/pricing-registry');

  const resolvedFor47 =
    BedrockProvider.resolveBedrockModelId('claude-opus-4-7');
  const resolvedFor48 =
    BedrockProvider.resolveBedrockModelId('claude-opus-4-8');
  assert.strictEqual(
    resolvedFor47,
    resolvedFor48,
    'this test assumes the real many-to-one collapse still exists -- if BEDROCK_MODEL_MAP ever ' +
      'gives opus-4-7 and opus-4-8 distinct Bedrock ids, this specific defect class no longer applies',
  );

  const opus47Rate = getPrice('claude-opus-4-7', 'input');
  const opus48Rate = getPrice('claude-opus-4-8', 'input');
  assert.notStrictEqual(
    opus47Rate,
    FALLBACK_RATES.input,
    'claude-opus-4-7 has a real market_registry entry and must never resolve to the generic fallback',
  );
  assert.strictEqual(
    opus48Rate,
    FALLBACK_RATES.input,
    'claude-opus-4-8 has no market_registry entry at any id shape -- an honest fallback is correct here',
  );
  assert.notStrictEqual(
    opus47Rate,
    opus48Rate,
    'pricing by the ORIGINAL short id keeps opus-4-7 and opus-4-8 correctly distinct, even though ' +
      'bedrock-provider.js resolves both to the identical Bedrock id internally',
  );
});

test('complete() forwards a fabricated/unknown model id to priceCall unchanged (no silent substitution)', async () => {
  const BedrockProvider = require('../bin/models/bedrock-provider');
  const pricingRegistry = require('../bin/models/pricing-registry');
  const originalPriceCall = pricingRegistry.priceCall;
  const calls = [];
  pricingRegistry.priceCall = (modelId) => {
    calls.push(modelId);
    return 0;
  };
  const restoreClient = stubBedrockClient(BedrockProvider, {
    inputTokens: 1,
    outputTokens: 1,
  });
  try {
    const provider = new BedrockProvider({
      accessKey: 'fake',
      secretKey: 'fake',
    });
    await provider.complete({
      model: 'some-totally-unrecognized-model-id',
      userMessage: 'hi',
    });
    assert.deepStrictEqual(
      calls,
      ['some-totally-unrecognized-model-id'],
      'an id BEDROCK_MODEL_MAP does not recognize must pass through resolveBedrockModelId() ' +
        '(a no-op pass-through per its own || modelId fallback) and reach priceCall unchanged',
    );
  } finally {
    pricingRegistry.priceCall = originalPriceCall;
    restoreClient();
  }
});

(async () => {
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
  console.log(`\nBedrock Provider: ${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
})();
