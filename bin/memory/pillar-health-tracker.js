/**
 * MindForge v6.7.0 — Pillar Health Tracker
 * Component: Architectural Health & Stability (Pillar XVIII)
 * 
 * Aggregates scores from RSA, SCS, and IDC pillars to track project 
 * stability and identify requirement-stagnation patterns.
 */
'use strict';

const fs = require('fs');

class PillarHealthTracker {
  /**
   * Summarizes the health of a completed phase based on the audit trail.
   * @param {string} auditPath - Path to AUDIT.jsonl
   */
  summarizePhase(auditPath) {
    if (!fs.existsSync(auditPath)) return null;

    const lines = fs.readFileSync(auditPath, 'utf8').trim().split('\n');
    const events = lines.map(l => JSON.parse(l));

    // 1. RSA (Mission Fidelity) Analysis
    const rsaEvents = events.filter(e => e.type === 'mission_fidelity' || e.event === 'scs_homing_injected');
    const avgRsa = rsaEvents.length > 0 
      ? rsaEvents.reduce((s, e) => s + (e.alignment?.confidence || e.confidence || 0), 0) / rsaEvents.length 
      : 1.0;

    // 2. IDC (Intelligence Drift) Analysis
    const idcEvents = events.filter(e => e.event === 'intelligence_upgrade_signalled');
    const idcScore = idcEvents.length; // Count of upgrades as drift indicator

    // 3. Extract Stability Patterns (Successful SCS Homing)
    const stabilityPatterns = events
      .filter(e => e.event === 'scs_homing_injected' && e.confidence > 0.6)
      .map(e => ({
        req_id: e.req_id,
        instruction: e.instruction,
        efficacy: e.confidence
      }));

    return {
      avgRsa: parseFloat(avgRsa.toFixed(4)),
      idcCount: idcScore,
      stabilityPatterns
    };
  }

  /**
   * Aggregates stability patterns by requirement ID.
   */
  getHighEfficacyTemplates(stabilityPatterns) {
    const byId = new Map();
    for (const p of stabilityPatterns) {
      if (!byId.has(p.req_id) || byId.get(p.req_id).efficacy < p.efficacy) {
        byId.set(p.req_id, p);
      }
    }
    return Array.from(byId.values());
  }
}

module.exports = new PillarHealthTracker();
