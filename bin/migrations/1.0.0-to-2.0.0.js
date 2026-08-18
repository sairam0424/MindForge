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
const { appendAuditEntrySync } = require('../autonomous/audit-writer');

module.exports = {
  fromVersion: '1.0.0',
  toVersion:   '2.0.0',
  description: 'Additive schema upgrade: record the migration in the audit log; model_group in tokens',

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
    //
    // APPEND-ONLY, for the same reason as 0.6.0-to-1.0.0.js step 2: this rewrote every entry to add
    // `runtime` and `agent_id`, and bin/governance/audit-hash.js hashes {...entry, previous_hash}, so
    // any added key changes the hash material and the chain breaks at the first entry while the
    // migration reports success.
    //
    // Worse than its sibling, because here the backfill had NO consumer at all: `git grep agent_id`
    // and `git grep model_group` outside bin/migrations/ return zero readers in bin/. The chain was
    // being destroyed to populate fields nothing reads.
    //
    // Note safeMigrate() cannot express this — it takes raw content and returns replacement content,
    // which is a rewrite by construction. An append goes through the canonical writer instead.
    if (fs.existsSync(paths.audit)) {
      appendAuditEntrySync(paths.audit, {
        event:       'schema_migrated',
        target_id:   'AUDIT.jsonl',
        description: 'schema 1.0.0 -> 2.0.0; existing entries left byte-identical (append-only log)',
        agent:       'migrate',
      });
      console.log('    • AUDIT.jsonl: recorded the migration as a new entry; existing entries untouched');
    }

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
