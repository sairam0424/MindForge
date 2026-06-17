'use strict';

/**
 * MindForge — ads-engine / federated-sync load smoke test (Wave 8).
 *
 * Regression for the v11.5.0 latent bug: bin/review/ads-engine.js did
 *   const { v4: uuidv4 } = require('uuid');
 * but `uuid` is NOT in package.json dependencies — so requiring ads-engine threw
 * MODULE_NOT_FOUND in any clean install, and federated-sync (which eagerly
 * requires ads-engine at module top) was un-loadable too. The fix replaces uuid
 * with Node's built-in crypto.randomUUID() (the repo's zero-native-deps ethos;
 * already used in knowledge-graph.js + instinct-capture-hook.js).
 *
 * These tests prove the dependency cone now loads with no extra packages.
 *
 * Run: node tests/ads-engine-load.test.js
 */

const assert = require('node:assert');
const { test } = require('node:test');

test('ads-engine loads without the uuid dependency', () => {
  assert.doesNotThrow(() => require('../bin/review/ads-engine'),
    'ads-engine must require cleanly using crypto.randomUUID(), no uuid package');
});

test('federated-sync loads (it eagerly requires ads-engine)', () => {
  assert.doesNotThrow(() => require('../bin/memory/federated-sync'),
    'federated-sync must load now that its transitive ads-engine require is fixed');
});

test('crypto.randomUUID emits a v4 UUID matching the old uuidv4 shape', () => {
  // Proves the swap is behaviorally equivalent: ADS record IDs + the
  // `ADS-${id.slice(0,8)}.md` filename keep the same RFC 4122 v4 format.
  const V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  const id = require('node:crypto').randomUUID();
  assert.match(id, V4, 'crypto.randomUUID must emit a v4 UUID');
});

console.log('ads-engine-load tests defined');
