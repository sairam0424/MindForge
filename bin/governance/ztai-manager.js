/**
 * MindForge ZTAI (Zero-Trust Agentic Identity) Manager
 * v4.2.5 — Enterprise-Grade Hardening
 */

const crypto = require('node:crypto');
const { promisify } = require('node:util');
const configManager = require('./config-manager');

const generateKeyPair = promisify(crypto.generateKeyPair);

/**
 * Abstract Base Class for Key Providers
 */
class KeyProvider {
  async generate(did) { throw new Error('Not implemented'); }
  async sign(did, data) { throw new Error('Not implemented'); }
  async rotate(did) { throw new Error('Not implemented'); }
  delete(did) { throw new Error('Not implemented'); }
}

/**
 * Standard In-Memory Key Provider (Tier 1-2)
 */
class LocalKeyProvider extends KeyProvider {
  constructor() {
    super();
    this.keys = new Map(); // DID -> privateKeyPEM
  }

  async generate(did) {
    const { publicKey, privateKey } = await generateKeyPair('ed25519');
    const pubPEM = publicKey.export({ type: 'spki', format: 'pem' });
    const privPEM = privateKey.export({ type: 'pkcs8', format: 'pem' });
    
    this.keys.set(did, privPEM);
    return pubPEM;
  }

  async sign(did, data) {
    const privPEM = this.keys.get(did);
    if (!privPEM) throw new Error(`Private key not found in local store for ${did}`);
    
    const privateKey = crypto.createPrivateKey(privPEM);
    return crypto.sign(null, Buffer.from(data), privateKey).toString('base64');
  }

  async rotate(did) {
    return this.generate(did);
  }

  delete(did) {
    this.keys.delete(did);
  }
}

/**
 * Simulated Hardware Security Enclave (Tier 3)
 * Mocks a TPM/KMS environment where keys never leave the "hardware".
 */
class SecureEnclaveProvider extends KeyProvider {
  constructor() {
    super();
    this.enclaveStore = new Map(); // DID -> { privateKey, metadata }
  }

  async generate(did) {
    console.log(`[ZTAI-HSM] Provisioning protected identity enclave for ${did}...`);
    const { publicKey, privateKey } = await generateKeyPair('ed25519');
    const pubPEM = publicKey.export({ type: 'spki', format: 'pem' });
    
    this.enclaveStore.set(did, {
      privateKey, // In a real HSM, this would be a key handle/ID
      provisionedAt: new Date().toISOString(),
      integrityCheck: crypto.randomBytes(32).toString('hex')
    });
    
    return pubPEM;
  }

  async sign(did, data) {
    const record = this.enclaveStore.get(did);
    if (!record) throw new Error(`Enclave record not found for ${did}`);
    
    console.log(`[ZTAI-HSM] Delegating signature to hardware enclave [DID: ${did}]`);
    
    // Simulate enclave "wrapping" or "sealing" logic
    const signature = crypto.sign(null, Buffer.from(data), record.privateKey);
    
    // Add a verifiable "Enclave Metadata" header to the signature in a real implementation
    // For now, we just return the standard signature but log the security event.
    return signature.toString('base64');
  }

  async rotate(did) {
    console.log(`[ZTAI-HSM] Rotating enclave keys for ${did}...`);
    return this.generate(did);
  }

  delete(did) {
    this.enclaveStore.delete(did);
  }
}

/**
 * Simulated Quantum-Safe Key Provider (Tier 4+)
 * Post-Quantum signatures for Sovereign Intelligence.
 */
class QuantumSafeKeyProvider extends KeyProvider {
  constructor() {
    super();
    this.quantumCrypto = require('./quantum-crypto');
    this.keyStore = new Map(); // DID -> { privateKey, publicKey, algorithm }
  }

  async generate(did) {
    console.log(`[PQAS-DILITHIUM] Provisioning post-quantum lattice identity for ${did}...`);
    const pair = await this.quantumCrypto.generateLatticeKeyPair();
    this.keyStore.set(did, pair);
    return pair.publicKey;
  }

  async sign(did, data) {
    const record = this.keyStore.get(did);
    if (!record) throw new Error(`PQ record not found for ${did}`);

    console.log(`[PQAS-DILITHIUM] Delegating signature to lattice enclave [DID: ${did}]`);
    const result = await this.quantumCrypto.signPQ(data, record.privateKey);
    return result;
  }

  async rotate(did) {
    return this.generate(did);
  }

  delete(did) {
    this.keyStore.delete(did);
  }
}

class ZTAIManager {
  constructor() {
    this.agentRegistry = new Map(); // DID -> { publicKey, persona, tier, providerType }
    this.providers = {
      local: new LocalKeyProvider(),
      enclave: new SecureEnclaveProvider(),
      quantum: new QuantumSafeKeyProvider()
    };
  }

