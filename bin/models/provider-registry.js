/**
 * MindForge — Provider Registry / Resolver seam.
 *
 * Adapted from ECC (src/llm/providers/resolver.py) as a pure internal seam.
 * model-client.js consults resolveProvider(modelId) BEFORE its prefix-matching
 * fallback, so providers are pluggable (e.g. add a custom OpenAI-compatible
 * endpoint, or force a sovereign local provider) without editing _getProvider.
 *
 * Sovereignty / cost-capping / offline-test override:
 *   MINDFORGE_LLM_PROVIDER=ollama  forces every resolve to the named provider.
 *
 * Does NOT adopt ECC's .llm.env file convention — that would violate MindForge's
 * single-source-of-truth (MINDFORGE.md carries *_MODEL, .mindforge/config.json
 * carries cost_routing). Registration is in-process only.
 */
'use strict';

// name -> factory(modelId) => provider instance (or null if unavailable)
const _registry = new Map();

/**
 * Register a provider factory under a name. The factory receives the modelId and
 * returns a provider instance or null (e.g. when its API key/base URL is unset).
 */
function registerProvider(name, factory) {
  if (typeof name !== 'string' || !name) throw new Error('provider name must be a non-empty string');
  if (typeof factory !== 'function') throw new Error('provider factory must be a function');
  _registry.set(name.toLowerCase(), factory);
}

function hasProvider(name) {
  return _registry.has(String(name || '').toLowerCase());
}

/**
 * Resolve a provider for a modelId. Honors the MINDFORGE_LLM_PROVIDER override
 * first (sovereignty/offline), then any explicitly registered factory. Returns
 * null if nothing matches — the caller's built-in prefix fallback then runs.
 */
function resolveProvider(modelId) {
  const override = String(process.env.MINDFORGE_LLM_PROVIDER || '').trim().toLowerCase();
  if (override && _registry.has(override)) {
    return _registry.get(override)(modelId);
  }
  // No name-based match here by default; model-client owns the prefix routing.
  // Registered factories are consulted by explicit name only (via the override
  // or a caller that knows the provider name). This keeps the seam additive.
  return null;
}

function listProviders() {
  return [..._registry.keys()];
}

function _reset() {
  _registry.clear();
}

module.exports = { registerProvider, resolveProvider, hasProvider, listProviders, _reset };
