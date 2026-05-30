/**
 * MindForge Semantic Hub
 * v4.2.5 — Global Intelligence Mesh
 */

const fs = require('node:fs/promises');
const path = require('node:path');
const os = require('node:os');
const vectorHub = require('./vector-hub'); // v8 Pillar XV

class SemanticHub {
  constructor() {
    this.localPath = '.mindforge/memory';
    this.globalPath = path.join(os.homedir(), '.mindforge/memory/global');
    this.syncManifest = path.join(this.localPath, 'sync-manifest.json');
    this.vhInitialized = false;
  }

  async ensureInit() {
    if (!this.vhInitialized) {
      await vectorHub.init();
      this.vhInitialized = true;
    }
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
    } catch (e) { /* intentionally empty */ }

    manifest[libraryName] = {
      lastSync: new Date().toISOString(),
      localCount: count
    };

    await fs.writeFile(this.syncManifest, JSON.stringify(manifest, null, 2));
  }

  /**
   * Retrieves all 'golden_trace' types from the global hub and local SQLite.
   */
  async getGoldenTraces(skillFilter = null) {
    await this.ensureInit();

    // v8: Prioritize SQLite search for high-speed retrieval
    let sqliteTraces = [];
    try {
      if (skillFilter) {
        sqliteTraces = await vectorHub.searchTraces(skillFilter);
      } else {
        sqliteTraces = vectorHub.query(
          'SELECT * FROM traces WHERE event = ? LIMIT 20',
          ['reasoning_trace']
        );
      }
    } catch (err) {
      console.warn(`[SEMANTIC-HUB] SQLite trace lookup failed: ${err.message}`);
    }

    // Legacy file-based fallback/global sync
    const patternFile = path.join(this.globalPath, 'pattern-library.jsonl');
    let fileTraces = [];
    try {
      const data = await fs.readFile(patternFile, 'utf8');
      fileTraces = data.split('\n')
        .filter(Boolean)
        .map(JSON.parse)
        .filter(p => p.type === 'golden-trace' || p.tags?.includes('success'));

      if (skillFilter) {
        fileTraces = fileTraces.filter(t => t.skill === skillFilter || t.tags?.includes(skillFilter));
      }
    } catch (e) {
      // Fallback is silent
    }

    // Merge and deduplicate
    const allTraces = [...sqliteTraces, ...fileTraces];
    const uniqueTraces = Array.from(new Map(allTraces.map(t => [t.id || t.trace_id, t])).values());

    return uniqueTraces;
  }

  /**
   * Retrieves all 'ghost_pattern' types for proactive risk detection.
   */
  async getGhostPatterns() {
    await this.ensureInit();

    // 1. Fetch from legacy file-based global hub
    const patternFile = path.join(this.globalPath, 'pattern-library.jsonl');
    let ghostPatterns = [];
    try {
      const data = await fs.readFile(patternFile, 'utf8');
      ghostPatterns = data.split('\n')
        .filter(Boolean)
        .map(JSON.parse)
        .filter(p => p.type === 'ghost-pattern' || p.tags?.includes('failure'));
    } catch (e) {
      // Missing library is handled gracefully
    }

    // 2. Fetch from SQLite high-drift traces (v8 specific ghosting)
    try {
      const v8Ghosts = vectorHub.query(
        'SELECT * FROM traces WHERE drift_score > ? LIMIT 20',
        [0.5]
      );

      const v8Mapped = v8Ghosts.map(g => ({
        id: g.id,
        tags: ['v8-drift-risk', 'failure'],
        failureContext: g.content,
        mitigationStrategy: 'Review logic drift in v8 trace logs.'
      }));

      ghostPatterns = [...ghostPatterns, ...v8Mapped];
    } catch (err) {
      console.warn(`[SEMANTIC-HUB] SQLite ghost lookup failed: ${err.message}`);
    }

    return ghostPatterns;
  }

  /**
   * Saves a discovered skill to SQLite.
   */
  async saveSkill(skill) {
    await this.ensureInit();
    vectorHub.run(
      `INSERT OR REPLACE INTO skills (skill_id, name, description, path, success_rate, last_verified)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        skill.id || `sk_${Math.random().toString(36).substr(2, 6)}`,
        skill.name,
        skill.description || '',
        skill.path || '',
        skill.success_rate || 0.0,
        new Date().toISOString()
      ]
    );

    // v8 Pillar XVII: Metadata provenance for evolved skills
    if (skill.is_autonomous) {
      console.log(`[SEMANTIC-HUB] Persistence acknowledged for ASE evolved skill: ${skill.name}`);
    }
  }
}

module.exports = new SemanticHub();
