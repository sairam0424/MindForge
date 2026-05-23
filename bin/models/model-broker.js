const fs = require('fs');
const path = require('path');
const CloudBroker = require('./cloud-broker');

class ModelBroker {
  constructor(config = {}) {
    this.projectRoot = config.projectRoot || process.cwd();
    this.cloudBroker = new CloudBroker(config.cloud);
    this.defaults = {
      EXECUTOR_MODEL: 'sonnet',
      PLANNER_MODEL: 'sonnet',
      SECURITY_MODEL: 'opus',
      QA_MODEL: 'sonnet',
      RESEARCH_MODEL: 'sonnet',
      DEBUG_MODEL: 'sonnet',
      QUICK_MODEL: 'haiku',
    };
  }

  /**
   * Resolves the optimal model for a given task (v5 Multi-Cloud Arbitrage).
   * @param {Object} context - Task context (persona, difficulty, tier)
   * @returns {Object} - Resolved model details (modelId, provider, costTier, reasoning)
   */
  resolveModel(context) {
    const { persona, difficulty, tier } = context;
    let modelGroup = this.defaults.EXECUTOR_MODEL;
    let reasoningParts = [];

    // 1. Check Security Tier (T3 requires premium models)
    if (tier === 3) {
      modelGroup = this.defaults.SECURITY_MODEL;
      reasoningParts.push('Tier 3 (Principal) action requires high-trust model (Opus).');
    } else {
      // 2. Map Persona to Base Model
      const personaMap = {
        'executor': 'EXECUTOR_MODEL',
        'planner': 'PLANNER_MODEL',
        'security-reviewer': 'SECURITY_MODEL',
        'qa-engineer': 'QA_MODEL',
        'researcher': 'RESEARCH_MODEL',
        'debug-specialist': 'DEBUG_MODEL',
      };
      if (personaMap[persona]) {
        modelGroup = this.defaults[personaMap[persona]];
      }
    }

    // 3. Complexity-based Overrides
    if (difficulty < 2.0 && difficulty !== undefined && tier !== 3) {
      modelGroup = this.defaults.QUICK_MODEL;
      reasoningParts.push(`Low difficulty (${difficulty}) -> Quick model.`);
    } else if (difficulty > 4.5 && tier !== 3) {
      modelGroup = this.defaults.SECURITY_MODEL;
      reasoningParts.push(`High difficulty (${difficulty}) -> Complexity upgrade.`);
    }

    // 4. v5 Multi-Cloud Arbitrage
    const provider = this.cloudBroker.getBestProvider({ 
      latencyConstraint: tier === 3 ? 500 : 1000 
    });
    const modelId = this.cloudBroker.mapToProviderModel(provider, modelGroup);
    
    reasoningParts.push(`Arbitrage: Routed to ${provider} (${modelId}) based on latency/cost.`);

    return { 
      modelId, 
      provider,
      modelGroup,
      costTier: modelGroup === 'opus' ? 'high' : (modelGroup === 'haiku' ? 'low' : 'medium'), 
      reasoning: reasoningParts.join(' ') 
    };
  }

  /**
   * Implements the Provider Fallback Protocol (v5 Pillar V).
   * @param {string} failedProvider - The provider that failed.
   * @param {string} modelGroup - The group being requested.
   * @returns {Object} - New model and provider details.
   */
  handleProviderFailure(failedProvider, modelGroup) {
    const fallbackProvider = this.cloudBroker.getFallbackProvider(failedProvider);
    const modelId = this.cloudBroker.mapToProviderModel(fallbackProvider, modelGroup);

    console.warn(`[P5-FALLBACK] Provider ${failedProvider} failed. Migrating context to ${fallbackProvider} (${modelId}).`);

    return {
      modelId,
      provider: fallbackProvider,
      modelGroup,
      reasoning: `Provider Fallback Protocol: Emergency migration from ${failedProvider} to ${fallbackProvider}.`
    };
  }

  /**
   * Tracks the "Agentic ROI" for a completed task.
   * @param {Object} report - Task execution report (tokens, duration, status)
   */
  trackROI(report) {
    const roiPath = path.join(this.projectRoot, '.planning', 'ROI.jsonl');
    const entry = {
      timestamp: new Date().toISOString(),
      planId: report.planId,
      task: report.taskName,
      model: report.modelId,
      costTier: report.costTier,
      inputTokens: report.inputTokens,
      outputTokens: report.outputTokens,
      durationMs: report.durationMs,
      status: report.status,
      goalAchieved: report.status === 'completed' ? 1 : 0,
      estimatedCostUSD: this.estimateCost(report.modelId, report.inputTokens, report.outputTokens),
    };

    fs.appendFileSync(roiPath, JSON.stringify(entry) + '\n');
  }

  estimateCost(modelId, input, output) {
    // v9: Pricing aligned to Claude 4.x family (per 1M tokens)
    const rates = {
      'claude-opus-4-7':   { in: 15, out: 75 },
      'claude-sonnet-4-6': { in: 3, out: 15 },
      'claude-haiku-4-5':  { in: 0.80, out: 4.0 },
      'gemini-2.5-pro':    { in: 1.25, out: 10 },
    };

    const rate = rates[modelId] || rates['claude-sonnet-4-6'];
    return (input / 1_000_000) * rate.in + (output / 1_000_000) * rate.out;
  }
}

module.exports = ModelBroker;
