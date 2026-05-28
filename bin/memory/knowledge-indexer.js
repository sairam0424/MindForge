/**
 * MindForge v2 — Knowledge Indexer
 * TF-IDF inspired relevance scoring for fast knowledge retrieval.
 * Provides tag-based and text-based search across the knowledge graph.
 *
 * Design note: We use a simple in-memory index rebuilt on each query
 * (not persisted) because the knowledge base stays small (< 10K entries
 * for a typical project). Rebuild time < 50ms for 1K entries.
 */
'use strict';

const fs    = require('fs');
const path  = require('path');
const Store = require('./knowledge-store');
const { buildBM25Index, bm25Score } = require('./embedding-engine');

// ── Stopwords (excluded from TF-IDF scoring) ──────────────────────────────────
const STOPWORDS = new Set([
  'the', 'a', 'an', 'is', 'it', 'in', 'on', 'at', 'to', 'for', 'of', 'and',
  'or', 'but', 'not', 'this', 'that', 'with', 'from', 'by', 'be', 'are',
  'was', 'were', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would',
  'could', 'should', 'may', 'might', 'can', 'use', 'using', 'used', 'when',
  'where', 'which', 'what', 'how', 'why', 'who', 'all', 'any', 'some', 'we',
  'our', 'they', 'their', 'we', 'you', 'your', 'my', 'its',
]);

// ── Tokenizer ─────────────────────────────────────────────────────────────────
function tokenize(text) {
  if (!text) return [];
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s_-]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 2 && !STOPWORDS.has(w));
}

// ── Build in-memory index ─────────────────────────────────────────────────────
function buildIndex(entries) {
  const index = new Map(); // token → [{ id, count }]
  const docTokenCounts = new Map(); // id → token count

  for (const entry of entries) {
    if (entry.deprecated) continue;

    const text   = `${entry.topic} ${entry.content} ${(entry.tags || []).join(' ')}`;
    const tokens = tokenize(text);
    const counts = {};

    for (const tok of tokens) {
      counts[tok] = (counts[tok] || 0) + 1;
    }

    docTokenCounts.set(entry.id, tokens.length);

    for (const [tok, count] of Object.entries(counts)) {
      if (!index.has(tok)) index.set(tok, []);
      index.get(tok).push({ id: entry.id, count });
    }
  }

  return { index, docTokenCounts, N: entries.length };
}

// ── TF-IDF scoring ────────────────────────────────────────────────────────────
function tfidfScore(queryTokens, entryId, index, docTokenCounts, N) {
  let score = 0;
  const docLen = docTokenCounts.get(entryId) || 1;

  for (const qTok of queryTokens) {
    const postings = index.get(qTok) || [];
    const df       = postings.length; // Document frequency
    if (df === 0) continue;

    const posting  = postings.find(p => p.id === entryId);
    if (!posting) continue;

    const tf  = posting.count / docLen;              // Term frequency (normalized)
    const idf = Math.log((N + 1) / (df + 1)) + 1;   // Smoothed IDF
    score += tf * idf;
  }

  return score;
}

// ── Persistent BM25 Index Cache ──────────────────────────────────────────────

function getKbPath() {
  const memoryDir = path.join(process.cwd(), '.mindforge', 'memory');
  return path.join(memoryDir, 'knowledge.jsonl');
}

function getCachePath() {
  const memoryDir = path.join(process.cwd(), '.mindforge', 'memory');
  return path.join(memoryDir, '.index-cache.json');
}

/**
 * Load BM25 index from cache if source file hasn't changed,
 * otherwise rebuild and persist.
 */
