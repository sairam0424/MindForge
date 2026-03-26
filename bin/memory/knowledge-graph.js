/**
 * MindForge v2.4.0 — Knowledge Graph Engine (RAG 2.0)
 * Graph-aware knowledge management with nodes, edges, and traversal.
 *
 * Design:
 * - Nodes = KnowledgeEntry items from knowledge-store.js
 * - Edges = Typed relationships stored in graph-edges.jsonl
 * - Adjacency index rebuilt on load for O(1) neighbor lookups
 * - Traversal via BFS with configurable depth and edge type filters
 * - All edge writes are append-only with SHA-256 integrity checksums
 */
'use strict';

const fs       = require('fs');
const path     = require('path');
const crypto   = require('crypto');
const Store    = require('./knowledge-store');
const Embedder = require('./embedding-engine');

// ── Edge Types ────────────────────────────────────────────────────────────────
const EDGE_TYPES = Object.freeze({
  RELATED_TO:  'RELATED_TO',   // Semantic similarity (auto-inferred)
  CAUSED_BY:   'CAUSED_BY',    // Bug → Root cause
  SUPERSEDES:  'SUPERSEDES',   // New decision → Old decision
  DEPENDS_ON:  'DEPENDS_ON',   // Pattern → Required pattern
  INFORMS:     'INFORMS',      // Review finding → Decision
  CONTRADICTS: 'CONTRADICTS',  // Conflicting knowledge
});

const EDGE_SCHEMA_VERSION = '1.0.0';
const DEFAULT_EDGE_WEIGHT = 1.0;
const DECAY_RATE          = 0.10;    // 10% weight decay per cycle
const DECAY_THRESHOLD_DAYS = 30;     // Decay edges not traversed in 30 days

// ── Path Configuration ────────────────────────────────────────────────────────
let baseDir = process.cwd();
let testMemoryDir = null;

function setBaseDir(dir) { baseDir = dir; }

/**
 * Set a flat memory directory for testing (bypasses .mindforge/memory/ nesting).
 * @param {string|null} dir - Flat directory path, or null to reset
 */
function setTestMode(dir) { testMemoryDir = dir; }

function getPaths() {
  const memoryDir = testMemoryDir || path.join(baseDir, '.mindforge', 'memory');
  return {
    MEMORY_DIR:     memoryDir,
    EDGES_PATH:     path.join(memoryDir, 'graph-edges.jsonl'),
    CACHE_PATH:     path.join(memoryDir, 'embeddings.json'),
    GRAPH_STATS:    path.join(memoryDir, 'graph-stats.json'),
  };
}

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

// ── Edge CRUD ─────────────────────────────────────────────────────────────────

/**
 * Add a directed edge between two knowledge nodes.
 * @param {object} edge
 * @param {string} edge.sourceId  - Source node ID
 * @param {string} edge.targetId  - Target node ID
 * @param {string} edge.type      - Edge type (from EDGE_TYPES)
 * @param {number} [edge.weight]  - Edge weight (default: 1.0)
 * @param {string} [edge.reason]  - Why this edge exists
 * @param {object} [edge.metadata] - Additional metadata
 * @returns {string} Edge ID
 */
function addEdge(edge) {
  const paths = getPaths();
  ensureDir(paths.MEMORY_DIR);

  if (!edge.sourceId) throw new Error('Edge requires sourceId');
  if (!edge.targetId) throw new Error('Edge requires targetId');
  if (!edge.type || !EDGE_TYPES[edge.type]) {
    throw new Error(`Invalid edge type: ${edge.type}. Must be one of: ${Object.keys(EDGE_TYPES).join(', ')}`);
  }
  if (edge.sourceId === edge.targetId) {
    throw new Error('Self-referencing edges are not allowed');
  }

  const id = crypto.randomUUID();
  const now = new Date().toISOString();

  const record = {
    id,
    schema_version: EDGE_SCHEMA_VERSION,
    sourceId:       edge.sourceId,
    targetId:       edge.targetId,
    type:           edge.type,
    weight:         Math.min(2.0, Math.max(0.0, edge.weight ?? DEFAULT_EDGE_WEIGHT)),
    reason:         edge.reason || '',
    metadata:       edge.metadata || {},
    created_at:     now,
    last_traversed: null,
    traversal_count: 0,
    deprecated:     false,
    checksum:       '',
  };

  // Compute integrity checksum
  const payload = JSON.stringify({ ...record, checksum: '' });
  record.checksum = crypto.createHash('sha256').update(payload).digest('hex');

  fs.appendFileSync(paths.EDGES_PATH, JSON.stringify(record) + '\n');
  return id;
}

