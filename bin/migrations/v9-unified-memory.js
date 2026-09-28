/**
 * MindForge v9 Migration — Unified Memory Architecture (Pillar XXVI)
 * Migrates knowledge-store JSONL and knowledge-graph JSONL into celestial.db.
 */
'use strict';

const fs = require('fs');
const vectorHub = require('../memory/vector-hub');
const knowledgeStore = require('../memory/knowledge-store');
const knowledgeGraph = require('../memory/knowledge-graph');

const fromVersion = '8.2.1';
const toVersion = '9.0.0';
const description = 'Unified Memory: migrate JSONL knowledge stores into SQLite';

async function run() {
  await vectorHub.init();

  const applied = await vectorHub.getAppliedMigrations();
  if (applied.includes('v9-unified-memory')) {
    console.log('[v9-MIGRATION] Already applied — skipping.');
    return;
  }

  let knowledgeMigrated = 0;
  let edgesMigrated = 0;
  let skippedLines = 0;

  await vectorHub.transaction(async ({ run: txRun }) => {
    // 1. Migrate knowledge-base.jsonl → knowledge table
    //
    // THE DEFECT THIS REPLACES. The global path used to be hardcoded as
    // process.cwd()/.mindforge/memory/global-knowledge-base.jsonl -- but that is not where the
    // global store actually lives. knowledge-store.js's own getPaths() puts it at
    // os.homedir()/.mindforge/global-knowledge-base.jsonl (no /memory/ nesting, and homedir rather
    // than cwd). The hardcoded path could never have matched a real file, so global entries were
    // silently skipped by every run of this migration. Reusing getPaths() also means this can't
    // drift from the real path again -- there is exactly one place that path is constructed.
    const paths = knowledgeStore.getPaths();
    const kbPaths = [
      paths.KB_PATH,
      paths.GLOBAL_KB_PATH,
    ];

    for (const kbPath of kbPaths) {
      if (!fs.existsSync(kbPath)) continue;
      const lines = fs.readFileSync(kbPath, 'utf8').split('\n').filter(Boolean);

      for (const line of lines) {
        try {
          const entry = JSON.parse(line);
          if (entry.status === 'deleted') continue;
          await vectorHub.saveKnowledge({
            id: entry.id,
            type: entry.type || 'insight',
            content: entry.content || entry.insight || '',
            tags: entry.tags || [],
            source: entry.source || (kbPath.includes('global') ? 'global' : 'project'),
            confidence: entry.confidence ?? 1.0,
            created_at: entry.timestamp || entry.created_at,
            metadata: entry,
          });
          knowledgeMigrated++;
        } catch (e) {
          skippedLines++;
        }
      }
    }

    // 2. Migrate knowledge-graph edges → graph_edges table
    //
    // THE DEFECT THIS REPLACES. This path used to be a second, independent hardcoded expression
    // (process.cwd()/.mindforge/memory/graph-edges.jsonl) -- the exact same drift risk just fixed
    // above for the KB paths, left unfixed here even though knowledge-graph.js already exposes its
    // own getPaths().EDGES_PATH for this. Under default state both resolved identically, so nothing
    // was broken today, but a future relocation of the real file would have silently broken this
    // migration's read with no test catching it. Reusing the shared resolver closes that gap the
    // same way knowledgeStore.getPaths() closed it for the KB paths above.
    const graphPath = knowledgeGraph.getPaths().EDGES_PATH;
    if (fs.existsSync(graphPath)) {
      const lines = fs.readFileSync(graphPath, 'utf8').split('\n').filter(Boolean);

      for (const line of lines) {
        try {
          const edge = JSON.parse(line);
          await vectorHub.saveEdge({
            id: edge.id || edge.edge_id,
            source_id: edge.source_id || edge.from,
            target_id: edge.target_id || edge.to,
            edge_type: edge.edge_type || edge.type || 'RELATED_TO',
            weight: edge.weight ?? 1.0,
            created_at: edge.timestamp || edge.created_at,
          });
          edgesMigrated++;
        } catch (e) {
          skippedLines++;
        }
      }
    }
  });

  // 3. Record migration completion (outside transaction — it committed successfully)
  await vectorHub.recordMigration('v9-unified-memory');

  console.log(`[v9-MIGRATION] Knowledge entries migrated: ${knowledgeMigrated}`);
  console.log(`[v9-MIGRATION] Graph edges migrated: ${edgesMigrated}`);
  if (skippedLines > 0) {
    console.warn(`[v9-MIGRATION] WARNING: ${skippedLines} malformed lines skipped`);
  }
}

if (require.main === module) {
  run().then(() => process.exit(0)).catch(err => { console.error(err); process.exit(1); });
}

module.exports = { fromVersion, toVersion, description, run };