  /**
   * Selects a key provider for a given trust tier.
   *
   * UC-24: All tiers route to REAL crypto by default — Tier 1-2 use the
   * in-memory Ed25519 provider, Tier 3+ use the (simulated-HSM) enclave
   * provider which also signs with REAL Ed25519. The SIMULATED post-quantum
   * lattice provider ('quantum') is NEVER selected on the live trust path
   * unless the operator has explicitly opted into the demo via
   * experimental.pqc_demo. This keeps false-assurance signatures off the
   * default trust path while preserving the demo for explicit exploration.
   *
   * @param {number} tier - Trust tier (1-4)
   * @returns {'local'|'enclave'|'quantum'}
   */
  _selectProvider(tier) {
    const pqcDemo = configManager.get('experimental.pqc_demo', false) === true;

    // Tier 4+ MAY use the simulated lattice provider, but only when the
    // operator has explicitly enabled the PQC demo. Otherwise it falls back to
    // the real-Ed25519 enclave provider so the trust path stays verifiable.
    if (tier >= 4) {
      return pqcDemo ? 'quantum' : 'enclave';
    }

    // Tier 3 agents use the SecureEnclaveProvider (real Ed25519).
    return tier >= 3 ? 'enclave' : 'local';
  }

  /**
   * Registers a new agent and assigns a provider based on Trust Tier.
   * @param {string} persona - Agent persona identifier
   * @param {number} tier - Trust tier (1-4)
   * @param {string|null} sessionId - Optional session scope for isolation
   */
  async registerAgent(persona, tier = 1, sessionId = null) {
    const uuid = crypto.randomUUID();
    const did = `did:mindforge:${uuid}`;

    const providerType = this._selectProvider(tier);
    const provider = this.providers[providerType];

    const publicKeyPEM = await provider.generate(did);

    const agentData = {
      publicKey: publicKeyPEM,
      persona,
      tier,
      providerType,
      createdAt: new Date().toISOString()
    };

    // Store sessionId if provided for session-scoped isolation
    if (sessionId) {
      agentData.sessionId = sessionId;
    }

    this.agentRegistry.set(did, agentData);

    return did;
  }

  /**
   * Signs data using the provider associated with the DID.
   */
  async signData(did, data) {
    const agent = this.agentRegistry.get(did);
    if (!agent) throw new Error(`Agent not registered: ${did}`);
    
    const provider = this.providers[agent.providerType];
    return await provider.sign(did, data);
  }

  /**
   * Verifies a signature against the registered public key.
   */
  verifySignature(did, data, signature) {
    const agent = this.agentRegistry.get(did);
    if (!agent) throw new Error(`Agent not registered: ${did}`);

    const publicKey = crypto.createPublicKey(agent.publicKey);
    return crypto.verify(null, Buffer.from(data), publicKey, Buffer.from(signature, 'base64'));
  }

  isAuthorized(did, requiredTier) {
    const agent = this.agentRegistry.get(did);
    return agent && agent.tier >= requiredTier;
  }

  async rotateKeys(did) {
    const agent = this.agentRegistry.get(did);
    if (!agent) throw new Error(`Agent not found: ${did}`);
    
    const provider = this.providers[agent.providerType];
    agent.publicKey = await provider.rotate(did);
    agent.rotatedAt = new Date().toISOString();
    return true;
  }

  revokeAgent(did) {
    const agent = this.agentRegistry.get(did);
    if (agent) {
      this.providers[agent.providerType].delete(did);
      this.agentRegistry.delete(did);
    }
  }

  getAgent(did) {
    return this.agentRegistry.get(did);
  }

  /**
   * Returns all agents registered under a specific session.
   * @param {string} sessionId - Session identifier to filter by
   */
  getSessionAgents(sessionId) {
    const results = [];
    for (const [did, agent] of this.agentRegistry.entries()) {
      if (agent.sessionId === sessionId) {
        results.push({ did, ...agent });
      }
    }
    return results;
  }

  /**
   * Revokes all agents belonging to a session. Used for session cleanup.
   * @param {string} sessionId - Session identifier
   */
  revokeSessionAgents(sessionId) {
    const dids = [];
    for (const [did, agent] of this.agentRegistry.entries()) {
      if (agent.sessionId === sessionId) {
        dids.push(did);
      }
    }
    for (const did of dids) {
      this.revokeAgent(did);
    }
    return dids;
  }

  /**
   * Specialized signing for FinOps budget decisions (Pillar V).
   */
  async signFinOpsDecision(did, decision) {
    const data = JSON.stringify(decision);
    return await this.signData(did, data);
  }

  /**
   * Specialized signing for Self-Healing repair plans (Pillar VI).
   */
  async signSelfHealPlan(did, plan) {
    const data = JSON.stringify(plan);
    return await this.signData(did, data);
  }
}

module.exports = new ZTAIManager();
