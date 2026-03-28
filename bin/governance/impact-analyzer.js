/**
 * MindForge v5.4.0 — Impact Analyzer (Hardened Edition)
 * Calculates the 'Blast Radius' score of a proposed intent.
 */
'use strict';

class ImpactAnalyzer {
  static CRITICAL_PATHS = [
    '.env',
    'id_rsa',
    '*.pem',
    'package-lock.json',
    'yarn.lock',
    'AUDIT.jsonl',
    'STATE.md'
  ];

  static SENSITIVE_NAMESPACES = [
    '.mindforge',
    'bin/',
    'config/',
    '.agent/',
    'security/'
  ];

  static ACTION_SCORES = {
    'READ': 1,
    'WRITE': 5,
    'DELETE': 10,
    'EXECUTE': 15, // Raised from 8
    'GRANT': 20    // Raised from 15
  };

  /**
   * Scores an intent based on action type, target path sensitivity, and recursion depth.
   * Score Range: 0 - 100
   */
  static analyze(intent) {
    const { action, target, namespace } = intent;
    
    // 1. Critical Path Protection (Score 100)
    const isCritical = this.CRITICAL_PATHS.some(cp => 
      (target && (target.endsWith(cp) || target.includes(`/${cp}`)))
    );

    if (isCritical && (action === 'WRITE' || action === 'DELETE')) {
      return 100; // Automatic CRITICAL block
    }

    let score = this.ACTION_SCORES[action] || 5;
    
    // 2. Sensitive Namespace Multiplier
    const isSensitive = this.SENSITIVE_NAMESPACES.some(ns => 
      (target && target.includes(ns)) || (namespace && namespace.includes(ns))
    );

    if (isSensitive) {
      score *= 4; 
    }

    // 3. Recursive Depth Penalty (Beast Mode)
    if (target && target.split('/').length > 5) {
      score *= 1.5; // Deeper actions are riskier (mass-scale silent mods)
    }

    // Cap the score at 100
    return Math.min(Math.round(score), 100);
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
