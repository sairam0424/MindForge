/**
 * MindForge v2 — Cost Tracker
 */
'use strict';

const fs = require('fs');
const path = require('path');

const METRICS_DIR = path.join(process.cwd(), '.mindforge', 'metrics');
const USAGE_LOG = path.join(METRICS_DIR, 'token-usage.jsonl');

function ensureDir() {
  if (!fs.existsSync(METRICS_DIR)) {
    fs.mkdirSync(METRICS_DIR, { recursive: true });
  }
}

let _dailyCache = { value: 0, computed_at: 0 };

function getTodaySpend() {
  if (!fs.existsSync(USAGE_LOG)) return 0;
  
  const today = new Date().toISOString().slice(0, 10);
  const content = fs.readFileSync(USAGE_LOG, 'utf8');
  const lines = content.trim().split('\n');
  
  let total = 0;
  for (const line of lines) {
    try {
      const entry = JSON.parse(line);
      if (entry.date === today) {
        total += entry.cost_usd || 0;
      }
    } catch (e) {
      process.stderr.write(`[cost-tracker] Skipped malformed entry\n`);
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
  const enriched = {
    ...entry,
    date: new Date().toISOString().slice(0, 10),
    timestamp: new Date().toISOString()
  };
  fs.appendFileSync(USAGE_LOG, JSON.stringify(enriched) + '\n');
  _dailyCache.computed_at = 0; // Invalidate cache
}

function getSummary(params = { days: 7 }) {
  if (!fs.existsSync(USAGE_LOG)) return { total_usd: 0, by_model: {} };
  
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - params.days);
  const cutoffStr = cutoffDate.toISOString().slice(0, 10);

  const content = fs.readFileSync(USAGE_LOG, 'utf8');
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
      if (entry.date >= cutoffStr) {
        const cost = entry.cost_usd || 0;
        result.total_usd += cost;
        result.calls++;
        
        const model = entry.model || 'unknown';
        if (!result.by_model[model]) result.by_model[model] = { cost: 0, calls: 0, tokens: 0 };
        result.by_model[model].cost += cost;
        result.by_model[model].calls++;
        result.by_model[model].tokens += (entry.input_tokens || 0) + (entry.output_tokens || 0);

        const phase = entry.phase || 'unknown';
        if (!result.by_phase[phase]) result.by_phase[phase] = 0;
        result.by_phase[phase] += cost;
      }
    } catch (e) {}
  }
  return result;
}

module.exports = { record, preflight, getTodaySpend, getTodaySpendCached, getSummary };
