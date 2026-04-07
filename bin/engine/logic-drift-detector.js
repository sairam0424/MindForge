/**
 * MindForge v6.1.0-alpha — Neural Drift Remediation (NDR)
 * Component: Logic Drift Detector (Pillar X)
 * 
 * Analyzes reasoning traces for "Semantic Decay" (repeated failure patterns, 
 * hallucination-like markers, or mission drift).
 */
'use strict';

class LogicDriftDetector {
  constructor() {
    this.sessionDriftHistory = new Map(); // spanId -> [scores]
    this.DRIFT_THRESHOLD = 0.75;
    this.CRITICAL_DRIFT_THRESHOLD = 0.50; // v6.3.0: Recalibrated for IDC intervention readiness
  }

  /**
   * Analyzes a specific thought for logic drift.
   * @param {string} spanId 
   * @param {string} thought 
   */
  analyze(spanId, thought) {
    const semanticDensity = this._calculateSemanticDensity(thought);
    const patternScore = this._detectRepetitivePatterns(spanId, thought);
    const contradictionScore = this._checkHeuristicContradictions(thought);

    // v6.1 Weights: Aggressive on contradictions and patterns
    const driftScore = (semanticDensity * 0.1) + (patternScore * 0.5) + (contradictionScore * 0.4);

    if (!this.sessionDriftHistory.has(spanId)) {
      this.sessionDriftHistory.set(spanId, []);
    }
    this.sessionDriftHistory.get(spanId).push(driftScore);

    return {
      span_id: spanId,
      drift_score: parseFloat(driftScore.toFixed(4)),
      status: driftScore > this.DRIFT_THRESHOLD ? 'DRIFT_DETECTED' : 'STABLE',
      markers: {
        density: semanticDensity,
        pattern: patternScore,
        contradiction: contradictionScore
      }
    };
  }

  /**
   * Internal Heuristic: Detects low semantic density (rambling).
   */
  _calculateSemanticDensity(thought) {
    const words = thought.split(/\s+/).length;
    // Strip punctuation for keyword matching
    const keywords = thought.toLowerCase().replace(/[^\w\s]/g, '').match(/\b(\w{5,})\b/g) || [];
    const uniqueKeywords = new Set(keywords).size;
    
    if (words === 0) return 0;
    const ratio = uniqueKeywords / words;
    // v6.1 Hardening: High sensitivity to rambling
    return ratio < 0.25 ? 0.95 : 0.05; 
  }

  /**
   * Internal Heuristic: Detects circular reasoning across a span window 
   * and within the thought itself.
   */
  _detectRepetitivePatterns(spanId, currentThought) {
    const history = this.sessionDriftHistory.get(spanId) || [];
    
    // Internal Repetition Check (Strip punctuation)
    const normalized = currentThought.toLowerCase().replace(/[^\w\s]/g, '');
    const words = normalized.split(/\s+/).filter(w => w.length > 3);
    const wordCounts = {};
    words.forEach(w => wordCounts[w] = (wordCounts[w] || 0) + 1);
    
    const maxRep = Math.max(0, ...Object.values(wordCounts));
    const internalRepFactor = maxRep > 3 ? 0.9 : 0.1; // v6.1: Higher penalty

    if (history.length < 2) return internalRepFactor;

    // Window trending check
    const recentScores = history.slice(-3);
    const isTrendingUp = recentScores.length >= 2 && recentScores[recentScores.length-1] > recentScores[0];

    return Math.max(internalRepFactor, isTrendingUp ? 0.7 : 0.1);
  }

  /**
   * Internal Heuristic: Detects logic contradiction keywords.
   */
  _checkHeuristicContradictions(thought) {
    const t = thought.toLowerCase();
    const markers = ['nevertheless', 'however, i will instead', 'contradicting', 'error in reasoning', 'failed to', 'restart checking'];
    const hits = markers.filter(m => t.includes(m)).length;
    return Math.min(1.0, hits * 0.35); // v6.1: Higher impact per marker
  }
}

module.exports = new LogicDriftDetector();
