/**
 * MindForge Semantic Hub
 * v4.2.5 — Global Intelligence Mesh
 */

const fs = require('node:fs/promises');
const path = require('node:path');
const os = require('node:os');

class SemanticHub {
  constructor() {
    this.localPath = '.mindforge/memory';
    this.globalPath = path.join(os.homedir(), '.mindforge/memory/global');
    this.syncManifest = path.join(this.localPath, 'sync-manifest.json');
  }

  /**
   * Initializes the global memory store if it doesn't exist.
   */
  async ensureGlobalStore() {
    try {
      await fs.mkdir(this.globalPath, { recursive: true });
      console.log(`[SEMANTIC-HUB] Global Store Initialized: ${this.globalPath}`);
    } catch (err) {
      console.error(`[SEMANTIC-HUB] Failed to initialize global store: ${err.message}`);
    }
  }

  /**
   * Syncs a local library with the global hub.
   * @param {string} libraryName - e.g., 'pattern-library.jsonl'
   */
  async syncLibrary(libraryName) {
    const localFile = path.join(this.localPath, libraryName);
    const globalFile = path.join(this.globalPath, libraryName);

    try {
      // 1. Read local entries
      const localData = await fs.readFile(localFile, 'utf8');
      const localEntries = localData.split('\n').filter(Boolean).map(JSON.parse);

      // 2. Read global entries (if exist)
      let globalEntries = [];
      try {
        const globalData = await fs.readFile(globalFile, 'utf8');
        globalEntries = globalData.split('\n').filter(Boolean).map(JSON.parse);
      } catch (e) {
        // Global doesn't exist yet, that's fine.
      }

      // 3. Simple ID-based deduplication Logic
      const globalIds = new Set(globalEntries.map(e => e.id));
      const newEntries = localEntries.filter(e => !globalIds.has(e.id));

      if (newEntries.length > 0) {
        // Append new entries to global store
        const appendData = newEntries.map(e => JSON.stringify(e)).join('\n') + '\n';
        await fs.appendFile(globalFile, appendData);
        console.log(`[SEMANTIC-HUB] Synced ${newEntries.length} new entries to global ${libraryName}`);
      }

      // 4. Update sync manifest
      await this.updateManifest(libraryName, localEntries.length);
      
      return true;
    } catch (err) {
      console.error(`[SEMANTIC-HUB] Sync failed for ${libraryName}: ${err.message}`);
      return false;
    }
  }

  async updateManifest(libraryName, count) {
    let manifest = {};
    try {
      const data = await fs.readFile(this.syncManifest, 'utf8');
      manifest = JSON.parse(data);
    } catch (e) {}

    manifest[libraryName] = {
      lastSync: new Date().toISOString(),
      localCount: count
    };

    await fs.writeFile(this.syncManifest, JSON.stringify(manifest, null, 2));
  }

  /**
   * Retrieves all 'golden_trace' types from the global hub.
   */
  async getGoldenTraces(skillFilter = null) {
    const patternFile = path.join(this.globalPath, 'pattern-library.jsonl');
    try {
      const data = await fs.readFile(patternFile, 'utf8');
      const traces = data.split('\n')
        .filter(Boolean)
        .map(JSON.parse)
        .filter(p => p.type === 'golden-trace' || p.tags?.includes('success'));
      
      if (skillFilter) {
        return traces.filter(t => t.skill === skillFilter || t.tags?.includes(skillFilter));
      }
      return traces;
    } catch (e) {
      return [];
    }
  }
}

module.exports = new SemanticHub();
