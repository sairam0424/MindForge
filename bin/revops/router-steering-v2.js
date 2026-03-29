/**
 * MindForge v6.1.0-alpha — AgRevOps Arbitrage Hub
 * Component: Router Steering (Pillar IX)
 * 
 * Intercepts model requests and selects the best provider based 
 * on Min-Intelligence-Requirement (MIR) heuristics.
 */
'use strict';

const marketEvaluator = require('./market-evaluator');

class RouterSteering {
  constructor() {
    this.history = [];
  }

  /**
   * Steers a reasoning task to the optimal model.
   * @param {string} spanId - From Nexus Tracer
   * @param {string} taskDescription - Natural language task context
   * @param {Object} preferences - Manual overrides (optional)
   */
  async steer(spanId, taskDescription, preferences = {}) {
    const mir = this._calculateMIR(taskDescription);
    const recommendation = marketEvaluator.getBestProvider(mir);

    const selection = {
      span_id: spanId,
      mir_score: mir,
      selected_model: recommendation.model_id,
      provider: recommendation.provider,
      estimated_arbitrage_savings: marketEvaluator.calculateArbitrageSavings(recommendation.model_id),
      timestamp: new Date().toISOString()
    };

    console.log(`[AgRevOps] Steered Span ${spanId} to ${selection.selected_model} (MIR: ${mir})`);
    
    this.history.push(selection);
    return selection;
  }

  /**
   * Internal Heuristic: Calculate Min-Intelligence-Requirement (MIR).
   */
  _calculateMIR(task) {
    const t = task.toLowerCase();
    
    // Tier 1: High-Complexity (MIR 95+)
    if (t.includes('architect') || t.includes('security') || t.includes('governance') || 
        t.includes('cryptography') || t.includes('enclave') || t.includes('blueprint')) {
      return 98; 
    }
    
    // Tier 2: Standard Reasoning (MIR 85-94)
    if (t.includes('implement') || t.includes('refactor') || t.includes('integrate') || 
        t.includes('optimize') || t.includes('logic')) {
      return 92;
    }

    // Tier 3: Low-Complexity/Boilerplate (MIR <85)
    if (t.includes('test') || t.includes('verify') || t.includes('polish') || t.includes('sync') || t.includes('markdown')) {
      return 82;
    }

    return 90; // Default baseline
  }

  getHistory() {
    return this.history;
  }
}

module.exports = new RouterSteering();
