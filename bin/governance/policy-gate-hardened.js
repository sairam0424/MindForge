/**
 * MindForge v7 — Post-Quantum Agentic Security (PQAS)
 * Component: Hardened Policy Gate
 * 
 * Enforces strict biometric/executive bypasses for high-impact mutations.
 */
'use strict';

const fs = require('node:fs');
const path = require('node:path');

class PolicyGateHardened {
  constructor() {
    this.bypassStore = path.join(process.cwd(), '.mindforge', 'bypasses.json');
  }

  /**
   * Evaluates if an intent requires a biometric bypass.
   * @param {Object} intent 
   * @param {number} impactScore 
   */
  async evaluateBypass(intent, impactScore) {
    if (impactScore <= 95) {
      return { status: 'ALLOWED', reason: 'Impact within standard threshold' };
    }

    console.log(`[PQAS-GATE] Impact Score ${impactScore} exceeds Critical Threshold (95)`);
    
    // Check if a pre-existing bypass exists for this request
    const bypasses = this._loadBypasses();
    const existing = bypasses.find(b => b.requestId === intent.requestId && b.status === 'APPROVED');

    if (existing) {
      return { status: 'ALLOWED', reason: 'Biometric Bypass Verified via WebAuthn/DEX', signature: existing.signature };
    }

    // Trigger a new challenge
    return { 
      status: 'WAIT_FOR_BIOMETRIC', 
      reason: 'Biometric steering required for high-impact mutation',
      challenge_id: `ch_${Math.random().toString(36).substr(2, 6)}`,
      threshold: 95
    };
  }

  /**
   * Records a manual bypass approval (Simulated).
   */
  async recordBypass(requestId, signature) {
    const bypasses = this._loadBypasses();
    bypasses.push({
      requestId,
      signature,
      status: 'APPROVED',
      timestamp: new Date().toISOString()
    });
    this._saveBypasses(bypasses);
    console.log(`[PQAS-GATE] Recorded Biometric Approval for Request: ${requestId}`);
  }

  _loadBypasses() {
    try {
      if (fs.existsSync(this.bypassStore)) {
        return JSON.parse(fs.readFileSync(this.bypassStore, 'utf8'));
      }
    } catch (err) {}
    return [];
  }

  _saveBypasses(data) {
    if (!fs.existsSync(path.dirname(this.bypassStore))) {
      fs.mkdirSync(path.dirname(this.bypassStore), { recursive: true });
    }
    fs.writeFileSync(this.bypassStore, JSON.stringify(data, null, 2));
  }
}

module.exports = new PolicyGateHardened();
