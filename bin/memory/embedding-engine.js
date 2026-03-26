/**
 * MindForge v2.4.0 — Embedding Engine (RAG 2.0)
 * Local-first TF-IDF vector space for semantic similarity.
 *
 * No external API dependencies — runs entirely on local compute.
 * Provides vectorization and cosine similarity for the Knowledge Graph.
 *
 * Design:
 * - Sparse TF-IDF vectors stored as { token → weight } objects
 * - Cosine similarity for semantic matching between entries
 * - Embedding cache persisted to disk for fast session restarts
 * - Auto-edge inference when similarity exceeds threshold
 */
'use strict';

const fs     = require('fs');
const path   = require('path');
const crypto = require('crypto');

// ── Configuration ─────────────────────────────────────────────────────────────
const SIMILARITY_THRESHOLD   = 0.65;  // Auto-edge creation threshold
const SHADOW_THRESHOLD       = 0.50;  // Minimum similarity for auto-shadow retrieval
const MAX_VECTOR_TERMS       = 200;   // Cap sparse vector dimensionality
const CACHE_SCHEMA_VERSION   = '1.0.0';

// ── Stopwords (expanded for technical content) ────────────────────────────────
const STOPWORDS = new Set([
  'the', 'a', 'an', 'is', 'it', 'in', 'on', 'at', 'to', 'for', 'of', 'and',
  'or', 'but', 'not', 'this', 'that', 'with', 'from', 'by', 'be', 'are',
  'was', 'were', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would',
  'could', 'should', 'may', 'might', 'can', 'use', 'using', 'used', 'when',
  'where', 'which', 'what', 'how', 'why', 'who', 'all', 'any', 'some', 'we',
  'our', 'they', 'their', 'you', 'your', 'my', 'its', 'also', 'just', 'more',
  'very', 'been', 'being', 'each', 'then', 'than', 'into', 'only', 'other',
  'such', 'like', 'over', 'after', 'before', 'between', 'through', 'about',
  'will', 'shall', 'must', 'need', 'make', 'made', 'get', 'got', 'set',
  'new', 'old', 'see', 'way', 'well', 'back', 'even', 'give', 'most',
]);

// ── Tokenizer ─────────────────────────────────────────────────────────────────

/**
 * Tokenize text into normalized, filtered terms.
 * Handles camelCase, snake_case, and kebab-case splitting.
 * @param {string} text - Raw text to tokenize
 * @returns {string[]} Filtered tokens
 */
function tokenize(text) {
  if (!text || typeof text !== 'string') return [];

  return text
    // Split camelCase: "userId" → "user Id"
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    // Split snake_case and kebab-case
    .replace(/[_-]/g, ' ')
    // Remove non-alphanumeric (keep dots for versions)
    .replace(/[^a-zA-Z0-9.\s]/g, ' ')
    .toLowerCase()
    .split(/\s+/)
    .filter(w => w.length > 2 && !STOPWORDS.has(w));
}

/**
 * Extract n-grams (bigrams) from tokens for compound term matching.
 * "react memo" stays as a single feature "react_memo".
 * @param {string[]} tokens - Unigram tokens
 * @returns {string[]} Bigram tokens
 */
function bigrams(tokens) {
  const result = [];
  for (let i = 0; i < tokens.length - 1; i++) {
    result.push(`${tokens[i]}_${tokens[i + 1]}`);
  }
  return result;
}

// ── TF-IDF Vectorization ──────────────────────────────────────────────────────

/**
 * Build a document-frequency map from a corpus of documents.
 * @param {Array<{id: string, tokens: string[]}>} corpus
 * @returns {Map<string, number>} token → document frequency
 */
function buildDocumentFrequency(corpus) {
  const df = new Map();
  for (const doc of corpus) {
    const unique = new Set(doc.tokens);
    for (const token of unique) {
      df.set(token, (df.get(token) || 0) + 1);
    }
  }
  return df;
}

/**
 * Compute TF-IDF vector for a single document.
 * @param {string[]} tokens - Document tokens
 * @param {Map<string, number>} df - Document frequency map
 * @param {number} N - Total document count
 * @returns {Object<string, number>} Sparse vector { token → weight }
 */
function computeTfIdfVector(tokens, df, N) {
  if (tokens.length === 0) return {};

  // Term frequency
  const tf = {};
  for (const t of tokens) {
    tf[t] = (tf[t] || 0) + 1;
  }

  // TF-IDF weights
  const vector = {};
  for (const [term, count] of Object.entries(tf)) {
    const termFreq = count / tokens.length;                // Normalized TF
    const docFreq  = df.get(term) || 1;
    const idf      = Math.log((N + 1) / (docFreq + 1)) + 1; // Smoothed IDF
    vector[term]   = termFreq * idf;
  }

  // Cap dimensionality: keep only top-N terms by weight
  const sorted = Object.entries(vector)
    .sort((a, b) => b[1] - a[1])
    .slice(0, MAX_VECTOR_TERMS);

  const capped = {};
  for (const [term, weight] of sorted) {
    capped[term] = weight;
  }

  return capped;
}

// ── Similarity ────────────────────────────────────────────────────────────────

/**
 * Compute cosine similarity between two sparse vectors.
 * @param {Object<string, number>} vecA - Sparse vector A
 * @param {Object<string, number>} vecB - Sparse vector B
 * @returns {number} Cosine similarity [0, 1]
 */
