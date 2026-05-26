/**
 * MindForge Migration: v0.6.0 → v1.0.0
 *
 * Changes:
 * 1. HANDOFF.json: add `plugin_api_version` field
 * 2. AUDIT.jsonl: backfill `session_id` for entries missing it
 * 3. MINDFORGE.md: convert VERIFY_PASS_RATE_WARNING_THRESHOLD if in old 0-100 format
 * 4. STATE.md: add v1.0.0 compatibility note if it doesn't already have one
 */
'use strict';

const fs = require('fs');

module.exports = {
  fromVersion: '0.6.0',
  toVersion:   '1.0.0',
  description: 'Add plugin_api_version; backfill session_id; normalise MINDFORGE.md thresholds',

  async run(paths) {
    // ── 1. HANDOFF.json ───────────────────────────────────────────────────────
    if (fs.existsSync(paths.handoff)) {
      const handoff = JSON.parse(fs.readFileSync(paths.handoff, 'utf8'));

      if (!handoff.plugin_api_version) {
        handoff.plugin_api_version = '1.0.0';
      }
      // Ensure fields added in 0.6.0 are present (for projects that skipped intermediate updates)
      if (!Array.isArray(handoff.recent_commits)) handoff.recent_commits = [];
      if (!Array.isArray(handoff.recent_files))   handoff.recent_files   = [];
      if (!handoff.session_id) {
        handoff.session_id = `migrated-${Date.now()}`;
      }

      fs.writeFileSync(paths.handoff, JSON.stringify(handoff, null, 2) + '\n');
      console.log('    • HANDOFF.json: added plugin_api_version, normalised arrays');
    }

    // ── 2. AUDIT.jsonl ────────────────────────────────────────────────────────
    if (fs.existsSync(paths.audit)) {
      const raw   = fs.readFileSync(paths.audit, 'utf8');
      const lines = raw.split('\n').filter(Boolean);
      let modified = 0;

      const updated = lines.map(line => {
        try {
          const entry = JSON.parse(line);
          if (!entry.session_id) {
            entry.session_id = 'migrated-from-pre-1.0';
            modified++;
            return JSON.stringify(entry);
          }
          return line;
        } catch {
          return line;  // Preserve unparseable lines exactly as-is (quarantine pattern)
        }
      });

      if (modified > 0) {
        fs.writeFileSync(paths.audit, updated.join('\n') + '\n');
        console.log(`    • AUDIT.jsonl: backfilled session_id in ${modified} of ${lines.length} entries`);
      } else {
        console.log('    • AUDIT.jsonl: all entries already have session_id');
      }
    }

    // ── 3. MINDFORGE.md ───────────────────────────────────────────────────────
    if (fs.existsSync(paths.mindforgemd)) {
      let content = fs.readFileSync(paths.mindforgemd, 'utf8');
      let changed = false;

      // Convert VERIFY_PASS_RATE_WARNING_THRESHOLD from percent (>1) to decimal
      const pctPattern = /^(VERIFY_PASS_RATE_WARNING_THRESHOLD=)(\d+(?:\.\d+)?)(\s*)$/m;
      const match = content.match(pctPattern);
      if (match) {
        const val = parseFloat(match[2]);
        if (val > 1) {
          // Old format: integer like 75 → new format: 0.75
          const newVal = (val / 100).toFixed(2);
          content = content.replace(pctPattern, `$1${newVal}$3`);
          changed = true;
          console.log(`    • MINDFORGE.md: converted VERIFY_PASS_RATE_WARNING_THRESHOLD ${val} → ${newVal}`);
        }
        // If val <= 1, it's already in the correct format — no change needed
      }

      if (changed) fs.writeFileSync(paths.mindforgemd, content);
    }

    // ── 4. STATE.md ───────────────────────────────────────────────────────────
    if (fs.existsSync(paths.state)) {
      const content = fs.readFileSync(paths.state, 'utf8');
      if (!content.includes('v1.0.0') && !content.includes('MindForge v1')) {
        fs.appendFileSync(paths.state,
          `\n\n---\n*Migrated to MindForge v1.0.0 schema on ${new Date().toISOString().slice(0,10)}*\n`
        );
        console.log('    • STATE.md: added v1.0.0 migration note');
      }
    }
  },
};
