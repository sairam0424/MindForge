/**
 * MindForge v6.4.0 — Context Entropy Guard (CEG)
 * Component: Context Entropy Guard (Pillar XI)
 * 
 * Actively manages context density by suppressing reasoning noise 
 * and compressing repetitive semantic loops before handoff.
 */
'use strict';

class ContextEntropyGuard {
  constructor() {
    this.SIMILARITY_SUPPRESSION_THRESHOLD = 0.85; // Suppress thoughts > 85% similar
    this.STAGNATION_LIMIT = 3; // Max repetitive cycles before compression
  }

  /**
   * Prunes and compresses a reasoning trace to manage context entropy.
   * @param {Array} trace - Array of reasoning trace events.
   * @returns {Array} - Guarded reasoning trace.
   */
  compress(trace) {
    if (!trace || trace.length === 0) return [];

    const result = [];
    const history = [];
    let loopBuffer = [];

    for (const event of trace) {
      if (event.event !== 'reasoning_trace') {
        result.push(event);
        continue;
      }

      const similarity = this._calculateMaxSimilarity(event.thought, history);
      
      if (similarity > this.SIMILARITY_SUPPRESSION_THRESHOLD) {
        // High similarity: Buffer for potential compression
        loopBuffer.push(event);
        if (loopBuffer.length >= this.STAGNATION_LIMIT) {
          // Trigger automatic compression/digest
          const digest = {
            event: 'reasoning_digest',
            summary: `Compressed reasoning loop (${loopBuffer.length} stagnant steps).`,
            final_conclusion: event.thought,
            timestamp: new Date().toISOString()
          };
          // Replace buffered noise with a single digest
          result.push(digest);
          loopBuffer = []; 
        }
        continue;
      }

      // If we had a short buffer that didn't reach stagnation limit, push them back
      if (loopBuffer.length > 0) {
        result.push(...loopBuffer);
        loopBuffer = [];
      }

      result.push(event);
      history.push(event.thought);
      if (history.length > 10) history.shift(); // Keep history window sliding
    }

    // Final flush for items remaining in buffer
    if (loopBuffer.length > 0) {
      result.push(...loopBuffer);
    }

    return result;
  }

  /**
   * Internal Similarity Heuristic (Jaccard)
   */
  _calculateMaxSimilarity(thought, history) {
    if (history.length === 0) return 0;
    
    const getTokens = (str) => new Set(str.toLowerCase().split(/\s+/).filter(t => t.length > 3));
    const currentTokens = getTokens(thought);
    
    let max = 0;
    for (const prev of history) {
      const prevTokens = getTokens(prev);
      const intersection = new Set([...currentTokens].filter(x => prevTokens.has(x)));
      const union = new Set([...currentTokens, ...prevTokens]);
      const sim = union.size === 0 ? 0 : intersection.size / union.size;
      if (sim > max) max = sim;
    }
    return max;
  }
}

module.exports = new ContextEntropyGuard();
