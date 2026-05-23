/**
 * MindForge v8 — Orbital Governance
 * Component: Orbital Guardian (Pillar XVIII)
 *
 * Manages hardware-bound/biometric attestations for high-blast-radius actions.
 */
'use strict';

const vectorHub = require('../memory/vector-hub');
const ztaiManager = require('../governance/ztai-manager');
const crypto = require('node:crypto');

class OrbitalGuardian {
  constructor() {
    this.vhInitialized = false;
  }

  async ensureInit() {
    if (!this.vhInitialized) {
      await vectorHub.init();
      this.vhInitialized = true;
    }
  }

  /**
   * Generates a new hardware-attested approval report.
   * Mimics a biometric/HSM handshake.
   */
  async attest(requestId, did, payload) {
    await this.ensureInit();
    console.log(`[ORBITAL-GUARDIAN] Requesting Hardware Attestation for [${requestId}] via [${did}]`);

    const agent = ztaiManager.getAgent(did);
    if (!agent || agent.tier < 3) {
      throw new Error(`[ORBITAL-GUARDIAN] DID ${did} has insufficient Trust Tier for Orbital Attestation.`);
    }

    // 1. Sign the attestation payload using the Hardware Enclave provider
    const attestationPayload = await ztaiManager.signData(did, JSON.stringify({
      requestId,
      payload,
      timestamp: new Date().toISOString()
    }));

    const attestation = {
      id: `att_${crypto.randomBytes(4).toString('hex')}`,
      request_id: requestId,
      status: 'APPROVED',
      attestation_payload: attestationPayload,
      timestamp: new Date().toISOString()
    };

    // 2. Persist to SQLite (Source of truth for v8 Governance Dashboard)
    vectorHub.run(
      `INSERT INTO attestations (id, request_id, status, attestation_payload, timestamp)
       VALUES (?, ?, ?, ?, ?)`,
      [attestation.id, attestation.request_id, attestation.status, attestation.attestation_payload, attestation.timestamp]
    );

    console.log(`[ORBITAL-GUARDIAN] Attestation SUCCESS: ${attestation.id}`);
    return attestation;
  }

  /**
   * Verifies if a request has a valid hardware bypass.
   */
  async verify(requestId) {
    if (!requestId) return { verified: false };
    await this.ensureInit();

    const results = vectorHub.query(
      'SELECT * FROM attestations WHERE request_id = ? AND status = ? LIMIT 1',
      [requestId, 'APPROVED']
    );

    const record = results[0];
    if (!record) return { verified: false };

    return {
      verified: true,
      id: record.id,
      timestamp: record.timestamp
    };
  }
}

module.exports = new OrbitalGuardian();