/**
 * Read all edges from the graph-edges.jsonl file.
 * Later entries with the same ID supersede earlier ones (append-only pattern).
 * @returns {object[]} Edges
 */
function readAllEdges() {
  const paths = getPaths();
  if (!fs.existsSync(paths.EDGES_PATH)) return [];

  const lines = fs.readFileSync(paths.EDGES_PATH, 'utf8').split('\n').filter(Boolean);
  const byId = new Map();

  for (const line of lines) {
    try {
      const edge = JSON.parse(line);
      byId.set(edge.id, edge);
    } catch {
      // Skip malformed lines
    }
  }

  return [...byId.values()].filter(e => !e.deprecated);
}

/**
 * Deprecate an edge.
 * @param {string} edgeId - Edge to deprecate
 * @param {string} reason - Why
 */
function deprecateEdge(edgeId, reason) {
  const paths = getPaths();
  const edges = readAllEdges();
  const edge = edges.find(e => e.id === edgeId);
  if (!edge) return;

  const deprecated = {
    ...edge,
    deprecated: true,
    deprecated_reason: reason,
    deprecated_at: new Date().toISOString(),
  };

  fs.appendFileSync(paths.EDGES_PATH, JSON.stringify(deprecated) + '\n');
}

/**
 * Reinforce an edge (increase weight, update traversal stats).
 * @param {string} edgeId
 */
function reinforceEdge(edgeId) {
  const paths = getPaths();
  const edges = readAllEdges();
  const edge = edges.find(e => e.id === edgeId);
  if (!edge) return;

  const reinforced = {
    ...edge,
    weight: Math.min(2.0, edge.weight + 0.1),
    last_traversed: new Date().toISOString(),
    traversal_count: (edge.traversal_count || 0) + 1,
  };

  // Recompute checksum
  const payload = JSON.stringify({ ...reinforced, checksum: '' });
  reinforced.checksum = crypto.createHash('sha256').update(payload).digest('hex');

  fs.appendFileSync(paths.EDGES_PATH, JSON.stringify(reinforced) + '\n');
}

// ── Adjacency Index ───────────────────────────────────────────────────────────

/**
 * Build an in-memory adjacency index for O(1) neighbor lookups.
 * @param {object[]} edges - All active edges
 * @returns {Map<string, object[]>} nodeId → [{ edge, neighborId }]
 */
function buildAdjacencyIndex(edges) {
  const index = new Map();

  for (const edge of edges) {
    // Forward direction
    if (!index.has(edge.sourceId)) index.set(edge.sourceId, []);
    index.get(edge.sourceId).push({
      edge,
      neighborId: edge.targetId,
      direction: 'outgoing',
    });

    // Reverse direction (for bidirectional traversal)
    if (!index.has(edge.targetId)) index.set(edge.targetId, []);
    index.get(edge.targetId).push({
      edge,
      neighborId: edge.sourceId,
      direction: 'incoming',
    });
  }

  return index;
}

// ── Graph Traversal ───────────────────────────────────────────────────────────

/**
 * BFS traversal from a node, returning all reachable nodes within depth.
 * @param {string} startId - Starting node ID
 * @param {number} maxDepth - Maximum hop count (default: 2)
 * @param {object} opts
 * @param {string[]} [opts.edgeTypes] - Filter by edge types
 * @param {number} [opts.minWeight] - Minimum edge weight
 * @returns {Array<{id: string, depth: number, path: string[]}>}
 */
function traverse(startId, maxDepth = 2, opts = {}) {
  const { edgeTypes, minWeight = 0 } = opts;
  const edges = readAllEdges();
  const adjacency = buildAdjacencyIndex(edges);

  const visited = new Set();
  const results = [];
  const queue = [{ id: startId, depth: 0, path: [startId] }];

  while (queue.length > 0) {
    const { id, depth, path: currentPath } = queue.shift();

    if (visited.has(id)) continue;
    visited.add(id);

    if (id !== startId) {
      results.push({ id, depth, path: currentPath });
    }

    if (depth >= maxDepth) continue;

    const neighbors = adjacency.get(id) || [];
    for (const { edge, neighborId } of neighbors) {
      if (visited.has(neighborId)) continue;
      if (edgeTypes && !edgeTypes.includes(edge.type)) continue;
      if (edge.weight < minWeight) continue;

      queue.push({
        id: neighborId,
        depth: depth + 1,
        path: [...currentPath, neighborId],
      });
    }
  }

  return results;
}