function cosineSimilarity(vecA, vecB) {
  if (!vecA || !vecB) return 0;

  const keysA = Object.keys(vecA);
  const keysB = Object.keys(vecB);
  if (keysA.length === 0 || keysB.length === 0) return 0;

  // Dot product (only over shared terms)
  let dot = 0;
  for (const key of keysA) {
    if (vecB[key]) {
      dot += vecA[key] * vecB[key];
    }
  }

  if (dot === 0) return 0;

  // Magnitudes
  let magA = 0;
  for (const v of Object.values(vecA)) magA += v * v;
  magA = Math.sqrt(magA);

  let magB = 0;
  for (const v of Object.values(vecB)) magB += v * v;
  magB = Math.sqrt(magB);

  if (magA === 0 || magB === 0) return 0;

  return dot / (magA * magB);
}

// ── Corpus Manager ────────────────────────────────────────────────────────────

/**
 * Build embeddings for all knowledge entries.
 * @param {object[]} entries - Knowledge entries with { id, topic, content, tags }
 * @returns {{ vectors: Map<string, object>, df: Map<string, number> }}
 */
function buildEmbeddings(entries) {
  // Tokenize all entries
  const corpus = entries
    .filter(e => !e.deprecated)
    .map(e => {
      const text = `${e.topic || ''} ${e.content || ''} ${(e.tags || []).join(' ')}`;
      const unigrams = tokenize(text);
      const bi = bigrams(unigrams);
      return { id: e.id, tokens: [...unigrams, ...bi] };
    });

  const df = buildDocumentFrequency(corpus);
  const N  = corpus.length;

  const vectors = new Map();
  for (const doc of corpus) {
    vectors.set(doc.id, computeTfIdfVector(doc.tokens, df, N));
  }

  return { vectors, df, N };
}

/**
 * Compute embedding for a single query string against an existing corpus.
 * @param {string} queryText - Natural language query
 * @param {Map<string, number>} df - Document frequency from corpus
 * @param {number} N - Total document count
 * @returns {Object<string, number>} Query vector
 */
function embedQuery(queryText, df, N) {
  const unigrams = tokenize(queryText);
  const bi = bigrams(unigrams);
  return computeTfIdfVector([...unigrams, ...bi], df, N);
}

/**
 * Find the top-K most similar entries to a query.
 * @param {string} queryText - Natural language query
 * @param {Map<string, object>} vectors - Precomputed entry vectors
 * @param {Map<string, number>} df - Document frequency
 * @param {number} N - Corpus size
 * @param {number} topK - Max results
 * @param {number} minSimilarity - Minimum cosine similarity (default: SHADOW_THRESHOLD)
 * @returns {Array<{id: string, similarity: number}>}
 */
function findSimilar(queryText, vectors, df, N, topK = 10, minSimilarity = SHADOW_THRESHOLD) {
  const queryVec = embedQuery(queryText, df, N);
  const results = [];

  for (const [id, vec] of vectors) {
    const sim = cosineSimilarity(queryVec, vec);
    if (sim >= minSimilarity) {
      results.push({ id, similarity: sim });
    }
  }

  return results
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, topK);
}

/**
 * Find entries that should be auto-linked (similarity > SIMILARITY_THRESHOLD).
 * @param {string} entryId - The new entry's ID
 * @param {Map<string, object>} vectors - All entry vectors
 * @returns {Array<{targetId: string, similarity: number}>} Candidate edges
 */
function inferEdges(entryId, vectors) {
  const entryVec = vectors.get(entryId);
  if (!entryVec) return [];

  const candidates = [];
  for (const [id, vec] of vectors) {
    if (id === entryId) continue;
    const sim = cosineSimilarity(entryVec, vec);
    if (sim >= SIMILARITY_THRESHOLD) {
      candidates.push({ targetId: id, similarity: sim });
    }
  }

  return candidates.sort((a, b) => b.similarity - a.similarity);
}

// ── Embedding Cache ───────────────────────────────────────────────────────────

/**
 * Save embedding cache to disk.
 * @param {string} cachePath - Absolute path to cache file
 * @param {Map<string, object>} vectors - Entry vectors
 * @param {Map<string, number>} df - Document frequency
 * @param {number} N - Corpus size
 */
function saveCache(cachePath, vectors, df, N) {
  const data = {
    schema_version: CACHE_SCHEMA_VERSION,
    updated_at: new Date().toISOString(),
    corpus_size: N,
    df: Object.fromEntries(df),
    vectors: Object.fromEntries(vectors),
    checksum: '',
  };

  const payload = JSON.stringify(data);
  data.checksum = crypto.createHash('sha256').update(payload).digest('hex');

  const dir = path.dirname(cachePath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(cachePath, JSON.stringify(data, null, 2));
}

/**
 * Load embedding cache from disk.
 * @param {string} cachePath - Absolute path to cache file
 * @returns {{ vectors: Map<string, object>, df: Map<string, number>, N: number } | null}
 */
function loadCache(cachePath) {
  if (!fs.existsSync(cachePath)) return null;

  try {
    const raw = JSON.parse(fs.readFileSync(cachePath, 'utf8'));
    if (raw.schema_version !== CACHE_SCHEMA_VERSION) return null;

    return {
      vectors: new Map(Object.entries(raw.vectors || {})),
      df:      new Map(Object.entries(raw.df || {})),
      N:       raw.corpus_size || 0,
    };
  } catch {
    return null; // Corrupt cache — rebuild
  }
}

// ── Exports ───────────────────────────────────────────────────────────────────
module.exports = {
  tokenize,
  bigrams,
  buildDocumentFrequency,
  computeTfIdfVector,
  cosineSimilarity,
  buildEmbeddings,
  embedQuery,
  findSimilar,
  inferEdges,
  saveCache,
  loadCache,
  SIMILARITY_THRESHOLD,
  SHADOW_THRESHOLD,
};
