/**
 * MindForge — SREManager (Pillar VI: Sovereign Reason Enclaves)
 * Manages confidential reasoning sessions in simulated Trusted Execution Environments (TEE).
 */
'use strict';

const crypto = require('crypto');

const EPHEMERAL_ENCLAVE_KEY = crypto.randomBytes(32).toString('hex');
const SYSTEM_DID = 'did:mindforge:enclave:0xenterprise';

let _enclaveWarningShown = false;
function warnNonTEE() {
  if (!_enclaveWarningShown) {
    console.warn('[SRE] Running in simulated enclave mode — not backed by hardware TEE');
    _enclaveWarningShown = true;
  }
}

class SREManager {
  constructor() {
    this.activeEnclaves = new Map();
  }

  /**
   * Initializes a Sovereign Reason Enclave for a task.
   * @param {Object} context - Task context (requires Tier 3 identity)
   * @returns {string} - Enclave ID
   */
  initializeEnclave(context) {
    if (context.tier < 3) {
      throw new Error(`[SRE-DENY] Tier ${context.tier} principal is not authorized for Sovereign Reason Enclaves.`);
    }

    warnNonTEE();
    const enclaveId = crypto.randomBytes(12).toString('hex');
    this.activeEnclaves.set(enclaveId, {
      startedAt: new Date().toISOString(),
      principal: context.did,
      hasIP: true,
      isolationLevel: 'Hardware-Enclave (Simulated)',
      cumulativeHash: null // Root of the proof chain
    });

    console.log(`[SRE-INIT] Initialized Sovereign Reason Enclave: ${enclaveId} for ${context.did}`);
    return enclaveId;
  }

  /**
   * Sanitizes a thought chain and generates a ZK-Proof Compliance Certificate.
   * Ensures that sensitive IP or "zero-visibility" thoughts are isolated while proving audit-eligibility.
   * @param {string} thoughtChain - The raw agentic thought chain.
   * @param {string} enclaveId - The active enclave ID.
   * @param {Object} policyResult - Whether the content passed internal policy checks.
   * @returns {Object} - ZK-Proof compliance certificate.
   */
  sanitizeThoughtChain(thoughtChain, enclaveId, policyResult = { passed: true }) {
    if (!this.activeEnclaves.has(enclaveId)) {
      return { status: 'PLAINTEXT', content: thoughtChain };
    }

    // v5 Pillar VI: Merkle-style Cumulative Hash Chain
    const enclaveData = this.activeEnclaves.get(enclaveId);
    const prevHash = enclaveData.cumulativeHash;
    const digest = crypto.createHash('sha256').update(thoughtChain).digest('hex');
    
    // Generate a simulated ZK-Proof Compliance Certificate
    const proofPayload = {
      enclaveId: enclaveId,
      digest: digest,
      prevHash: prevHash, // Links the chain
      policyPassed: policyResult.passed,
      timestamp: new Date().toISOString(),
      principal: enclaveData.principal
    };

    // Sign the proof with the Enclave Private Key
    const signature = crypto.createHmac('sha256', EPHEMERAL_ENCLAVE_KEY)
      .update(JSON.stringify(proofPayload))
      .digest('hex');

    // Update the cumulative hash for the next block
    const proofHash = crypto.createHash('sha256').update(signature).digest('hex');
    enclaveData.cumulativeHash = proofHash;

    const certificate = {
      status: 'SRE-ISOLATED',
      proof: proofPayload,
      signature: signature,
      proofHash: proofHash,
      verificationDid: SYSTEM_DID,
      message: `[SRE-ZK-PROOF] Confidential reasoning (sha256:${digest.substring(0, 8)}...) verified by Enclave Auditor.`
    };

    return certificate;
  }

  /**
   * Verifies an SRE Compliance Certificate without seeing the original content.
   */
  verifyZKProof(certificate) {
    if (certificate.status !== 'SRE-ISOLATED') return false;

    const expectedSignature = crypto.createHmac('sha256', EPHEMERAL_ENCLAVE_KEY)
      .update(JSON.stringify(certificate.proof))
      .digest('hex');

    const isValid = (expectedSignature === certificate.signature);
    const policyPassed = certificate.proof.policyPassed;

    return isValid && policyPassed;
  }

  /**
   * Finalizes and purges the enclave.
   */
  terminateEnclave(enclaveId) {
    if (this.activeEnclaves.has(enclaveId)) {
      this.activeEnclaves.delete(enclaveId);
      console.log(`[SRE-PURGE] Sovereign Reason Enclave ${enclaveId} has been securely purged.`);
    }
  }
}

module.exports = SREManager;