/**
 * Find related nodes via both graph traversal AND embedding similarity.
 * Returns a combined, deduplicated, scored result set.
 * @param {string} queryText - Natural language query
 * @param {Map<string, object>} vectors - Precomputed embeddings
 * @param {Map<string, number>} df - Document frequency
 * @param {number} N - Corpus size
 * @param {object} opts
 * @param {number} [opts.maxHops] - Graph traversal depth
 * @param {number} [opts.topK] - Max results
 * @returns {Array<{id: string, score: number, source: string}>}
 */
function findRelated(queryText, vectors, df, N, opts = {}) {
  const { maxHops = 2, topK = 10 } = opts;

  // 1. Embedding-based similarity
  const embeddingResults = Embedder.findSimilar(queryText, vectors, df, N, topK * 2);

  // 2. Graph-based traversal from top embedding matches
  const graphResults = new Map();
  for (const { id } of embeddingResults.slice(0, 3)) {
    const neighbors = traverse(id, maxHops);
    for (const n of neighbors) {
      if (!graphResults.has(n.id) || graphResults.get(n.id).depth > n.depth) {
        graphResults.set(n.id, n);
      }
    }
  }

  // 3. Merge and score
  const combined = new Map();

  // Embedding scores (0.0 - 1.0)
  for (const r of embeddingResults) {
    combined.set(r.id, {
      id: r.id,
      embeddingScore: r.similarity,
      graphScore: 0,
      source: 'embedding',
    });
  }

  // Graph scores (inversely proportional to depth)
  for (const [id, result] of graphResults) {
    const graphScore = 1.0 / (result.depth + 1);
    if (combined.has(id)) {
      const existing = combined.get(id);
      existing.graphScore = graphScore;
      existing.source = 'hybrid';
    } else {
      combined.set(id, {
        id,
        embeddingScore: 0,
        graphScore,
        source: 'graph',
      });
    }
  }

  // Final score: weighted combination
  const scored = [...combined.values()].map(r => ({
    id: r.id,
    score: r.embeddingScore * 0.6 + r.graphScore * 0.4,
    source: r.source,
  }));

  return scored
    .filter(r => r.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, topK);
}

/**
 * Get all edges for a specific node.
 * @param {string} nodeId
 * @param {object} opts
 * @param {string} [opts.direction] - 'outgoing', 'incoming', or 'both' (default)
 * @param {string[]} [opts.edgeTypes] - Filter by types
 * @returns {object[]} Edges
 */
function getNodeEdges(nodeId, opts = {}) {
  const { direction = 'both', edgeTypes } = opts;
  const edges = readAllEdges();

  return edges.filter(e => {
    const matchesNode =
      direction === 'outgoing' ? e.sourceId === nodeId :
      direction === 'incoming' ? e.targetId === nodeId :
      e.sourceId === nodeId || e.targetId === nodeId;

    const matchesType = !edgeTypes || edgeTypes.includes(e.type);

    return matchesNode && matchesType;
  });
}

// ── Auto-Edge Creation ────────────────────────────────────────────────────────

/**
 * When a new entry is added, auto-create RELATED_TO edges
 * for entries with cosine similarity above the threshold.
 * @param {string} entryId - Newly added entry's ID
 * @param {Map<string, object>} vectors - Precomputed entry vectors
 * @returns {string[]} Created edge IDs
 */
function autoCreateEdges(entryId, vectors) {
  const candidates = Embedder.inferEdges(entryId, vectors);
  const created = [];

  // Check for existing edges to avoid duplicates
  const existingEdges = getNodeEdges(entryId);
  const existingTargets = new Set(existingEdges.map(e =>
    e.sourceId === entryId ? e.targetId : e.sourceId
  ));

  for (const { targetId, similarity } of candidates.slice(0, 5)) {
    if (existingTargets.has(targetId)) continue;

    const edgeId = addEdge({
      sourceId: entryId,
      targetId,
      type: EDGE_TYPES.RELATED_TO,
      weight: similarity,
      reason: `Auto-inferred: cosine similarity ${similarity.toFixed(3)}`,
      metadata: { auto_inferred: true, similarity },
    });

    created.push(edgeId);
  }

  return created;
}

// ── Edge Weight Decay ─────────────────────────────────────────────────────────

/**
 * Apply weight decay to edges not traversed in DECAY_THRESHOLD_DAYS.
 * Edges that decay to weight ≤ 0.1 are deprecated.
 * @returns {{ decayed: number, pruned: number }}
 */
