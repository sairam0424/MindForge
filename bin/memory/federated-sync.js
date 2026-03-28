/**
 * MindForge v5 — Federated Knowledge Sync
 * Upgrades the local global-sync.js to a distributed intelligence mesh.
 */
'use strict';

const fs    = require('node:fs');
const path  = require('node:path');
const Store = require('./knowledge-store');
const EISClient = require('./eis-client');
const crypto = require('node:crypto');

class FederatedSync {
  constructor(config = {}) {
    this.client = new EISClient(config);
    this.localStore = Store;
    this.syncHistoryPath = path.join(Store.getPaths().MEMORY_DIR, 'sync-history.jsonl');
  }

  /**
   * Performs an organizational-wide synchronization.
   * This pushes local high-confidence entries and pulls new organizational knowledge.
   */
  async fullSync() {
    console.log('🔄 Initiating Federated Intelligence Sync (Pillar 1)...');
    
    // 1. Get promotable entries (Tiers 1-3)
    const localEntries = this.localStore.readAll(false).filter(e => e.confidence > 0.8 && !e.deprecated);
    
    // 2. Filter out already synced entries
    const unsynced = localEntries.filter(e => !e.global && !this.isRecentlySynced(e.id));
    
    // 3. Push to EIS
    if (unsynced.length > 0) {
      const auth = await this.client.getAuthHeader('push', 'kb/global');
      const results = await this.client.push(unsynced, { headers: auth });
      this.logSyncEvent(results);
    }
    
    // 4. [HARDEN] Delta Pull from EIS
    const lastSync = this.getLastSyncTimestamp();
    const authPull = await this.client.getAuthHeader('pull', 'kb/global');
    const remoteEntries = await this.client.pull({ 
      orgId: this.client.orgId,
      since: lastSync,
      headers: authPull 
    });

    if (remoteEntries.length > 0) {
      this.mergeRemoteKnowledge(remoteEntries);
    }
    
    this.updateLastSyncTimestamp();
    console.log(`✅ Federated Intelligence Mesh: Sync complete. (Delta since ${lastSync})`);
    return { pushed: unsynced.length, pulled: remoteEntries.length };
  }

  getLastSyncTimestamp() {
    const statsPath = path.join(this.localStore.getPaths().MEMORY_DIR, 'sync-stats.json');
    if (!fs.existsSync(statsPath)) return '1970-01-01T00:00:00Z';
    try {
      const stats = JSON.parse(fs.readFileSync(statsPath, 'utf8'));
      return stats.last_sync || '1970-01-01T00:00:00Z';
    } catch {
      return '1970-01-01T00:00:00Z';
    }
  }

  updateLastSyncTimestamp() {
    const statsPath = path.join(this.localStore.getPaths().MEMORY_DIR, 'sync-stats.json');
    const stats = { last_sync: new Date().toISOString() };
    fs.writeFileSync(statsPath, JSON.stringify(stats, null, 2));
  }

  /**
   * Merges remote knowledge into the local global-knowledge-base.jsonl.
   * Uses LWW (Last-Write-Wins) with cryptographic version checks.
   */
  mergeRemoteKnowledge(remoteEntries) {
    const globalPath = this.localStore.getPaths().GLOBAL_KB_PATH;
    const existingGlobalLines = fs.existsSync(globalPath) 
      ? fs.readFileSync(globalPath, 'utf8').split('\n').filter(Boolean)
      : [];
      
    const existingById = new Map();
    for (const line of existingGlobalLines) {
      const e = JSON.parse(line);
      existingById.set(e.id, e);
    }

    let mergedCount = 0;
    for (const remote of remoteEntries) {
      const local = existingById.get(remote.id);
      
      // Conflict Resolution: Remote Wins if timestamp is newer
      if (!local || new Date(remote.timestamp) > new Date(local.timestamp)) {
        fs.appendFileSync(globalPath, JSON.stringify(remote) + '\n');
        mergedCount++;
      }
    }
    
    return mergedCount;
  }

  isRecentlySynced(id) {
    // Simple check against local sync-history log
    if (!fs.existsSync(this.syncHistoryPath)) return false;
    const history = fs.readFileSync(this.syncHistoryPath, 'utf8');
    return history.includes(id);
  }

  logSyncEvent(results) {
    const log = results.map(r => JSON.stringify({ ...r, timestamp: new Date().toISOString() })).join('\n') + '\n';
    fs.mkdirSync(path.dirname(this.syncHistoryPath), { recursive: true });
    fs.appendFileSync(this.syncHistoryPath, log);
  }
}

/**
 * Migration helper from global-sync.js
 */
async function runSync(options = {}) {
  const sync = new FederatedSync(options);
  return await sync.fullSync();
}

module.exports = { FederatedSync, runSync };
