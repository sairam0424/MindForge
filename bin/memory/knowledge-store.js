/**
 * MindForge v2 — Knowledge Store
 * Append-only JSONL knowledge base with CRUD-like operations.
 *
 * Philosophy:
 * - NEVER delete entries — deprecate instead (audit trail)
 * - NEVER update entries in-place — append new version, deprecate old
 * - All writes are atomic (append to JSONL is atomic on POSIX)
 * - Reads are always full scan + in-memory filter (files stay small)
 */
'use strict';

const fs   = require('fs');
const path = require('path');
const os   = require('os');
const crypto = require('crypto');

// ── Paths ─────────────────────────────────────────────────────────────────────
let baseDir = process.cwd();
let globalBaseDir = os.homedir();

/**
 * Configure the base directory for memory (useful for testing).
 */
function setBaseDir(dir) {
  baseDir = dir;
}

/**
 * Configure the global base directory (useful for testing).
 */
function setGlobalDir(dir) {
  globalBaseDir = dir;
}

function getPaths() {
  const memoryDir = path.join(baseDir, '.mindforge', 'memory');
  const globalDir = path.join(globalBaseDir, '.mindforge');
  return {
    MEMORY_DIR:       memoryDir,
    GLOBAL_DIR:       globalDir,
    KB_PATH:          path.join(memoryDir, 'knowledge-base.jsonl'),
    GLOBAL_KB_PATH:   path.join(globalDir, 'global-knowledge-base.jsonl'),
    DECISION_PATH:    path.join(memoryDir, 'decision-library.jsonl'),
    PATTERN_PATH:     path.join(memoryDir, 'pattern-library.jsonl'),
    PREFERENCES_PATH: path.join(memoryDir, 'team-preferences.jsonl'),
  };
}

/**
 * Generates a UUID v4.
 */
function generateId() {
  return crypto.randomUUID();
}

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function getFilePath(type) {
  const paths = getPaths();
  switch (type) {
    case 'architectural_decision': return paths.DECISION_PATH;
    case 'code_pattern':           return paths.PATTERN_PATH;
    case 'team_preference':        return paths.PREFERENCES_PATH;
    default:                       return paths.KB_PATH; // bug_pattern, domain_knowledge, all others
  }
}

// ── Write operations ──────────────────────────────────────────────────────────

/**
 * Append a new knowledge entry.
 * @param {object} entry - Entry data (without id, timestamp, times_referenced)
 * @returns {string} The new entry's ID
 */
function add(entry) {
  const paths = getPaths();
  ensureDir(paths.MEMORY_DIR);

  if (!entry.type)    throw new Error('Knowledge entry requires a "type" field');
  if (!entry.topic)   throw new Error('Knowledge entry requires a "topic" field');
  if (!entry.content) throw new Error('Knowledge entry requires a "content" field');

  const id = entry.id || generateId();
  const now = new Date().toISOString();

  const full = {
    id,
    timestamp: now,
    type:              entry.type,
    topic:             entry.topic.slice(0, 80), // Enforce max topic length
    content:           entry.content,
    source:            entry.source || 'manual',
    project:           entry.project || readProjectName(),
    confidence:        Math.min(1.0, Math.max(0.0, entry.confidence ?? 0.7)),
    tags:              Array.isArray(entry.tags) ? entry.tags : [],
    linked_adrs:       Array.isArray(entry.linked_adrs) ? entry.linked_adrs : [],
    times_referenced:  entry.times_referenced || 0,
    last_referenced:   entry.last_referenced || null,
    deprecated:        false,
    deprecated_by:     null,
    // Type-specific fields
    ...(entry.decision     && { decision:     entry.decision }),
    ...(entry.rationale    && { rationale:    entry.rationale }),
    ...(entry.alternatives && { alternatives: entry.alternatives }),
    ...(entry.adr_reference && { adr_reference: entry.adr_reference }),
    ...(entry.pattern_type && { pattern_type: entry.pattern_type }),
    ...(entry.language     && { language:     entry.language }),
    ...(entry.example_good && { example_good: entry.example_good }),
    ...(entry.example_bad  && { example_bad:  entry.example_bad }),
    ...(entry.bug_category && { bug_category: entry.bug_category }),
    ...(entry.root_cause   && { root_cause:   entry.root_cause }),
    ...(entry.fix          && { fix:          entry.fix }),
    ...(entry.preference   && { preference:   entry.preference }),
    ...(entry.strength     && { strength:     entry.strength }),
    ...(entry.domain       && { domain:       entry.domain }),
    ...(entry.tech_stack   && { tech_stack:   entry.tech_stack }),
  };

  const filePath = getFilePath(entry.type);
  fs.appendFileSync(filePath, JSON.stringify(full) + '\n');

  // Also append to unified knowledge-base.jsonl for cross-type queries
  if (filePath !== paths.KB_PATH) {
    fs.appendFileSync(paths.KB_PATH, JSON.stringify(full) + '\n');
  }

  return id;
}

/**
 * Deprecate an entry (never hard-delete).
 */
function deprecate(id, reason, supersededBy = null) {
  const paths = getPaths();
  const entries = readAll();
  const entry   = entries.find(e => e.id === id);
  if (!entry) throw new Error(`Knowledge entry not found: ${id}`);

  // Append a deprecation marker (new entry with same id, deprecated=true)
  const filePath = getFilePath(entry.type);
  const deprecated = {
    ...entry,
    deprecated:        true,
    deprecated_by:     supersededBy,
    deprecated_reason: reason,
    deprecated_at:     new Date().toISOString(),
  };

  fs.appendFileSync(filePath, JSON.stringify(deprecated) + '\n');
  if (filePath !== paths.KB_PATH) {
    fs.appendFileSync(paths.KB_PATH, JSON.stringify(deprecated) + '\n');
  }

  return id;
}