function applyDecay() {
  const edges = readAllEdges();
  const now = Date.now();
  let decayed = 0;
  let pruned = 0;

  for (const edge of edges) {
    const lastUsed = edge.last_traversed
      ? new Date(edge.last_traversed).getTime()
      : new Date(edge.created_at).getTime();

    const daysSince = (now - lastUsed) / 86_400_000;
    if (daysSince < DECAY_THRESHOLD_DAYS) continue;

    const cycles = Math.floor(daysSince / DECAY_THRESHOLD_DAYS);
    const newWeight = edge.weight * Math.pow(1 - DECAY_RATE, cycles);

    if (newWeight <= 0.1) {
      deprecateEdge(edge.id, `Pruned: weight decayed to ${newWeight.toFixed(3)} after ${cycles} cycles`);
      pruned++;
    } else if (newWeight < edge.weight) {
      // Append updated weight
      const paths = getPaths();
      const updated = {
        ...edge,
        weight: parseFloat(newWeight.toFixed(4)),
      };
      const payload = JSON.stringify({ ...updated, checksum: '' });
      updated.checksum = crypto.createHash('sha256').update(payload).digest('hex');
      fs.appendFileSync(paths.EDGES_PATH, JSON.stringify(updated) + '\n');
      decayed++;
    }
  }

  return { decayed, pruned };
}

// ── Cycle Detection ───────────────────────────────────────────────────────────

/**
 * Detect cycles in directed edge types (CAUSED_BY, SUPERSEDES).
 * Uses DFS to find back-edges.
 * @returns {Array<string[]>} List of cycles (as node ID arrays)
 */
function detectCycles() {
  const edges = readAllEdges().filter(e =>
    e.type === EDGE_TYPES.CAUSED_BY || e.type === EDGE_TYPES.SUPERSEDES
  );

  const adj = new Map();
  for (const e of edges) {
    if (!adj.has(e.sourceId)) adj.set(e.sourceId, []);
    adj.get(e.sourceId).push(e.targetId);
  }

  const visited = new Set();
  const inStack = new Set();
  const cycles = [];

  function dfs(node, path) {
    if (inStack.has(node)) {
      const cycleStart = path.indexOf(node);
      cycles.push(path.slice(cycleStart));
      return;
    }
    if (visited.has(node)) return;

    visited.add(node);
    inStack.add(node);

    for (const neighbor of (adj.get(node) || [])) {
      dfs(neighbor, [...path, neighbor]);
    }

    inStack.delete(node);
  }

  for (const nodeId of adj.keys()) {
    if (!visited.has(nodeId)) {
      dfs(nodeId, [nodeId]);
    }
  }

  return cycles;
}

// ── Graph Statistics ──────────────────────────────────────────────────────────

/**
 * Compute and return graph statistics.
 * @returns {object} Graph stats
 */
function graphStats() {
  const edges = readAllEdges();
  const entries = Store.readAll();
  const activeEntries = entries.filter(e => !e.deprecated);

  const byType = {};
  for (const e of edges) {
    byType[e.type] = (byType[e.type] || 0) + 1;
  }

  // Find orphan nodes (no edges)
  const connectedNodes = new Set();
  for (const e of edges) {
    connectedNodes.add(e.sourceId);
    connectedNodes.add(e.targetId);
  }
  const orphans = activeEntries.filter(e => !connectedNodes.has(e.id));

  return {
    total_nodes:    activeEntries.length,
    total_edges:    edges.length,
    edges_by_type:  byType,
    orphan_nodes:   orphans.length,
    avg_weight:     edges.length
      ? edges.reduce((s, e) => s + e.weight, 0) / edges.length
      : 0,
    connected_ratio: activeEntries.length
      ? connectedNodes.size / activeEntries.length
      : 0,
  };
}

// ── Edge Integrity Verification ───────────────────────────────────────────────

/**
 * Verify SHA-256 checksums on all edges.
 * @returns {{ valid: number, corrupted: string[] }}
 */
function verifyEdgeIntegrity() {
  const edges = readAllEdges();
  let valid = 0;
  const corrupted = [];

  for (const edge of edges) {
    const storedChecksum = edge.checksum;
    const payload = JSON.stringify({ ...edge, checksum: '' });
    const computed = crypto.createHash('sha256').update(payload).digest('hex');

    if (storedChecksum === computed) {
      valid++;
    } else {
      corrupted.push(edge.id);
    }
  }

  return { valid, corrupted };
}

// ── Exports ───────────────────────────────────────────────────────────────────
module.exports = {
  EDGE_TYPES,
  setBaseDir,
  setTestMode,
  getPaths,
  addEdge,
  readAllEdges,
  deprecateEdge,
  reinforceEdge,
  buildAdjacencyIndex,
  traverse,
  findRelated,
  getNodeEdges,
  autoCreateEdges,
  applyDecay,
  detectCycles,
  graphStats,
  verifyEdgeIntegrity,
};
