/**
 * MindForge v2 — Metrics Aggregator
 * Reads .mindforge/metrics/ and .planning/ files and produces
 * structured metrics for the dashboard API.
 */
'use strict';

const fs   = require('fs');
const path = require('path');

const QUALITY_LOG    = path.join(process.cwd(), '.mindforge', 'metrics', 'session-quality.jsonl');
const USAGE_LOG      = path.join(process.cwd(), '.mindforge', 'metrics', 'token-usage.jsonl');
const AUDIT_PATH     = path.join(process.cwd(), '.planning', 'AUDIT.jsonl');
const HANDOFF_PATH   = path.join(process.cwd(), '.planning', 'HANDOFF.json');
const AUTO_STATE     = path.join(process.cwd(), '.planning', 'auto-state.json');
const APPROVAL_DIR   = path.join(process.cwd(), '.planning', 'approvals');
const TEAM_STATE     = path.join(process.cwd(), '.planning', 'TEAM-STATE.jsonl');
const KB_PATH        = path.join(process.cwd(), '.mindforge', 'memory', 'knowledge-base.jsonl');

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
  const handoff   = readJSON(HANDOFF_PATH);
  const autoState = readJSON(AUTO_STATE);

  // Read project name from PROJECT.md
  let projectName = 'MindForge Project';
  const projectMd = path.join(process.cwd(), '.planning', 'PROJECT.md');
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
  const all = readJSONL(AUDIT_PATH, 1000);
  const reversed = all.reverse(); // Newest first

  const filtered = eventFilter
    ? reversed.filter(e => e.event === eventFilter)
    : reversed;

  return {
    entries: filtered.slice(offset, offset + limit),
    total:   filtered.length,
    limit,
    offset,
  };
}

// ── Metrics ───────────────────────────────────────────────────────────────────
function getMetrics() {
  const qualityEntries = readJSONL(QUALITY_LOG, 20);
  const usageEntries   = readJSONL(USAGE_LOG, 200);
  const auditEntries   = readJSONL(AUDIT_PATH, 500);

  // Quality scores (last 20 sessions)
  const sessions = qualityEntries.map(e => ({
    id:               e.session_id,
    timestamp:        e.timestamp,
    quality_score:    e.quality_score ?? 0,
    verify_pass_rate: e.verify_pass_rate ?? 0,
    cost_usd:         e.total_cost_usd ?? 0,
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

  return {
    sessions,
    avg_quality:        Math.round(avg_quality * 100) / 100,
    avg_cost_usd:       Math.round(avg_cost_usd * 10000) / 10000,
    security_findings:  securityFindings,
    node_repair_rate:   Math.round(node_repair_rate * 100) / 100,
    total_tasks:        taskEvents.filter(e => e.event === 'task_completed').length,
  };
}

// ── Approvals ─────────────────────────────────────────────────────────────────
function getApprovals() {
  if (!fs.existsSync(APPROVAL_DIR)) return { pending: [], approved: [], rejected: [], expired: [] };

  const now   = Date.now();
  const files = fs.readdirSync(APPROVAL_DIR)
    .filter(f => f.startsWith('APPROVAL-') && f.endsWith('.json'))
    .sort();

  const pending  = [];
  const approved = [];
  const rejected = [];
  const expired  = [];

  for (const f of files) {
    try {
      const data    = JSON.parse(fs.readFileSync(path.join(APPROVAL_DIR, f), 'utf8'));
      const expiry  = data.expires_at ? new Date(data.expires_at).getTime() : Infinity;
      const hoursRemaining = expiry === Infinity ? null : (expiry - now) / 3_600_000;

      const enriched = { ...data, hours_remaining: hoursRemaining };

      if (data.status === 'approved')        approved.push(enriched);
      else if (data.status === 'rejected')   rejected.push(enriched);
      else if (expiry < now)                 expired.push({ ...enriched, status: 'expired' });
      else                                   pending.push(enriched);
    } catch { /* skip corrupt files */ }
  }

  return { pending, approved, rejected, expired };
}

// ── Team activity ─────────────────────────────────────────────────────────────
function getTeamActivity() {
  const auditEntries = readJSONL(AUDIT_PATH, 200);

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

  return { active, conflicts };
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
  if (!fs.existsSync(KB_PATH)) return { entries: [], total: 0 };

  const lines  = fs.readFileSync(KB_PATH, 'utf8').split('\n').filter(Boolean);
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
  const entries    = readJSONL(USAGE_LOG, 1000);
  const cutoff     = new Date(Date.now() - windowDays * 86_400_000).toISOString().slice(0, 10);
  const today      = new Date().toISOString().slice(0, 10);

  const stats = {
    total_usd:     0,
    today_usd:     0,
    by_model:      {},
    daily_limit:   10.00, // Default for viz
  };

  for (const e of entries) {
    if (e.timestamp < cutoff) continue;
    
    const cost = e.total_cost_usd || 0;
    stats.total_usd += cost;
    
    if (e.timestamp.startsWith(today)) {
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

  return stats;
}

module.exports = {
  getStatus,
  getAuditEntries,
  getMetrics,
  getApprovals,
  getTeamActivity,
  getMemory,
  getCosts
};
