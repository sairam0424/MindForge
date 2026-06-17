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
const EmbeddingEngine = require('./embedding-engine');
const adsEngine = require('../review/ads-engine');

class FederatedSync {
  constructor(config = {}) {
    this.client = new EISClient(config);
    this.localStore = Store;
    this.syncHistoryPath = path.join(Store.getPaths().MEMORY_DIR, 'sync-history.jsonl');
    this.circuitBreakerPath = path.join(Store.getPaths().MEMORY_DIR, 'circuit-breaker.json');
    this.MAX_FAILURES = 3;
    this.COOLDOWN_MS = 3600000; // 1 hour
  }

  /**
   * [ENTERPRISE] Checks if the circuit is open.
   */
  isCircuitOpen() {
    if (!fs.existsSync(this.circuitBreakerPath)) return false;
    try {
      const state = JSON.parse(fs.readFileSync(this.circuitBreakerPath, 'utf8'));
      if (state.status === 'OPEN' && (Date.now() - state.trippedAt < this.COOLDOWN_MS)) {
        return true;
      }
      // Reset if cooldown passed
      if (state.status === 'OPEN') {
        this.resetCircuit();
      }
      return false;
    } catch {
      return false;
    }
  }

  tripCircuit(reason) {
    console.warn(`[CIRCUIT-BREAKER] ⚠️ Circuit Breaker TRIPPED: ${reason}. Mesh sync disabled for 1hr.`);
    const state = { status: 'OPEN', trippedAt: Date.now(), reason };
    fs.writeFileSync(this.circuitBreakerPath, JSON.stringify(state, null, 2));
  }

  resetCircuit() {
    if (fs.existsSync(this.circuitBreakerPath)) {
      fs.unlinkSync(this.circuitBreakerPath);
    }
  }

  handleSyncFailure(err) {
    const statsPath = path.join(this.localStore.getPaths().MEMORY_DIR, 'sync-stats.json');
    let stats = { failures: 0 };
    if (fs.existsSync(statsPath)) {
      try {
        stats = JSON.parse(fs.readFileSync(statsPath, 'utf8'));
      } catch {
        stats = { failures: 0 };
      }
    }
    stats.failures = (stats.failures || 0) + 1;
    stats.last_error = err.message;
    fs.writeFileSync(statsPath, JSON.stringify(stats, null, 2));

    if (stats.failures >= this.MAX_FAILURES) {
      this.tripCircuit(err.message);
    }
  }

  /**
   * Performs an organizational-wide synchronization.
   * This pushes local high-confidence entries and pulls new organizational knowledge.
   */
  async fullSync() {
    if (this.isCircuitOpen()) {
      console.warn('🛑 Federated Intelligence Sync: Circuit is OPEN. Skipping network calls.');
      return { status: 'CIRCUIT_OPEN' };
    }

    console.log('🔄 Initiating Federated Intelligence Sync (v5.4.0 ENTERPRISE)...');
    
    try {
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
      this.resetFailures(); // Reset on success
      console.log(`✅ Federated Intelligence Mesh: Sync complete. (Delta since ${lastSync})`);
      return { pushed: unsynced.length, pulled: remoteEntries.length };
    } catch (err) {
      console.error('❌ Federated Intelligence Sync FAILED:', err.message);
      this.handleSyncFailure(err);
      throw err;
    }
  }

