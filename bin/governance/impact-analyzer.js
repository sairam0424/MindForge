/**
 * MindForge v6.0.0 — Context-Aware Dynamic Impact Analysis (CADIA)
 * Calculates the 'Blast Radius' score of a proposed intent.
 */
'use strict';

const fs = require('node:fs');
const path = require('node:path');

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
    'EXECUTE': 15,
    'GRANT': 20
  };

  // Cache for session-based entropy tracking
  static sessionState = new Map();

  /**
   * [CADIA] Scores an intent based on architectural influence, session entropy, and trust tiers.
   * Score Range: 0 - 100
   */
  static analyze(intent, context = {}) {
    const { action, target, namespace } = intent;
    const { sessionId = 'default', trustTier = 0, currentGoal = '' } = context;

    // 1. Critical Path Protection (Hardened)
    const isCritical = this.CRITICAL_PATHS.some(cp => 
      (target && (target.endsWith(cp) || target.includes(`/${cp}`)))
    );

    if (isCritical && (action === 'WRITE' || action === 'DELETE')) {
      return 100; // Automatic CRITICAL block
    }

    let score = this.ACTION_SCORES[action] || 5;
    
    // 2. [NEW] Architectural Influence Engine (x2.5 multiplier)
    if (this.isArchitecturallySignificant(target)) {
      score *= 2.5; 
    }

    // 3. Sensitive Namespace Multiplier (x4.0 multiplier)
    const isSensitive = this.SENSITIVE_NAMESPACES.some(ns => 
      (target && target.includes(ns)) || (namespace && namespace.includes(ns))
    );

    if (isSensitive) {
      score *= 4.0; 
    }

    // 4. [NEW] Session Entropy Tracker (+15 penalty)
    const sessCount = (this.sessionState.get(sessionId) || 0) + 1;
    this.sessionState.set(sessionId, sessCount);
    
    if (sessCount > 5) {
      score += (sessCount - 5) * 15; 
    }

    // 5. [NEW] Goal-to-Path Alignment (+40 penalty)
    if (currentGoal && !this.isGoalAligned(target, currentGoal)) {
      score += 40; 
    }

    // 6. [NEW] ZTAI-Trust Scaling (Risk buffer)
    const trustBuffer = trustTier * 10;
    score = Math.max(0, score - trustBuffer);

    // 7. Recursive Depth Scale
    if (target && target.split('/').length > 5) {
      score *= 1.25; 
    }

    return Math.min(Math.round(score), 100);
  }


  /**
   * Identifies files with high architectural side-effects.
   */
  static isArchitecturallySignificant(filePath) {
    if (!filePath) return false;
    const highWeightDirs = ['bin/governance', 'bin/engine', 'bin/models', '.mindforge/intelligence'];
    const highWeightFiles = ['package.json', 'sdk/nexus-core.js', 'bin/mindforge-cli.js'];
    
    return highWeightDirs.some(d => filePath.includes(d)) || 
           highWeightFiles.some(f => filePath.endsWith(f));
  }

  /**
   * Checks if the target path semantically aligns with the current active goal/phase.
   */
  static isGoalAligned(filePath, currentGoal) {
    if (!currentGoal || !filePath) return true; // Default to neutral if no goal set
    
    // Simple heuristic: Does the goal mention the file or directory?
    const normalizedGoal = currentGoal.toLowerCase();
    const normalizedPath = filePath.toLowerCase();
    
    // Extract domain (e.g., 'auth', 'ui', 'api')
    const domain = normalizedPath.split('/')[0];
    
    return normalizedGoal.includes(domain) || 
           normalizedGoal.includes(path.basename(normalizedPath, path.extname(normalizedPath)));
  }

  static getRiskTier(score) {
    if (score < 25) return 'LOW';
    if (score < 50) return 'MEDIUM';
    if (score < 75) return 'HIGH';
    return 'CRITICAL';
  }

  static resetSession(sessionId) {
    this.sessionState.delete(sessionId);
  }
}

module.exports = ImpactAnalyzer;

