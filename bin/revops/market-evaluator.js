/**
 * MindForge v6.1.0-alpha — AgRevOps Arbitrage Hub
 * Component: Market Evaluator (Pillar IX)
 * 
 * Tracks real-time token costs, latency, and Intelligence Benchmarks 
 * to enable dynamic model selection based on MIR.
 */
'use strict';

const configManager = require('../governance/config-manager');

class MarketEvaluator {
  constructor() {
    this.marketRegistry = configManager.get('revops.market_registry', {});
  }

  /**
   * Evaluates a specific model's cost/performance.
   */
  evaluate(modelId) {
    return this.marketRegistry[modelId] || null;
  }

  /**
   * Suggests the cheapest provider that meets the Min-Intelligence-Requirement (MIR).
   * @param {number} minBenchmark - MIR Score (0-100)
   */
  getBestProvider(minBenchmark) {
    let bestMatch = null;

    // Filter models that meet MIR and sort by combined input/output cost
    const viable = Object.entries(this.marketRegistry)
      .filter(([id, data]) => data.benchmark >= minBenchmark)
      .sort((a, b) => {
        const costA = a[1].cost_input + a[1].cost_output;
        const costB = b[1].cost_input + b[1].cost_output;
        return costA - costB;
      });

    if (viable.length > 0) {
      const [id, data] = viable[0];
      return { model_id: id, ...data };
    }

    // Fallback to highest benchmark if none meet MIR exactly
    return this.getPremiumProvider();
  }

  /**
   * Intelligence fallback for mission-critical tasks.
   *
   * Resolves a model that ACTUALLY exists in the market registry (with real
   * cost/benchmark fields), so downstream cost accounting can never silently
   * zero out. Order: configured premium_fallback_model -> highest-benchmark
   * registry entry. FAILS CLOSED (throws) if the registry is empty rather than
   * returning a phantom costless model — a missing cost must never let the
   * AgRevOps hard-limit escalation become a no-op.
   *
   * (Previously hardcoded 'claude-3-5-sonnet', which is ABSENT from the registry
   * — `gold` was undefined and this returned a model with no cost fields.)
   */
  getPremiumProvider() {
    const preferred = configManager.get('revops.premium_fallback_model', null);
    if (preferred && this.marketRegistry[preferred]) {
      return { model_id: preferred, ...this.marketRegistry[preferred] };
    }

    // Fall back to the highest-benchmark registry entry.
    const ranked = Object.entries(this.marketRegistry)
      .sort((a, b) => (b[1].benchmark || 0) - (a[1].benchmark || 0));
    if (ranked.length === 0) {
      throw new Error('[market-evaluator] no models in revops.market_registry — cannot resolve a premium provider (failing closed)');
    }
    const [id, data] = ranked[0];
    return { model_id: id, ...data };
  }

  /**
   * Calculates potential savings vs a static premium baseline.
   */
  calculateArbitrageSavings(usedModelId, staticBaselineId = 'gpt-4o') {
    const used = this.evaluate(usedModelId);
    const baseline = this.evaluate(staticBaselineId);

    if (!used || !baseline) return 0;

    const usedTotal = used.cost_input + used.cost_output;
    const baseTotal = baseline.cost_input + baseline.cost_output;

    return Math.max(0, baseTotal - usedTotal);
  }
}

module.exports = new MarketEvaluator();
