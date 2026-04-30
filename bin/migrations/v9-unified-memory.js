/**
 * MindForge v9 Migration — Unified Memory Architecture (Pillar XXVI)
 * Migrates knowledge-store JSONL and knowledge-graph JSONL into celestial.db.
 */
'use strict';

const fs = require('fs');
const path = require('path');
const vectorHub = require('../memory/vector-hub');

const fromVersion = '8.2.1';
const toVersion = '9.0.0';
const description = 'Unified Memory: migrate JSONL knowledge stores into SQLite';

async function run() {
  await vectorHub.init();
  let knowledgeMigrated = 0;
  let edgesMigrated = 0;

  // 1. Migrate knowledge-base.jsonl → knowledge table
  const kbPaths = [
    path.join(process.cwd(), '.mindforge', 'memory', 'knowledge-base.jsonl'),
    path.join(process.cwd(), '.mindforge', 'memory', 'global-knowledge-base.jsonl'),
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
          source: entry.source || kbPath.includes('global') ? 'global' : 'project',
          confidence: entry.confidence ?? 1.0,
          created_at: entry.timestamp || entry.created_at,
          metadata: entry,
        });
        knowledgeMigrated++;
      } catch (e) {
        // Skip malformed lines
      }
    }
  }

  // 2. Migrate knowledge-graph edges → graph_edges table
  const graphPath = path.join(process.cwd(), '.mindforge', 'memory', 'graph-edges.jsonl');
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
        // Skip malformed lines
      }
    }
  }

  // 3. Record migration completion
  await vectorHub.recordMigration('v9-unified-memory');

  console.log(`[v9-MIGRATION] Knowledge entries migrated: ${knowledgeMigrated}`);
  console.log(`[v9-MIGRATION] Graph edges migrated: ${edgesMigrated}`);
}

if (require.main === module) {
  run().then(() => process.exit(0)).catch(err => { console.error(err); process.exit(1); });
}

module.exports = { fromVersion, toVersion, description, run };
