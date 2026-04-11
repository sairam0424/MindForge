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
    this.criticalThreshold = configManager.get('governance.critical_drift_threshold', 95); 
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