/**
 * Reinforce an entry (increase confidence, increment reference count).
 */
function reinforce(id) {
  const paths = getPaths();
  const entries   = readAll();
  const entry     = entries.find(e => e.id === id && !e.deprecated);
  if (!entry) return;

  const reinforced = {
    ...entry,
    confidence:       Math.min(1.0, entry.confidence + 0.05),
    times_referenced: entry.times_referenced + 1,
    last_referenced:  new Date().toISOString(),
  };

  const filePath = getFilePath(entry.type);
  fs.appendFileSync(filePath, JSON.stringify(reinforced) + '\n');
  if (filePath !== paths.KB_PATH) {
    fs.appendFileSync(paths.KB_PATH, JSON.stringify(reinforced) + '\n');
  }
}

// ── Read operations ───────────────────────────────────────────────────────────

/**
 * Read all entries from a JSONL file.
 * Handles the append pattern: later entries with same ID supersede earlier ones.
 */
function readFile(filePath) {
  if (!fs.existsSync(filePath)) return [];

  const lines = fs.readFileSync(filePath, 'utf8').split('\n').filter(Boolean);
  const byId  = new Map(); // Later entries (same ID) win

  for (const line of lines) {
    try {
      const entry = JSON.parse(line);
      byId.set(entry.id, entry); // Last write wins
    } catch {
      // Skip malformed lines — never crash on corrupt JSONL
    }
  }

  return [...byId.values()];
}

function readAll(includeGlobal = false) {
  const paths = getPaths();
  let entries = readFile(paths.KB_PATH);
  if (includeGlobal && fs.existsSync(paths.GLOBAL_KB_PATH)) {
    const globalEntries = readFile(paths.GLOBAL_KB_PATH).map(e => ({ ...e, global: true }));
    entries = [...entries, ...globalEntries];
  }
  return entries;
}

function readByType(type) {
  return readFile(getFilePath(type)).filter(e => e.type === type);
}

// ── Query operations ──────────────────────────────────────────────────────────

/**
 * Query the knowledge base.
 * Returns entries sorted by relevance score (confidence × recency × tag overlap).
 */
function query(params = {}) {
  const {
    tags          = [],
    topic,
    type,
    minConfidence = 0.3,
    limit         = 20,
    includeGlobal = false,
    includeDeprecated = false,
    project,
  } = params;

  let entries = readAll(includeGlobal);

  // Filter
  if (!includeDeprecated) entries = entries.filter(e => !e.deprecated);
  if (type)               entries = entries.filter(e => e.type === type);
  if (project)            entries = entries.filter(e => !e.project || e.project === project);
  entries = entries.filter(e => e.confidence >= minConfidence);

  // Score entries by relevance
  const scored = entries.map(e => ({
    entry: e,
    score: scoreRelevance(e, { tags, topic }),
  }));

  return scored
    .filter(s => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(s => s.entry);
}

function scoreRelevance(entry, { tags = [], topic = '' }) {
  let score = entry.confidence; // Base score from confidence

  // Tag overlap
  const entryTags = entry.tags || [];
  const tagOverlap = tags.filter(t => entryTags.some(et => et.toLowerCase() === t.toLowerCase())).length;
  score += tagOverlap * 0.2;

  // Topic text match
  if (topic) {
    const topicWords = topic.toLowerCase().split(/\s+/);
    const entryText  = `${entry.topic} ${entry.content}`.toLowerCase();
    const wordMatches = topicWords.filter(w => w.length > 3 && entryText.includes(w)).length;
    score += (wordMatches / Math.max(topicWords.length, 1)) * 0.3;
  }

  // Recency boost (entries referenced in last 30 days get a small boost)
  if (entry.last_referenced) {
    const daysSince = (Date.now() - new Date(entry.last_referenced).getTime()) / 86_400_000;
    if (daysSince < 30) score += 0.1 * (1 - daysSince / 30);
  }

  // Penalty for very low reference count (may be noisy)
  if (entry.times_referenced === 0) score *= 0.9;

  return score;
}

// ── Project name helper ───────────────────────────────────────────────────────
function readProjectName() {
  const projectMd = path.join(process.cwd(), '.planning', 'PROJECT.md');
  if (!fs.existsSync(projectMd)) return 'unknown';
  const match = fs.readFileSync(projectMd, 'utf8').match(/^# (.+)/m);
  return match?.[1]?.trim().slice(0, 50) || 'unknown';
}

// ── Statistics ────────────────────────────────────────────────────────────────
function stats() {
  const all    = readAll();
  const active = all.filter(e => !e.deprecated);
  const byType = {};
  for (const e of active) {
    byType[e.type] = (byType[e.type] || 0) + 1;
  }
  return {
    total_entries:      all.length,
    active_entries:     active.length,
    deprecated_entries: all.length - active.length,
    by_type:            byType,
    avg_confidence:     active.length
      ? active.reduce((s, e) => s + e.confidence, 0) / active.length
      : 0,
  };
}

module.exports = {
  add, deprecate, reinforce,
  readAll, readByType, readFile, query, stats,
  setBaseDir, setGlobalDir, getPaths,
};