function loadOrBuildIndex(entries) {
  const kbPath = getKbPath();
  const cachePath = getCachePath();
  const stat = fs.statSync(kbPath, { throwIfNoEntry: false });

  if (stat && fs.existsSync(cachePath)) {
    try {
      const cache = JSON.parse(fs.readFileSync(cachePath, 'utf8'));
      if (cache.mtime === stat.mtimeMs && cache.entryCount === entries.length) {
        return cache.index;
      }
    } catch (e) { /* cache corrupt, rebuild */ }
  }

  const index = buildBM25Index(entries);

  if (stat) {
    const dir = path.dirname(cachePath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    const cacheData = { mtime: stat.mtimeMs, entryCount: entries.length, index };
    fs.writeFileSync(cachePath, JSON.stringify(cacheData));
  }

  return index;
}

// ── Main search function ──────────────────────────────────────────────────────
/**
 * Search knowledge base with TF-IDF scoring.
 * @param {string} queryText - Natural language query
 * @param {object} filters   - Optional filters { type, tags, minConfidence }
 * @param {number} limit     - Max results to return
 * @returns {object[]} Ranked results
 */
function search(queryText, filters = {}, limit = 10) {
  const allEntries = Store.readAll(filters.includeGlobal);
  const active     = allEntries.filter(e => !e.deprecated);

  // Apply filters
  let candidates = active;
  if (filters.type)          candidates = candidates.filter(e => e.type === filters.type);
  if (filters.minConfidence) candidates = candidates.filter(e => e.confidence >= filters.minConfidence);
  if (filters.tags?.length) {
    const filterTags = filters.tags.map(t => t.toLowerCase());
    candidates = candidates.filter(e =>
      (e.tags || []).some(t => filterTags.includes(t.toLowerCase()))
    );
  }

  if (candidates.length === 0) return [];

  const queryTokens = tokenize(queryText);
  if (queryTokens.length === 0) {
    return candidates
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, limit);
  }

  // Use cached BM25 index for scoring
  const bm25Index = loadOrBuildIndex(candidates);
  const { docFrequency, avgDocLength, tokenizedDocs } = bm25Index;
  const totalDocs = tokenizedDocs.length;
  const docMap = new Map(tokenizedDocs.map(d => [d.id, d.tokens]));

  const scored = candidates.map(entry => {
    const docTokens = docMap.get(entry.id) || [];
    const textScore = bm25Score(queryTokens, docTokens, docFrequency, totalDocs, avgDocLength);
    const finalScore = textScore > 0
      ? textScore * 0.7 + entry.confidence * 0.3
      : 0;
    return { entry, score: finalScore };
  });

  return scored
    .filter(s => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(s => s.entry);
}

/**
 * Load session context: retrieve the most relevant memories for the current session.
 * @param {object} context - { techStack, phase, topic, project }
 * @returns {object} Categorized memories for session start display
 */
function loadSessionContext(context = {}) {
  const { techStack = [], phase, topic = '', project } = context;

  const allEntries = Store.readAll(true); // Include global knowledge
  const active     = allEntries.filter(e => !e.deprecated && e.confidence >= 0.5);

  // Build query from context
  const queryText = [
    topic,
    ...(techStack || []),
  ].join(' ');

  const { index, docTokenCounts, N } = buildIndex(active);
  const queryTokens = tokenize(queryText);

  // Score all active entries
  const scored = active.map(e => ({
    entry: e,
    score: queryTokens.length > 0
      ? tfidfScore(queryTokens, e.id, index, docTokenCounts, N) * 0.6 + e.confidence * 0.4
      : e.confidence,
  })).sort((a, b) => b.score - a.score);

  // Bucket by type, top N per bucket
  const preferences  = scored.filter(s => s.entry.type === 'team_preference').slice(0, 5).map(s => s.entry);
  const decisions    = scored.filter(s => s.entry.type === 'architectural_decision').slice(0, 8).map(s => s.entry);
  const bugPatterns  = scored.filter(s => s.entry.type === 'bug_pattern').slice(0, 5).map(s => s.entry);
  const codePatterns = scored.filter(s => s.entry.type === 'code_pattern').slice(0, 5).map(s => s.entry);
  const domain       = scored.filter(s => s.entry.type === 'domain_knowledge').slice(0, 3).map(s => s.entry);

  return { preferences, decisions, bugPatterns, codePatterns, domain };
}

module.exports = { search, loadSessionContext, buildIndex, tfidfScore, tokenize, loadOrBuildIndex };
