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

  /**
   * Evaluates if a model upgrade is required based on reasoning drift.
   * @param {string} spanId 
   * @param {string} thought 
   */
  evaluate(spanId, thought) {
    const analysis = driftDetector.analyze(spanId, thought);
    
    if (analysis.drift_score > this.UPGRADE_THRESHOLD) {
      console.log(`[IDC] Critical Drift Detected (${analysis.drift_score}). Recommending intelligence upgrade for Span ${spanId}.`);
      return {
        action: 'UPGRADE_MIR',
        new_mir: 99, // Force maximum intelligence (Tier 1+)
        reason: analysis.markers
      };
    }

    return { action: 'CONTINUE', drift: analysis.drift_score };
  }
}

module.exports = new IntelligenceInterlock();
