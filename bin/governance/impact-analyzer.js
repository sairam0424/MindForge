/**
 * MindForge v5.3.0 — Impact Analyzer (Dynamic Blast Radius)
 * Calculates the 'Blast Radius' score of a proposed intent.
 */
'use strict';

class ImpactAnalyzer {
  static SENSITIVE_NAMESPACES = [
    '.mindforge',
    'bin/',
    'config/',
    '.env',
    'security/'
  ];

  static ACTION_SCORES = {
    'READ': 1,
    'WRITE': 5,
    'DELETE': 10,
    'EXECUTE': 8,
    'GRANT': 15
  };

  /**
   * Scores an intent based on action type and target path sensitivity.
   * Score Range: 0 - 100
   */
  static analyze(intent) {
    const { action, target, namespace } = intent;
    
    let score = this.ACTION_SCORES[action] || 5;
    
    // Check for sensitive namespace overlap
    const isSensitive = this.SENSITIVE_NAMESPACES.some(ns => 
      (target && target.includes(ns)) || (namespace && namespace.includes(ns))
    );

    if (isSensitive) {
      score *= 4; // Quadruple impact for sensitive areas
    }

    // Cap the score at 100
    return Math.min(score, 100);
  }

  /**
   * Returns a risk tier based on the score.
   */
  static getRiskTier(score) {
    if (score < 20) return 'LOW';
    if (score < 50) return 'MEDIUM';
    if (score < 80) return 'HIGH';
    return 'CRITICAL';
  }
}

module.exports = ImpactAnalyzer;
