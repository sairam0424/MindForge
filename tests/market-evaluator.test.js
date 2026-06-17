'use strict';

/**
 * Tests for the AgRevOps market evaluator's premium-provider fallback and the
 * cost_routing ↔ market_registry referential integrity.
 *
 * Guards a verified fail-open bug: getPremiumProvider() used to hardcode
 * 'claude-3-5-sonnet', which is ABSENT from the registry — so it returned a
 * model with NO cost fields, silently zeroing cost accumulation and disabling
 * the AgRevOps session_hard_limit_usd escalation. The fix resolves a model that
 * actually exists (config premium_fallback_model → highest-benchmark entry) and
 * fails CLOSED on an empty registry.
 */

const assert = require('node:assert');
const { test } = require('node:test');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
// The module exports a singleton instance (not the class).
const ev = require(path.join(ROOT, 'bin', 'revops', 'market-evaluator'));
const config = require(path.join(ROOT, '.mindforge', 'config.json'));

test('getPremiumProvider resolves a model that EXISTS in the registry (with cost fields)', () => {
  const premium = ev.getPremiumProvider();
  assert.ok(premium && premium.model_id, 'must return a model_id');
  // The returned model must be a real registry entry carrying real cost data.
  const registry = config.revops.market_registry;
  assert.ok(registry[premium.model_id], `premium model ${premium.model_id} must exist in market_registry`);
  assert.strictEqual(typeof premium.cost_input, 'number', 'premium provider must carry numeric cost_input');
  assert.strictEqual(typeof premium.cost_output, 'number', 'premium provider must carry numeric cost_output');
  assert.notStrictEqual(premium.model_id, 'claude-3-5-sonnet', 'must not return the phantom claude-3-5-sonnet');
});

test('getPremiumProvider prefers the configured premium_fallback_model', () => {
  const preferred = config.revops.premium_fallback_model;
  if (preferred && config.revops.market_registry[preferred]) {
    assert.strictEqual(ev.getPremiumProvider().model_id, preferred);
  }
});

test('getPremiumProvider FAILS CLOSED on an empty registry (never a costless phantom)', () => {
  const saved = ev.marketRegistry;
  try {
    ev.marketRegistry = {}; // simulate a drifted/empty registry
    assert.throws(() => ev.getPremiumProvider(), /no models in revops\.market_registry/);
  } finally {
    ev.marketRegistry = saved; // restore so later tests/imports are unaffected
  }
});

test('referential integrity: every cost_routing.model_tiers value exists in market_registry', () => {
  const registry = config.revops.market_registry;
  const tiers = config.cost_routing && config.cost_routing.model_tiers;
  assert.ok(tiers && typeof tiers === 'object', 'cost_routing.model_tiers must exist');
  const orphans = Object.entries(tiers)
    .filter(([, modelId]) => !registry[modelId])
    .map(([tier, modelId]) => `${tier} -> ${modelId}`);
  assert.deepStrictEqual(
    orphans, [],
    `every model_tiers value must be a market_registry key (orphans silently zero cost): ${orphans.join(', ')}`
  );
});

test('referential integrity: default + premium fallback models exist in registry', () => {
  const registry = config.revops.market_registry;
  for (const key of ['default_baseline_model', 'premium_fallback_model']) {
    const modelId = config.revops[key];
    if (modelId) {
      assert.ok(registry[modelId], `revops.${key} (${modelId}) must exist in market_registry`);
    }
  }
});
