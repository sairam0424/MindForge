/**
 * MindForge v2 — Cost Tracker
 */
'use strict';

const fs = require('fs');
const { ledgerPath, ledgerDir, buildRecord, entryCost, entryDay } = require('./usage-record');

// Paths are resolved lazily (see usage-record.js) so the suite can exercise the
// ledger inside a temp cwd instead of appending to the developer's real ledger.
function ensureDir() {
  const dir = ledgerDir();
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

let _dailyCache = { value: 0, computed_at: 0 };

function getTodaySpend() {
  const usageLog = ledgerPath();
  if (!fs.existsSync(usageLog)) return 0;

  const today = new Date().toISOString().slice(0, 10);
  const content = fs.readFileSync(usageLog, 'utf8');
  const lines = content.trim().split('\n');

  let total = 0;
  for (const line of lines) {
    if (!line) continue;
    try {
      const entry = JSON.parse(line);
      if (entryDay(entry) === today) {
        total += entryCost(entry);
      }
    } catch (e) {
      process.stderr.write('[cost-tracker] Skipped malformed entry\n');
    }
  }
  return total;
}

function getTodaySpendCached() {
  const AGE_MS = Date.now() - _dailyCache.computed_at;
  if (AGE_MS > 60_000) {
    _dailyCache.value = getTodaySpend();
    _dailyCache.computed_at = Date.now();
  }
  return _dailyCache.value;
}

// COST-02 — the $25/day cap declared at MINDFORGE.md:54 was inert from the day it
// was written. v11.9.2 read `settings.MODEL_COST_HARD_LIMIT_USD`; the registry
// declares `[COST_HARD_LIMIT_USD]`. The MODEL_-prefixed name appears in exactly one
// shipped file (.mindforge/MINDFORGE-V2-SCHEMA.json:58) and that file has no code
// reader, so the lookup was always undefined -> parseFloat('0.0') -> 0 -> the
// `hardLimit <= 0` guard returned before any spend was compared. Canonical registry
// key first; the MODEL_-prefixed name is still read second so anyone who copied it
// out of the V2 schema keeps the working cap they have instead of silently losing it.
const HARD_LIMIT_KEYS = ['COST_HARD_LIMIT_USD', 'MODEL_COST_HARD_LIMIT_USD'];
const WARN_LIMIT_KEYS = ['COST_WARN_USD', 'MODEL_COST_WARN_USD'];

/** First non-empty key from `keys`, canonical-first. Returns null when none is set. */
function findThreshold(settings, keys) {
  for (const key of keys) {
    const raw = settings[key];
    if (raw !== undefined && raw !== null && String(raw).trim() !== '') {
      return { key, raw: String(raw) };
    }
  }
  return null;
}

/**
 * Classify a registry cost threshold. Returns a new object, never mutates input:
 *   { state: 'unset' }                  key absent/empty        -> caller fails OPEN
 *   { state: 'disabled', key, value:0 } explicit 0              -> caller fails OPEN
 *   { state: 'armed', key, value }      finite positive USD     -> caller enforces
 *   { state: 'invalid', key, raw }      unreadable or negative  -> caller fails CLOSED
 *
 * parseFloat after stripping a leading `$` and thousands separators — not Number() —
 * because `= $25.00` and `= 25.00 USD` are shapes a human types into MINDFORGE.md and
 * both plainly mean 25; Number() would call them invalid and refuse every model call.
 * Only a value with no leading number at all is invalid. Non-finite is invalid on
 * purpose: `Infinity` compares false against every projection, i.e. it is not a cap.
 */
function classifyThreshold(found) {
  if (!found) return { state: 'unset' };
  const value = parseFloat(found.raw.trim());
  if (!Number.isFinite(value) || value < 0) return { state: 'invalid', key: found.key, raw: found.raw };
  if (value === 0) return { state: 'disabled', key: found.key, value: 0 };
  return { state: 'armed', key: found.key, value };
}

// [COST_WARN_USD] had no reader anywhere in bin/ before COST-02. At most one line per
// UTC day per threshold, so an armed warning does not append to stderr on every call.
// Replaced as a whole object rather than mutated in place.
let _warnState = { day: '', threshold: 0 };

/** Soft threshold. Must never throw — a warning that blocks is a second hard cap. */
function warnIfCrossed(settings, projected, hardLimit) {
  const warn = classifyThreshold(findThreshold(settings, WARN_LIMIT_KEYS));
  if (warn.state !== 'armed') return;
  // Suppress only when an ARMED hard cap sits at or below the warn value — there the
  // throw preempts this line anyway. With no hard cap, nothing preempts it, and an
  // upgraded install without [COST_HARD_LIMIT_USD] is the common case
  // (installer-core.js:706 never rewrites an existing MINDFORGE.md) — precisely the
  // install that most needs a spend warning.
  if (hardLimit !== null && warn.value >= hardLimit) return;
  if (projected < warn.value) return;

  const today = new Date().toISOString().slice(0, 10);
  if (_warnState.day === today && _warnState.threshold === warn.value) return;
  _warnState = { day: today, threshold: warn.value };
  const cap = hardLimit === null ? 'no hard cap set' : `hard cap ${hardLimit}`;
  process.stderr.write(
    `[cost-tracker] Projected daily spend ${projected.toFixed(4)} crossed [${warn.key}] = ${warn.value} (${cap})\n`
  );
}

async function preflight(estimatedCost = 0) {
  const settings = require('./model-router').getAllSettings();
  const limit = classifyThreshold(findThreshold(settings, HARD_LIMIT_KEYS));

  // Fail CLOSED on a limit that is present but unreadable: a cap nobody can parse is
  // not a cap. Not a new surprise either — bin/validate-config.js already rejects this
  // exact config with exit 1, because COST_HARD_LIMIT_USD is typed "number" at
  // .mindforge/MINDFORGE-SCHEMA.json:87. The code is distinct from COST_LIMIT_REACHED
  // so a caller can tell a spend stop from a config fault; bin/models/model-client.js
  // re-throws both, which is the only reason this throw is not swallowed.
  if (limit.state === 'invalid') {
    throw Object.assign(
      new Error(`[${limit.key}] = "${limit.raw}" is not a USD amount — the daily cost cap cannot be evaluated. Set a number in MINDFORGE.md (0 disables the cap).`),
      { code: 'COST_LIMIT_MISCONFIGURED', key: limit.key, raw: limit.raw }
    );
  }

  // Fail OPEN when the key is absent or explicitly 0. DELIBERATE — do not invert it.
  // docs/research/2026-08-v12-upgrade-report.md:85 recommends making an unset limit a
  // config error, but bin/installer-core.js:706 writes MINDFORGE.md only when it does
  // not already exist, so every install upgraded from a registry predating this key
  // would start refusing every model call. The shipped schema agrees the key is
  // optional: it sits in `recommended`, not `required` (.mindforge/MINDFORGE-SCHEMA.json
  // :13-17), and bin/validate-config.js:48-49 only warns and exits 0 when it is absent.
  if (limit.state !== 'armed') {
    // The soft threshold must NOT depend on the hard cap. Guarded on the warn key so
    // the no-cost-config fast path stays a pure early return and never reads the ledger.
    if (classifyThreshold(findThreshold(settings, WARN_LIMIT_KEYS)).state === 'armed') {
      warnIfCrossed(settings, getTodaySpendCached() + estimatedCost, null);
    }
    return;
  }

  const todaySpend = getTodaySpendCached();
  const projected = todaySpend + estimatedCost;

  if (projected >= limit.value) {
    throw Object.assign(
      new Error(`Daily cost limit $${limit.value} reached (Today: $${todaySpend.toFixed(4)})`),
      { code: 'COST_LIMIT_REACHED', spend: todaySpend, limit: limit.value }
    );
  }

  warnIfCrossed(settings, projected, limit.value);
}

async function record(entry) {
  ensureDir();
  const enriched = buildRecord(entry);
  fs.appendFileSync(ledgerPath(), JSON.stringify(enriched) + '\n');
  _dailyCache.computed_at = 0; // Invalidate cache
}

function getSummary(params = { days: 7 }) {
  const usageLog = ledgerPath();
  if (!fs.existsSync(usageLog)) return { total_usd: 0, by_model: {} };

  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - params.days);
  const cutoffStr = cutoffDate.toISOString().slice(0, 10);

  const content = fs.readFileSync(usageLog, 'utf8');
  const lines = content.trim().split('\n');
  
  const result = {
    total_usd: 0,
    by_model: {},
    by_phase: {},
    calls: 0
  };

  for (const line of lines) {
    try {
      const entry = JSON.parse(line);
      if (entryDay(entry) >= cutoffStr) {
        const cost = entryCost(entry);
        result.total_usd += cost;
        result.calls++;
        
        const model = entry.model || 'unknown';
        if (!result.by_model[model]) result.by_model[model] = { cost: 0, calls: 0, tokens: 0, cache_read_tokens: 0, cache_creation_tokens: 0 };
        result.by_model[model].cost += cost;
        result.by_model[model].calls++;
        result.by_model[model].tokens += (entry.input_tokens || 0) + (entry.output_tokens || 0);
        result.by_model[model].cache_read_tokens += (entry.cache_read_input_tokens || 0);
        result.by_model[model].cache_creation_tokens += (entry.cache_creation_input_tokens || 0);

        const phase = entry.phase || 'unknown';
        if (!result.by_phase[phase]) result.by_phase[phase] = 0;
        result.by_phase[phase] += cost;
      }
    } catch (e) { /* ignore parse errors for summary */ }
  }
  return result;
}

module.exports = { record, preflight, getTodaySpend, getTodaySpendCached, getSummary };
