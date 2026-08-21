/**
 * MindForge v8 — Orbital Governance (Pillar XVIII)
 * Component: Hardened Policy Gate (Final Evolution)
 * 
 * Enforces hardware-attested bypasses for high-impact system mutations.
 */
'use strict';

const orbitalGuardian = require('../engine/orbital-guardian');
const configManager = require('../governance/config-manager');

class PolicyGateHardened {
  constructor() {
    // bypasses.json deprecated in favor of orbital.attestations table (v8)
    // Impact scores are 0-100. This used to read `governance.critical_drift_threshold` with a
    // default of 95 — but that key is a DRIFT RATIO, read by bin/engine/logic-drift-detector.js:23
    // with a default of 0.50, and the shipped config sets it to 0.5. One key, two incompatible
    // scales: the drift detector was correct and this gate silently received 0.5 where it expected
    // ~95, making the "within standard threshold" branch below permanently dead.
    //
    // Dead was the SAFE direction, but it is one plausible edit from the unsafe one: raising that
    // key to 95 to "fix" this gate would return ALLOWED for every high-risk score AND break drift
    // detection, and policy-engine.js would then log "Biometric signature verified" for an
    // operation where no attestation was ever attempted. Hence a dedicated key, plus a range guard
    // so a ratio can never be mistaken for a score again.
    this.criticalThreshold = this.resolveImpactThreshold();
  }

  /**
   * The impact score (0-100) at or below which no hardware attestation is demanded.
   *
   * Rejects anything that is not on the 0-100 scale rather than trusting it. A value of 0.5 is a
   * ratio that somebody has pointed at the wrong knob, and silently accepting it is how this gate
   * came to compare a drift ratio against an impact score.
   *
   * @returns {number}
   */
  resolveImpactThreshold(fallback = 95) {
    const raw = configManager.get('governance.critical_impact_threshold', fallback);
    const value = Number(raw);
    if (!Number.isFinite(value) || value < 1 || value > 100) {
      // Deliberately loud: a mis-scaled threshold changes whether high-risk mutations demand
      // attestation at all, so it must not be absorbed quietly.
      console.warn(
        `[ORBITAL-GATE] governance.critical_impact_threshold=${JSON.stringify(raw)} is not an ` +
        'impact score on the 0-100 scale (a value below 1 is usually a drift RATIO pointed at the ' +
        `wrong key). Using ${fallback}.`);
      return fallback;
    }
    return value;
  }

  /**
   * Evaluates if an intent requires hardware-bound attestation.
   */
  async evaluateBypass(intent, impactScore) {
    if (impactScore <= this.criticalThreshold) {
      return { status: 'ALLOWED', reason: 'Impact within standard threshold' };
    }

    console.log(`[ORBITAL-GATE] Impact Score ${impactScore} requires Hardware Attestation`);

    // 1. Check SQLite via OrbitalGuardian (Unified v8 persistence)
    const attestation = await orbitalGuardian.verify(intent.requestId);
    
    if (attestation.verified) {
      return { 
        status: 'ALLOWED', 
        reason: 'Hardware Attestation Verified via Enclave', 
        attestation_id: attestation.id,
        timestamp: attestation.timestamp
      };
    }

    // 2. Trigger Orbital Challenge
    return {
      status: 'WAIT_FOR_ORBITAL',
      reason: 'Hardware/Biometric attestation required for orbital-tier mutation',
      challenge_id: `orb_${Math.random().toString(36).substr(2, 6)}`,
      impact: impactScore
    };
  }

  /**
   * Records a hardware-attested approval.
   */
  async recordBypass(requestId, did, signature_blob = 'MOCK_HARDWARE_SIGN_v8') {
    const report = await orbitalGuardian.attest(requestId, did, signature_blob);
    console.log(`[ORBITAL-GATE] Recorded Hardware Approval for Request: ${requestId}`);
    return report;
  }
}

module.exports = new PolicyGateHardened();
