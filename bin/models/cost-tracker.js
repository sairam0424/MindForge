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

async function preflight(estimatedCost = 0) {
  const settings = require('./model-router').getAllSettings();
  const hardLimit = parseFloat(settings.MODEL_COST_HARD_LIMIT_USD || '0.0');
  
  if (hardLimit <= 0) return;

  const todaySpend = getTodaySpendCached();
  const projected = todaySpend + estimatedCost;

  if (projected >= hardLimit) {
    throw Object.assign(
      new Error(`Daily cost limit $${hardLimit} reached (Today: $${todaySpend.toFixed(4)})`),
      { code: 'COST_LIMIT_REACHED', spend: todaySpend, limit: hardLimit }
    );
  }
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
