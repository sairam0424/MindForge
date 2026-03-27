/**
 * MindForge ZTAI (Zero-Trust Agentic Identity) Manager
 * v4.2.5 — Beast Mode Hardening
 */

const crypto = require('node:crypto');
const { promisify } = require('node:util');

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

class ZTAIManager {
  constructor() {
    this.agentRegistry = new Map(); // DID -> { publicKey, persona, tier, providerType }
    this.providers = {
      local: new LocalKeyProvider(),
      enclave: new SecureEnclaveProvider()
    };
  }

  /**
   * Registers a new agent and assigns a provider based on Trust Tier.
   */
  async registerAgent(persona, tier = 1) {
    const uuid = crypto.randomUUID();
    const did = `did:mindforge:${uuid}`;
    
    // Tier 3 agents use the SecureEnclaveProvider
    const providerType = tier >= 3 ? 'enclave' : 'local';
    const provider = this.providers[providerType];
    
    const publicKeyPEM = await provider.generate(did);

    this.agentRegistry.set(did, {
      publicKey: publicKeyPEM,
      persona,
      tier,
      providerType,
      createdAt: new Date().toISOString()
    });

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
