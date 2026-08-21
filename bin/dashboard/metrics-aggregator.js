/**
 * MindForge v2 — Metrics Aggregator
 * Reads .mindforge/metrics/ and .planning/ files and produces
 * structured metrics for the dashboard API.
 */
'use strict';

const fs   = require('fs');
const path = require('path');
const { ledgerPath, entryCost, entryDay } = require('../models/usage-record');

// ── TTL Cache (5-second window) ──────────────────────────────────────────────
const _cache = new Map();
const CACHE_TTL_MS = 5000;

function cacheGet(key) {
  const entry = _cache.get(key);
  if (!entry) return undefined;
  if (Date.now() - entry.timestamp >= CACHE_TTL_MS) {
    _cache.delete(key);
    return undefined;
  }
  return entry.data;
}

function cacheSet(key, data) {
  _cache.set(key, { data, timestamp: Date.now() });
}

// Paths are resolved lazily to support testing in temp directories
const getPaths = () => ({
  quality:   path.join(process.cwd(), '.mindforge', 'metrics', 'session-quality.jsonl'),
  usage:     ledgerPath(),
  audit:     path.join(process.cwd(), '.planning', 'AUDIT.jsonl'),
  handoff:   path.join(process.cwd(), '.planning', 'HANDOFF.json'),
  auto:      path.join(process.cwd(), '.planning', 'auto-state.json'),
  approvals: path.join(process.cwd(), '.planning', 'approvals'),
  team:      path.join(process.cwd(), '.planning', 'TEAM-STATE.jsonl'),
  kb:        path.join(process.cwd(), '.mindforge', 'memory', 'knowledge-base.jsonl'),
  project:   path.join(process.cwd(), '.planning', 'PROJECT.md'),
});

function readJSONL(filePath, limit = 500) {
  if (!fs.existsSync(filePath)) return [];
  return fs.readFileSync(filePath, 'utf8')
    .split('\n').filter(Boolean).slice(-limit)
    .map(l => { try { return JSON.parse(l); } catch { return null; } })
    .filter(Boolean);
}

function readJSON(filePath) {
  if (!fs.existsSync(filePath)) return null;
  try { return JSON.parse(fs.readFileSync(filePath, 'utf8')); } catch { return null; }
}

