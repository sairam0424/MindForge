/**
 * MindForge v11.2.0 — Self-Corrective Synthesis (SCS)
 * Component: Self-Corrective Synthesizer (Pillar XII)
 *
 * Analyzes mission drift and logic stagnation to synthesize
 * corrective steering signals (Homing Instructions).
 *
 * v11: Expanded analysis window (50 events), exponential decay weighting,
 * and correction effectiveness tracking.
 */
'use strict';

const rsa = require('./reason-source-aligner.js');

const HISTORY_LIMIT = 50;
const DECAY_FACTOR = 0.95;
const MAX_CORRECTION_HISTORY = 20;

class SelfCorrectiveSynthesizer {
  constructor() {
    this.historyLimit = HISTORY_LIMIT;
    this.synthesisCount = 0;
    this.correctionHistory = [];
  }

  /**
   * Evaluates a suboptimal state and generates a corrective thought.
   * @param {Array} auditTrail - Recent audit events.
   * @param {Object} context - Current execution context.
   */
  async synthesizeCorrection(auditTrail, context) {
    console.log('[SCS] Critical drift detected. Initiating internal alignment pass...');

    this._evaluatePreviousCorrection(auditTrail);

    const recentEvents = auditTrail.slice(-this.historyLimit);

    // Weight events by recency: newest = 1.0, decays by 0.95^position
    const weightedEvents = recentEvents.map((event, i) => ({
      ...event,
      weight: Math.pow(DECAY_FACTOR, recentEvents.length - 1 - i)
    }));

    const failureEvents = weightedEvents.filter(e =>
      e.type === 'mission_fidelity' && e.alignment.confidence < 0.50
    );

    if (failureEvents.length === 0) {
      return this._generateGenericRefocus(context);
    }

    // Weighted sort: higher weight (more recent) failures surface first
    const sortedFailures = [...failureEvents].sort((a, b) => b.weight - a.weight);

    const targetId = sortedFailures[0].alignment.best_match_id;
    const requirement = rsa.getRequirementDetails(targetId);

    if (!requirement) {
      return this._generateGenericRefocus(context);
    }

    this.synthesisCount++;

    const currentConfidence = sortedFailures[0].alignment.confidence;
    const correctionId = `scs_${Date.now()}_${this.synthesisCount}`;

    const correction = {
      type: 'scs_refocus',
      correctionId,
      req_id: targetId,
      instruction: `[SCS-REFOCUS] Targeting [${targetId}]: ${requirement.summary}. Action: Resuming strict alignment with core requirement: ${requirement.description.split('\n')[0]}`,
      confidence: 0.98
    };

    this._recordCorrection(correctionId, currentConfidence);

    console.log(`[SCS] Synthesis complete. Correction targeted at ${targetId}.`);
    return correction;
  }

  _evaluatePreviousCorrection(auditTrail) {
    if (this.correctionHistory.length === 0) return;

    const lastCorrection = this.correctionHistory[this.correctionHistory.length - 1];
    if (lastCorrection.effective !== undefined) return;

    const recentEvents = auditTrail.slice(-this.historyLimit);
    const fidelityEvents = recentEvents.filter(e =>
      e.type === 'mission_fidelity' && e.alignment
    );

    if (fidelityEvents.length === 0) return;

    const latestConfidence = fidelityEvents[fidelityEvents.length - 1].alignment.confidence;
    const improved = latestConfidence > lastCorrection.preConfidence;

    // Immutable update: replace last entry with effectiveness result
    const updatedEntry = {
      ...lastCorrection,
      postConfidence: latestConfidence,
      effective: improved
    };

    this.correctionHistory = [
      ...this.correctionHistory.slice(0, -1),
      updatedEntry
    ];
  }

  _recordCorrection(correctionId, preConfidence) {
    const entry = {
      correctionId,
      timestamp: new Date().toISOString(),
      preConfidence
    };

    if (this.correctionHistory.length >= MAX_CORRECTION_HISTORY) {
      this.correctionHistory = [...this.correctionHistory.slice(1), entry];
    } else {
      this.correctionHistory = [...this.correctionHistory, entry];
    }
  }

  getEffectivenessRate() {
    if (this.correctionHistory.length === 0) return null;
    const effective = this.correctionHistory.filter(c => c.effective).length;
    return effective / this.correctionHistory.length;
  }

  _generateGenericRefocus(context) {
    return {
      type: 'scs_refocus',
      instruction: '[SCS-GENERAL-HOMING] Reasoning drift detected. I am resetting my internal thought buffer and re-reading the project constitution to ensure mission fidelity.',
      confidence: 0.85
    };
  }
}

module.exports = new SelfCorrectiveSynthesizer();
