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
   * Sanitizes a thought chain and generates an HMAC integrity certificate.
   *
   * IMPORTANT — HONEST LABELING: This is NOT a zero-knowledge proof. The
   * artifact is an HMAC-SHA256 tag computed with a process-local shared secret
   * (EPHEMERAL_ENCLAVE_KEY). It provides tamper-evidence/integrity over the
   * proof payload, but:
   *   - any party holding the key can forge it (symmetric MAC, not asymmetric),
   *   - the payload carries the plaintext sha256(thoughtChain) digest, so it is
   *     not "zero-visibility".
   * The enclave is simulated (no hardware TEE). Consumers must treat the
   * returned object as an integrity tag, not a cryptographic ZK proof.
   *
   * @param {string} thoughtChain - The raw agentic thought chain.
   * @param {string} enclaveId - The active enclave ID.
   * @param {Object} policyResult - Whether the content passed internal policy checks.
   * @returns {Object} - HMAC integrity certificate (simulated enclave).
   */
  sanitizeThoughtChain(thoughtChain, enclaveId, policyResult = { passed: true }) {
    if (!this.activeEnclaves.has(enclaveId)) {
      return { status: 'PLAINTEXT', content: thoughtChain };
    }

    // v5 Pillar VI: Merkle-style Cumulative Hash Chain
    const enclaveData = this.activeEnclaves.get(enclaveId);
    const prevHash = enclaveData.cumulativeHash;
    const digest = crypto.createHash('sha256').update(thoughtChain).digest('hex');
    
    // Generate a simulated-enclave HMAC integrity certificate (NOT a ZK proof)
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
      // Honest labeling: this is a symmetric HMAC integrity tag, not a ZK proof.
      type: 'hmac-integrity-certificate',
      method: 'hmac-sha256-integrity',
      simulated: true,
      zeroKnowledge: false,
      disclosure: 'HMAC integrity tag (simulated enclave; NOT a zero-knowledge proof). '
        + 'Forgeable by any holder of the shared enclave key; payload carries the plaintext sha256(thought) digest.',
      proof: proofPayload,
      signature: signature,
      proofHash: proofHash,
      verificationDid: SYSTEM_DID,
      message: `[SRE-HMAC] HMAC integrity tag for confidential reasoning (sha256:${digest.substring(0, 8)}...) `
        + 'in simulated enclave — NOT a zero-knowledge proof.'
    };

    return certificate;
  }

  /**
   * Verifies an SRE integrity certificate's HMAC tag and policy flag.
   *
   * NOTE — HONEST LABELING: this recomputes the HMAC-SHA256 tag using the
   * shared enclave key and compares it. It is symmetric MAC verification, NOT
   * zero-knowledge verification. The method name is retained for API
   * compatibility with existing callers; see verifyIntegrityCertificate alias.
   */
  verifyIntegrityCertificate(certificate) {
    return this.verifyZKProof(certificate);
  }

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
