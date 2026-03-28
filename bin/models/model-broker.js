/**
 * MindForge — ModelBroker (Pillar V: Autonomous FinOps Hub)
 * Calculates C2C (Confidence-to-Cost) and routes tasks to optimal models.
 */

const fs = require('fs');
const path = require('path');

class ModelBroker {
  constructor(config = {}) {
    this.projectRoot = config.projectRoot || process.cwd();
    this.defaults = {
      EXECUTOR_MODEL: 'claude-3-5-sonnet',
      PLANNER_MODEL: 'claude-3-5-sonnet',
      SECURITY_MODEL: 'claude-3-opus',
      QA_MODEL: 'claude-3-5-sonnet',
      RESEARCH_MODEL: 'claude-3-5-sonnet',
      DEBUG_MODEL: 'claude-3-5-sonnet',
      QUICK_MODEL: 'claude-3-haiku',
    };
  }

  /**
   * Resolves the optimal model for a given task.
   * @param {Object} context - Task context (persona, difficulty, tier)
   * @returns {Object} - Resolved model details (modelId, costTier, reasoning)
   */
  resolveModel(context) {
    const { persona, difficulty, tier } = context;
    let modelId = this.defaults.EXECUTOR_MODEL;
    let reasoning = 'Default executor model.';

    // 1. Check Security Tier (T3 requires premium models)
    if (tier === 3) {
      modelId = this.defaults.SECURITY_MODEL;
      reasoning = 'Tier 3 (Principal) action requires high-trust model (Opus).';
      return { modelId, costTier: 'high', reasoning };
    }

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
      modelId = this.defaults[personaMap[persona]];
      reasoning = `Routed to ${persona} specialist model.`;
    }

    // 3. Calculate C2C (Confidence-to-Cost)
    // If difficulty is low (< 2.0), route to Quick Model (Haiku) to save costs.
    if (difficulty < 2.0 && difficulty !== undefined) {
      const originalModel = modelId;
      modelId = this.defaults.QUICK_MODEL;
      reasoning = `Low difficulty (${difficulty}) - C2C Optimization: Switched ${originalModel} to Haiku.`;
      return { modelId, costTier: 'low', reasoning };
    }

    // 4. Handle Complex Tasks (Difficulty > 4.0)
    if (difficulty > 4.0) {
      modelId = this.defaults.SECURITY_MODEL; // Use Opus for high complexity
      reasoning = `High difficulty (${difficulty}) - Complexity routing: Upgraded to Opus.`;
      return { modelId, costTier: 'high', reasoning };
    }

    return { modelId, costTier: 'medium', reasoning };
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
    // Mock cost estimation logic per 1M tokens
    const rates = {
      'claude-3-opus': { in: 15, out: 75 },
      'claude-3-5-sonnet': { in: 3, out: 15 },
      'claude-3-haiku': { in: 0.25, out: 1.25 },
    };

    const rate = rates[modelId] || rates['claude-3-5-sonnet'];
    return (input / 1_000_000) * rate.in + (output / 1_000_000) * rate.out;
  }
}

module.exports = ModelBroker;
