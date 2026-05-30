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
    // not shipped. The simulated path is gated SOLELY behind the explicit
    // experimental.pqc_demo opt-in (read fresh via isPqcDemoEnabled), so there
    // is exactly one switch controlling the simulated minter. The legacy
    // security.pqas_enabled flag is retained for provider metadata only and
    // MUST NOT independently gate minting (see getProvider).
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
    // In v7, this would resolve to a real provider like 'oqs-provider.js'.
    // Read pqas_enabled FRESH from config (not the constructor cache) for
    // symmetry with the demo gate. This is metadata only — it does NOT gate
    // minting; experimental.pqc_demo is the single source of truth for that.
    return {
      id: this.providerId,
      pqas_enabled: configManager.get('security.pqas_enabled', false),
      algorithm: 'Dilithium-5'
    };
  }

  /**
   * Generates a key pair using the configured PQ provider.
   */
  async generateLatticeKeyPair() {
    // UC-24: simulated keys are demo-only. The SINGLE gate is the fresh-read
    // experimental.pqc_demo flag — enabling it is sufficient to mint, and
    // disabling it fails closed. security.pqas_enabled does NOT gate this.
    this._assertPqcDemoEnabled();

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
    // trust path. The SINGLE gate is the fresh-read experimental.pqc_demo flag
    // (same flag _selectProvider routes on) — security.pqas_enabled does NOT
    // independently block signing.
    this._assertPqcDemoEnabled();
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
   * Generates a SIMULATED ZK-Proof of policy adherence.
   * This mimics a SNARK where the agent proves it ran the PolicyEngine rules,
   * but it is NOT a real zero-knowledge proof. The returned token is explicitly
   * stamped with a `sim` marker (zkp_v1_sim_...) so downstream code and audit
   * logs can never mistake it for a real SNARK. It remains inert by default —
   * verifyZKProof DENYs unless an external verifier module is configured.
   * @returns {string} A simulated ZK-proof token prefixed `zkp_v1_sim_`.
   */
  generateZKProof(intent, result) {
    const proofPayload = JSON.stringify({
      intent: intent.id,
      verdict: result.verdict,
      timestamp: Date.now(),
      entropy: crypto.randomBytes(16).toString('hex'),
      simulated: true
    });

    const hash = crypto.createHash('sha256').update(proofPayload).digest('hex');
    // `sim` marker is embedded AFTER the `zkp_v1_` prefix so the existing
    // format check (startsWith 'zkp_v1_') and any external verifier still work.
    return `zkp_v1_sim_${hash}_${crypto.randomBytes(32).toString('base64')}`;
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
