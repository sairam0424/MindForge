/**
 * MindForge v6.1.0-alpha — AgRevOps Arbitrage Hub
 * Component: Market Evaluator (Pillar IX)
 * 
 * Tracks real-time token costs, latency, and Intelligence Benchmarks 
 * to enable dynamic model selection based on MIR.
 */
'use strict';

class MarketEvaluator {
  constructor() {
    // Simulated live market data (Values based on avg market tiers)
    this.marketRegistry = {
      'gemini-1.5-pro': { cost_input: 0.0035, cost_output: 0.0105, benchmark: 98, provider: 'Google' },
      'claude-3-5-sonnet': { cost_input: 0.0030, cost_output: 0.0150, benchmark: 99, provider: 'Anthropic' },
      'gpt-4o': { cost_input: 0.0050, cost_output: 0.0150, benchmark: 97, provider: 'OpenAI' },
      'llama-3-70b-local': { cost_input: 0.0001, cost_output: 0.0001, benchmark: 92, provider: 'Sovereign' },
      'gemini-1.5-flash': { cost_input: 0.0003, cost_output: 0.0003, benchmark: 85, provider: 'Google' },
      'haiku-3': { cost_input: 0.0002, cost_output: 0.0004, benchmark: 82, provider: 'Anthropic' }
    };
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
   */
  getPremiumProvider() {
    const gold = this.marketRegistry['claude-3-5-sonnet'];
    return { model_id: 'claude-3-5-sonnet', ...gold };
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
