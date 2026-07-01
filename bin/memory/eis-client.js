/**
 * MindForge v5 — Enterprise Intelligence Service (EIS) Client
 * Handles communication with the central organizational intelligence hub.
 */
'use strict';

const fs    = require('node:fs');
const path  = require('node:path');
const crypto = require('node:crypto');
const ZTAI = require('../governance/ztai-manager');

class EISClient {
  constructor(config = {}) {
    this.endpoint = config.endpoint || process.env.MINDFORGE_EIS_ENDPOINT || 'http://localhost:7340';
    this.apiKey   = config.apiKey   || process.env.MINDFORGE_EIS_KEY || '';
    this.orgId    = config.orgId    || 'default-org';
    this.syncInterval = config.syncInterval || 300_000; // 5 minutes
  }

  /**
   * Pushes local knowledge entries to the central Mesh.
   * @param {Array} entries - Local knowledge entries to sync.
   */
  async push(entries) {
    if (!this.endpoint || this.endpoint === 'http://localhost:7340') {
      return {
        synced: entries.length,
        hashes: entries.map(e => e.id || crypto.createHash('sha256').update(JSON.stringify(e)).digest('hex').slice(0, 8))
      };
    }

    const url = `${this.endpoint}/api/v1/knowledge/push`;
    const body = JSON.stringify({ entries, orgId: this.orgId });

    let lastError;
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const headers = await this.getAuthHeader('push', 'knowledge');
        headers['Content-Type'] = 'application/json';

        const response = await fetch(url, {
          method: 'POST',
          headers,
          body,
          signal: AbortSignal.timeout(10000)
        });

        if (!response.ok) {
          throw new Error(`EIS push failed: ${response.status}`);
        }

        return await response.json();
      } catch (e) {
        lastError = e;
        await new Promise(r => setTimeout(r, 1000 * Math.pow(2, attempt)));
      }
    }

    console.warn(`[EIS] Push failed after 3 retries: ${lastError.message}`);
    return { synced: 0, error: lastError.message };
  }

  /**
   * Pulls new knowledge from the central Mesh.
   * @param {Object} filter - Filter criteria (e.g. since timestamp).
   */
  async pull(filter = {}) {
    if (!this.endpoint || this.endpoint === 'http://localhost:7340') {
      return [];
    }

    const url = `${this.endpoint}/api/v1/knowledge/pull`;
    const body = JSON.stringify({ filter, orgId: this.orgId });

    let lastError;
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const headers = await this.getAuthHeader('pull', 'knowledge');
        headers['Content-Type'] = 'application/json';

        const response = await fetch(url, {
          method: 'POST',
          headers,
          body,
          signal: AbortSignal.timeout(10000)
        });

        if (!response.ok) {
          throw new Error(`EIS pull failed: ${response.status}`);
        }

        return await response.json();
      } catch (e) {
        lastError = e;
        await new Promise(r => setTimeout(r, 1000 * Math.pow(2, attempt)));
      }
    }

    console.warn(`[EIS] Pull failed after 3 retries: ${lastError.message}`);
    return [];
  }

  /**
   * Verifies the provenance of a remote knowledge entry by cryptographically
   * checking its signature against the signer DID's registered public key.
   *
   * HONEST / FAIL-CLOSED CONTRACT (UC-22, finding #22): this method NEVER
   * returns true for a signature it has not actually verified. It returns true
   * ONLY when ZTAI.verifySignature confirms the signature against a public key
   * that is resolvable in the local trust registry. Every other case fails
   * closed → false:
   *   - no/empty signature,
   *   - no signer DID on the entry,
   *   - the DID is not resolvable here (e.g. a genuinely remote peer whose key
   *     is not in the local registry — there is no remote DID-resolution infra
   *     yet, see resolveRemoteNode),
   *   - tampered payload or signature (crypto.verify returns false / throws).
   *
   * @param {{did?: string, signedData?: string}} entry - Provenance-bearing entry.
   *   `did` is the signer's DID; `signedData` is the exact canonical bytes that
   *   were signed (defaults to a deterministic JSON of the entry if absent).
   * @param {string} signature - Base64 signature to verify.
   * @returns {boolean} true only if cryptographically verified; false otherwise.
   */
  verifyRemoteProvenance(entry, signature) {
    if (!signature || typeof signature !== 'string') return false;
    if (!entry || typeof entry !== 'object') return false;

    const did = entry.did;
    if (!did || typeof did !== 'string') return false;

    // Canonical signed bytes: prefer an explicit signedData field, else a
    // deterministic JSON of the entry (excluding the signature envelope).
    const signedData = typeof entry.signedData === 'string'
      ? entry.signedData
      : JSON.stringify(entry);

    try {
      // ZTAI.verifySignature throws for an unresolvable (unregistered) DID —
      // treat that as fail-closed rather than asserting verified provenance.
      return ZTAI.verifySignature(did, signedData, signature) === true;
    } catch {
      return false;
    }
  }

  // TODO(EIS-remote): implement cross-node context resolution in v1.1
  async resolveRemoteNode(nodeId) {
    // TODO(EIS-remote): implement cross-node context resolution in v1.1
    throw new Error(
      `EIS remote node resolution not implemented (nodeId: ${nodeId}). ` +
      'Cross-node context is local-only in v1.0.'
    );
  }

  /**
   * Lazily registers (once) this client's outbound node identity in the ZTAI
   * trust registry and returns its DID. ZTAI is a SINGLETON instance (exported
   * as `new ZTAIManager()`), so we call it directly — never `new ZTAI()`. The
   * DID is cached so every header from this client shares one resolvable key.
   */
  async _getNodeDid() {
    if (!this._nodeDid) {
      // Tier 3: the enclave provider signs with real Ed25519 (see ztai-manager).
      this._nodeDid = await ZTAI.registerAgent(`eis-client:${this.orgId}`, 3);
    }
    return this._nodeDid;
  }

  /**
   * [HARDEN] Generates a cryptographically signed auth header using this node's
   * DID. Attaches OUTBOUND provenance to locally-originated requests (it signs
   * what this node sends). It does NOT verify inbound remote entries — that is
   * verifyRemoteProvenance's job, which fails closed unless a signature is
   * cryptographically verified against a resolvable public key.
   *
   * FAIL-CLOSED: uses the real ZTAI API (registerAgent -> signData) and asserts
   * the produced signature is a non-empty string. A signing failure THROWS
   * rather than shipping a malformed `ZTAI-v5 <did>:` header with an empty sig.
   */
  async getAuthHeader(action, resource) {
    const did = await this._getNodeDid();
    const payload = `${this.orgId}:${action}:${resource}:${Date.now()}`;
    const signature = await ZTAI.signData(did, payload);

    if (typeof signature !== 'string' || signature.length === 0) {
      throw new Error('EIS auth header signing failed: ZTAI produced an empty signature');
    }

    return {
      'Authorization': `ZTAI-v5 ${did}:${signature}`,
      'X-MF-Org': this.orgId,
      'X-MF-Timestamp': Date.now().toString()
    };
  }
}

module.exports = EISClient;
module.exports.EISClient = EISClient;
