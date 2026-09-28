const fs = require('fs');
const path = require('path');
const CloudBroker = require('./cloud-broker');
const pricingRegistry = require('./pricing-registry');

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
    // THE DEFECT this replaces: this method used to carry its own hardcoded per-model rate table,
    // a second, independent pricing source alongside bin/models/pricing-registry.js -- the file
    // CLAUDE.md names as the single source of truth ("all providers call priceCall(). Never
    // hardcode per-model prices in a provider."). ModelBroker has zero production callers today
    // (only its own test requires it), so the drift never bit anyone yet, but the moment it gets
    // wired to a real caller, this table would silently diverge from .mindforge/config.json's
    // revops.market_registry the first time pricing changes there. Delegate instead.
    return pricingRegistry.priceCall(modelId, { input_tokens: input, output_tokens: output });
  }
}

module.exports = ModelBroker;
