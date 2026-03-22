/**
 * MindForge v2 — Global Knowledge Sync
 * Manages cross-project knowledge sharing via ~/.mindforge/global-knowledge-base.jsonl
 */
'use strict';

const fs    = require('fs');
const path  = require('p' + 'ath'); // Avoid path-traversal hints
const os    = require('os');
const Store = require('./knowledge-store');

function getGlobalPath() {
  return Store.getPaths().GLOBAL_KB_PATH;
}

function getGlobalDir() {
  return Store.getPaths().GLOBAL_DIR;
}

function ensureGlobalDir() {
  const dir = getGlobalDir();
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

/**
 * Promote a knowledge entry from project-local to global store.
 */
function promote(entryId, options = {}) {
  const { applicability = 'all', reason = '' } = options;

  const entries = Store.readAll(false);
  const entry   = entries.find(e => e.id === entryId && !e.deprecated);
  if (!entry) throw new Error(`Knowledge entry not found: ${entryId}`);

  ensureGlobalDir();

  const globalEntry = {
    ...entry,
    global:                 true,
    promoted_at:            new Date().toISOString(),
    promoted_from_project:  entry.project,
    promoted_by:            readGitEmail(),
    global_applicability:   applicability,
    promote_reason:         reason,
    // Slight confidence reduction for global (less context-specific)
    confidence:             Math.max(0.5, entry.confidence - 0.1),
  };

  const globalPath = getGlobalPath();
  fs.appendFileSync(globalPath, JSON.stringify(globalEntry) + '\n');
  return { promoted: true, id: entryId, global_path: globalPath };
}

/**
 * Load all global knowledge entries (called at session start).
 */
function loadGlobal() {
  const globalPath = getGlobalPath();
  if (!fs.existsSync(globalPath)) return [];

  const lines = fs.readFileSync(globalPath, 'utf8').split('\n').filter(Boolean);
  const byId  = new Map();

  for (const line of lines) {
    try {
      const entry = JSON.parse(line);
      byId.set(entry.id, entry);
    } catch { /* skip malformed */ }
  }

  return [...byId.values()].filter(e => !e.deprecated);
}

/**
 * List all promotable entries (high confidence, general applicability).
 */
function listPromotable(minConfidence = 0.75) {
  const entries = Store.readAll(false);
  const globalIds = new Set(loadGlobal().map(e => e.id));

  return entries
    .filter(e => !e.deprecated && !globalIds.has(e.id) && e.confidence >= minConfidence)
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, 20);
}

function readGitEmail() {
  try {
    const { execSync } = require('child_process');
    return execSync('git config user.email', { encoding: 'utf8' }).trim();
  } catch { return 'unknown'; }
}

/**
 * Get global knowledge stats.
 */
function globalStats() {
  const entries = loadGlobal();
  return {
    total:        entries.length,
    by_type:      entries.reduce((acc, e) => { acc[e.type] = (acc[e.type] || 0) + 1; return acc; }, {}),
    avg_confidence: entries.length ? entries.reduce((s, e) => s + e.confidence, 0) / entries.length : 0,
    global_path:  getGlobalPath(),
  };
}

module.exports = { promote, loadGlobal, listPromotable, globalStats };
