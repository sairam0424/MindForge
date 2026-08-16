/**
 * MindForge — Token-usage ledger record shape.
 *
 * SINGLE SOURCE OF TRUTH for `.mindforge/metrics/token-usage.jsonl`.
 * The writer (bin/models/cost-tracker.js, fed by every provider in
 * bin/models/*-provider.js) and every reader (bin/models/cost-tracker.js,
 * bin/dashboard/metrics-aggregator.js) MUST go through this module so the
 * field names cannot drift apart again.
 *
 * Canonical row (all five providers emit exactly this cost field):
 *   {
 *     model, input_tokens, output_tokens,
 *     cache_read_input_tokens?, cache_creation_input_tokens?,
 *     cost_usd,                       // <- the ONLY cost field. Never total_cost_usd.
 *     task_name?, session_id?, phase?,
 *     date,                           // 'YYYY-MM-DD', added by buildRecord()
 *     timestamp                       // full ISO 8601, added by buildRecord()
 *   }
 *
 * `total_cost_usd` is a DIFFERENT concept that belongs to cross-review reports
 * (bin/review/cross-review-engine.js:72) and must never appear in this ledger.
 *
 * NOTE ON PATHS: resolution stays on process.cwd() (not bin/utils/paths.js
 * findProjectRoot) to preserve today's behaviour exactly; relocating user state
 * is deliberately deferred to v12.
 *
 * KNOWN STALE SITE, deliberately NOT migrated here: bin/migrations/1.0.0-to-2.0.0.js:93
 * resolves the ledger to .planning/token-usage.jsonl — a path that has never existed —
 * so that migration silently no-ops. Repointing it is out of scope for COST-01 because
 * it would start a migration that has never run against real data. Until then, this
 * module is the single source of truth for every LIVE reader and writer, not literally
 * every path-resolution site in the tree.
 */
'use strict';

const path = require('path');

// Project-root-relative location of the append-only usage ledger.
const LEDGER_SEGMENTS = ['.mindforge', 'metrics', 'token-usage.jsonl'];

/** Absolute path to the ledger. Resolved lazily so tests can chdir. */
function ledgerPath(root = process.cwd()) {
  return path.join(root, ...LEDGER_SEGMENTS);
}

/** Directory containing the ledger. */
function ledgerDir(root = process.cwd()) {
  return path.join(root, ...LEDGER_SEGMENTS.slice(0, -1));
}

/** Stamp a provider result into a canonical ledger row. */
function buildRecord(entry, now = new Date()) {
  const iso = now.toISOString();
  return { ...entry, date: iso.slice(0, 10), timestamp: iso };
}

/** Cost of one row, in USD. Returns 0 for absent/non-finite values. */
function entryCost(entry) {
  const v = entry && entry.cost_usd;
  return typeof v === 'number' && Number.isFinite(v) ? v : 0;
}

/** 'YYYY-MM-DD' day of one row: prefers `date`, falls back to `timestamp`. */
function entryDay(entry) {
  if (!entry) return '';
  if (typeof entry.date === 'string' && entry.date.length >= 10) return entry.date.slice(0, 10);
  if (typeof entry.timestamp === 'string' && entry.timestamp.length >= 10) return entry.timestamp.slice(0, 10);
  return '';
}

module.exports = { LEDGER_SEGMENTS, ledgerPath, ledgerDir, buildRecord, entryCost, entryDay };
