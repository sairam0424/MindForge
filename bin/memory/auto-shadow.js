/**
 * MindForge v2.4.0 — Auto-Shadow Engine (RAG 2.0)
 * Proactive "ghost pattern" injection — surfaces relevant knowledge
 * before subagent execution WITHOUT manual /mindforge:remember calls.
 *
 * Design:
 * - Runs automatically before each subagent spawn (context-injector hook)
 * - Queries both the Knowledge Graph (traversal) and Embedding Engine (similarity)
 * - Formats top results into a structured context section
 * - Budget-capped at 2KB (~8000 chars) to prevent context bloat
 * - Deduplicates against Hot/Warm context already loaded
 * - Never shadows secrets, credentials, or deprecated entries
 */
'use strict';

const fs       = require('fs');
const path     = require('path');
const Store    = require('./knowledge-store');
const Graph    = require('./knowledge-graph');
const Embedder = require('./embedding-engine');
const Indexer  = require('./knowledge-indexer');
const { fuseResults } = require('./retrieval-fusion');

// ── Configuration ─────────────────────────────────────────────────────────────
const MAX_SHADOW_CHARS  = 8000;    // ~2KB tokens
const MAX_SHADOW_ITEMS  = 5;       // Max items in shadow section
const MIN_SHADOW_SCORE  = 0.35;    // Minimum combined score to include
const SECURITY_KEYWORDS = new Set([
  'password', 'secret', 'token', 'api_key', 'apikey', 'private_key',
  'credential', 'auth_token', 'bearer', 'encryption_key', 'ssh',
]);

// ── Core Shadow Logic ─────────────────────────────────────────────────────────

/**
 * Generate auto-shadow context for a given task description.
 * This is the primary entry point, called by the context-injector.
 *
 * @param {object} opts
 * @param {string} opts.taskDescription  - Current task/plan description
 * @param {string[]} [opts.excludeIds]   - Entry IDs already in hot/warm context
 * @param {string[]} [opts.techStack]    - Tech stack for relevance boosting
 * @param {number} [opts.maxItems]       - Override max items (default: 5)
 * @returns {{ formatted: string, items: object[], count: number, budgetUsed: number }}
 */
function generateShadowContext(opts = {}) {
  const {
    taskDescription = '',
    excludeIds = [],
    techStack = [],
    maxItems = MAX_SHADOW_ITEMS,
  } = opts;

  if (!taskDescription || taskDescription.length < 10) {
    return { formatted: '', items: [], count: 0, budgetUsed: 0 };
  }

  // 1. Build embeddings for the full knowledge base
  const allEntries = Store.readAll(true); // Include global
  const activeEntries = allEntries.filter(e => !e.deprecated && e.confidence >= 0.3);

  if (activeEntries.length === 0) {
    return { formatted: '', items: [], count: 0, budgetUsed: 0 };
  }

  const { vectors, df, N } = Embedder.buildEmbeddings(activeEntries);

  // 2. Multi-path retrieval with RRF fusion (UC-20)
  //    Path 1: Knowledge Graph (embedding + graph traversal)
  //    Path 2: Knowledge Indexer (BM25 + confidence)
  //    Results are fused via Reciprocal Rank Fusion for scale-free merging.
  const queryText = `${taskDescription} ${techStack.join(' ')}`;
  const fetchK = maxItems * 3; // Over-fetch for filtering headroom

  const graphResults = Graph.findRelated(queryText, vectors, df, N, {
    maxHops: 2,
    topK: fetchK,
  });

  let indexerResults = [];
  try {
    const rawIndexer = Indexer.search(queryText, { includeGlobal: true }, fetchK);
    indexerResults = rawIndexer.map((entry, rank) => ({
      id: entry.id,
      score: entry.confidence || 0,
      source: 'indexer',
    }));
  } catch {
    // Indexer may fail on empty store — non-fatal
  }

  // RRF fusion: merge both ranked lists by ordinal position
  const fusedResults = fuseResults([graphResults, indexerResults]);

  // Map fused results back to the legacy shape expected downstream
  const related = fusedResults.map(item => ({
    id: item.id,
    score: item.rrfScore, // RRF score replaces incomparable linear blends
    source: item.source || 'fused',
  }));

  // 3. Filter and enrich results
  const excludeSet = new Set(excludeIds);
  const enriched = [];

  for (const result of related) {
    if (excludeSet.has(result.id)) continue;
    if (result.score < MIN_SHADOW_SCORE) continue;

    const entry = activeEntries.find(e => e.id === result.id);
    if (!entry) continue;

    // Security guard: never shadow secrets
    if (containsSecrets(entry)) continue;

    enriched.push({
      id: entry.id,
      type: entry.type,
      topic: entry.topic,
      content: entry.content,
      confidence: entry.confidence,
      score: result.score,
      source: result.source,
      tags: entry.tags || [],
      edges: getEdgeSummary(entry.id),
    });
  }

  // 4. Sort by score and cap
  enriched.sort((a, b) => b.score - a.score);
  const capped = enriched.slice(0, maxItems);

  // 5. Format for context injection (budget-capped)
  const formatted = formatShadowSection(capped);

  return {
    formatted,
    items: capped,
    count: capped.length,
    budgetUsed: formatted.length,
  };
}

