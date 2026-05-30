'use strict';

/**
 * Recall@K — fraction of relevant items found in the top-k retrieved results.
 * @param {string[]} retrieved - IDs in ranked order
 * @param {string[]} relevant - ground-truth relevant IDs
 * @param {number} k - cutoff
 * @returns {number} recall in [0, 1]
 */
function recallAtK(retrieved, relevant, k) {
  if (relevant.length === 0) return 0;
  const topK = retrieved.slice(0, k);
  const relevantSet = new Set(relevant);
  const found = topK.filter(id => relevantSet.has(id)).length;
  return found / relevant.length;
}

/**
 * nDCG (Normalized Discounted Cumulative Gain) with graded relevance.
 * @param {string[]} retrieved - IDs in ranked order
 * @param {Object.<string, number>} relevanceMap - {id: grade} where grade is 0-3
 * @param {number} k - cutoff
 * @returns {number} nDCG in [0, 1]
 */
function ndcg(retrieved, relevanceMap, k) {
  const topK = retrieved.slice(0, k);

  // DCG = Σ (2^rel_i - 1) / log2(i + 2) for i = 0..k-1
  const dcg = topK.reduce((sum, id, i) => {
    const rel = relevanceMap[id] || 0;
    return sum + (Math.pow(2, rel) - 1) / Math.log2(i + 2);
  }, 0);

  // IDCG — ideal ordering: sort all relevance grades descending, take top-k
  const idealGrades = Object.values(relevanceMap)
    .filter(g => g > 0)
    .sort((a, b) => b - a)
    .slice(0, k);

  const idcg = idealGrades.reduce((sum, rel, i) => {
    return sum + (Math.pow(2, rel) - 1) / Math.log2(i + 2);
  }, 0);

  if (idcg === 0) return 0;
  return dcg / idcg;
}

/**
 * Run a full evaluation over a golden set of queries.
 * @param {Object} opts
 * @param {Array<{query: string, relevant: string[]}>} opts.goldenSet
 * @param {function(string): string[]} opts.retriever
 * @param {number} opts.k
 * @param {function} [opts.judge] - optional judge (unused for now)
 * @returns {Promise<{meanRecallAtK: number, meanNDCG: number, perQuery: Array}>}
 */
async function runEval({ goldenSet, retriever, k, judge }) {
  const perQuery = [];

  for (const { query, relevant } of goldenSet) {
    const retrieved = await Promise.resolve(retriever(query));

    // Binary relevance map: relevant items get grade 1, others 0
    const relevanceMap = {};
    for (const id of relevant) {
      relevanceMap[id] = 1;
    }

    const recall = recallAtK(retrieved, relevant, k);
    const ndcgScore = ndcg(retrieved, relevanceMap, k);

    perQuery.push({ query, recall, ndcg: ndcgScore, retrieved });
  }

  const meanRecallAtK = perQuery.reduce((s, q) => s + q.recall, 0) / perQuery.length;
  const meanNDCG = perQuery.reduce((s, q) => s + q.ndcg, 0) / perQuery.length;

  return { meanRecallAtK, meanNDCG, perQuery };
}

module.exports = { recallAtK, ndcg, runEval };