// ── Status ────────────────────────────────────────────────────────────────────
function getStatus() {
  const paths     = getPaths();
  const handoff   = readJSON(paths.handoff);
  const autoState = readJSON(paths.auto);

  // Read project name from PROJECT.md
  let projectName = 'MindForge Project';
  const projectMd = paths.project;
  if (fs.existsSync(projectMd)) {
    const m = fs.readFileSync(projectMd, 'utf8').match(/^# (.+)/m);
    if (m) projectName = m[1].trim();
  }

  return {
    project_name:      projectName,
    phase:             handoff?.current_phase ?? null,
    phase_description: handoff?.phase_description ?? null,
    auto_mode:         autoState?.auto_mode_active ?? false,
    auto_status:       autoState?.status ?? 'idle',
    current_task:      autoState?.current_task ?? handoff?.next_task ?? null,
    wave_current:      autoState?.wave_current ?? null,
    wave_total:        autoState?.wave_total ?? null,
    tasks_completed:   autoState?.tasks_completed ?? null,
    tasks_total:       autoState?.tasks_total ?? null,
    elapsed_ms:        autoState?.elapsed_ms ?? null,
    node_repairs:      autoState?.node_repairs ?? 0,
    escalations:       autoState?.escalations ?? 0,
    last_commit:       autoState?.last_commit ?? null,
    last_event_at:     handoff?.last_updated ?? null,
    schema_version:    handoff?.schema_version ?? null,
  };
}

// ── Audit ─────────────────────────────────────────────────────────────────────
function getAuditEntries(limit = 50, offset = 0, eventFilter = null) {
  const cacheKey = `audit:${limit}:${offset}:${eventFilter || ''}`;
  const cached = cacheGet(cacheKey);
  if (cached !== undefined) return cached;

  const paths = getPaths();
  const all   = readJSONL(paths.audit, 1000);
  const reversed = all.reverse(); // Newest first

  const filtered = eventFilter
    ? reversed.filter(e => e.event === eventFilter)
    : reversed;

  const result = {
    entries: filtered.slice(offset, offset + limit),
    total:   filtered.length,
    limit,
    offset,
  };

  cacheSet(cacheKey, result);
  return result;
}

// ── Metrics ───────────────────────────────────────────────────────────────────
function getMetrics() {
  const cached = cacheGet('metrics');
  if (cached !== undefined) return cached;

  const paths          = getPaths();
  const qualityEntries = readJSONL(paths.quality, 20);
  const usageEntries   = readJSONL(paths.usage, 200);
  const auditEntries   = readJSONL(paths.audit, 500);

  // Quality scores (last 20 sessions)
  // session-quality.jsonl has NO writer anywhere in this repo — every one of its
  // four references (here, sdk/src/client.ts, mcp-server/src/vendor/client.ts,
  // plugins/mindforge/mcp/dist/index.js) is a READ, and no command instructs an
  // agent to append it either. The read is kept because those three other
  // consumers depend on the file and a schema-compliant one may exist in a user
  // project; supplying a writer is OUT OF SCOPE for this patch. Read the
  // SCHEMA-DECLARED names first (.mindforge/metrics/METRICS-SCHEMA.md), keeping
  // the historical names as fallbacks.
  // Per-session cost is NOT a session-quality field: it is joined from the
  // usage ledger by session_id (every provider result carries one — see
  // bin/models/model-client.js:69).
  const costBySession = usageEntries.reduce((acc, u) => {
    if (!u || typeof u.session_id !== 'string') return acc;
    acc[u.session_id] = (acc[u.session_id] || 0) + entryCost(u);
    return acc;
  }, {});

  const sessions = qualityEntries.map(e => ({
    id:               e.session_id,
    timestamp:        e.timestamp,
    quality_score:    e.session_quality_score ?? e.quality_score ?? 0,
    verify_pass_rate: e.verify_pass_rate ?? 0,
    cost_usd:         costBySession[e.session_id] ?? 0,
    node_repairs:     e.node_repairs ?? 0,
  }));

  const avg_quality    = sessions.length
    ? sessions.reduce((s, e) => s + e.quality_score, 0) / sessions.length : 0;
  const avg_cost_usd   = sessions.length
    ? sessions.reduce((s, e) => s + e.cost_usd, 0) / sessions.length : 0;

  // Security findings from AUDIT
  const securityFindings = { CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0 };
  auditEntries
    .filter(e => e.event === 'security_finding')
    .forEach(e => {
      const sev = e.severity || 'LOW';
      securityFindings[sev] = (securityFindings[sev] || 0) + 1;
    });

  // Node repair rate
  const taskEvents   = auditEntries.filter(e => e.event === 'task_completed' || e.event === 'task_failed');
  const repairEvents = auditEntries.filter(e => e.event === 'node_repair');
  const node_repair_rate = taskEvents.length
    ? repairEvents.length / taskEvents.length : 0;

  const result = {
    sessions,
    avg_quality:        Math.round(avg_quality * 100) / 100,
    avg_cost_usd:       Math.round(avg_cost_usd * 10000) / 10000,
    security_findings:  securityFindings,
    node_repair_rate:   Math.round(node_repair_rate * 100) / 100,
    total_tasks:        taskEvents.filter(e => e.event === 'task_completed').length,
  };

  cacheSet('metrics', result);
  return result;
}

// ── Approvals ─────────────────────────────────────────────────────────────────
/**
 * Read the approval records that actually exist, with their verified integrity.
 *
 * This replaces a read path that could never return anything. It filtered
 * `f.startsWith('APPROVAL-')` while the only producer — bin/governance/approve.js — writes
 * `approval-<id>.json` in lower case, and String.prototype.startsWith is case-sensitive on every
 * platform (macOS's case-insensitive filesystem affects fs.open, not this comparison). It then
 * categorised on a `status` field no producer has ever written, so any record that HAD been
 * found would have fallen into `pending` regardless of what it said.
 *
 * The categories are now derived from verification rather than from a self-declared status:
 * a record either verifies against the release being built, or it is stale, or it is corrupt.
 * There is deliberately no `pending` category — nothing in MindForge creates a pending approval
 * REQUEST; approve.js records an already-made decision. A category with no producer is exactly
 * the kind of empty promise this pass exists to remove.
 *
 * Returns an ARRAY, because the previous object shape was also incompatible with its only
 * consumer: the dashboard did `currentApprovals.length` and `.map()` on it, which on an object
 * yields undefined and then a TypeError.
 */
function getApprovals() {
  const paths = getPaths();
  if (!fs.existsSync(paths.approvals)) return [];

  const { verifyRecord } = require('../governance/approval-record');
  let currentVersion = null;
  try {
    // MindForge's version, resolved by package NAME. `path.join(__dirname, '..', '..',
    // 'package.json')` reached <project>/package.json in an install — the CONSUMER's manifest — so
    // verifyRecord() below compared an approval record against the host app's version (0.4.2, say)
    // instead of MindForge's. The try/catch stopped it crashing, which is why it went unnoticed:
    // a wrong binding is quieter than a missing one.
    currentVersion = require('../utils/mindforge-version').resolveMindforgeVersion(process.cwd()).version;
  } catch { /* version binding is skipped if the manifest is unreadable */ }

  const now = Date.now();
  const files = fs.readdirSync(paths.approvals)
    .filter(f => f.endsWith('.json'))
    .sort();

  const out = [];
  for (const f of files) {
    let data;
    try { data = JSON.parse(fs.readFileSync(path.join(paths.approvals, f), 'utf8')); }
    catch (e) {
      out.push({ file: f, state: 'corrupt', problems: [`not valid JSON: ${e.message}`] });
      continue;
    }
    const v = verifyRecord(data, { currentVersion, now: new Date(now) });
    const expiry = data.expires_at ? new Date(data.expires_at).getTime() : null;
    out.push({
      ...data,
      file: f,
      state: v.ok ? 'valid' : (v.stale ? 'stale' : 'corrupt'),
      problems: v.problems,
      hours_remaining: expiry === null ? null : (expiry - now) / 3_600_000,
    });
  }
  return out;
}

// ── Team activity ─────────────────────────────────────────────────────────────
function getTeamActivity() {
  const cached = cacheGet('teamActivity');
  if (cached !== undefined) return cached;

  const paths        = getPaths();
  const auditEntries = readJSONL(paths.audit, 200);

  // Group by author (git email from session_id or authored_by field)
  const byAuthor = {};
  for (const entry of auditEntries) {
    const author = entry.authored_by || entry.session_id || 'unknown';
    if (!byAuthor[author] || entry.timestamp > byAuthor[author].last_seen) {
      byAuthor[author] = {
        email:        author,
        last_seen:    entry.timestamp,
        current_task: entry.plan ? `Plan ${entry.phase}-${entry.plan}` : null,
        event:        entry.event,
      };
    }
  }

  const now    = Date.now();
  const active = Object.values(byAuthor)
    .map(a => ({
      ...a,
      last_seen_mins: Math.round((now - new Date(a.last_seen).getTime()) / 60_000),
    }))
    .filter(a => a.last_seen_mins < 120) // Active in last 2 hours
    .sort((a, b) => a.last_seen_mins - b.last_seen_mins);

  // Conflict detection — two authors recently touching same file
  const conflicts = detectFileConflicts(auditEntries);

  const result = { active, conflicts };
  cacheSet('teamActivity', result);
  return result;
}

function detectFileConflicts(auditEntries) {
  const fileToAuthors = {};

  for (const entry of auditEntries.slice(-100)) {
    if (!entry.files_modified) continue;
    const author = entry.authored_by || entry.session_id;
    if (!author) continue;

    const files = Array.isArray(entry.files_modified) ? entry.files_modified : [entry.files_modified];
    for (const f of files) {
      if (!fileToAuthors[f]) fileToAuthors[f] = new Set();
      fileToAuthors[f].add(author);
    }
  }

  return Object.entries(fileToAuthors)
    .filter(([, authors]) => authors.size > 1)
    .map(([file, authors]) => ({ file, developers: [...authors] }));
}

// ── Memory ────────────────────────────────────────────────────────────────────
function getMemory(query = '', limit = 20) {
  const paths = getPaths();
  if (!fs.existsSync(paths.kb)) return { entries: [], total: 0 };

  const lines  = fs.readFileSync(paths.kb, 'utf8').split('\n').filter(Boolean);
  const byId   = new Map();
  for (const l of lines) {
    try { const e = JSON.parse(l); byId.set(e.id, e); } catch { /* skip */ }
  }

  let entries = [...byId.values()].filter(e => !e.deprecated);

  if (query) {
    const q = query.toLowerCase();
    entries = entries.filter(e =>
      e.topic.toLowerCase().includes(q) ||
      e.content.toLowerCase().includes(q) ||
      (e.tags || []).some(t => t.toLowerCase().includes(q))
    );
  }

  entries.sort((a, b) => b.confidence - a.confidence);

  return { entries: entries.slice(0, limit), total: entries.length };
}

// ── Costs ─────────────────────────────────────────────────────────────────────
function getCosts(windowDays = 7) {
  const cacheKey = `costs:${windowDays}`;
  const cached = cacheGet(cacheKey);
  if (cached !== undefined) return cached;

  const paths      = getPaths();
  const entries    = readJSONL(paths.usage, 1000);
  const cutoff     = new Date(Date.now() - windowDays * 86_400_000).toISOString().slice(0, 10);
  const today      = new Date().toISOString().slice(0, 10);

  const stats = {
    total_usd:     0,
    today_usd:     0,
    by_model:      {},
    daily_limit:   10.00, // Default for viz
  };

  for (const e of entries) {
    // Ledger rows carry both `date` and `timestamp` (see bin/models/usage-record.js).
    // Bucket on the canonical day so date-only and full-ISO rows behave alike.
    const day = entryDay(e);
    if (!day || day < cutoff) continue;

    const cost = entryCost(e);
    stats.total_usd += cost;

    if (day === today) {
      stats.today_usd += cost;
    }

    const model = e.model || 'unknown';
    stats.by_model[model] = (stats.by_model[model] || 0) + cost;
  }

  // Cleanup numbers
  stats.total_usd = Math.round(stats.total_usd * 100) / 100;
  stats.today_usd = Math.round(stats.today_usd * 100) / 100;
  for (const m in stats.by_model) {
    stats.by_model[m] = Math.round(stats.by_model[m] * 100) / 100;
  }

  cacheSet(cacheKey, stats);
  return stats;
}

// ── Heap Health ──────────────────────────────────────────────────────────────
function checkHeapHealth() {
  const heapUsed = process.memoryUsage().heapUsed;
  const maxHeap = getMaxOldSpaceSize();
  const usagePct = Math.round(heapUsed / maxHeap * 100);

  let status = 'healthy';
  if (usagePct > 85) {
    status = 'critical';
  } else if (usagePct > 70) {
    status = 'warning';
  }

  return { status, usage_pct: usagePct };
}

function getMaxOldSpaceSize() {
  // Parse --max-old-space-size from process args, default 1.4GB
  const flag = process.execArgv.find(a => a.startsWith('--max-old-space-size'));
  if (flag) {
    const mb = parseInt(flag.split('=')[1], 10);
    if (mb > 0) return mb * 1024 * 1024;
  }
  return 1.4 * 1024 * 1024 * 1024;
}

module.exports = {
  getStatus,
  getAuditEntries,
  getMetrics,
  getApprovals,
  getTeamActivity,
  getMemory,
  getCosts,
  checkHeapHealth
};
