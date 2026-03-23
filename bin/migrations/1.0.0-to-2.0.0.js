/**
 * MindForge Migration: v1.0.0 → v2.0.0 (The Autonomous Enterprise)
 *
 * Changes:
 * 1. AUDIT.jsonl: Add `runtime` and `agent_id` for consistent v2 reporting.
 * 2. token-usage.jsonl: Add `model_group` for the new analytics dashboard.
 * 3. HANDOFF.json: Upgrade `plugin_api_version` to 2.0.0.
 * 4. Hardening: Automatic backup/restore and smart skip logic.
 */
'use strict';

const fs = require('fs');
const path = require('path');

module.exports = {
  fromVersion: '1.0.0',
  toVersion:   '2.0.0',
  description: 'Additive schema upgrade: backfill runtime/agent_id in audit; model_group in tokens',

  async run(paths) {
    const backupDir = path.join(path.dirname(paths.handoff), '.backups', `v1-to-v2-${Date.now()}`);
    
    // ── Pre-flight: Create backup directory ───────────────────────────────────
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }

    const safeMigrate = (filePath, migrateFn) => {
      if (!fs.existsSync(filePath)) return;
      
      const fileName = path.basename(filePath);
      const backupPath = path.join(backupDir, fileName);
      
      try {
        // Backup
        fs.copyFileSync(filePath, backupPath);
        
        // Migrate
        const original = fs.readFileSync(filePath, 'utf8');
        const updated = migrateFn(original);
        
        if (original !== updated) {
          fs.writeFileSync(filePath, updated);
          console.log(`    • ${fileName}: migrated successfully (backup at .backups/)`);
        } else {
          console.log(`    • ${fileName}: already up to date`);
        }
      } catch (err) {
        console.error(`    ❌ ${fileName}: migration failed. Restoring from backup...`);
        if (fs.existsSync(backupPath)) {
          fs.copyFileSync(backupPath, filePath);
        }
        throw err;
      }
    };

    // ── 1. HANDOFF.json ───────────────────────────────────────────────────────
    safeMigrate(paths.handoff, (raw) => {
      const data = JSON.parse(raw);
      if (data.plugin_api_version !== '2.0.0') {
        data.plugin_api_version = '2.0.0';
        return JSON.stringify(data, null, 2) + '\n';
      }
      return raw;
    });

    // ── 2. AUDIT.jsonl ────────────────────────────────────────────────────────
    safeMigrate(paths.audit, (raw) => {
      const lines = raw.split('\n').filter(Boolean);
      let modified = 0;
      
      const updated = lines.map(line => {
        try {
          const entry = JSON.parse(line);
          let changed = false;
          if (!entry.runtime) { entry.runtime = 'unknown'; changed = true; }
          if (!entry.agent_id) { entry.agent_id = 'migrated-v1'; changed = true; }
          
          if (changed) {
            modified++;
            return JSON.stringify(entry);
          }
          return line;
        } catch {
          return line;
        }
      });
      
      return modified > 0 ? updated.join('\n') + '\n' : raw;
    });

    // ── 3. token-usage.jsonl ──────────────────────────────────────────────────
    const tokensFile = path.join(path.dirname(paths.handoff), 'token-usage.jsonl');
    safeMigrate(tokensFile, (raw) => {
      const lines = raw.split('\n').filter(Boolean);
      let modified = 0;
      
      const updated = lines.map(line => {
        try {
          const entry = JSON.parse(line);
          if (!entry.model_group) {
            entry.model_group = 'unknown';
            modified++;
            return JSON.stringify(entry);
          }
          return line;
        } catch {
          return line;
        }
      });
      
      return modified > 0 ? updated.join('\n') + '\n' : raw;
    });
  },
};
