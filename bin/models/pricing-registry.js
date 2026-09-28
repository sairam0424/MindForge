/**
 * MindForge v2 — Pricing Registry (UC-05)
 *
 * Single source of truth for all model pricing. Loads from
 * .mindforge/config.json `revops.market_registry` and normalizes
 * to per-1M-token units. All providers and cost-tracker MUST
 * query this module instead of hardcoding rates.
 *
 * Buckets: input, output, cache_read, cache_creation
 */
'use strict';

const fs = require('fs');
const path = require('path');

const CONFIG_PATH = path.join(__dirname, '..', '..', '.mindforge', 'config.json');

// Fallback per-1M rates when model is unknown (generous estimate to avoid under-billing)
const FALLBACK_RATES = {
  input: 5.0,
  output: 15.0,
  cache_read: 0.5,
  cache_creation: 6.25,
};

let _priceTable = null;

/**
 * Load and normalize the market_registry from config.json.
 * Config values are in per-1K-token units. We multiply by 1000 to get per-1M.
 * Cache buckets: cache_read = 10% of input, cache_creation = 125% of input
 * (unless explicitly provided in config).
 */
function loadPriceTable() {
  const raw = fs.readFileSync(CONFIG_PATH, 'utf8');
  const config = JSON.parse(raw);
  const registry = config.revops && config.revops.market_registry;

  if (!registry || typeof registry !== 'object') {
    process.stderr.write('[pricing-registry] WARN: market_registry missing from config.json, using fallbacks\n');
    return {};
  }

  const table = {};
  for (const [modelId, entry] of Object.entries(registry)) {
    const inputPer1M = (entry.cost_input || 0) * 1000;
    const outputPer1M = (entry.cost_output || 0) * 1000;

    // Cache bucket derivation: use explicit config fields if present,
    // otherwise derive from Anthropic-standard ratios
    const cacheReadPer1M = entry.cost_cache_read != null
      ? entry.cost_cache_read * 1000
      : inputPer1M * 0.1;
    const cacheCreationPer1M = entry.cost_cache_creation != null
      ? entry.cost_cache_creation * 1000
      : inputPer1M * 1.25;

    table[modelId] = {
      input: inputPer1M,
      output: outputPer1M,
      cache_read: cacheReadPer1M,
      cache_creation: cacheCreationPer1M,
    };
  }
  return table;
}

function ensureLoaded() {
  if (_priceTable === null) {
    _priceTable = loadPriceTable();
  }
  return _priceTable;
}

// THE DEFECT this replaces: cloud-broker.js's mapToProviderModel() and bedrock-provider.js's
// BEDROCK_MODEL_MAP both return real, in-use Bedrock-style model ids for the 'aws' provider
// (e.g. 'anthropic.claude-sonnet-4-6-v1:0', 'us.anthropic.claude-haiku-4-5-20251001-v1:0') --
// three different shapes across those two files alone -- but market_registry only has plain ids
// ('claude-sonnet-4-6'). getPrice() used to do an exact-match lookup only, so every Bedrock-style
// id missed and silently fell to the generic FALLBACK_RATES (off by ~25x for Haiku). Both
// mapToProviderModel() and BEDROCK_MODEL_MAP must keep returning genuine Bedrock ids -- that's
// what a real AWS Bedrock Converse API call requires -- so the normalization belongs here, the
// one chokepoint every pricing caller already goes through, rather than duplicated in each
// provider file.
/**
 * Reduce a Bedrock-style Anthropic model id down to the plain id market_registry uses, by
 * stripping (in order) a cross-region inference-profile prefix, the vendor prefix, an embedded
 * date stamp, and a trailing on-demand version suffix. Non-Bedrock ids (plain ids, gpt-4o,
 * gemini-*, etc.) pass through unchanged.
 * @param {string} modelId
 * @returns {string}
 */
function normalizeBedrockModelId(modelId) {
  if (!/anthropic\.claude/.test(modelId)) return modelId;
  return modelId
    .replace(/^(us|eu|apac)\./, '')
    .replace(/^anthropic\./, '')
    .replace(/-\d{8}/, '')
    .replace(/-v\d+:\d+$/, '');
}

/**
 * Get the per-1M-token price for a model+bucket.
 * @param {string} modelId - e.g. 'claude-sonnet-4-6', or a Bedrock-style id like
 *   'anthropic.claude-sonnet-4-6-v1:0' or 'us.anthropic.claude-haiku-4-5-20251001-v1:0'
 * @param {'input'|'output'|'cache_read'|'cache_creation'} bucket
 * @returns {number} USD per 1M tokens
 */
function getPrice(modelId, bucket) {
  const table = ensureLoaded();
  const lookupId = table[modelId] ? modelId : normalizeBedrockModelId(modelId);
  const entry = table[lookupId];
  if (!entry) {
    process.stderr.write(`[pricing-registry] WARN: unknown model "${modelId}", using fallback rates\n`);
    return FALLBACK_RATES[bucket] || FALLBACK_RATES.input;
  }
  return entry[bucket] != null ? entry[bucket] : (FALLBACK_RATES[bucket] || 0);
}

/**
 * Calculate total cost for a single API call.
 * @param {string} modelId
 * @param {object} usage
 * @param {number} usage.input_tokens
 * @param {number} usage.output_tokens
 * @param {number} [usage.cache_read_input_tokens=0]
 * @param {number} [usage.cache_creation_input_tokens=0]
 * @returns {number} Total USD cost
 */
function priceCall(modelId, usage) {
  const inputTokens = usage.input_tokens || 0;
  const outputTokens = usage.output_tokens || 0;
  const cacheReadTokens = usage.cache_read_input_tokens || 0;
  const cacheCreationTokens = usage.cache_creation_input_tokens || 0;

  const inputRate = getPrice(modelId, 'input');
  const outputRate = getPrice(modelId, 'output');
  const cacheReadRate = getPrice(modelId, 'cache_read');
  const cacheCreationRate = getPrice(modelId, 'cache_creation');

  const cost =
    (inputTokens / 1_000_000) * inputRate +
    (outputTokens / 1_000_000) * outputRate +
    (cacheReadTokens / 1_000_000) * cacheReadRate +
    (cacheCreationTokens / 1_000_000) * cacheCreationRate;

  return cost;
}

/**
 * Clear the cached price table (for testing or config reload).
 */
function clearCache() {
  _priceTable = null;
}

module.exports = { getPrice, priceCall, clearCache };
// Exported so tests can reference the real constant/helper directly instead of duplicating a
// hardcoded copy that would silently drift from this file's own values.
module.exports.FALLBACK_RATES = FALLBACK_RATES;
module.exports.normalizeBedrockModelId = normalizeBedrockModelId;
