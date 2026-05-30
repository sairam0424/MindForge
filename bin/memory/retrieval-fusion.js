'use strict';
/**
 * MindForge — Reciprocal Rank Fusion (UC-20).
 * Merges multiple ranked lists using scale-free RRF scoring.
 *
 * RRF eliminates the need for score normalization across retrieval paths
 * with incomparable scoring functions (embedding similarity, BM25, graph
 * traversal, FTS rank). Only ordinal rank matters, not score magnitude.
 *
 * Formula:
 *   rrfScore(item) = SUM( 1 / (K + rank_i) ) for all lists containing the item
 *
 * Where K=60 is the standard constant from the original RRF paper
 * (Cormack, Clarke, Butt — 2009).
 */

const K = 60; // Standard RRF constant — dampens the influence of high ranks

/**
 * Fuse multiple ranked result lists using Reciprocal Rank Fusion.
 *
 * Each list is an array of objects with at least an `id` field.
 * Items appearing in multiple lists accumulate RRF score and rank higher.
 *
 * @param {Array<Array<{id: string, [key: string]: any}>>} rankedLists
 *   Array of ranked lists. Each list is ordered by relevance (index 0 = most relevant).
 * @returns {Array<{id: string, rrfScore: number, [key: string]: any}>}
 *   Fused results sorted by RRF score descending. Each item retains its
 *   original properties from the first list it appeared in.
 */
function fuseResults(rankedLists) {
  if (!rankedLists || rankedLists.length === 0) return [];

  const scores = new Map(); // id -> merged item with rrfScore

  for (const list of rankedLists) {
    if (!Array.isArray(list)) continue;

    for (let rank = 0; rank < list.length; rank++) {
      const item = list[rank];
      if (!item || !item.id) continue;

      const id = item.id;
      const rrfContribution = 1 / (K + rank + 1); // rank is 0-based, +1 makes it 1-based

      if (scores.has(id)) {
        const existing = scores.get(id);
        existing.rrfScore += rrfContribution;
      } else {
        scores.set(id, { ...item, rrfScore: rrfContribution });
      }
    }
  }

  return [...scores.values()].sort((a, b) => b.rrfScore - a.rrfScore);
}

module.exports = { fuseResults, K };
