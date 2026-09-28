'use strict';

const fs = require('fs');
const path = require('path');

const MIGRATION_ID = '10.7.0-to-11.0.0';
const TARGET_VERSION = '11.0.0';

async function migrate(projectRoot) {
  const results = { steps: [], success: true };

  // Step 1: Backup config.json
  const configPath = path.join(projectRoot, '.mindforge', 'config.json');
  if (fs.existsSync(configPath)) {
    const backupPath = configPath + '.v10-backup';
    fs.copyFileSync(configPath, backupPath);
    results.steps.push({ step: 'backup_config', status: 'done', path: backupPath });

    // Step 2: Add new config sections
    try {
      const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));

      if (!config.temporal) {
        config.temporal = { max_snapshots: 50, max_age_days: 7 };
      }
      if (!config.rate_limiting) {
        config.rate_limiting = { dashboard_rpm: 100, model_rpm: {} };
      }
      if (!config.session) {
        config.session = { token_expiry_hours: 24 };
      }
      if (!config.wave_execution) {
        config.wave_execution = { max_concurrency: 3 };
      }

      config.version = TARGET_VERSION;

      fs.writeFileSync(configPath, JSON.stringify(config, null, 2) + '\n');
      results.steps.push({ step: 'update_config', status: 'done' });
    } catch (e) {
      results.steps.push({ step: 'update_config', status: 'warning', error: e.message });
    }
  }

  // THE DEFECT this replaces: this step used to archive AUDIT.jsonl past 5000 lines by gzipping
  // everything except the last 500 lines, then OVERWRITING the live file with just that tail --
  // a genuine non-append rewrite of the SHA-256 back-linked audit log. That breaks the hash chain
  // the exact same way bin/autonomous/audit-writer.js's own retirement comment documents (UC-04b):
  // "archiving + truncating AUDIT.jsonl orphaned the carried head's previous_hash from an entry no
  // longer on disk, so the verifier failed closed on a rotated-but-untampered file." This migration
  // was dead code until it was wired into migrate.js's allMigrations() (see that file), so the
  // defect was latent, not live -- but wiring it in without removing this step would have made a
  // reachable hash-chain-breaking path for any real project whose AUDIT.jsonl had grown past 5000
  // lines during an upgrade crossing 11.0.0. Removed entirely, matching the same accepted tradeoff
  // audit-writer.js already documents project-wide: AUDIT.jsonl grows unbounded by design until
  // chain-aware compaction (re-anchoring the first carried entry to previous_hash=null) ships as
  // its own, separate feature -- not invented here as a side effect of unrelated migration wiring.

  // Step 4: GC old snapshots
  try {
    const TemporalHub = require('../engine/temporal-hub');
    const gcResult = await TemporalHub.gc({ maxSnapshots: 50, maxAgeDays: 30 });
    results.steps.push({ step: 'snapshot_gc', status: 'done', deleted: gcResult.deleted });
  } catch (e) {
    results.steps.push({ step: 'snapshot_gc', status: 'warning', error: e.message });
  }

  // Step 5: Bump schema_version in HANDOFF.json
  const handoffPath = path.join(projectRoot, '.planning', 'HANDOFF.json');
  if (fs.existsSync(handoffPath)) {
    try {
      const handoff = JSON.parse(fs.readFileSync(handoffPath, 'utf8'));
      handoff.schema_version = TARGET_VERSION;
      fs.writeFileSync(handoffPath, JSON.stringify(handoff, null, 2) + '\n');
      results.steps.push({ step: 'bump_handoff_version', status: 'done' });
    } catch (e) {
      results.steps.push({ step: 'bump_handoff_version', status: 'warning', error: e.message });
    }
  }

  // Step 6: Update MINDFORGE.md VERSION
  const mindforgeFile = path.join(projectRoot, 'MINDFORGE.md');
  if (fs.existsSync(mindforgeFile)) {
    try {
      let content = fs.readFileSync(mindforgeFile, 'utf8');
      content = content.replace(/VERSION\s*=\s*[\d.]+/, `VERSION = ${TARGET_VERSION}`);
      fs.writeFileSync(mindforgeFile, content);
      results.steps.push({ step: 'bump_mindforge_version', status: 'done' });
    } catch (e) {
      results.steps.push({ step: 'bump_mindforge_version', status: 'warning', error: e.message });
    }
  }

  return results;
}

module.exports = { MIGRATION_ID, TARGET_VERSION, migrate };
