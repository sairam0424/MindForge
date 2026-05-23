const fs = require('fs');
const path = require('path');
const vectorHub = require('../memory/vector-hub');

/**
 * MindForge v8 SQLite Migration Script
 * Migrates legacy .json and .jsonl state into VectorHub.
 */
async function runMigration() {
  console.log('[MIGRATION] Starting MindForge v8 (Celestial) SQLite migration...');

  await vectorHub.init();

  // 1. Migrate Remediation Queue
  const remPath = path.join(process.cwd(), '.mindforge', 'remediation-queue.json');
  if (fs.existsSync(remPath)) {
    try {
      const data = JSON.parse(fs.readFileSync(remPath, 'utf8'));
      console.log(`[MIGRATION] Migrating ${data.length} remediations...`);
      for (const rem of data) {
        vectorHub.run(
          `INSERT OR IGNORE INTO remediations (id, trace_id, strategy, status, timestamp, outcome)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [
            rem.remediation_id,
            rem.span_id,
            rem.strategy,
            rem.status,
            rem.timestamp || new Date().toISOString(),
            rem.status === 'SUCCESS' ? 'Legacy Success' : null
          ]
        );
      }
    } catch (err) {
      console.warn(`[MIGRATION] Failed to migrate remediations: ${err.message}`);
    }
  }

  // 2. Migrate Audit Traces (AUDIT.jsonl)
  const auditPath = path.join(process.cwd(), '.planning', 'AUDIT.jsonl');
  if (fs.existsSync(auditPath)) {
    try {
      const lines = fs.readFileSync(auditPath, 'utf8').split('\n').filter(Boolean);
      console.log(`[MIGRATION] Migrating ${lines.length} audit trace lines...`);

      for (const line of lines) {
        const entry = JSON.parse(line);
        if (entry.event === 'reasoning_trace' || entry.event === 'drift_remediation_event') {
          await vectorHub.recordTrace({
            id: entry.id,
            trace_id: entry.trace_id || 'legacy_trace',
            span_id: entry.span_id || null,
            event: entry.event,
            timestamp: entry.timestamp,
            agent: entry.agent || null,
            content: entry.thought || entry.strategy || null,
            metadata: entry,
            drift_score: entry.drift_score || 0
          });
        }
      }
    } catch (err) {
      console.warn(`[MIGRATION] Failed to migrate audit traces: ${err.message}`);
    }
  }

  // 3. Set Mesh Node Identity
  vectorHub.run(
    'INSERT OR IGNORE INTO mesh_config (key, value) VALUES (?, ?)',
    ['mesh_node_id', `mindforge-node-${Math.random().toString(36).substr(2, 6)}`]
  );

  vectorHub.run(
    'INSERT OR IGNORE INTO mesh_config (key, value) VALUES (?, ?)',
    ['v8_migration_complete', new Date().toISOString()]
  );

  console.log('[MIGRATION] MindForge v8 Migration Successful.');
  await vectorHub.close();
}

if (require.main === module) {
  runMigration().catch(console.error);
}

module.exports = runMigration;
