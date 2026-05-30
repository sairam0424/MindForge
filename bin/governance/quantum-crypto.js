/**
 * MindForge v7 — Post-Quantum Agentic Security (PQAS)
 * Simulated Lattice-Based Cryptography (Dilithium-5 / Kyber-1024)
 *
 * @typedef {Object} ZKVerifierProvider
 * @property {(proof: string, intentId: string) => {verified: boolean, reason?: string}} verify
 */
'use strict';

const crypto = require('node:crypto');
const configManager = require('./config-manager');

/**
 * Honest-disclosure guard message. The signatures produced by this module are
 * SIMULATED Dilithium-5 (base64(SHA3 + random) — NOT real ML-DSA/FIPS-204
 * lattice crypto). They must NEVER sit on the live trust path silently. The
 * simulated implementation is preserved for demonstration only and is gated
 * behind an explicit, opt-in flag.
 */
const PQC_DEMO_DISABLED_MSG =
  'PQC demo disabled — set experimental.pqc_demo=true to use simulated lattice crypto (NOT for production trust)';

class QuantumCrypto {
  constructor() {
    this.providerId = configManager.get('security.provider', 'simulated-lattice');
    // UC-24: simulated PQC is OFF the live trust path by default. Real PQC has
    // not shipped, so pqas_enabled defaults to false and the simulated path is
    // additionally gated behind the explicit experimental.pqc_demo opt-in.
    this.pqasEnabled = configManager.get('security.pqas_enabled', false);
  }

  /**
   * Returns true only when the operator has explicitly opted into the SIMULATED
   * post-quantum demo. Read fresh from config so a runtime toggle is honored.
   * @returns {boolean}
   */
  isPqcDemoEnabled() {
    return configManager.get('experimental.pqc_demo', false) === true;
  }

  /**
   * Hard gate: throws unless the operator has explicitly enabled the simulated
   * PQC demo. Prevents simulated (false-assurance) signatures from silently
   * landing on the live trust path.
   */
  _assertPqcDemoEnabled() {
    if (!this.isPqcDemoEnabled()) {
      throw new Error(PQC_DEMO_DISABLED_MSG);
    }
  }

  /**
   * Returns the current active crypto provider.
   */
  getProvider() {
    // In v7, this would resolve to a real provider like 'oqs-provider.js'
    return {
      id: this.providerId,
      pqas_enabled: this.pqasEnabled,
      algorithm: 'Dilithium-5'
    };
  }

  /**
   * Generates a key pair using the configured PQ provider.
   */
  async generateLatticeKeyPair() {
    // UC-24: simulated keys are demo-only. Refuse to mint them on the live
    // trust path unless the operator has explicitly opted in.
    this._assertPqcDemoEnabled();
    if (!this.pqasEnabled) throw new Error('PQAS is disabled in configuration.');

    // Simulate high-entropy lattice seeds
    const seed = crypto.randomBytes(64).toString('hex');
    const publicKey = `mfq7_dilithium5_pub_${crypto.randomBytes(32).toString('hex')}`;
    const privateKey = `mfq7_dilithium5_priv_${crypto.randomBytes(64).toString('hex')}`;
    
    return {
      publicKey,
      privateKey,
      algorithm: this.getProvider().algorithm,
      version: 'v7.0.0-PQAS',
      provider: this.providerId
    };
  }

  /**
   * Signs data using simulated Dilithium-5.
   * @returns {{ signature: string, simulated: true, algorithm: string }}
   */
  async signPQ(data, privateKey) {
    // UC-24: never produce a simulated (false-assurance) signature on the live
    // trust path unless the operator has explicitly enabled the PQC demo.
    this._assertPqcDemoEnabled();
    if (!this.pqasEnabled) throw new Error('PQAS is disabled.');
    if (!privateKey.startsWith('mfq7_dilithium5_priv_')) {
      throw new Error('Invalid Post-Quantum private key format.');
    }

    const hash = crypto.createHash('sha3-512').update(data).digest('hex');
    const salt = crypto.randomBytes(16).toString('hex');
    const signature = `pqas_sig_d5_${Buffer.from(hash + salt).toString('base64')}_${crypto.randomBytes(128).toString('base64')}`;

    return {
      signature,
      simulated: true,
      algorithm: 'Dilithium-5'
    };
  }

  /**
   * Verifies a Dilithium-5 signature using constant-time comparison simulation.
   */
  verifyPQ(data, signature, publicKey) {
    if (!publicKey.startsWith('mfq7_dilithium5_pub_')) return false;
    const sig = typeof signature === 'object' && signature.signature ? signature.signature : signature;
    if (!sig.startsWith('pqas_sig_d5_')) return false;

    try {
      const parts = sig.split('_');
      const blob = Buffer.from(parts[3], 'base64').toString('utf8');
      const hashInSig = blob.slice(0, 128); 
      
      const actualHash = crypto.createHash('sha3-512').update(data).digest('hex');
      
      // Use timing-safe comparison to prevent side-channel leaks
      return crypto.timingSafeEqual(Buffer.from(hashInSig), Buffer.from(actualHash));
    } catch {
      return false;
    }
  }

  /**
   * Generates a simulated ZK-Proof of policy adherence.
   * This mimics a SNARK where the agent proves it ran the PolicyEngine rules.
   */
  generateZKProof(intent, result) {
    const proofPayload = JSON.stringify({
      intent: intent.id,
      verdict: result.verdict,
      timestamp: Date.now(),
      entropy: crypto.randomBytes(16).toString('hex')
    });

    const hash = crypto.createHash('sha256').update(proofPayload).digest('hex');
    return `zkp_v1_${hash}_${crypto.randomBytes(32).toString('base64')}`;
  }

  verifyZKProof(proof, intentId) {
    if (!proof || !proof.startsWith('zkp_v1_')) {
      return { verified: false, reason: 'invalid_proof_format' };
    }

    try {
      const verifierModule = configManager.get('security.zk_verifier_module');
      if (verifierModule) {
        const verifier = require(verifierModule);
        return verifier.verify(proof, intentId);
      }
    } catch (e) { /* no external verifier configured */ }

    return {
      verified: false,
      reason: 'no_verifier_configured',
      simulated: true,
      message: 'ZK proof verification requires an external verifier module (e.g., snarkjs/circom). Configure via security.zk_verifier_module in config.json.'
    };
  }
}

module.exports = new QuantumCrypto();
