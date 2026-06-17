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

  // Step 3: Archive old AUDIT lines if > 5000
  const auditPath = path.join(projectRoot, '.planning', 'AUDIT.jsonl');
  if (fs.existsSync(auditPath)) {
    try {
      const content = fs.readFileSync(auditPath, 'utf8');
      const lines = content.split('\n').filter(l => l.trim());
      if (lines.length > 5000) {
        const archiveDir = path.join(projectRoot, '.planning', 'audit-archive');
        if (!fs.existsSync(archiveDir)) fs.mkdirSync(archiveDir, { recursive: true });

        const zlib = require('zlib');
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const archivePath = path.join(archiveDir, `AUDIT-pre-v11-${timestamp}.jsonl.gz`);
        const toArchive = lines.slice(0, -500).join('\n') + '\n';
        fs.writeFileSync(archivePath, zlib.gzipSync(toArchive));

        const remaining = lines.slice(-500).join('\n') + '\n';
        fs.writeFileSync(auditPath, remaining);
        results.steps.push({ step: 'archive_audit', status: 'done', archived: lines.length - 500 });
      } else {
        results.steps.push({ step: 'archive_audit', status: 'skipped', reason: 'under_threshold' });
      }
    } catch (e) {
      results.steps.push({ step: 'archive_audit', status: 'warning', error: e.message });
    }
  }

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
