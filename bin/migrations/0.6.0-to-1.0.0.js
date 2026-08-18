/**
 * MindForge Migration: v0.6.0 → v1.0.0
 *
 * Changes:
 * 1. HANDOFF.json: add `plugin_api_version` field
 * 2. AUDIT.jsonl: append a migration record — existing entries are NEVER rewritten (see step 2)
 * 3. MINDFORGE.md: convert VERIFY_PASS_RATE_WARNING_THRESHOLD if in old 0-100 format
 * 4. STATE.md: add v1.0.0 compatibility note if it doesn't already have one
 */
'use strict';

const fs = require('fs');
const { appendAuditEntrySync } = require('../autonomous/audit-writer');

module.exports = {
  fromVersion: '0.6.0',
  toVersion:   '1.0.0',
  description: 'Add plugin_api_version; record the migration in the audit log; normalise MINDFORGE.md thresholds',

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
    //
    // APPEND-ONLY. This step used to rewrite every entry to backfill `session_id`, which BROKE the
    // hash chain and then reported success. Measured on a 50-entry chain written by the real writer:
    //
    //     before  ->  audit chain valid: 50 entries          exit 0
    //     after   ->  audit chain BROKEN at entry 0: hash mismatch (entry mutated)   exit 1
    //
    // 50 of 50 entries mutated, integrity destroyed at the very first entry, and the migration printed
    // "backfilled session_id in 50 of 50 entries" and carried on to report "All migrations complete".
    // bin/governance/audit-hash.js hashes {...entry, previous_hash} with JSON.stringify, so ANY added
    // key changes the material — a back-linked log cannot be edited in place, only appended to. No file
    // in this directory referenced the canonical hasher.
    //
    // AND THE BACKFILL BOUGHT NOTHING. The only consumer of `session_id` on an audit entry is
    // bin/dashboard/metrics-aggregator.js:253,286, which reads
    // `entry.authored_by || entry.session_id || 'unknown'`. So the rewrite swapped the placeholder
    // 'unknown' for the placeholder 'migrated-from-pre-1.0' — no consumer distinguishes them — at the
    // cost of every integrity guarantee in the file. Deleting it loses nothing.
    //
    // What IS worth recording is that a migration touched this project, so one entry is APPENDED
    // through the canonical writer. An append extends the chain instead of invalidating it.
    if (fs.existsSync(paths.audit)) {
      appendAuditEntrySync(paths.audit, {
        event:       'schema_migrated',
        target_id:   'AUDIT.jsonl',
        description: 'schema 0.6.0 -> 1.0.0; existing entries left byte-identical (append-only log)',
        agent:       'migrate',
      });
      console.log('    • AUDIT.jsonl: recorded the migration as a new entry; existing entries untouched');
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