// ── Formatting ────────────────────────────────────────────────────────────────

/**
 * Format shadow items into a structured context section.
 * Budget-capped at MAX_SHADOW_CHARS.
 * @param {object[]} items
 * @returns {string}
 */
function formatShadowSection(items) {
  if (items.length === 0) return '';

  const lines = [
    '## Auto-Shadow Context (RAG 2.0)',
    '',
    '> These are automatically surfaced "ghost patterns" from past sessions.',
    '> Use them as background context — do not explicitly reference them unless relevant.',
    '',
  ];

  let totalChars = lines.join('\n').length;

  for (const item of items) {
    const icon = getTypeIcon(item.type);
    const edgeNote = item.edges ? ` [${item.edges}]` : '';
    const confidenceBar = `${(item.confidence * 100).toFixed(0)}%`;

    const header = `### ${icon} ${item.topic} (${confidenceBar} confidence)${edgeNote}`;
    const content = truncateContent(item.content, 300);
    const tags = item.tags.length > 0 ? `Tags: ${item.tags.join(', ')}` : '';
    const sourceLabel = `Source: ${item.source} | Score: ${item.score.toFixed(2)}`;

    const block = [header, content, tags, sourceLabel, ''].join('\n');

    if (totalChars + block.length > MAX_SHADOW_CHARS) break;
    lines.push(block);
    totalChars += block.length;
  }

  return lines.join('\n');
}

/**
 * Get icon for entry type.
 * @param {string} type
 * @returns {string}
 */
function getTypeIcon(type) {
  const icons = {
    architectural_decision: '🏛️',
    code_pattern:           '🔧',
    bug_pattern:            '🐛',
    team_preference:        '👥',
    domain_knowledge:       '📚',
  };
  return icons[type] || '💡';
}

/**
 * Get a brief edge summary for a node.
 * @param {string} nodeId
 * @returns {string}
 */
function getEdgeSummary(nodeId) {
  try {
    const edges = Graph.getNodeEdges(nodeId);
    if (edges.length === 0) return '';

    const types = {};
    for (const e of edges) {
      types[e.type] = (types[e.type] || 0) + 1;
    }

    return Object.entries(types)
      .map(([type, count]) => `${count} ${type.toLowerCase().replace(/_/g, '-')}`)
      .join(', ');
  } catch {
    return '';
  }
}

/**
 * Truncate content to maxLen characters, adding ellipsis.
 * @param {string} content
 * @param {number} maxLen
 * @returns {string}
 */
function truncateContent(content, maxLen) {
  if (!content) return '';
  if (content.length <= maxLen) return content;
  return content.slice(0, maxLen - 3) + '...';
}

// ── Security ──────────────────────────────────────────────────────────────────

/**
 * Check if an entry might contain secrets/credentials.
 * @param {object} entry
 * @returns {boolean}
 */
function containsSecrets(entry) {
  const text = `${entry.topic} ${entry.content} ${(entry.tags || []).join(' ')}`.toLowerCase();

  for (const keyword of SECURITY_KEYWORDS) {
    if (text.includes(keyword)) return true;
  }

  // Check for common secret patterns
  const secretPatterns = [
    /[a-z0-9]{32,}/,      // Long hex strings (API keys)
    /-----BEGIN/,          // PEM keys
    /sk_[a-z]+_[a-z0-9]/i, // Stripe-style keys
  ];

  for (const pattern of secretPatterns) {
    if (pattern.test(entry.content || '')) return true;
  }

  return false;
}

// ── Contradiction Detection ───────────────────────────────────────────────────

/**
 * Check shadow items for contradictions and flag them.
 * Looks for CONTRADICTS edges between shadow items.
 * @param {object[]} items - Shadow items
 * @returns {object[]} Items with contradiction flags
 */
function flagContradictions(items) {
  const itemIds = new Set(items.map(i => i.id));

  for (const item of items) {
    const edges = Graph.getNodeEdges(item.id, {
      edgeTypes: [Graph.EDGE_TYPES.CONTRADICTS],
    });

    const contradicted = edges.some(e =>
      itemIds.has(e.sourceId === item.id ? e.targetId : e.sourceId)
    );

    if (contradicted) {
      item.contradiction = true;
      item.topic = `⚠️ ${item.topic} [CONTRADICTED]`;
    }
  }

  return items;
}

// ── Exports ───────────────────────────────────────────────────────────────────
module.exports = {
  generateShadowContext,
  formatShadowSection,
  containsSecrets,
  flagContradictions,
  getEdgeSummary,
  MAX_SHADOW_CHARS,
  MAX_SHADOW_ITEMS,
  MIN_SHADOW_SCORE,
};
