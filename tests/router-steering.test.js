'use strict';

/**
 * MindForge AgRevOps — router-steering shadow_mode latch tests (Wave 6).
 *
 * Regression anchor: router-steering-v2.js never read cost_routing.shadow_mode.
 * The config carried the latch (default true), but steer() always returned a
 * selection with no shadow/authoritative marking — so a documented "observe-only"
 * mode was silently non-functional and arbitrage steering looked live regardless.
 * Fix: steer() reads the latch and marks the selection shadow/authoritative.
 *
 * We flip the latch by mutating the in-memory config object (configManager
 * getAll() returns the live reference) and RESTORE it in finally — we never call
 * set(), which would persist to the real .mindforge/config.json on disk.
 */

const assert = require('node:assert');
const { test } = require('node:test');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const router = require(path.join(ROOT, 'bin', 'revops', 'router-steering-v2'));
const configManager = require(path.join(ROOT, 'bin', 'governance', 'config-manager'));

// Run `fn` with cost_routing.shadow_mode forced to `value`, restoring the prior
// in-memory value afterwards (no disk write).
async function withShadowMode(value, fn) {
  const cfg = configManager.getAll();
  cfg.cost_routing = cfg.cost_routing || {};
  const prev = cfg.cost_routing.shadow_mode;
  cfg.cost_routing.shadow_mode = value;
  try { return await fn(); }
  finally { cfg.cost_routing.shadow_mode = prev; }
}

test('shadow_mode=true -> selection is observe-only (shadow:true, authoritative:false)', async () => {
  await withShadowMode(true, async () => {
    const sel = await router.steer('span-shadow', 'implement a refactor');
    assert.strictEqual(sel.shadow, true, 'shadow flag must be set under shadow_mode');
    assert.strictEqual(sel.authoritative, false, 'a shadow selection must NOT be authoritative');
    assert.ok(sel.selected_model, 'a recommendation is still computed for observation');
  });
});

test('shadow_mode=false -> selection is authoritative (live steering)', async () => {
  await withShadowMode(false, async () => {
    const sel = await router.steer('span-live', 'implement a refactor');
    assert.strictEqual(sel.shadow, false);
    assert.strictEqual(sel.authoritative, true, 'live mode must produce an authoritative selection');
  });
});

test('defaults to shadow (fail-safe) when the latch is absent from config', async () => {
  const cfg = configManager.getAll();
  const prevCostRouting = cfg.cost_routing;
  // Remove the whole cost_routing block so the get() default path is exercised.
  delete cfg.cost_routing;
  try {
    const sel = await router.steer('span-default', 'optimize logic');
    assert.strictEqual(sel.shadow, true, 'missing latch must default to shadow (observe-only), not live');
    assert.strictEqual(sel.authoritative, false);
  } finally { cfg.cost_routing = prevCostRouting; }
});

console.log('router-steering shadow_mode tests defined');
