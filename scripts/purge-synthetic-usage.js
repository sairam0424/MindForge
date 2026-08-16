#!/usr/bin/env node
/**
 * MindForge — Synthetic Usage-Ledger Purge  (repo maintenance; does NOT ship)
 *
 * Until COST-01, tests/model-routing.test.js appended its fixture row to the
 * REAL .mindforge/metrics/token-usage.jsonl: bin/models/cost-tracker.js resolved
 * the ledger from process.cwd() and the suite runs from the repo root. One
 * byte-identical row accumulated per suite run (measured 2026-08-16: 1,090 rows,
 * $13.6250, 100% synthetic — the count is a moving target by construction, so
 * this script reports what it finds instead of asserting a number). It removes
 * ONLY rows that are exactly that fixture.
 *
 * SCOPE — this script touches EXACTLY ONE file: .mindforge/metrics/token-usage.jsonl.
 * It never opens .mindforge/celestial.db (or any SQLite database), .planning/AUDIT.jsonl,
 * or git. The only other path it writes is the backup under scratch-pad/purge-backups/.
 *
 * Fail-closed by design:
 *   - dry run unless --apply is passed;
 *   - a row is synthetic only if its key set is EXACTLY the fixture key set AND
 *     every fixture value matches exactly (an extra key, a different model, or a
 *     different cost => retained);
 *   - unparseable lines are always RETAINED verbatim, never silently dropped;
 *   - refuses to write unless kept + purged === total;
 *   - a timestamped backup is written to scratch-pad/purge-backups/ (gitignored
 *     via .gitignore:2, so it can never be committed or npm-packed) BEFORE any
 *     rewrite. NOT next to the ledger: .mindforge/metrics/ IS in package.json
 *     files[] and only the exact path token-usage.jsonl is negated, so a sibling
 *     token-usage.jsonl.bak-* would be committed AND npm-packed;
 *   - idempotent: a second --apply finds 0 synthetic rows and leaves the file
 *     untouched (no new backup, no rewrite);
 *   - the rewrite is atomic (temp file + rename).
 *
 * Usage:
 *   node scripts/purge-synthetic-usage.js            # dry run + report
 *   node scripts/purge-synthetic-usage.js --apply    # backup, then rewrite
 */
'use strict';

const fs = require('fs');
const path = require('path');
const { ledgerPath, entryCost } = require('../bin/models/usage-record');

const LEDGER = ledgerPath();
const BACKUP_DIR = path.join(process.cwd(), 'scratch-pad', 'purge-backups');

// The exact fixture from tests/model-routing.test.js plus the two fields
// cost-tracker.record() stamps on. Any deviation => NOT synthetic.
const FIXTURE_KEYS = ['cost_usd', 'date', 'input_tokens', 'model', 'output_tokens', 'timestamp'];
const FIXTURE_VALUES = { model: 'gpt-4o', input_tokens: 1000, output_tokens: 500, cost_usd: 0.0125 };

function isSyntheticFixture(line) {
  let entry;
  try { entry = JSON.parse(line); } catch { return false; }
  if (!entry || typeof entry !== 'object' || Array.isArray(entry)) return false;
  const keys = Object.keys(entry).sort();
  if (keys.length !== FIXTURE_KEYS.length) return false;
  for (let i = 0; i < keys.length; i++) if (keys[i] !== FIXTURE_KEYS[i]) return false;
  for (const k of Object.keys(FIXTURE_VALUES)) if (entry[k] !== FIXTURE_VALUES[k]) return false;
  return true;
}

function sumCost(lines) {
  return lines.reduce((total, line) => {
    try { return total + entryCost(JSON.parse(line)); } catch { return total; }
  }, 0);
}

function main() {
  const apply = process.argv.includes('--apply');

  if (!fs.existsSync(LEDGER)) {
    console.log(`[purge] no ledger at ${LEDGER} — nothing to do.`);
    return 0;
  }

  const lines = fs.readFileSync(LEDGER, 'utf8').split('\n').filter(l => l.length > 0);
  const kept = [];
  let purged = 0;
  let unparseable = 0;

  for (const line of lines) {
    if (isSyntheticFixture(line)) { purged++; continue; }
    try { JSON.parse(line); } catch { unparseable++; }
    kept.push(line);
  }

  if (kept.length + purged !== lines.length) {
    console.error('[purge] ABORT: line accounting mismatch — refusing to write.');
    return 1;
  }

  console.log(`[purge] ledger:               ${LEDGER}`);
  console.log(`[purge] total rows:           ${lines.length}`);
  console.log(`[purge] synthetic (removable): ${purged}  ($${(sumCost(lines) - sumCost(kept)).toFixed(4)})`);
  console.log(`[purge] retained:             ${kept.length}  ($${sumCost(kept).toFixed(4)})`);
  console.log(`[purge] unparseable retained: ${unparseable}`);
  for (const l of kept.slice(0, 5)) console.log(`[purge] retained sample: ${l}`);

  if (!apply) {
    console.log('[purge] DRY RUN — re-run with --apply to write.');
    return 0;
  }
  if (purged === 0) {
    console.log('[purge] nothing synthetic found — ledger left untouched.');
    return 0;
  }

  fs.mkdirSync(BACKUP_DIR, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backup = path.join(BACKUP_DIR, `token-usage-${stamp}.jsonl`);
  fs.copyFileSync(LEDGER, backup);

  // '.tmp.' (not '.tmp-') so it matches the repo's UC-09 ignore convention, and the
  // ledger's directory is a whole-directory files[] entry — a leaked temp file would
  // otherwise be both committable and publishable.
  const tmp = `${LEDGER}.tmp.${process.pid}`;
  try {
    fs.writeFileSync(tmp, kept.length ? kept.join('\n') + '\n' : '', 'utf8');
    fs.renameSync(tmp, LEDGER);
  } catch (err) {
    try { fs.unlinkSync(tmp); } catch { /* nothing to clean up */ }
    console.error(`[purge] ABORT: rewrite failed (${err.code || err.message}); ledger unchanged, backup kept at ${backup}`);
    return 1;
  }

  console.log(`[purge] backup written: ${backup}`);
  console.log(`[purge] APPLIED — removed ${purged} synthetic rows, kept ${kept.length}.`);
  return 0;
}

process.exit(main());
