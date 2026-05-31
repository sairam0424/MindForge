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

    // 1. Build the EXACT canonical message and sign it with the agent's key.
    //    UC-22: this canonical string is persisted verbatim alongside the DID so
    //    verify() can re-verify the signature later. We must store the precise
    //    bytes that were signed — recomputing them (e.g. with a fresh timestamp)
    //    would never verify — so capture the message once, here, and reuse it.
    const signedMessage = JSON.stringify({
      requestId,
      payload,
      timestamp: new Date().toISOString()
    });
    const signature = await ztaiManager.signData(did, signedMessage);

    const attestation = {
      id: `att_${crypto.randomBytes(4).toString('hex')}`,
      request_id: requestId,
      status: 'APPROVED',
      did,
      signed_message: signedMessage,
      attestation_payload: signature,
      timestamp: new Date().toISOString()
    };

    // 2. Persist to SQLite (Source of truth for v8 Governance Dashboard).
    //    did + signed_message + signature together let verify() re-check the
    //    cryptographic signature; status='APPROVED' alone is NOT trusted.
    vectorHub.run(
      `INSERT INTO attestations (id, request_id, status, did, signed_message, attestation_payload, timestamp)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        attestation.id,
        attestation.request_id,
        attestation.status,
        attestation.did,
        attestation.signed_message,
        attestation.attestation_payload,
        attestation.timestamp
      ]
    );

    console.log(`[ORBITAL-GUARDIAN] Attestation SUCCESS: ${attestation.id}`);
    return attestation;
  }

  /**
   * Verifies if a request has a valid hardware bypass.
   *
   * UC-22 (audit finding #2): an APPROVED row is NOT trusted on its own. The
   * stored signature is re-verified against the signer's registered public key
   * over the EXACT canonical message that attest() signed. Anyone who forges an
   * APPROVED row but cannot produce a valid signature is rejected. The check is
   * fail-closed: a missing field, an unregistered/revoked DID, or any thrown
   * error all resolve to { verified:false }.
   */
  async verify(requestId) {
    if (!requestId) return { verified: false, reason: 'missing requestId' };
    await this.ensureInit();

    const results = vectorHub.query(
      'SELECT * FROM attestations WHERE request_id = ? AND status = ? LIMIT 1',
      [requestId, 'APPROVED']
    );

    const record = results[0];
    if (!record) return { verified: false, reason: 'no APPROVED attestation found' };

    // Re-verify the cryptographic signature. Without a DID, the canonical signed
    // message, AND a signature we cannot prove the row was produced by attest().
    if (!record.did || !record.signed_message || !record.attestation_payload) {
      return { verified: false, reason: 'attestation missing signature material' };
    }

    let signatureValid = false;
    try {
      signatureValid = ztaiManager.verifySignature(
        record.did,
        record.signed_message,
        record.attestation_payload
      );
    } catch (err) {
      // Unregistered/revoked DID or malformed signature → fail closed.
      return { verified: false, reason: `signature verification error: ${err.message}` };
    }

    if (!signatureValid) {
      return { verified: false, reason: 'signature verification failed' };
    }

    return {
      verified: true,
      id: record.id,
      timestamp: record.timestamp
    };
  }
}

module.exports = new OrbitalGuardian();