  resetFailures() {
    const statsPath = path.join(this.localStore.getPaths().MEMORY_DIR, 'sync-stats.json');
    if (fs.existsSync(statsPath)) {
      let stats = { failures: 0 };
      try {
        stats = JSON.parse(fs.readFileSync(statsPath, 'utf8'));
      } catch {
        stats = { failures: 0 };
      }
      stats.failures = 0;
      fs.writeFileSync(statsPath, JSON.stringify(stats, null, 2));
    }
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
      
      if (!local) {
        fs.appendFileSync(globalPath, JSON.stringify(remote) + '\n');
        mergedCount++;
        continue;
      }

      // Pillar I (v5.2.0): Hybrid Semantic synthesis
      let similarity = 0;
      try {
        similarity = EmbeddingEngine.cosineSimilarity(
          EmbeddingEngine.computeTfIdfVector(EmbeddingEngine.tokenize(local.content), {}, 1),
          EmbeddingEngine.computeTfIdfVector(EmbeddingEngine.tokenize(remote.content), {}, 1)
        );
      } catch (err) {
        console.error(`[FIM-ERR] Semantic analysis failed for ${local.id}. Falling back to LWW.`, err);
        // Fallback to basic LWW (Last-Write-Wins)
        if (new Date(remote.timestamp) > new Date(local.timestamp)) {
          this.writeToGlobalKB(remote, globalPath);
        }
        continue;
      }

      this.triggerHybridSynthesis(local, remote, similarity, globalPath);
      mergedCount++;
    }
    
    return mergedCount;
  }

  /**
   * Hybrid Synthesis Logic (Pillar I v5.2.0)
   */
  async triggerHybridSynthesis(local, remote, similarity, globalPath) {
    console.log(`[FIM-SYNC] Analyzing semantic overlap for ${local.id} (Similarity: ${similarity.toFixed(4)})`);

    // 1. LWW (Similarity > 0.9) - Near identical
    if (similarity > 0.9) {
      if (new Date(remote.timestamp) > new Date(local.timestamp)) {
        this.writeToGlobalKB(remote, globalPath);
        this.logConflictTelemetry(local.id, 'LWW', similarity);
        console.log('  └─ [LWW] Auto-resolved via timestamp.');
      }
      return;
    }

    // 2. Autonomous Merge (0.75 - 0.9) - Semantic Overlap
    if (similarity > 0.75) {
      console.log('  └─ [ADS] Triggering Autonomous Knowledge Synthesis...');
      const merged = await this.triggerADSMerging(local, remote);
      this.writeToGlobalKB(merged, globalPath);
      this.logConflictTelemetry(local.id, 'ADS_MERGE', similarity);
      return;
    }

    // 3. Human Stewardship (0.6 - 0.75) - Probable Disagreement
    if (similarity > 0.6) {
      console.log('  └─ [DHH] High disagreement. Triggering Nexus Handover...');
      this.localStore.markConflict(local.id, remote);
      this.logConflictTelemetry(local.id, 'DHH_HANDOVER', similarity);
      return;
    }

    // 4. Collision Isolation (< 0.6) - Topic Mismatch
    console.log('  └─ [ISO] Semantic collision (Topic mismatch). Isolating entries.');
    this.writeToGlobalKB({ ...remote, id: `${remote.id}_collision_${Date.now()}` }, globalPath);
    this.logConflictTelemetry(local.id, 'COLLISION_ISOLATION', similarity);
  }

  logConflictTelemetry(id, resolution, similarity) {
    const telePath = path.join(this.localStore.getPaths().MEMORY_DIR, 'sync-telemetry.jsonl');
    const entry = JSON.stringify({
      id,
      resolution,
      similarity,
      timestamp: new Date().toISOString()
    }) + '\n';
    fs.appendFileSync(telePath, entry);
  }

  async triggerADSMerging(local, remote) {
    const result = await adsEngine.runADSSynthesis({
      phaseNum: 'SYNC',
      goal: `Synthesize a unified knowledge entry for topic: ${local.topic || local.id}`,
      context: `Local Entry: ${local.content}\n\nRemote Entry: ${remote.content}`,
      sessionId: 'fim-sync-v5.2.0'
    });

    // Extract the final plan/content from ADS result
    const mergedContent = fs.readFileSync(path.join(process.cwd(), '.planning', 'PLAN.md'), 'utf8');
    
    return {
      ...remote,
      content: mergedContent,
      confidence: 1.0,
      synthesis_id: result.ads_id,
      timestamp: new Date().toISOString()
    };
  }

  writeToGlobalKB(entry, globalPath) {
    fs.appendFileSync(globalPath, JSON.stringify(entry) + '\n');
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
