/**
 * MindForge v6.3.0 — Intelligence-Drift Coupling (IDC)
 * Component: Intelligence Interlock
 * 
 * New architectural bridge that listens for critical logic-drift signals 
 * and triggers proactive model upgrades in the steering engine.
 */
'use strict';

const driftDetector = require('./logic-drift-detector');
const routerSteering = require('../revops/router-steering-v2');

class IntelligenceInterlock {
  constructor() {
    this.UPGRADE_THRESHOLD = 0.50; // v6.3.0 Threshold (Recalibrated for IDC readiness)
  }

  evaluate(spanId, thought) {
    const driftReport = driftDetector.analyze(spanId, thought);
    const driftScore = driftReport.drift_score;

    if (driftScore <= this.UPGRADE_THRESHOLD) {
      return { action: 'CONTINUE', drift_score: driftScore };
    }

    let tierIncrease;
    if (driftScore > 0.80) {
      tierIncrease = 'MAX';
    } else if (driftScore > 0.65) {
      tierIncrease = 2;
    } else {
      tierIncrease = 1;
    }

    let costWarning = false;
    try {
      const CostTracker = require('../models/cost-tracker');
      const dailySpend = CostTracker.getDailySpend ? CostTracker.getDailySpend() : 0;
      const hardLimit = CostTracker.getHardLimit ? CostTracker.getHardLimit() : Infinity;
      if (dailySpend / hardLimit > 0.8) {
        costWarning = true;
        tierIncrease = Math.min(tierIncrease === 'MAX' ? 3 : tierIncrease, 1);
      }
    } catch { /* cost tracker unavailable */ }

    return {
      action: 'UPGRADE_MIR',
      tier_increase: tierIncrease,
      drift_score: driftScore,
      cost_constrained: costWarning,
      reason: driftReport.markers
    };
  }
}

module.exports = new IntelligenceInterlock();
