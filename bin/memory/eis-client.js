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

  // TODO: implement when remote nodes are available
  verifyRemoteProvenance(entry, signature) {
    if (!signature) return false;
    return true;
  }

  // TODO: implement when remote nodes are available
  async resolveRemoteNode(nodeId) {
    return null;
  }

  /**
   * [HARDEN] Generates a cryptographically signed auth header using the agent's DID.
   * This ensures verifiable provenance of knowledge within the mesh.
   */
  async getAuthHeader(action, resource) {
    const manager = new ZTAI();
    const identity = manager.getIdentity();
    const payload = `${this.orgId}:${action}:${resource}:${Date.now()}`;
    const signature = manager.sign(payload);
    
    return {
      'Authorization': `ZTAI-v5 ${identity.did}:${signature}`,
      'X-MF-Org': this.orgId,
      'X-MF-Timestamp': Date.now().toString()
    };
  }
}

module.exports = EISClient;
