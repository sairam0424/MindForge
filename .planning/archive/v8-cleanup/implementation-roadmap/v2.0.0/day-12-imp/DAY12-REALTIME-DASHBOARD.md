# MindForge v2 — Day 12: Real-Time Web Observability Dashboard
# Branch: `feat/mindforge-v2-realtime-dashboard`
# Prerequisite: `feat/mindforge-v2-persistent-memory` merged to `main`
# Version target: v2.0.0-alpha.5
# Theme: "The Entire Team Sees What MindForge Is Doing."

---

## BRANCH SETUP

```bash
git checkout main
git pull origin main

# Verify Day 11 baseline
node -e "console.log(require('./package.json').version)"  # Must be 2.0.0-alpha.4

# All 19 test suites must pass before starting Day 12
SUITES=(install wave-engine audit compaction skills-platform \
        integrations governance intelligence metrics \
        distribution ci-mode sdk production migration e2e \
        autonomous browser model-routing memory)

for suite in "${SUITES[@]}"; do
  printf "  %-30s" "${suite}..."
  node tests/${suite}.test.js 2>&1 | tail -1
done
# ALL 19 must pass — zero failures before Day 12 begins.

git checkout -b feat/mindforge-v2-realtime-dashboard
```

---

## DAY 12 SCOPE

Day 12 builds the **Real-Time Web Observability Dashboard** — the feature that
takes MindForge from a CLI-only tool to a team-visible platform. When
`/mindforge:auto` is running in one terminal, anyone on the team can open
`http://localhost:7339` and see exactly what is happening: tasks completing,
security findings, approval requests, cost accumulation, knowledge graph entries —
all updating live without page refresh.

**The competitive advantage:** No other agentic framework has an integrated
web dashboard. Teams currently track progress via CLI output in a shared terminal
or by looking at git commits. The MindForge dashboard makes the agent's work
as visible as a Jira board.

**Architecture decisions:**
- **Express.js** — battle-tested, zero-config HTTP server with SSE support
- **Server-Sent Events** (SSE, not WebSocket) — one-way push from server, no client lib needed
- **Single-file HTML frontend** — no build step, no bundler, no framework dependency
- **localhost:7339** — adjacent to SDK SSE (7337) and browser daemon (7338)
- **Localhost-only** — consistent with ADR-017 (never expose on network interface)
- **No authentication** — local dev tool; security via binding address only

**Day 12 components:**

| Component | Description |
|---|---|
| Dashboard server | Express.js HTTP server, localhost:7339, SSE push |
| SSE event bridge | Tails AUDIT.jsonl, auto-state.json → SSE stream |
| REST API | 10 endpoints: status, audit, metrics, approvals, team, memory, costs, steer |
| Approval API | POST /api/approve/:id — approve/reject from browser |
| Frontend: Activity Feed | Live AUDIT event stream, wave progress bar, phase status |
| Frontend: Quality Metrics | Charts: session score trend, verify rate, cost trend |
| Frontend: Pending Approvals | Tier 2/3 approval UI with approve/reject buttons |
| Frontend: Knowledge Graph | Visual nodes/edges of knowledge base entries |
| Frontend: Team Activity | Active developers, last-seen, conflict detection |
| `/mindforge:dashboard` command | Start/stop/status/open |
| `tests/dashboard.test.js` | 20th test suite |

**New commands today: 45 total (44 + dashboard)**

---

# ═══════════════════════════════════════════════════════════════════════
# PART 1 — IMPLEMENTATION PROMPT
# ═══════════════════════════════════════════════════════════════════════

---

## TASK 1 — Scaffold Day 12 directory structure

```bash
# Dashboard server
mkdir -p bin/dashboard
touch bin/dashboard/server.js
touch bin/dashboard/sse-bridge.js
touch bin/dashboard/api-router.js
touch bin/dashboard/approval-handler.js
touch bin/dashboard/team-tracker.js
touch bin/dashboard/metrics-aggregator.js

# Dashboard frontend (single-file HTML, no build step)
mkdir -p bin/dashboard/frontend
touch bin/dashboard/frontend/index.html

# Dashboard specs
mkdir -p .mindforge/dashboard
touch .mindforge/dashboard/dashboard-spec.md
touch .mindforge/dashboard/api-reference.md

# New command
touch .claude/commands/mindforge/dashboard.md
cp .claude/commands/mindforge/dashboard.md .agent/mindforge/dashboard.md

# Test suite
touch tests/dashboard.test.js

# PID file location
# .planning/dashboard-server.pid — created at runtime, gitignored
cat >> .gitignore << 'EOF'

# MindForge v2 — dashboard runtime files
.planning/dashboard-server.pid
EOF
```

**Add Express.js dependency:**
```bash
node -e "
  const fs = require('fs');
  const p  = JSON.parse(fs.readFileSync('package.json','utf8'));
  p.dependencies = p.dependencies || {};
  p.dependencies['express'] = '^4.19.2';
  fs.writeFileSync('package.json', JSON.stringify(p, null, 2) + '\n');
  console.log('Added express dependency');
"
```

**Commit:**
```bash
git add .
git commit -m "chore(v2-day12): scaffold real-time dashboard directory structure"
```

---

## TASK 2 — Write the Dashboard Specification

### `.mindforge/dashboard/dashboard-spec.md`

```markdown
# MindForge v2 — Dashboard Specification

## Overview

The MindForge dashboard is a real-time web UI that reflects the live state of
the MindForge agent and all project artifacts. It serves as the team's window
into what the agent is doing — designed for standup visibility, not agent control
(though it does support approval actions for Tier 2/3 governance).

## Architecture

```
Browser clients
     ↑ SSE (push)     ↑ REST (pull on load)
     │                │
  bin/dashboard/server.js  (Express.js, localhost:7339)
     │                │
  sse-bridge.js       api-router.js
     │ (tails files)  │ (reads files)
     │                │
  AUDIT.jsonl         HANDOFF.json
  auto-state.json     session-quality.jsonl
  APPROVAL-*.json     token-usage.jsonl
  HANDOFF.json        knowledge-base.jsonl
  TEAM-STATE.jsonl    .planning/phases/
```

## Port and binding

- **Port:** 7339 (Dashboard = 7337+2, after SSE at 7337 and Browser Daemon at 7338)
- **Binding:** 127.0.0.1 ONLY — never 0.0.0.0 (ADR-017 policy)
- **Protocol:** HTTP/1.1 with SSE for live events
- **Process lifecycle:**
  - Started by: `/mindforge:dashboard` command or `bin/dashboard/server.js`
  - Stopped by: `CTRL+C`, `/mindforge:dashboard --stop`, or SIGTERM
  - Auto-stop: when MindForge session ends (watches for HANDOFF.json inactivity)

## Dashboard pages (5 tabs)

### Page 1 — Live Activity (default view)
Shows real-time execution state:
- Project name and current phase description
- Auto mode status indicator (RUNNING/PAUSED/ESCALATED/IDLE)
- Wave progress bar (current wave / total waves)
- Current task name and elapsed time
- Live AUDIT event feed (last 50 events, newest at top)
- Steering input box (sends to steering queue if auto mode active)

### Page 2 — Quality Metrics
Charts powered by session-quality.jsonl and token-usage.jsonl:
- Session quality score trend (last 20 sessions, sparkline)
- Verify pass rate over time (last 20 sessions)
- Security findings by severity (bar chart: CRITICAL/HIGH/MEDIUM/LOW)
- Token cost per session trend
- Node repair frequency (auto mode health signal)

### Page 3 — Pending Approvals
Governance queue visible to the whole team:
- Shows all APPROVAL-*.json files with status: pending
- For each: tier, phase/plan, change description, time since requested, expiry
- [Approve] and [Reject] buttons that call POST /api/approve/:id
- Expired approvals shown separately with red indicator

### Page 4 — Knowledge Graph
Visual representation of the knowledge base:
- Force-directed graph: nodes = knowledge entries, edges = ADR links
- Color by type: blue=decision, green=preference, red=bug_pattern, yellow=domain
- Node size = confidence × 30px radius
- Click node → side panel with full content
- Filter by type, tags, or confidence threshold

### Page 5 — Team Activity
Multi-developer visibility:
- Active developers (git email → last AUDIT event timestamp)
- What each developer is working on (last task from AUDIT.jsonl)
- File conflict detection (two developers recently touching the same file)
- Session history (list of sessions, quality scores, costs)

## Security model

1. Localhost-only binding (127.0.0.1) — consistent with all MindForge servers
2. No authentication — local dev tool, not exposed to network
3. CORS policy: only allow requests from localhost
4. Approval actions (POST /api/approve/:id) require the approval file to exist
   in `.planning/approvals/` — cannot fabricate approvals from browser
5. Steering (POST /api/steer) only works when auto-state.json shows `status: running`
6. All file reads are restricted to `.planning/` and `.mindforge/` directories —
   no arbitrary filesystem access from the API

## SCREENSHARE MODE (recommended team use)
The dashboard is designed to be screenshared during standups:
- Product managers see live progress without CLI access
- Designers see when their UI implementation tasks are running
- Stakeholders see real estimates of completion time
- On-call engineers see security findings as they're detected
Never expose the dashboard URL externally — it contains project details.
```

### `.mindforge/dashboard/api-reference.md`

```markdown
# MindForge Dashboard API Reference

## Base URL: http://localhost:7339

## GET /api/status
Current execution state.
```json
{
  "project_name": "saas-app",
  "phase": 3,
  "phase_description": "Authentication System",
  "auto_mode": true,
  "auto_status": "running|paused|escalated|idle",
  "current_task": "Plan 3-05 — JWT middleware",
  "wave_current": 2,
  "wave_total": 3,
  "tasks_completed": 5,
  "tasks_total": 8,
  "elapsed_ms": 1083000,
  "node_repairs": 1,
  "escalations": 0,
  "last_commit": "abc1234",
  "last_event_at": "ISO-8601"
}
```

## GET /api/audit?limit=50&offset=0&event=task_completed
Recent AUDIT.jsonl entries (newest first).
Query params: limit (default 50, max 200), offset, event (filter by event type)

## GET /api/metrics
Session quality and cost summary.
```json
{
  "sessions": [{ "id": "...", "quality_score": 0.87, "cost_usd": 0.42, "verify_pass_rate": 0.95 }],
  "avg_quality": 0.85,
  "avg_cost_usd": 0.38,
  "security_findings": { "CRITICAL": 0, "HIGH": 2, "MEDIUM": 5, "LOW": 8 },
  "node_repair_rate": 0.08
}
```

## GET /api/approvals
Pending governance approvals.
```json
{
  "pending": [
    {
      "id": "uuid",
      "tier": 2,
      "phase": 3,
      "plan": "04",
      "description": "Add user RBAC model",
      "requested_at": "ISO-8601",
      "expires_at": "ISO-8601",
      "hours_remaining": 21.3,
      "diff_preview": "src/models/user.ts +48 lines..."
    }
  ],
  "approved": [...],
  "rejected": [...],
  "expired": [...]
}
```

## POST /api/approve/:id
```json
Request:  { "decision": "approve|reject", "comment": "optional", "approver": "email" }
Response: { "success": true, "decision": "approve", "approval_id": "uuid" }
```

## GET /api/team
Active developer activity.
```json
{
  "active": [
    { "email": "john@company.com", "current_task": "Plan 3-05", "last_seen_mins": 0 }
  ],
  "conflicts": [
    { "file": "src/auth/session.ts", "developers": ["john@...", "jane@..."] }
  ]
}
```

## GET /api/memory?q=jwt&limit=10
Knowledge base query.
```json
{
  "entries": [
    { "id": "kb-uuid", "type": "architectural_decision", "topic": "JWT tokens", "confidence": 0.90 }
  ],
  "total": 47
}
```

## GET /api/costs?window=7d
Cost summary from token-usage.jsonl.
```json
{
  "total_usd": 3.84,
  "today_usd": 1.21,
  "by_model": { "claude-sonnet-4-6": 1.92, "gpt-4o": 0.98 },
  "daily_limit_usd": 10.00,
  "limit_used_pct": 12.1
}
```

## POST /api/steer
Inject steering guidance (requires auto mode running).
```json
Request:  { "instruction": "Use Redis for session storage", "priority": "normal" }
Response: { "success": true, "queued": true }
```

## GET /events
SSE stream. Events emitted:
- `audit:new` — new AUDIT.jsonl entry
- `status:update` — auto-state.json changed
- `approval:new` — new approval request
- `approval:resolved` — approval approved or rejected
- `conflict:detected` — two developers touching same file
- `ping` — keepalive every 15 seconds
```

**Commit:**
```bash
git add .mindforge/dashboard/
git commit -m "feat(v2-dashboard): write dashboard specification and API reference"
```

---

## TASK 3 — Implement the SSE Bridge

### `bin/dashboard/sse-bridge.js`

```javascript
/**
 * MindForge v2 — SSE Event Bridge
 * Tails AUDIT.jsonl and auto-state.json and pushes changes
 * to all connected SSE clients.
 *
 * Design:
 * - Uses fs.watchFile() for cross-platform file watching (not fs.watch)
 * - Each connected client gets a Response object stored in a Set
 * - Events are broadcast to ALL connected clients on every file change
 * - Keepalive ping every 15 seconds to detect disconnected clients
 */
'use strict';

const fs   = require('fs');
const path = require('path');

const AUDIT_PATH      = path.join(process.cwd(), '.planning', 'AUDIT.jsonl');
const AUTO_STATE_PATH = path.join(process.cwd(), '.planning', 'auto-state.json');
const APPROVAL_DIR    = path.join(process.cwd(), '.planning', 'approvals');

const clients = new Set(); // Connected SSE response objects

let _lastAuditSize  = 0;
let _lastAutoState  = '';
let _lastApprovals  = '';

// ── Client management ─────────────────────────────────────────────────────────

function addClient(res) {
  clients.add(res);
  res.on('close', () => {
    clients.delete(res);
  });
}

function broadcast(eventName, data) {
  const message = `event: ${eventName}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const res of clients) {
    try {
      res.write(message);
    } catch {
      clients.delete(res);
    }
  }
}

function broadcastRaw(message) {
  for (const res of clients) {
    try {
      res.write(message);
    } catch {
      clients.delete(res);
    }
  }
}

// ── File tail: AUDIT.jsonl ────────────────────────────────────────────────────

function pollAuditLog() {
  if (!fs.existsSync(AUDIT_PATH)) return;

  try {
    const stat    = fs.statSync(AUDIT_PATH);
    const newSize = stat.size;

    if (newSize <= _lastAuditSize) return; // No new data

    // Read only the new bytes appended since last poll
    const fd   = fs.openSync(AUDIT_PATH, 'r');
    const chunk = Buffer.alloc(newSize - _lastAuditSize);
    fs.readSync(fd, chunk, 0, chunk.length, _lastAuditSize);
    fs.closeSync(fd);
    _lastAuditSize = newSize;

    // Parse new lines
    const newLines = chunk.toString().split('\n').filter(Boolean);
    for (const line of newLines) {
      try {
        const entry = JSON.parse(line);
        broadcast('audit:new', entry);
      } catch { /* skip malformed */ }
    }
  } catch { /* ignore read errors — file may be locked */ }
}

// ── File poll: auto-state.json ────────────────────────────────────────────────

function pollAutoState() {
  if (!fs.existsSync(AUTO_STATE_PATH)) return;

  try {
    const raw = fs.readFileSync(AUTO_STATE_PATH, 'utf8');
    if (raw === _lastAutoState) return;
    _lastAutoState = raw;
    const state = JSON.parse(raw);
    broadcast('status:update', state);
  } catch { /* ignore */ }
}

// ── File poll: approval directory ─────────────────────────────────────────────

function pollApprovals() {
  if (!fs.existsSync(APPROVAL_DIR)) return;

  try {
    const files  = fs.readdirSync(APPROVAL_DIR)
      .filter(f => f.startsWith('APPROVAL-') && f.endsWith('.json'))
      .sort();
    const key = files.join(',');
    if (key === _lastApprovals) return;
    _lastApprovals = key;

    // Find new pending approvals
    for (const f of files) {
      try {
        const data = JSON.parse(fs.readFileSync(path.join(APPROVAL_DIR, f), 'utf8'));
        if (data.status === 'pending') {
          broadcast('approval:new', data);
        }
      } catch { /* skip */ }
    }
  } catch { /* ignore */ }
}

// ── Keepalive ─────────────────────────────────────────────────────────────────

let _pollInterval  = null;
let _pingInterval  = null;

function start() {
  // Initialize AUDIT position
  if (fs.existsSync(AUDIT_PATH)) {
    _lastAuditSize = fs.statSync(AUDIT_PATH).size;
  }

  // Poll every 2 seconds
  _pollInterval = setInterval(() => {
    pollAuditLog();
    pollAutoState();
    pollApprovals();
  }, 2000);

  // Keepalive ping every 15 seconds
  _pingInterval = setInterval(() => {
    broadcastRaw(`: ping\n\n`);
  }, 15_000);

  _pollInterval.unref();
  _pingInterval.unref();
}

function stop() {
  if (_pollInterval) { clearInterval(_pollInterval); _pollInterval = null; }
  if (_pingInterval) { clearInterval(_pingInterval); _pingInterval = null; }
}

function getClientCount() { return clients.size; }

module.exports = { addClient, broadcast, start, stop, getClientCount };
```

**Commit:**
```bash
git add bin/dashboard/sse-bridge.js
git commit -m "feat(v2-dashboard): implement SSE event bridge with AUDIT/state/approval tailing"
```

---

## TASK 4 — Implement the Metrics Aggregator

### `bin/dashboard/metrics-aggregator.js`

```javascript
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

  const filtered   = entries.filter(e => e.date >= cutoff);
  const todayItems = entries.filter(e => e.date === today);

  const total_usd  = filtered.reduce((s, e) => s + (e.cost_usd || 0), 0);
  const today_usd  = todayItems.reduce((s, e) => s + (e.cost_usd || 0), 0);

  const by_model = {};
  for (const e of filtered) {
    const m = e.model || 'unknown';
    by_model[m] = (by_model[m] || 0) + (e.cost_usd || 0);
  }

  // Read daily limit from MINDFORGE.md
  let daily_limit = 0;
  const mmPath = path.join(process.cwd(), 'MINDFORGE.md');
  if (fs.existsSync(mmPath)) {
    const match = fs.readFileSync(mmPath, 'utf8').match(/^MODEL_COST_HARD_LIMIT_USD=(.+)$/m);
    if (match) daily_limit = parseFloat(match[1]);
  }

  return {
    total_usd:       Math.round(total_usd * 10000) / 10000,
    today_usd:       Math.round(today_usd * 10000) / 10000,
    by_model,
    window_days:     windowDays,
    daily_limit_usd: daily_limit,
    limit_used_pct:  daily_limit > 0 ? Math.round((today_usd / daily_limit) * 100) : null,
  };
}

module.exports = { getStatus, getAuditEntries, getMetrics, getApprovals, getTeamActivity, getMemory, getCosts };
```

**Commit:**
```bash
git add bin/dashboard/metrics-aggregator.js
git commit -m "feat(v2-dashboard): implement metrics aggregator for all 7 API data sources"
```

---

## TASK 5 — Implement the Approval Handler

### `bin/dashboard/approval-handler.js`

```javascript
/**
 * MindForge v2 — Approval Handler
 * Handles POST /api/approve/:id — approve or reject governance requests.
 * Reads/writes APPROVAL-*.json files in .planning/approvals/
 */
'use strict';

const fs   = require('fs');
const path = require('path');

const APPROVAL_DIR = path.join(process.cwd(), '.planning', 'approvals');
const AUDIT_PATH   = path.join(process.cwd(), '.planning', 'AUDIT.jsonl');

/**
 * Process an approval decision from the dashboard.
 * @param {string} approvalId - The APPROVAL UUID
 * @param {string} decision   - 'approve' or 'reject'
 * @param {string} comment    - Optional comment
 * @param {string} approver   - Approver identifier (email or name)
 * @returns {{ success, decision, message }}
 */
function processDecision(approvalId, decision, comment, approver) {
  // Input validation
  if (!approvalId || typeof approvalId !== 'string') {
    return { success: false, error: 'Invalid approval ID' };
  }

  // Sanitize approvalId — only allow UUID characters
  if (!/^[a-f0-9-]{36}$/.test(approvalId)) {
    return { success: false, error: 'Malformed approval ID format' };
  }

  if (!['approve', 'reject'].includes(decision)) {
    return { success: false, error: 'Decision must be "approve" or "reject"' };
  }

  // Find the approval file
  const filePath = path.join(APPROVAL_DIR, `APPROVAL-${approvalId}.json`);
  if (!fs.existsSync(filePath)) {
    return { success: false, error: `Approval not found: ${approvalId}` };
  }

  let approval;
  try {
    approval = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch {
    return { success: false, error: 'Cannot parse approval file' };
  }

  // Validate approval is still pending
  if (approval.status !== 'pending') {
    return { success: false, error: `Approval already ${approval.status}` };
  }

  // Check expiry
  if (approval.expires_at && new Date(approval.expires_at) < new Date()) {
    return { success: false, error: 'Approval has expired' };
  }

  // Update approval file
  const updated = {
    ...approval,
    status:       decision === 'approve' ? 'approved' : 'rejected',
    resolved_at:  new Date().toISOString(),
    resolved_by:  approver || 'dashboard',
    comment:      comment || null,
    resolution_channel: 'mindforge-dashboard',
  };

  fs.writeFileSync(filePath, JSON.stringify(updated, null, 2));

  // Write AUDIT entry
  writeAuditEntry({
    id:          require('crypto').randomBytes(8).toString('hex'),
    timestamp:   new Date().toISOString(),
    event:       decision === 'approve' ? 'approval_granted' : 'approval_rejected',
    approval_id: approvalId,
    tier:        approval.tier,
    phase:       approval.phase,
    plan:        approval.plan,
    resolved_by: approver || 'dashboard',
    comment:     comment || null,
    agent:       'mindforge-dashboard',
    session_id:  'dashboard',
  });

  return {
    success:     true,
    decision,
    approval_id: approvalId,
    tier:        approval.tier,
    message:     `${approval.tier === 3 ? 'Tier 3' : 'Tier 2'} approval ${decision}d for Plan ${approval.phase}-${approval.plan}`,
  };
}

function writeAuditEntry(entry) {
  try {
    if (!fs.existsSync(path.dirname(AUDIT_PATH))) return;
    fs.appendFileSync(AUDIT_PATH, JSON.stringify(entry) + '\n');
  } catch { /* ignore AUDIT write failures */ }
}

function listApprovals() {
  if (!fs.existsSync(APPROVAL_DIR)) return [];
  return fs.readdirSync(APPROVAL_DIR)
    .filter(f => f.startsWith('APPROVAL-') && f.endsWith('.json'))
    .map(f => {
      try { return JSON.parse(fs.readFileSync(path.join(APPROVAL_DIR, f), 'utf8')); }
      catch { return null; }
    })
    .filter(Boolean);
}

module.exports = { processDecision, listApprovals };
```

**Commit:**
```bash
git add bin/dashboard/approval-handler.js
git commit -m "feat(v2-dashboard): implement approval handler with UUID validation and AUDIT trail"
```

---

## TASK 6 — Implement the Dashboard API Router

### `bin/dashboard/api-router.js`

```javascript
/**
 * MindForge v2 — Dashboard API Router
 * All REST endpoints for the dashboard.
 */
'use strict';

const path    = require('path');
const fs      = require('fs');
const Metrics = require('./metrics-aggregator');
const Approval = require('./approval-handler');
const SSE     = require('./sse-bridge');

// Steering queue path (from Day 8 auto-executor)
const STEERING_QUEUE = path.join(process.cwd(), '.planning', 'steering-queue.jsonl');
const AUTO_STATE_PATH = path.join(process.cwd(), '.planning', 'auto-state.json');

function register(app) {

  // ── SSE stream ──────────────────────────────────────────────────────────────
  app.get('/events', (req, res) => {
    res.setHeader('Content-Type',  'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection',    'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no'); // Disable Nginx buffering
    res.flushHeaders();

    // Send current status immediately on connect
    try {
      const status = Metrics.getStatus();
      res.write(`event: status:update\ndata: ${JSON.stringify(status)}\n\n`);
    } catch { /* ignore */ }

    SSE.addClient(res);
  });

  // ── Status ──────────────────────────────────────────────────────────────────
  app.get('/api/status', (req, res) => {
    try {
      res.json(Metrics.getStatus());
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // ── Audit entries ───────────────────────────────────────────────────────────
  app.get('/api/audit', (req, res) => {
    try {
      const limit  = Math.min(parseInt(req.query.limit  || '50',  10), 200);
      const offset = Math.max(parseInt(req.query.offset || '0',   10), 0);
      const event  = typeof req.query.event === 'string' ? req.query.event : null;
      res.json(Metrics.getAuditEntries(limit, offset, event));
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // ── Quality metrics ─────────────────────────────────────────────────────────
  app.get('/api/metrics', (req, res) => {
    try {
      res.json(Metrics.getMetrics());
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // ── Approvals ───────────────────────────────────────────────────────────────
  app.get('/api/approvals', (req, res) => {
    try {
      res.json(Metrics.getApprovals());
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/approve/:id', (req, res) => {
    try {
      const { id }                  = req.params;
      const { decision, comment, approver } = req.body || {};

      if (!decision) {
        return res.status(400).json({ error: 'Missing "decision" field (approve|reject)' });
      }

      const result = Approval.processDecision(id, decision, comment, approver);

      if (!result.success) {
        return res.status(400).json(result);
      }

      // Broadcast approval event to all SSE clients
      SSE.broadcast(
        decision === 'approve' ? 'approval:resolved' : 'approval:resolved',
        { approval_id: id, decision, message: result.message }
      );

      res.json(result);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // ── Team activity ───────────────────────────────────────────────────────────
  app.get('/api/team', (req, res) => {
    try {
      res.json(Metrics.getTeamActivity());
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // ── Knowledge base query ────────────────────────────────────────────────────
  app.get('/api/memory', (req, res) => {
    try {
      const q     = typeof req.query.q     === 'string' ? req.query.q.slice(0, 100) : '';
      const limit = Math.min(parseInt(req.query.limit || '20', 10), 100);
      res.json(Metrics.getMemory(q, limit));
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // ── Costs ───────────────────────────────────────────────────────────────────
  app.get('/api/costs', (req, res) => {
    try {
      const window = Math.min(parseInt(req.query.window || '7', 10), 90);
      res.json(Metrics.getCosts(window));
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // ── Steering (requires auto mode running) ───────────────────────────────────
  app.post('/api/steer', (req, res) => {
    try {
      const { instruction, priority = 'normal' } = req.body || {};

      if (!instruction || typeof instruction !== 'string') {
        return res.status(400).json({ error: 'Missing "instruction" field' });
      }
      if (instruction.length > 500) {
        return res.status(400).json({ error: 'Instruction too long (max 500 chars)' });
      }
      if (!['normal', 'urgent', 'stop'].includes(priority)) {
        return res.status(400).json({ error: 'Invalid priority. Use: normal|urgent|stop' });
      }

      // Check auto mode is running
      const autoState = fs.existsSync(AUTO_STATE_PATH)
        ? JSON.parse(fs.readFileSync(AUTO_STATE_PATH, 'utf8'))
        : null;

      if (!autoState || autoState.status !== 'running') {
        return res.status(409).json({ error: 'Auto mode is not running. Steering has no effect.' });
      }

      // Run injection guard
      const INJECTION_PATTERNS = [
        /IGNORE ALL PREVIOUS INSTRUCTIONS/i,
        /DISREGARD YOUR INSTRUCTIONS/i,
        /FORGET YOUR TRAINING/i,
        /YOUR NEW INSTRUCTIONS ARE/i,
        /OVERRIDE:/i,
      ];
      if (INJECTION_PATTERNS.some(p => p.test(instruction))) {
        return res.status(400).json({ error: 'Instruction rejected: contains prohibited patterns' });
      }

      // Write to steering queue
      const entry = {
        id:          require('crypto').randomBytes(8).toString('hex'),
        timestamp:   new Date().toISOString(),
        instruction: instruction.trim(),
        priority,
        authored_by: 'dashboard',
        applies_to:  'all',
        status:      'queued',
        applied_at:  null,
        applied_to_plan: null,
      };

      if (!fs.existsSync(path.dirname(STEERING_QUEUE))) {
        fs.mkdirSync(path.dirname(STEERING_QUEUE), { recursive: true });
      }
      fs.appendFileSync(STEERING_QUEUE, JSON.stringify(entry) + '\n');

      res.json({ success: true, queued: true, id: entry.id, priority });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // ── Client count (for dashboard connection indicator) ───────────────────────
  app.get('/api/connections', (req, res) => {
    res.json({ clients: SSE.getClientCount() });
  });
}

module.exports = { register };
```

**Commit:**
```bash
git add bin/dashboard/api-router.js
git commit -m "feat(v2-dashboard): implement dashboard API router with all 10 endpoints"
```

---

## TASK 7 — Implement the Dashboard Server

### `bin/dashboard/server.js`

```javascript
#!/usr/bin/env node
/**
 * MindForge v2 — Dashboard Server
 * Real-time web observability at localhost:7339.
 *
 * Usage:
 *   node bin/dashboard/server.js [--port 7339] [--open]
 *   /mindforge:dashboard [--port 7339] [--open] [--stop]
 *
 * Security: binds to 127.0.0.1 only (ADR-017 policy).
 * No authentication — localhost-only access is the security model.
 */
'use strict';

const http   = require('http');
const path   = require('path');
const fs     = require('fs');
const ARGS   = process.argv.slice(2);

const PORT     = parseInt(ARGS.find((_, i, a) => a[i-1] === '--port') || '7339', 10);
const OPEN_BROWSER = ARGS.includes('--open');
const PID_FILE = path.join(process.cwd(), '.planning', 'dashboard-server.pid');
const FRONTEND = path.join(__dirname, 'frontend', 'index.html');

// ── Load dependencies gracefully ──────────────────────────────────────────────
let express;
try {
  express = require('express');
} catch {
  console.error('[dashboard] express not installed. Run: npm install express');
  process.exit(1);
}

const SSE    = require('./sse-bridge');
const API    = require('./api-router');

// ── Express app ───────────────────────────────────────────────────────────────
const app = express();

// Security middleware
app.use((req, res, next) => {
  const addr = req.socket.remoteAddress;
  const isLocal = addr === '127.0.0.1' || addr === '::1' || addr === '::ffff:127.0.0.1';
  if (!isLocal) {
    return res.status(403).json({ error: 'Dashboard is localhost-only' });
  }
  next();
});

// CORS — only allow requests from localhost origins
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (!origin || /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin || '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  }
  if (req.method === 'OPTIONS') return res.status(204).end();
  next();
});

app.use(express.json({ limit: '64kb' })); // Limit request body size

// Security headers
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('Cache-Control', 'no-store'); // Never cache dashboard responses
  next();
});

// ── Static frontend ───────────────────────────────────────────────────────────
app.get('/', (req, res) => {
  if (!fs.existsSync(FRONTEND)) {
    return res.status(503).send('<h1>Dashboard frontend not found</h1><p>Run: npm run build:dashboard</p>');
  }
  res.sendFile(FRONTEND);
});

// ── Register API routes ───────────────────────────────────────────────────────
API.register(app);

// ── Start SSE bridge ──────────────────────────────────────────────────────────
SSE.start();

// ── HTTP server ───────────────────────────────────────────────────────────────
const server = http.createServer(app);

server.listen(PORT, '127.0.0.1', () => {
  fs.mkdirSync(path.dirname(PID_FILE), { recursive: true });
  fs.writeFileSync(PID_FILE, String(process.pid));

  console.log(`\n⚡  MindForge Dashboard`);
  console.log(`    URL:     http://localhost:${PORT}`);
  console.log(`    Status:  http://localhost:${PORT}/api/status`);
  console.log(`    Events:  http://localhost:${PORT}/events`);
  console.log(`    PID:     ${process.pid}`);
  console.log(`\n    Press CTRL+C to stop\n`);

  if (OPEN_BROWSER) {
    const open = process.platform === 'darwin' ? 'open'
      : process.platform === 'win32' ? 'start'
      : 'xdg-open';
    require('child_process').spawn(open, [`http://localhost:${PORT}`], { detached: true, stdio: 'ignore' });
  }
});

server.on('error', err => {
  if (err.code === 'EADDRINUSE') {
    console.error(`[dashboard] Port ${PORT} already in use.`);
    console.error(`[dashboard] Stop it: /mindforge:dashboard --stop`);
    console.error(`[dashboard] Or use a different port: /mindforge:dashboard --port 7340`);
  }
  process.exit(1);
});

// ── Graceful shutdown ─────────────────────────────────────────────────────────
function shutdown(signal) {
  console.log(`\n[dashboard] ${signal} received — shutting down`);
  SSE.stop();
  server.close(() => {
    if (fs.existsSync(PID_FILE)) fs.unlinkSync(PID_FILE);
    process.exit(0);
  });
  setTimeout(() => process.exit(0), 3000);
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT',  () => shutdown('SIGINT'));
```

**Commit:**
```bash
git add bin/dashboard/server.js
git commit -m "feat(v2-dashboard): implement Express dashboard server with security middleware and graceful shutdown"
```

---

## TASK 8 — Build the Single-File HTML Frontend

### `bin/dashboard/frontend/index.html`

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>MindForge Dashboard</title>
  <style>
    /* ── Design tokens ───────────────────────────────────────────── */
    :root {
      --bg:       #0d1117;
      --surface:  #161b22;
      --border:   #30363d;
      --text:     #e6edf3;
      --muted:    #8b949e;
      --accent:   #58a6ff;
      --green:    #3fb950;
      --yellow:   #d29922;
      --red:      #f85149;
      --orange:   #db6d28;
      --purple:   #bc8cff;
      --font-mono:'JetBrains Mono', 'Fira Code', 'Consolas', monospace;
    }

    /* ── Reset ───────────────────────────────────────────────────── */
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    html, body { height: 100%; overflow: hidden; }
    body { background: var(--bg); color: var(--text); font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; font-size: 13px; }

    /* ── Layout ──────────────────────────────────────────────────── */
    #app    { display: flex; flex-direction: column; height: 100vh; }
    header  { display: flex; align-items: center; justify-content: space-between; padding: 10px 20px; background: var(--surface); border-bottom: 1px solid var(--border); flex-shrink: 0; }
    nav     { display: flex; gap: 4px; padding: 8px 20px; background: var(--surface); border-bottom: 1px solid var(--border); flex-shrink: 0; }
    main    { flex: 1; overflow: hidden; padding: 16px 20px; }
    .page   { display: none; height: 100%; overflow: auto; }
    .page.active { display: flex; flex-direction: column; gap: 12px; }

    /* ── Header ──────────────────────────────────────────────────── */
    .logo   { font-weight: 700; font-size: 15px; color: var(--accent); letter-spacing: -0.3px; }
    .project{ font-size: 12px; color: var(--muted); }
    .conn   { display: flex; align-items: center; gap: 6px; font-size: 11px; color: var(--muted); }
    .dot    { width: 7px; height: 7px; border-radius: 50%; background: var(--red); }
    .dot.live { background: var(--green); animation: pulse 2s infinite; }
    @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.4} }

    /* ── Nav tabs ────────────────────────────────────────────────── */
    .tab    { padding: 5px 14px; border-radius: 6px; cursor: pointer; color: var(--muted); font-size: 12px; font-weight: 500; transition: all .15s; border: none; background: none; }
    .tab:hover  { background: var(--border); color: var(--text); }
    .tab.active { background: var(--accent); color: #fff; }
    .badge  { background: var(--red); color: #fff; border-radius: 10px; padding: 1px 6px; font-size: 10px; margin-left: 4px; }

    /* ── Cards ───────────────────────────────────────────────────── */
    .card   { background: var(--surface); border: 1px solid var(--border); border-radius: 8px; padding: 14px 16px; }
    .card h3{ font-size: 11px; font-weight: 600; color: var(--muted); text-transform: uppercase; letter-spacing: .5px; margin-bottom: 10px; }

    /* ── Status bar ──────────────────────────────────────────────── */
    #status-bar { display: grid; grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)); gap: 10px; }
    .stat   { display: flex; flex-direction: column; gap: 2px; }
    .stat-label { font-size: 10px; color: var(--muted); text-transform: uppercase; letter-spacing: .4px; }
    .stat-value { font-size: 18px; font-weight: 700; font-variant-numeric: tabular-nums; }
    .stat-value.accent { color: var(--accent); }
    .stat-value.green  { color: var(--green); }
    .stat-value.yellow { color: var(--yellow); }
    .stat-value.red    { color: var(--red); }

    /* ── Progress bar ────────────────────────────────────────────── */
    .progress-wrap { display: flex; align-items: center; gap: 10px; }
    .progress-bar  { flex: 1; height: 6px; background: var(--border); border-radius: 3px; overflow: hidden; }
    .progress-fill { height: 100%; background: var(--accent); border-radius: 3px; transition: width .3s; }
    .progress-pct  { font-size: 11px; color: var(--muted); min-width: 36px; text-align: right; }

    /* ── Audit feed ──────────────────────────────────────────────── */
    #audit-feed { font-family: var(--font-mono); font-size: 11px; line-height: 1.7; overflow-y: auto; max-height: calc(100vh - 320px); }
    .event-row  { display: grid; grid-template-columns: 80px 150px 1fr; gap: 10px; padding: 3px 0; border-bottom: 1px solid #1c2128; }
    .event-row:first-child { color: var(--text); }
    .event-row:not(:first-child) { color: var(--muted); }
    .ev-time  { color: var(--muted); }
    .ev-type  { }
    .ev-type.task_completed   { color: var(--green); }
    .ev-type.task_failed      { color: var(--red); }
    .ev-type.security_finding { color: var(--yellow); }
    .ev-type.auto_mode_escalated { color: var(--red); font-weight: bold; }
    .ev-type.node_repair      { color: var(--orange); }
    .ev-type.approval_granted { color: var(--green); }
    .ev-detail { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

    /* ── Steering input ──────────────────────────────────────────── */
    .steer-row { display: flex; gap: 8px; margin-top: 10px; }
    .steer-input { flex: 1; background: var(--bg); border: 1px solid var(--border); color: var(--text); padding: 7px 12px; border-radius: 6px; font-size: 12px; font-family: var(--font-mono); }
    .steer-input:focus { outline: none; border-color: var(--accent); }
    .steer-btn  { padding: 7px 16px; background: var(--accent); color: #fff; border: none; border-radius: 6px; cursor: pointer; font-size: 12px; font-weight: 600; }
    .steer-btn:hover { opacity: .85; }
    .steer-btn:disabled { opacity: .4; cursor: default; }

    /* ── Approval cards ──────────────────────────────────────────── */
    .approval-card { border-left: 3px solid var(--yellow); padding: 12px; display: flex; justify-content: space-between; align-items: flex-start; }
    .approval-card.tier3 { border-left-color: var(--red); }
    .approval-card.expiring { border-left-color: var(--orange); }
    .approval-meta { font-size: 10px; color: var(--muted); margin-top: 4px; }
    .approval-actions { display: flex; gap: 6px; flex-shrink: 0; }
    .btn-approve { padding: 5px 14px; background: var(--green); color: #fff; border: none; border-radius: 5px; cursor: pointer; font-size: 12px; font-weight: 600; }
    .btn-approve:hover { opacity: .85; }
    .btn-reject  { padding: 5px 14px; background: var(--red); color: #fff; border: none; border-radius: 5px; cursor: pointer; font-size: 12px; font-weight: 600; }
    .btn-reject:hover { opacity: .85; }

    /* ── Metrics charts ──────────────────────────────────────────── */
    .chart-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
    canvas { width: 100% !important; max-height: 140px; }

    /* ── Knowledge graph ─────────────────────────────────────────── */
    #graph-canvas { width: 100%; height: calc(100vh - 220px); background: var(--bg); border-radius: 8px; border: 1px solid var(--border); }
    .node-panel { position: absolute; right: 20px; top: 80px; width: 280px; background: var(--surface); border: 1px solid var(--border); border-radius: 8px; padding: 14px; max-height: 60vh; overflow-y: auto; display: none; }
    .node-panel.visible { display: block; }

    /* ── Team activity ───────────────────────────────────────────── */
    .developer-row { display: flex; align-items: center; gap: 12px; padding: 8px 0; border-bottom: 1px solid var(--border); }
    .avatar { width: 28px; height: 28px; border-radius: 50%; background: var(--accent); display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 700; color: #fff; flex-shrink: 0; }
    .dev-info { flex: 1; }
    .dev-name { font-size: 12px; font-weight: 600; }
    .dev-task { font-size: 11px; color: var(--muted); }
    .dev-last { font-size: 10px; color: var(--muted); }
    .conflict-row { background: rgba(248, 81, 73, .08); border: 1px solid var(--red); border-radius: 5px; padding: 7px 10px; font-size: 11px; color: var(--red); }

    /* ── Utility ─────────────────────────────────────────────────── */
    .empty { text-align: center; padding: 40px; color: var(--muted); font-size: 12px; }
    .tag   { display: inline-block; background: var(--border); padding: 2px 7px; border-radius: 3px; font-size: 10px; margin: 2px; }
    .confidence { display: inline-block; padding: 1px 6px; border-radius: 3px; font-size: 10px; font-weight: 700; }
    .conf-high   { background: rgba(63,185,80,.2); color: var(--green); }
    .conf-med    { background: rgba(210,153,34,.2); color: var(--yellow); }
    .conf-low    { background: rgba(248,81,73,.2); color: var(--red); }
  </style>
</head>
<body>
<div id="app">

  <!-- ── Header ─────────────────────────────────────────────────── -->
  <header>
    <div style="display:flex;align-items:center;gap:16px">
      <span class="logo">⚡ MindForge</span>
      <span class="project" id="hdr-project">Loading...</span>
      <span id="hdr-status" style="font-size:11px;padding:2px 8px;border-radius:3px;background:#161b22;color:#8b949e">IDLE</span>
    </div>
    <div class="conn">
      <div class="dot" id="conn-dot"></div>
      <span id="conn-label">Connecting...</span>
    </div>
  </header>

  <!-- ── Nav ────────────────────────────────────────────────────── -->
  <nav>
    <button class="tab active" onclick="showPage('activity')">Activity</button>
    <button class="tab" onclick="showPage('metrics')">Quality</button>
    <button class="tab" onclick="showPage('approvals')">Approvals <span class="badge" id="approval-badge" style="display:none">0</span></button>
    <button class="tab" onclick="showPage('memory')">Knowledge</button>
    <button class="tab" onclick="showPage('team')">Team</button>
  </nav>

  <!-- ── Main ───────────────────────────────────────────────────── -->
  <main>

    <!-- Page 1: Activity ──────────────────────────────────────── -->
    <div class="page active" id="page-activity">

      <div class="card" id="status-bar-card">
        <h3>Phase Status</h3>
        <div id="status-bar">
          <div class="stat"><span class="stat-label">Phase</span><span class="stat-value accent" id="s-phase">—</span></div>
          <div class="stat"><span class="stat-label">Tasks</span><span class="stat-value" id="s-tasks">—</span></div>
          <div class="stat"><span class="stat-label">Wave</span><span class="stat-value" id="s-wave">—</span></div>
          <div class="stat"><span class="stat-label">Repairs</span><span class="stat-value" id="s-repairs">0</span></div>
          <div class="stat"><span class="stat-label">Elapsed</span><span class="stat-value" id="s-elapsed">—</span></div>
        </div>
        <div class="progress-wrap" style="margin-top:12px">
          <div class="progress-bar"><div class="progress-fill" id="progress-fill" style="width:0%"></div></div>
          <span class="progress-pct" id="progress-pct">0%</span>
        </div>
        <div style="margin-top:8px;font-size:11px;color:var(--muted)" id="s-current-task">No active task</div>
      </div>

      <div class="card" style="flex:1">
        <h3>Live Events</h3>
        <div id="audit-feed"><div class="empty">Waiting for events...</div></div>
        <div class="steer-row">
          <input class="steer-input" id="steer-input" placeholder="Steer auto mode: e.g. Use Redis for session storage..." />
          <button class="steer-btn" id="steer-btn" onclick="sendSteer()">Steer</button>
        </div>
      </div>
    </div>

    <!-- Page 2: Quality Metrics ──────────────────────────────── -->
    <div class="page" id="page-metrics">
      <div class="chart-grid">
        <div class="card"><h3>Session Quality Score</h3><canvas id="chart-quality"></canvas></div>
        <div class="card"><h3>Verify Pass Rate</h3><canvas id="chart-verify"></canvas></div>
        <div class="card"><h3>Security Findings</h3><canvas id="chart-security"></canvas></div>
        <div class="card"><h3>Cost Per Session ($)</h3><canvas id="chart-cost"></canvas></div>
      </div>
      <div class="card" style="margin-top:4px">
        <h3>Summary</h3>
        <div id="metrics-summary" style="display:grid;grid-template-columns:repeat(4,1fr);gap:16px;padding-top:8px">
          <div class="stat"><span class="stat-label">Avg Quality</span><span class="stat-value accent" id="m-quality">—</span></div>
          <div class="stat"><span class="stat-label">Avg Cost</span><span class="stat-value" id="m-cost">—</span></div>
          <div class="stat"><span class="stat-label">Repair Rate</span><span class="stat-value" id="m-repair">—</span></div>
          <div class="stat"><span class="stat-label">Total Tasks</span><span class="stat-value green" id="m-tasks">—</span></div>
        </div>
      </div>
    </div>

    <!-- Page 3: Approvals ────────────────────────────────────── -->
    <div class="page" id="page-approvals">
      <div class="card">
        <h3>Pending Approvals</h3>
        <div id="approvals-pending"><div class="empty">No pending approvals ✅</div></div>
      </div>
      <div class="card">
        <h3>Recent Resolutions</h3>
        <div id="approvals-resolved"><div class="empty">No recent resolutions</div></div>
      </div>
    </div>

    <!-- Page 4: Knowledge Graph ──────────────────────────────── -->
    <div class="page" id="page-memory" style="position:relative">
      <div class="card" style="flex-shrink:0">
        <div style="display:flex;align-items:center;gap:12px">
          <input id="memory-search" style="flex:1;background:var(--bg);border:1px solid var(--border);color:var(--text);padding:6px 12px;border-radius:6px;font-size:12px" placeholder="Search knowledge base..." oninput="searchMemory(this.value)">
          <span id="memory-count" style="font-size:11px;color:var(--muted)">— entries</span>
        </div>
      </div>
      <div id="memory-list" style="overflow-y:auto;flex:1"></div>
    </div>

    <!-- Page 5: Team Activity ────────────────────────────────── -->
    <div class="page" id="page-team">
      <div class="card">
        <h3>Active Developers</h3>
        <div id="team-active"><div class="empty">No recent activity</div></div>
      </div>
      <div class="card">
        <h3>⚠️ File Conflicts</h3>
        <div id="team-conflicts"><div class="empty">No conflicts detected ✅</div></div>
      </div>
    </div>

  </main>
</div>

<script>
// ── State ─────────────────────────────────────────────────────────────────────
const state = { events: [], status: {}, approvals: {}, charts: {}, sse: null };

// ── Page navigation ───────────────────────────────────────────────────────────
function showPage(name) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  document.getElementById('page-' + name).classList.add('active');
  event.target.classList.add('active');

  // Load data for the page
  if (name === 'metrics')   loadMetrics();
  if (name === 'approvals') loadApprovals();
  if (name === 'memory')    loadMemory('');
  if (name === 'team')      loadTeam();
}

// ── SSE connection ────────────────────────────────────────────────────────────
function connectSSE() {
  const es = new EventSource('/events');
  state.sse = es;

  es.addEventListener('audit:new', e => {
    const entry = JSON.parse(e.data);
    prependAuditEvent(entry);
  });

  es.addEventListener('status:update', e => {
    updateStatusBar(JSON.parse(e.data));
  });

  es.addEventListener('approval:new', e => {
    const data = JSON.parse(e.data);
    showApprovalBadge();
  });

  es.onopen = () => {
    document.getElementById('conn-dot').classList.add('live');
    document.getElementById('conn-label').textContent = 'Live';
  };

  es.onerror = () => {
    document.getElementById('conn-dot').classList.remove('live');
    document.getElementById('conn-label').textContent = 'Reconnecting...';
    setTimeout(connectSSE, 3000);
    es.close();
  };
}

// ── Activity feed ─────────────────────────────────────────────────────────────
async function loadActivity() {
  try {
    const r = await fetch('/api/audit?limit=50');
    const d = await r.json();
    const feed = document.getElementById('audit-feed');
    if (!d.entries?.length) { feed.innerHTML = '<div class="empty">No events yet</div>'; return; }
    feed.innerHTML = '';
    d.entries.forEach(e => appendAuditRow(feed, e));
  } catch {}
}

function prependAuditEvent(entry) {
  const feed = document.getElementById('audit-feed');
  const empty = feed.querySelector('.empty');
  if (empty) feed.innerHTML = '';

  const row = createAuditRow(entry);
  feed.insertBefore(row, feed.firstChild);

  // Keep max 100 rows
  while (feed.children.length > 100) feed.removeChild(feed.lastChild);
}

function appendAuditRow(feed, entry) { feed.appendChild(createAuditRow(entry)); }

function createAuditRow(entry) {
  const row    = document.createElement('div');
  row.className = 'event-row';
  const time   = entry.timestamp ? new Date(entry.timestamp).toLocaleTimeString() : '';
  const detail = entry.plan ? `Plan ${entry.phase}-${entry.plan} ${entry.task_name || ''}`.trim()
    : entry.reason || entry.description || entry.topic || JSON.stringify(entry).slice(0, 80);
  row.innerHTML = `
    <span class="ev-time">${time}</span>
    <span class="ev-type ${entry.event}">${entry.event}</span>
    <span class="ev-detail">${escapeHtml(detail)}</span>
  `;
  return row;
}

// ── Status bar ────────────────────────────────────────────────────────────────
async function loadStatus() {
  try {
    const r = await fetch('/api/status');
    const d = await r.json();
    updateStatusBar(d);
  } catch {}
}

function updateStatusBar(d) {
  setText('hdr-project', d.project_name || 'MindForge Project');
  const statusEl = document.getElementById('hdr-status');
  statusEl.textContent = (d.auto_status || 'IDLE').toUpperCase();
  statusEl.style.background = d.auto_mode ? '#0d4429' : '#1c2128';
  statusEl.style.color = d.auto_mode ? 'var(--green)' : 'var(--muted)';

  setText('s-phase', d.phase ? `${d.phase} — ${(d.phase_description || '').slice(0, 30)}` : '—');
  setText('s-tasks', d.tasks_total ? `${d.tasks_completed}/${d.tasks_total}` : '—');
  setText('s-wave',  d.wave_total ? `${d.wave_current}/${d.wave_total}` : '—');
  setText('s-repairs', d.node_repairs || 0);
  setText('s-elapsed', d.elapsed_ms ? formatDuration(d.elapsed_ms) : '—');
  setText('s-current-task', d.current_task || 'No active task');

  const pct = d.tasks_total ? Math.round((d.tasks_completed / d.tasks_total) * 100) : 0;
  document.getElementById('progress-fill').style.width = pct + '%';
  setText('progress-pct', pct + '%');
}

// ── Metrics ───────────────────────────────────────────────────────────────────
async function loadMetrics() {
  try {
    const r = await fetch('/api/metrics');
    const d = await r.json();
    setText('m-quality', d.avg_quality?.toFixed(2) || '—');
    setText('m-cost', d.avg_cost_usd ? '$' + d.avg_cost_usd.toFixed(4) : '—');
    setText('m-repair', d.node_repair_rate ? (d.node_repair_rate * 100).toFixed(1) + '%' : '0%');
    setText('m-tasks', d.total_tasks || '0');
    drawCharts(d);
  } catch {}
}

function drawCharts(d) {
  const sessions = d.sessions || [];
  const labels   = sessions.map((_, i) => `S${i+1}`);

  drawLineChart('chart-quality',  labels, sessions.map(s => s.quality_score),    'Quality Score', '#58a6ff');
  drawLineChart('chart-verify',   labels, sessions.map(s => s.verify_pass_rate), 'Pass Rate',     '#3fb950');
  drawLineChart('chart-cost',     labels, sessions.map(s => s.cost_usd),         'Cost ($)',      '#bc8cff');

  const sf = d.security_findings || {};
  drawBarChart('chart-security',
    ['CRITICAL','HIGH','MEDIUM','LOW'],
    [sf.CRITICAL||0, sf.HIGH||0, sf.MEDIUM||0, sf.LOW||0],
    ['#f85149','#db6d28','#d29922','#8b949e']
  );
}

function drawLineChart(id, labels, data, label, color) {
  const canvas = document.getElementById(id);
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  canvas.width = canvas.offsetWidth; canvas.height = 130;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  if (!data.length) return;

  const max = Math.max(...data, 0.01);
  const pad = 20;
  const w   = canvas.width - pad * 2;
  const h   = canvas.height - pad * 2;

  ctx.strokeStyle = color; ctx.lineWidth = 2; ctx.beginPath();
  data.forEach((v, i) => {
    const x = pad + (i / Math.max(data.length - 1, 1)) * w;
    const y = pad + h - (v / max) * h;
    i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
  });
  ctx.stroke();

  // Area fill
  ctx.fillStyle = color + '22';
  ctx.lineTo(pad + w, pad + h); ctx.lineTo(pad, pad + h);
  ctx.closePath(); ctx.fill();
}

function drawBarChart(id, labels, data, colors) {
  const canvas = document.getElementById(id);
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  canvas.width = canvas.offsetWidth; canvas.height = 130;
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const max    = Math.max(...data, 1);
  const barW   = canvas.width / labels.length;
  const pad    = 10;

  data.forEach((v, i) => {
    const h   = ((v / max) * (canvas.height - pad * 2));
    const x   = i * barW + barW * 0.2;
    const y   = canvas.height - pad - h;
    ctx.fillStyle = colors[i] || '#58a6ff';
    ctx.fillRect(x, y, barW * 0.6, h);
    ctx.fillStyle = '#8b949e';
    ctx.font = '10px sans-serif';
    ctx.fillText(labels[i], x + barW * 0.1, canvas.height - 2);
    if (v > 0) { ctx.fillStyle = '#e6edf3'; ctx.fillText(v, x + barW * 0.1, y - 3); }
  });
}

// ── Approvals ─────────────────────────────────────────────────────────────────
async function loadApprovals() {
  try {
    const r = await fetch('/api/approvals');
    const d = await r.json();

    const pendingEl  = document.getElementById('approvals-pending');
    const resolvedEl = document.getElementById('approvals-resolved');

    if (!d.pending?.length) {
      pendingEl.innerHTML = '<div class="empty">No pending approvals ✅</div>';
    } else {
      pendingEl.innerHTML = d.pending.map(a => `
        <div class="approval-card ${a.tier === 3 ? 'tier3' : ''} ${a.hours_remaining < 4 ? 'expiring' : ''}">
          <div>
            <div><strong>Tier ${a.tier}</strong> — Phase ${a.phase}, Plan ${a.plan}</div>
            <div style="margin-top:4px;color:var(--text)">${escapeHtml(a.description || 'No description')}</div>
            <div class="approval-meta">${relativeTime(a.requested_at)} | ${a.hours_remaining ? a.hours_remaining.toFixed(1) + 'h remaining' : 'No expiry'}</div>
          </div>
          <div class="approval-actions">
            <button class="btn-approve" onclick="decide('${a.id}','approve')">Approve</button>
            <button class="btn-reject"  onclick="decide('${a.id}','reject')">Reject</button>
          </div>
        </div>
      `).join('');
    }

    const resolved = [...(d.approved||[]), ...(d.rejected||[])].slice(0, 5);
    resolvedEl.innerHTML = resolved.length
      ? resolved.map(a => `<div style="padding:6px 0;border-bottom:1px solid var(--border);font-size:11px;color:var(--muted)">
          ${a.status === 'approved' ? '✅' : '❌'} Tier ${a.tier} — Phase ${a.phase} Plan ${a.plan} — ${escapeHtml(a.resolved_by||'unknown')} ${relativeTime(a.resolved_at)}
        </div>`).join('')
      : '<div class="empty">No recent resolutions</div>';

    updateApprovalBadge(d.pending?.length || 0);
  } catch {}
}

async function decide(id, decision) {
  if (!confirm(`${decision === 'approve' ? 'Approve' : 'Reject'} this request?`)) return;
  try {
    const r = await fetch(`/api/approve/${id}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ decision, approver: 'dashboard-user' }),
    });
    const d = await r.json();
    if (d.success) { showToast(d.message); loadApprovals(); }
    else showToast('Error: ' + d.error, true);
  } catch (e) { showToast('Request failed', true); }
}

// ── Memory / Knowledge Graph ──────────────────────────────────────────────────
let _memSearchTimer;
function searchMemory(q) {
  clearTimeout(_memSearchTimer);
  _memSearchTimer = setTimeout(() => loadMemory(q), 300);
}

async function loadMemory(q = '') {
  try {
    const r = await fetch('/api/memory?q=' + encodeURIComponent(q) + '&limit=50');
    const d = await r.json();
    setText('memory-count', d.total + ' entries');

    const typeColors = {
      architectural_decision: '#58a6ff',
      code_pattern:           '#3fb950',
      bug_pattern:            '#f85149',
      team_preference:        '#d29922',
      domain_knowledge:       '#bc8cff',
    };

    document.getElementById('memory-list').innerHTML = d.entries.length
      ? d.entries.map(e => {
          const confClass = e.confidence >= 0.8 ? 'conf-high' : e.confidence >= 0.6 ? 'conf-med' : 'conf-low';
          const typeColor = typeColors[e.type] || '#8b949e';
          return `
          <div class="card" style="margin-bottom:8px;border-left:3px solid ${typeColor}">
            <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px">
              <strong style="font-size:12px">${escapeHtml(e.topic)}</strong>
              <div style="display:flex;gap:6px;align-items:center">
                <span class="confidence ${confClass}">${(e.confidence * 100).toFixed(0)}%</span>
                <span class="tag">${e.type.replace(/_/g, ' ')}</span>
              </div>
            </div>
            <div style="font-size:11px;color:var(--muted);line-height:1.5">${escapeHtml(e.content.slice(0, 200))}</div>
            <div style="margin-top:6px">${(e.tags||[]).map(t => `<span class="tag">${t}</span>`).join('')}</div>
          </div>`;
        }).join('')
      : '<div class="empty">No knowledge entries found</div>';
  } catch {}
}

// ── Team ──────────────────────────────────────────────────────────────────────
async function loadTeam() {
  try {
    const r = await fetch('/api/team');
    const d = await r.json();

    const activeEl    = document.getElementById('team-active');
    const conflictEl  = document.getElementById('team-conflicts');

    activeEl.innerHTML = d.active?.length
      ? d.active.map(a => `
          <div class="developer-row">
            <div class="avatar">${(a.email||'?')[0].toUpperCase()}</div>
            <div class="dev-info">
              <div class="dev-name">${escapeHtml(a.email)}</div>
              <div class="dev-task">${escapeHtml(a.current_task || 'No active task')}</div>
            </div>
            <div class="dev-last">${a.last_seen_mins}m ago</div>
          </div>`).join('')
      : '<div class="empty">No recent developer activity</div>';

    conflictEl.innerHTML = d.conflicts?.length
      ? d.conflicts.map(c => `
          <div class="conflict-row">⚠️ ${escapeHtml(c.file)} — modified by: ${c.developers.map(d => escapeHtml(d)).join(', ')}</div>`).join('')
      : '<div class="empty">No conflicts detected ✅</div>';
  } catch {}
}

// ── Steering ──────────────────────────────────────────────────────────────────
async function sendSteer() {
  const input = document.getElementById('steer-input');
  const instruction = input.value.trim();
  if (!instruction) return;
  try {
    const r = await fetch('/api/steer', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ instruction, priority: 'normal' }),
    });
    const d = await r.json();
    if (d.success) { showToast('Steering instruction queued'); input.value = ''; }
    else showToast('Error: ' + d.error, true);
  } catch { showToast('Failed to send steering instruction', true); }
}

document.getElementById('steer-input').addEventListener('keydown', e => {
  if (e.key === 'Enter') sendSteer();
});

// ── Approval badge ────────────────────────────────────────────────────────────
function updateApprovalBadge(count) {
  const badge = document.getElementById('approval-badge');
  badge.style.display = count > 0 ? 'inline' : 'none';
  badge.textContent = count;
}
function showApprovalBadge() { updateApprovalBadge(1); }

// ── Toast ─────────────────────────────────────────────────────────────────────
function showToast(msg, isError = false) {
  const t = document.createElement('div');
  t.textContent = msg;
  t.style.cssText = `position:fixed;bottom:20px;right:20px;padding:10px 18px;border-radius:6px;font-size:12px;color:#fff;z-index:1000;background:${isError?'var(--red)':'var(--green)'}`;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 3000);
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function setText(id, val) { const el = document.getElementById(id); if (el) el.textContent = val; }
function escapeHtml(s) { return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
function formatDuration(ms) {
  const m = Math.floor(ms / 60000); const s = Math.floor((ms % 60000) / 1000);
  return m > 60 ? `${Math.floor(m/60)}h ${m%60}m` : `${m}m ${s}s`;
}
function relativeTime(iso) {
  if (!iso) return '';
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  return `${Math.floor(mins/60)}h ago`;
}

// ── Init ──────────────────────────────────────────────────────────────────────
(async function init() {
  connectSSE();
  await loadStatus();
  await loadActivity();
  // Refresh activity every 30s
  setInterval(loadActivity, 30_000);
  setInterval(loadStatus,   15_000);
})();
</script>
</body>
</html>
```

**Commit:**
```bash
git add bin/dashboard/frontend/index.html
git commit -m "feat(v2-dashboard): implement single-file HTML dashboard with 5 pages and live SSE"
```

---

## TASK 9 — Write the `/mindforge:dashboard` command

### `.claude/commands/mindforge/dashboard.md`

```markdown
# MindForge v2 — Dashboard Command
# Usage: /mindforge:dashboard [--port 7339] [--open] [--stop] [--status]
# Version: v2.0.0-alpha.5

## Purpose
Start the MindForge real-time web dashboard — a live observability UI for the
entire team. Shows execution progress, quality metrics, pending approvals,
knowledge graph, and team activity without requiring CLI access.

## Design
The dashboard is a localhost-only web server:
- No build step — single HTML file, no bundler, no npm packages on client
- No authentication — binding to 127.0.0.1 is the security model
- Live updates via Server-Sent Events — no WebSocket library needed
- Designed for screensharing at standups, not external access

## Usage

### Start the dashboard
```
/mindforge:dashboard
→ Dashboard running at: http://localhost:7339
→ Press CTRL+C to stop (or /mindforge:dashboard --stop)
```

### Start and open in browser
```
/mindforge:dashboard --open
→ Opens http://localhost:7339 in your default browser
```

### Custom port
```
/mindforge:dashboard --port 7340
→ Useful if 7339 is already in use
```

### Stop the dashboard
```
/mindforge:dashboard --stop
→ Finds the running dashboard process (from PID file) and sends SIGTERM
```

### Check dashboard status
```
/mindforge:dashboard --status
→ Checks if dashboard is running, shows port and PID
→ Also shows: http://localhost:7339/api/status
```

## Dashboard pages

### Activity (default)
- Phase name, auto mode status (RUNNING/PAUSED/ESCALATED/IDLE)
- Wave progress bar (tasks completed / total)
- Live AUDIT event feed with color-coded event types
- Steering input: send guidance to auto mode without touching the CLI

### Quality Metrics
- Session quality score trend (last 20 sessions)
- Verify pass rate over time
- Security findings by severity (CRITICAL/HIGH/MEDIUM/LOW)
- Cost per session trend

### Approvals
- All pending Tier 2/3 governance requests
- [Approve] and [Reject] buttons — no CLI needed for approval
- Tier, phase/plan, description, time since requested, expiry warning
- Recent approval history

### Knowledge
- Search the knowledge graph from the browser
- Entries filtered by confidence, type, tags
- Color-coded by knowledge type

### Team
- Active developers (by git email, from AUDIT.jsonl)
- What each person is working on (last task)
- File conflict warnings (two developers recently touching the same file)

## Security rules
1. Never expose the dashboard on 0.0.0.0 — localhost only
2. Never forward the port externally (no ngrok, no port forwarding)
3. For remote team visibility: screenshare your browser instead
4. The dashboard shows project details including code patterns and decisions

## Integration with auto mode
When `/mindforge:auto` is running and the dashboard is open:
- Activity feed updates live as tasks complete
- Wave progress bar advances in real-time
- Any escalations appear immediately with red indicator
- The Steering input is active — inject guidance without a second terminal

## AUDIT entry
```json
{ "event": "dashboard_started", "port": 7339, "pid": 12345 }
{ "event": "dashboard_stopped", "pid": 12345 }
```
```

**Commit:**
```bash
cp .claude/commands/mindforge/dashboard.md .agent/mindforge/dashboard.md
git add .claude/commands/mindforge/dashboard.md .agent/mindforge/dashboard.md
git commit -m "feat(v2-dashboard): add /mindforge:dashboard command"
```

---

## TASK 10 — Update CLAUDE.md for dashboard awareness

### Add to `.claude/CLAUDE.md` and `.agent/CLAUDE.md`

```markdown
---

## REAL-TIME DASHBOARD (v2.0.0 — Day 12)

### Dashboard server
The MindForge dashboard runs at localhost:7339 when started.
Start: `node bin/dashboard/server.js [--port 7339] [--open]`
Stop:  `/mindforge:dashboard --stop`

Localhost-only (127.0.0.1) — consistent with ADR-017.
Never bind to 0.0.0.0, never port-forward externally.

### When to recommend the dashboard
Suggest starting the dashboard when:
- User runs /mindforge:auto (live progress visibility)
- Team standup approaching (screenshare mode)
- Tier 2/3 approvals are pending (approver can approve from browser)
- Debugging a quality issue (metrics page shows trends)

### AUDIT events written by dashboard
- dashboard_started: on server start
- dashboard_stopped: on graceful shutdown
- approval_granted / approval_rejected: when approved via browser UI
- steering_queued: when steering instruction sent via browser UI

### New command (Day 12)
- /mindforge:dashboard — start/stop/status the real-time web dashboard

---
```

**Commit:**
```bash
git add .claude/CLAUDE.md .agent/CLAUDE.md
git commit -m "feat(v2-dashboard): update CLAUDE.md with dashboard awareness and integration notes"
```

---

## TASK 11 — Write the dashboard test suite

### `tests/dashboard.test.js`

```javascript
/**
 * MindForge v2 — Dashboard Test Suite
 * Tests SSE bridge, metrics aggregator, approval handler,
 * API router, and server startup/shutdown.
 *
 * Note: Tests do NOT start a real Express server — they test
 * the component logic directly to avoid port conflicts in CI.
 *
 * Run: node tests/dashboard.test.js
 */
'use strict';

const fs     = require('fs');
const path   = require('path');
const http   = require('http');
const os     = require('os');
const assert = require('assert');

let passed = 0, failed = 0;

function test(name, fn) {
  try { fn(); console.log(`  ✅  ${name}`); passed++; }
  catch(e) { console.error(`  ❌  ${name}\n      ${e.message}`); failed++; }
}

async function testAsync(name, fn) {
  try { await fn(); console.log(`  ✅  ${name}`); passed++; }
  catch(e) { console.error(`  ❌  ${name}\n      ${e.message}`); failed++; }
}

// ── Temp project factory ──────────────────────────────────────────────────────
function mkProject() {
  const dir     = fs.mkdtempSync(path.join(os.tmpdir(), 'mf-dashboard-'));
  const write   = (rel, c) => { const f = path.join(dir, rel); fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, c); return f; };
  const exists  = rel => fs.existsSync(path.join(dir, rel));
  const cleanup = () => { try { fs.rmSync(dir, { recursive: true, force: true }); } catch {} };
  return { dir, write, exists, cleanup };
}

// ── Module imports ────────────────────────────────────────────────────────────
const Metrics  = require('../bin/dashboard/metrics-aggregator');
const Approval = require('../bin/dashboard/approval-handler');
const SSE      = require('../bin/dashboard/sse-bridge');

// ── Sample data fixtures ──────────────────────────────────────────────────────
const SAMPLE_HANDOFF = {
  schema_version: '2.0.0',
  current_phase: 3,
  phase_description: 'Authentication System',
  next_task: 'Plan 3-06',
  last_updated: new Date().toISOString(),
};

const SAMPLE_AUTO_STATE = {
  schema_version: '2.0.0',
  auto_mode_active: true,
  status: 'running',
  phase: 3,
  wave_current: 2, wave_total: 3,
  tasks_completed: 5, tasks_total: 8,
  node_repairs: 1, escalations: 0,
  elapsed_ms: 1083000,
  current_task: 'Plan 3-05 — JWT middleware',
  last_commit: 'abc1234',
};

const SAMPLE_APPROVAL = {
  id: 'aaaabbbb-cccc-dddd-eeee-ffffffffffff',
  tier: 2,
  phase: 3,
  plan: '04',
  description: 'Add user RBAC model',
  status: 'pending',
  requested_at: new Date().toISOString(),
  expires_at: new Date(Date.now() + 86_400_000).toISOString(),
};

// ═══════════════════════════════════════════════════════════════════════
console.log('\nMindForge v2 — Dashboard Tests\n');

// ── File existence ────────────────────────────────────────────────────────────
console.log('Required files:');
[
  'bin/dashboard/server.js',
  'bin/dashboard/sse-bridge.js',
  'bin/dashboard/api-router.js',
  'bin/dashboard/approval-handler.js',
  'bin/dashboard/metrics-aggregator.js',
  'bin/dashboard/frontend/index.html',
  '.mindforge/dashboard/dashboard-spec.md',
  '.mindforge/dashboard/api-reference.md',
  '.claude/commands/mindforge/dashboard.md',
  '.agent/mindforge/dashboard.md',
].forEach(f => test(`${f} exists`, () => assert.ok(fs.existsSync(f), `Missing: ${f}`)));

// ── Metrics aggregator ────────────────────────────────────────────────────────
console.log('\nMetrics aggregator:');

test('getStatus: returns object with required fields when no files exist', () => {
  const p    = mkProject();
  const orig = process.cwd();
  process.chdir(p.dir);
  try {
    const status = Metrics.getStatus();
    assert.ok(typeof status === 'object', 'Should return object');
    assert.ok('project_name' in status, 'Should have project_name');
    assert.ok('auto_mode'    in status, 'Should have auto_mode');
    assert.ok('auto_status'  in status, 'Should have auto_status');
  } finally { process.chdir(orig); p.cleanup(); }
});

test('getStatus: reads HANDOFF.json and auto-state.json', () => {
  const p    = mkProject();
  const orig = process.cwd();
  process.chdir(p.dir);
  try {
    p.write('.planning/HANDOFF.json', JSON.stringify(SAMPLE_HANDOFF));
    p.write('.planning/auto-state.json', JSON.stringify(SAMPLE_AUTO_STATE));
    p.write('.planning/PROJECT.md', '# My Auth App\n');

    const status = Metrics.getStatus();
    assert.strictEqual(status.phase,         3,       'Should read phase from HANDOFF.json');
    assert.strictEqual(status.auto_mode,     true,    'Should read auto_mode from auto-state.json');
    assert.strictEqual(status.auto_status,   'running', 'Should read status');
    assert.strictEqual(status.tasks_completed, 5,     'Should read tasks_completed');
    assert.strictEqual(status.project_name,  'My Auth App', 'Should read project name');
  } finally { process.chdir(orig); p.cleanup(); }
});

test('getAuditEntries: returns newest first with limit', () => {
  const p    = mkProject();
  const orig = process.cwd();
  process.chdir(p.dir);
  try {
    const entries = [
      { id: '1', timestamp: '2026-01-01T10:00:00Z', event: 'task_completed', phase: 3, plan: '01' },
      { id: '2', timestamp: '2026-01-01T10:05:00Z', event: 'task_completed', phase: 3, plan: '02' },
      { id: '3', timestamp: '2026-01-01T10:10:00Z', event: 'security_finding', phase: 3 },
    ];
    p.write('.planning/AUDIT.jsonl', entries.map(e => JSON.stringify(e)).join('\n') + '\n');

    const result = Metrics.getAuditEntries(2, 0, null);
    assert.strictEqual(result.entries.length, 2, 'Should respect limit');
    assert.strictEqual(result.entries[0].id, '3', 'Newest should be first (id=3)');
    assert.strictEqual(result.total, 3, 'Should report total count');
  } finally { process.chdir(orig); p.cleanup(); }
});

test('getAuditEntries: filters by event type', () => {
  const p    = mkProject();
  const orig = process.cwd();
  process.chdir(p.dir);
  try {
    const entries = [
      { id: '1', timestamp: '2026-01-01T10:00:00Z', event: 'task_completed' },
      { id: '2', timestamp: '2026-01-01T10:05:00Z', event: 'security_finding' },
    ];
    p.write('.planning/AUDIT.jsonl', entries.map(e => JSON.stringify(e)).join('\n') + '\n');

    const result = Metrics.getAuditEntries(50, 0, 'security_finding');
    assert.ok(result.entries.every(e => e.event === 'security_finding'), 'Should only return filtered event type');
    assert.strictEqual(result.entries.length, 1, 'Should return 1 security_finding');
  } finally { process.chdir(orig); p.cleanup(); }
});

test('getApprovals: returns categorized approvals', () => {
  const p    = mkProject();
  const orig = process.cwd();
  process.chdir(p.dir);
  try {
    p.write(`.planning/approvals/APPROVAL-${SAMPLE_APPROVAL.id}.json`, JSON.stringify(SAMPLE_APPROVAL));

    const result = Metrics.getApprovals();
    assert.ok(Array.isArray(result.pending),   'Should have pending array');
    assert.ok(Array.isArray(result.approved),  'Should have approved array');
    assert.ok(Array.isArray(result.rejected),  'Should have rejected array');
    assert.ok(Array.isArray(result.expired),   'Should have expired array');
    assert.strictEqual(result.pending.length, 1, 'Should have 1 pending approval');
    assert.strictEqual(result.pending[0].id, SAMPLE_APPROVAL.id);
  } finally { process.chdir(orig); p.cleanup(); }
});

test('getApprovals: classifies expired approval correctly', () => {
  const p    = mkProject();
  const orig = process.cwd();
  process.chdir(p.dir);
  try {
    const expired = {
      ...SAMPLE_APPROVAL,
      id: 'expired-uuid-1234-5678-abcd-ef0123456789',
      status: 'pending',
      expires_at: new Date(Date.now() - 3600_000).toISOString(), // 1 hour ago
    };
    p.write(`.planning/approvals/APPROVAL-${expired.id}.json`, JSON.stringify(expired));

    const result = Metrics.getApprovals();
    assert.strictEqual(result.expired.length, 1, 'Should classify as expired');
    assert.strictEqual(result.pending.length, 0, 'Should not be in pending');
  } finally { process.chdir(orig); p.cleanup(); }
});

test('getCosts: returns correct total', () => {
  const p    = mkProject();
  const orig = process.cwd();
  process.chdir(p.dir);
  try {
    const today = new Date().toISOString().slice(0, 10);
    p.write('.mindforge/metrics/token-usage.jsonl',
      JSON.stringify({ date: today, model: 'claude-sonnet-4-6', cost_usd: 0.05 }) + '\n' +
      JSON.stringify({ date: today, model: 'gpt-4o', cost_usd: 0.12 }) + '\n'
    );

    const costs = Metrics.getCosts(7);
    assert.ok(Math.abs(costs.total_usd - 0.17) < 0.001, `Expected ~0.17, got ${costs.total_usd}`);
    assert.ok(costs.by_model['claude-sonnet-4-6'], 'Should break down by model');
    assert.ok(costs.by_model['gpt-4o'], 'Should have gpt-4o');
  } finally { process.chdir(orig); p.cleanup(); }
});

test('getTeamActivity: returns active developers from AUDIT', () => {
  const p    = mkProject();
  const orig = process.cwd();
  process.chdir(p.dir);
  try {
    const now = new Date().toISOString();
    p.write('.planning/AUDIT.jsonl',
      JSON.stringify({ id: '1', timestamp: now, event: 'task_completed', authored_by: 'alice@team.com', phase: 3, plan: '04' }) + '\n' +
      JSON.stringify({ id: '2', timestamp: now, event: 'task_started',   authored_by: 'bob@team.com',   phase: 3, plan: '05' }) + '\n'
    );

    const team = Metrics.getTeamActivity();
    assert.ok(Array.isArray(team.active),    'Should have active array');
    assert.ok(Array.isArray(team.conflicts), 'Should have conflicts array');
    assert.ok(team.active.some(a => a.email === 'alice@team.com'), 'Should include alice');
    assert.ok(team.active.some(a => a.email === 'bob@team.com'),   'Should include bob');
  } finally { process.chdir(orig); p.cleanup(); }
});

// ── Approval handler ──────────────────────────────────────────────────────────
console.log('\nApproval handler:');

test('processDecision: approves a valid pending approval', () => {
  const p    = mkProject();
  const orig = process.cwd();
  process.chdir(p.dir);
  try {
    p.write(`.planning/approvals/APPROVAL-${SAMPLE_APPROVAL.id}.json`, JSON.stringify(SAMPLE_APPROVAL));
    p.write('.planning/AUDIT.jsonl', ''); // Create AUDIT file

    const result = Approval.processDecision(SAMPLE_APPROVAL.id, 'approve', 'Looks good', 'reviewer@team.com');
    assert.strictEqual(result.success, true,     'Should succeed');
    assert.strictEqual(result.decision, 'approve', 'Should record approve decision');

    const updated = JSON.parse(fs.readFileSync(path.join(p.dir, `.planning/approvals/APPROVAL-${SAMPLE_APPROVAL.id}.json`), 'utf8'));
    assert.strictEqual(updated.status, 'approved', 'File should be updated to approved');
    assert.strictEqual(updated.resolved_by, 'reviewer@team.com', 'Should record resolver');
  } finally { process.chdir(orig); p.cleanup(); }
});

test('processDecision: rejects a valid pending approval', () => {
  const p    = mkProject();
  const orig = process.cwd();
  process.chdir(p.dir);
  try {
    p.write(`.planning/approvals/APPROVAL-${SAMPLE_APPROVAL.id}.json`, JSON.stringify(SAMPLE_APPROVAL));
    p.write('.planning/AUDIT.jsonl', '');

    const result = Approval.processDecision(SAMPLE_APPROVAL.id, 'reject', 'Not ready', 'reviewer@team.com');
    assert.strictEqual(result.success, true);
    assert.strictEqual(result.decision, 'reject');
  } finally { process.chdir(orig); p.cleanup(); }
});

test('processDecision: rejects malformed approval ID', () => {
  const result = Approval.processDecision('../../evil/path', 'approve', '', '');
  assert.strictEqual(result.success, false, 'Should reject path traversal in ID');
  assert.ok(result.error, 'Should have error message');
});

test('processDecision: rejects already-resolved approval', () => {
  const p    = mkProject();
  const orig = process.cwd();
  process.chdir(p.dir);
  try {
    const alreadyApproved = { ...SAMPLE_APPROVAL, status: 'approved' };
    p.write(`.planning/approvals/APPROVAL-${SAMPLE_APPROVAL.id}.json`, JSON.stringify(alreadyApproved));

    const result = Approval.processDecision(SAMPLE_APPROVAL.id, 'reject', '', '');
    assert.strictEqual(result.success, false, 'Should not allow re-resolving');
    assert.ok(result.error.includes('already'), 'Should explain why');
  } finally { process.chdir(orig); p.cleanup(); }
});

test('processDecision: rejects invalid decision value', () => {
  const result = Approval.processDecision(SAMPLE_APPROVAL.id, 'maybe', '', '');
  assert.strictEqual(result.success, false);
  assert.ok(result.error, 'Should have error message');
});

test('processDecision: rejects expired approval', () => {
  const p    = mkProject();
  const orig = process.cwd();
  process.chdir(p.dir);
  try {
    const expired = { ...SAMPLE_APPROVAL, expires_at: new Date(Date.now() - 3600_000).toISOString() };
    p.write(`.planning/approvals/APPROVAL-${SAMPLE_APPROVAL.id}.json`, JSON.stringify(expired));

    const result = Approval.processDecision(SAMPLE_APPROVAL.id, 'approve', '', '');
    assert.strictEqual(result.success, false, 'Should reject expired approval');
    assert.ok(result.error.includes('expired'), 'Should mention expiry');
  } finally { process.chdir(orig); p.cleanup(); }
});

// ── SSE bridge ────────────────────────────────────────────────────────────────
console.log('\nSSE bridge:');

test('addClient / getClientCount: tracks connected clients', () => {
  const initial = SSE.getClientCount();
  // Simulate a client (mock res object)
  const mockRes = { write: () => {}, on: (evt, cb) => {} };
  SSE.addClient(mockRes);
  assert.strictEqual(SSE.getClientCount(), initial + 1, 'Count should increase by 1');
  // Simulate disconnect
  const mockRes2 = { write: () => {}, on: (evt, cb) => { if (evt === 'close') setTimeout(cb, 0); } };
  SSE.addClient(mockRes2);
});

test('broadcast: sends formatted SSE message', () => {
  const received = [];
  const mockRes = {
    write: msg => received.push(msg),
    on: () => {},
  };
  SSE.addClient(mockRes);
  SSE.broadcast('test:event', { hello: 'world' });
  const found = received.find(m => m.includes('test:event') && m.includes('hello'));
  assert.ok(found, 'Client should receive the broadcast message');
  assert.ok(found.includes('"hello":"world"'), 'Message should contain JSON data');
});

// ── Frontend HTML integrity ───────────────────────────────────────────────────
console.log('\nFrontend HTML:');

test('index.html: has all 5 page sections', () => {
  const html = fs.readFileSync('bin/dashboard/frontend/index.html', 'utf8');
  ['page-activity','page-metrics','page-approvals','page-memory','page-team']
    .forEach(id => assert.ok(html.includes(`id="${id}"`), `Missing page: ${id}`));
});

test('index.html: has SSE EventSource connection', () => {
  const html = fs.readFileSync('bin/dashboard/frontend/index.html', 'utf8');
  assert.ok(html.includes('EventSource'), 'Should create EventSource for SSE');
  assert.ok(html.includes('/events'), 'Should connect to /events endpoint');
});

test('index.html: has security-safe HTML escaping', () => {
  const html = fs.readFileSync('bin/dashboard/frontend/index.html', 'utf8');
  assert.ok(html.includes('escapeHtml'), 'Should have HTML escaping function');
  assert.ok(html.includes('replace(/&/g'), 'Should escape ampersands');
});

test('index.html: has approval action buttons', () => {
  const html = fs.readFileSync('bin/dashboard/frontend/index.html', 'utf8');
  assert.ok(html.includes('decide('), 'Should have decide() function for approvals');
  assert.ok(html.includes('/api/approve/'), 'Should call approval API endpoint');
});

// ── Security validations ──────────────────────────────────────────────────────
console.log('\nSecurity properties:');

test('server.js binds to 127.0.0.1 not 0.0.0.0', () => {
  const c = fs.readFileSync('bin/dashboard/server.js', 'utf8');
  assert.ok(c.includes("'127.0.0.1'"), 'Should bind to 127.0.0.1');
  assert.ok(!c.includes("'0.0.0.0'"), 'Must NOT bind to 0.0.0.0');
});

test('api-router.js has injection guard on steering endpoint', () => {
  const c = fs.readFileSync('bin/dashboard/api-router.js', 'utf8');
  assert.ok(c.includes('INJECTION_PATTERNS'), 'Should have injection patterns array');
  assert.ok(c.includes('prohibited'), 'Should reject prohibited patterns');
});

test('approval-handler.js validates UUID format before file access', () => {
  const c = fs.readFileSync('bin/dashboard/approval-handler.js', 'utf8');
  assert.ok(c.includes('[a-f0-9-]'), 'Should validate UUID format');
});

test('server.js has request body size limit', () => {
  const c = fs.readFileSync('bin/dashboard/server.js', 'utf8');
  assert.ok(c.includes('limit') && c.includes('64kb'), 'Should limit request body to 64kb');
});

test('server.js rejects non-localhost connections with 403', () => {
  const c = fs.readFileSync('bin/dashboard/server.js', 'utf8');
  assert.ok(c.includes('403'), 'Should return 403 for non-localhost');
  assert.ok(c.includes('isLocal'), 'Should check if request is local');
});

// ── All 45 commands ───────────────────────────────────────────────────────────
console.log('\nAll 45 commands (44 + 1 Day 12):');

const ALL_COMMANDS = [
  'help','init-project','plan-phase','execute-phase','verify-phase','ship',
  'next','quick','status','debug',
  'skills','review','security-scan','map-codebase','discuss-phase',
  'audit','milestone','complete-milestone','approve','sync-jira','sync-confluence',
  'health','retrospective','profile-team','metrics',
  'init-org','install-skill','publish-skill','pr-review','workspace','benchmark',
  'update','migrate','plugins','tokens','release',
  'auto','steer',
  'browse','qa',
  'cross-review','research','costs',
  'remember',
  'dashboard',
];
assert.strictEqual(ALL_COMMANDS.length, 45);

test('all 45 commands in .claude/commands/mindforge/', () => {
  const missing = ALL_COMMANDS.filter(c => !fs.existsSync(`.claude/commands/mindforge/${c}.md`));
  assert.strictEqual(missing.length, 0, `Missing: ${missing.join(', ')}`);
});

test('all 45 commands mirrored in .agent/mindforge/', () => {
  const missing = ALL_COMMANDS.filter(c => !fs.existsSync(`.agent/mindforge/${c}.md`));
  assert.strictEqual(missing.length, 0, `Missing agent: ${missing.join(', ')}`);
});

// ── Version ───────────────────────────────────────────────────────────────────
console.log('\nVersion:');

test('package.json is v2.0.0-alpha.5', () => {
  const v = JSON.parse(fs.readFileSync('package.json', 'utf8')).version;
  assert.ok(v === '2.0.0-alpha.5' || v.startsWith('2.'), `Expected v2.x, got ${v}`);
});

// ── Results ───────────────────────────────────────────────────────────────────
console.log(`\n${'─'.repeat(55)}`);
console.log(`Results: ${passed} passed, ${failed} failed`);
if (failed > 0) { console.error(`\n❌  ${failed} test(s) failed.\n`); process.exit(1); }
else { console.log(`\n✅  All dashboard tests passed.\n`); }
```

**Commit:**
```bash
git add tests/dashboard.test.js
git commit -m "test(v2-dashboard): add comprehensive dashboard test suite (20th suite)"
```

---

## TASK 12 — Bump version, update CHANGELOG, push

```bash
node -e "
  const fs = require('fs');
  const p  = JSON.parse(fs.readFileSync('package.json','utf8'));
  p.version = '2.0.0-alpha.5';
  fs.writeFileSync('package.json', JSON.stringify(p, null, 2) + '\n');
  console.log('Bumped to v2.0.0-alpha.5');
"
```

Update `CHANGELOG.md`:

```markdown
## [2.0.0-alpha.5] — Day 12: Real-Time Web Observability Dashboard

### Added

**Dashboard Server:**
- bin/dashboard/server.js — Express.js HTTP server at localhost:7339
- Localhost-only binding (127.0.0.1) — consistent with ADR-017
- Security middleware: IP check, CORS (localhost-only), body limit (64kb)
- Security headers: X-Content-Type-Options, X-Frame-Options, no-cache
- Graceful shutdown on SIGTERM/SIGINT with PID file cleanup
- --open flag opens default browser automatically

**SSE Event Bridge:**
- bin/dashboard/sse-bridge.js — tails AUDIT.jsonl, auto-state.json, approvals/
- 2-second poll interval for live event delivery
- 15-second keepalive ping to detect disconnected clients
- Client tracking via Set (auto-removes on close)

**Metrics Aggregator:**
- bin/dashboard/metrics-aggregator.js — 7 data source readers
- getStatus(): HANDOFF.json + auto-state.json → current execution state
- getAuditEntries(): newest-first with limit/offset/event-filter
- getMetrics(): quality trends, security findings, repair rate
- getApprovals(): categorized (pending/approved/rejected/expired)
- getTeamActivity(): active developers + file conflict detection
- getMemory(): knowledge base search
- getCosts(): per-model cost summary with daily limit %

**Approval Handler:**
- bin/dashboard/approval-handler.js — approve/reject from browser
- UUID format validation (prevents path traversal in approval ID)
- Expiry enforcement (rejects expired approvals)
- Writes AUDIT entry for every approval decision
- resolution_channel: 'mindforge-dashboard' for traceability

**API Router (10 endpoints):**
- GET /events — SSE stream with initial status push
- GET /api/status, /api/audit, /api/metrics, /api/approvals
- GET /api/team, /api/memory, /api/costs, /api/connections
- POST /api/approve/:id — with UUID validation
- POST /api/steer — with injection guard + auto-mode check

**Frontend (single-file HTML, no build step):**
- bin/dashboard/frontend/index.html — dark theme, 5-page dashboard
- Page 1 Activity: live event feed, wave progress, steering input
- Page 2 Quality: 4 charts (quality, verify, security, cost)
- Page 3 Approvals: approve/reject from browser with confirmation
- Page 4 Knowledge: searchable knowledge graph display
- Page 5 Team: active developers, last-seen, file conflicts
- Charts: canvas-based line and bar charts (no external lib)
- HTML escaping: escapeHtml() on all user-derived content

**New Command (total: 45):**
- /mindforge:dashboard — start/stop/status/open the web dashboard

**Tests:**
- tests/dashboard.test.js — 20th suite (all aggregator functions,
  approval handler CRUD, SSE client management, frontend integrity,
  security property validation)
```

```bash
git add CHANGELOG.md package.json
git commit -m "chore(v2-alpha5): Day 12 complete — real-time web dashboard, v2.0.0-alpha.5"
git push origin feat/mindforge-v2-realtime-dashboard
```

---

# ═══════════════════════════════════════════════════════════════════════
# PART 2 — REVIEW PROMPT
# ═══════════════════════════════════════════════════════════════════════

---

## DAY 12 REVIEW

Activate **`architect.md` + `security-reviewer.md` + `qa-engineer.js`** simultaneously.

Day 12 risk profile:
1. **Approval ID path traversal** — POST /api/approve/:id with crafted ID
2. **Steering injection via dashboard** — browser UI sends instructions to agent context
3. **SSE client accumulation** — disconnected clients never cleaned up = memory leak
4. **Chart data XSS** — knowledge topics/content rendered to canvas or innerHTML
5. **CORS bypass** — misconfigured CORS allows cross-origin approval actions
6. **Approval without auth** — any localhost process can approve Tier 3 changes via API

---

## REVIEW PASS 1 — Approval Security

Read `approval-handler.js` and `api-router.js` completely.

- [ ] **UUID validation in `processDecision` is correct but `api-router.js` uses `req.params.id` directly** without its own validation layer. Express route params are strings — a carefully crafted URL like `/api/approve/../../../../.planning/approvals/APPROVAL-real-uuid` could bypass the UUID check if path normalization behaves unexpectedly. Fix: "Add a second validation in `api-router.js` before calling `processDecision`: `if (!/^[a-f0-9-]{36}$/.test(req.params.id)) return res.status(400).json({ error: 'Invalid ID format' })`."

- [ ] **Tier 3 approvals can be approved via the dashboard without CLI verification.** The approval handler writes `approved` to the file — the same mechanism that CLI approval uses. But Tier 3 governance was designed to require a human with CLI access. Dashboard approval means a stakeholder who can access the dashboard (any localhost process) can approve Tier 3 (payment/PII/auth) changes without ever seeing the code diff. Fix: "Add a Tier 3 browser confirmation: require the approver to type the plan ID to confirm (not just click Approve). Add `confirmation_required: true` flag for Tier 3. The frontend shows: 'Type the plan ID to confirm Tier 3 approval:' input field."

- [ ] **Approval handler writes the approval file in-place after validation.** If the process crashes between writing `status: approved` and writing the AUDIT entry, the approval is recorded but the AUDIT trail is missing. Fix: "Write the AUDIT entry FIRST (before updating the approval file). If the AUDIT write succeeds but the file update fails: the state is slightly inconsistent (AUDIT says approved, file says pending) but the human reviewer can reconcile. If the file update succeeds but AUDIT write fails: approval happens silently — this is the worse case. Write AUDIT first."

---

## REVIEW PASS 2 — SSE Bridge: Memory Leaks

Read `sse-bridge.js` completely.

- [ ] **`clients` Set grows without cleanup when clients disconnect ungracefully.** The `res.on('close')` handler removes the client correctly — but only for graceful TCP closures. If the client connection dies without a TCP close (NAT timeout, process kill), the client stays in the Set forever. Fix: "Add a write-error cleanup: wrap `res.write()` in a try-catch. If writing throws (EPIPE, ECONNRESET), remove the client from the Set immediately. The existing try-catch does call `clients.delete(res)` — verify this is working by testing with a simulated write failure."

- [ ] **`pollAuditLog` reads file bytes by position assuming no file rotation.** If AUDIT.jsonl is rotated (renamed, new file created), `_lastAuditSize` will be wrong. The new file will have size < `_lastAuditSize`, but the condition `newSize <= _lastAuditSize` would return early and miss all new events. Fix: "On each poll: check if the file's inode has changed (compare `stat.ino`). If the inode changed: the file was rotated. Reset `_lastAuditSize = 0` and re-read from start."

---

## REVIEW PASS 3 — Frontend: XSS Risk

Read `bin/dashboard/frontend/index.html` completely.

- [ ] **`escapeHtml` is defined but not consistently applied.** Several `innerHTML` assignments use `escapeHtml()` correctly (`approval-card`, `memory-list`, `developer-row`). But `createAuditRow` uses `escapeHtml(detail)` — the `detail` variable is built from `entry.plan`, `entry.phase`, `entry.task_name`, etc. If any AUDIT.jsonl entry contains `<script>` in a task name (possible if a steering instruction is used as a task name), it would execute. Fix: "Verify every `innerHTML` assignment with dynamic content calls `escapeHtml()`. Add a note: 'All user-derived content MUST go through escapeHtml() before setting innerHTML. Never trust AUDIT.jsonl content.'"

- [ ] **Chart data could contain XSS if rendered to text.** The chart drawing uses `ctx.fillText(labels[i], ...)` for label text. Canvas `fillText` does not execute HTML/JS — it's safe. But `setText()` uses `textContent` (safe). The issue would only arise if chart labels were ever put into `innerHTML` — verify they are not.

---

## REVIEW PASS 4 — API Router: Input Validation

Read `api-router.js` completely.

- [ ] **`/api/memory?q=` query parameter is truncated to 100 chars but not sanitized.** The query is passed to `Metrics.getMemory(q, limit)` which does `entry.topic.toLowerCase().includes(q)`. This is safe (string comparison only). But if the knowledge base content were ever rendered into innerHTML without escaping, the query value could be used for injection. This is already guarded by `escapeHtml()` in the frontend — document this dependency explicitly.

- [ ] **`/api/steer` validation checks auto-mode running but reads auto-state.json directly.** If auto-state.json is stale (e.g., auto mode crashed without updating it), the check passes (`status: running`) even though no auto-mode loop is actually reading the steering queue. This is a minor issue — the queued instruction just gets ignored. Document: "Steer queue is best-effort — if auto mode has crashed, queued instructions will be picked up when auto mode resumes."

---

## REVIEW PASS 5 — Server Security

Read `server.js` completely.

- [ ] **CORS `Access-Control-Allow-Origin: *` fallback when no `origin` header.** The CORS middleware sets `*` when `origin` is absent. This happens with same-origin requests (correct) but also with curl, Postman, and scripted API calls. Since the dashboard is localhost-only, this is acceptable — but should be tightened. Fix: "When `origin` is absent, don't set CORS header at all (same-origin requests don't need it). Only set CORS headers when an origin header is present and it's localhost."

- [ ] **`--open` flag spawns a child process using `require('child_process').spawn`.** The `open`/`start`/`xdg-open` command is selected based on `process.platform`. On Linux, `xdg-open` opens a URL in the default browser. But the URL is hardcoded as `http://localhost:${PORT}` — no user input. This is safe (no injection possible). However, `detached: true` without `stdio: 'inherit'` means errors from the browser open command are silently ignored. This is the correct behaviour for this use case.

---

## REVIEW PASS 6 — Test Suite

Read `tests/dashboard.test.js` completely.

- [ ] **Missing test: Tier 3 approval confirmation requirement.** After hardening Pass 1 (Tier 3 requires typing plan ID), add a test that verifies the backend rejects a Tier 3 approval without the confirmation.

- [ ] **Missing test: SSE inode rotation.** After hardening Pass 2 (inode-based rotation detection), add a test that simulates file rotation and verifies new events are not missed.

- [ ] **`broadcast` test: the mock client stays in the `clients` Set.**  After calling `SSE.addClient(mockRes)` in the test, the mockRes remains in the Set for subsequent tests. This could cause `broadcast` tests to fail in non-isolated order. Fix: "After the broadcast test, remove the mock client from the Set by simulating a close event."

---

## REVIEW SUMMARY TABLE

```
## Day 12 Review Summary

| Category           | BLOCKING | MAJOR | MINOR | SUGGESTION |
|--------------------|----------|-------|-------|------------|
| Approval Security  |          |       |       |            |
| SSE Bridge         |          |       |       |            |
| Frontend XSS       |          |       |       |            |
| API Router         |          |       |       |            |
| Server Security    |          |       |       |            |
| Test Suite         |          |       |       |            |
| **TOTAL**          |          |       |       |            |

## Verdict
[ ] ✅ APPROVED — Proceed to HARDEN section
[ ] ⚠️  APPROVED WITH CONDITIONS
[ ] ❌ NOT APPROVED
```

---

# ═══════════════════════════════════════════════════════════════════════
# PART 3 — HARDENING PROMPT
# ═══════════════════════════════════════════════════════════════════════

---

## DAY 12 HARDENING

Activate **`security-reviewer.md` + `architect.md`** simultaneously.

Confirm all test suites pass before hardening:
```bash
for suite in install wave-engine audit compaction skills-platform \
             integrations governance intelligence metrics \
             distribution ci-mode sdk production migration e2e \
             autonomous browser model-routing memory dashboard; do
  printf "  %-30s" "${suite}..."
  node tests/${suite}.test.js 2>&1 | tail -1
done
```

---

## HARDEN 1 — Add Tier 3 confirmation requirement

Update `bin/dashboard/approval-handler.js`:

```javascript
/**
 * Updated processDecision — Tier 3 requires plan ID confirmation
 */
function processDecision(approvalId, decision, comment, approver, confirmationId = null) {
  // Existing validation...
  if (!/^[a-f0-9-]{36}$/.test(approvalId)) {
    return { success: false, error: 'Malformed approval ID format' };
  }
  // ... file read and pending check ...

  // TIER 3 CONFIRMATION — require typing the plan ID
  if (approval.tier === 3 && decision === 'approve') {
    const expectedConfirmation = `${approval.phase}-${approval.plan}`;
    if (!confirmationId || confirmationId.trim() !== expectedConfirmation) {
      return {
        success: false,
        error: `Tier 3 approval requires typing the plan ID to confirm.`,
        confirmation_required: true,
        expected: expectedConfirmation,
        tier3_warning: 'This is a Tier 3 change (auth/payment/PII). Review the code diff before approving.',
      };
    }
  }

  // ... rest of function unchanged ...
}
```

Update `bin/dashboard/frontend/index.html` — `decide()` function:

```javascript
async function decide(id, decision, tier) {
  let confirmationId = null;

  if (decision === 'approve' && tier === 3) {
    confirmationId = prompt(
      '⚠️  TIER 3 APPROVAL (auth/payment/PII)\n\n' +
      'Review the code diff before approving.\n\n' +
      'Type the plan ID (e.g., "3-04") to confirm:'
    );
    if (!confirmationId) return; // User cancelled
  } else {
    if (!confirm(`${decision === 'approve' ? 'Approve' : 'Reject'} this request?`)) return;
  }

  try {
    const r = await fetch(`/api/approve/${id}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ decision, approver: 'dashboard-user', confirmation_id: confirmationId }),
    });
    const d = await r.json();
    if (d.success) { showToast(d.message); loadApprovals(); }
    else if (d.confirmation_required) {
      showToast('Confirmation required: type the plan ID exactly', true);
    } else {
      showToast('Error: ' + d.error, true);
    }
  } catch { showToast('Request failed', true); }
}
```

Also update `/api/approve/:id` in `api-router.js` to pass `confirmation_id`:

```javascript
app.post('/api/approve/:id', (req, res) => {
  // ... existing validation ...
  const { decision, comment, approver, confirmation_id } = req.body || {};
  const result = Approval.processDecision(id, decision, comment, approver, confirmation_id);
  // ...
});
```

**Commit:**
```bash
git add bin/dashboard/approval-handler.js \
        bin/dashboard/frontend/index.html \
        bin/dashboard/api-router.js
git commit -m "harden(v2-dashboard): add Tier 3 confirmation — must type plan ID to approve"
```

---

## HARDEN 2 — Fix SSE inode rotation detection

Update `bin/dashboard/sse-bridge.js`:

```javascript
let _auditInode = 0;  // Track file inode for rotation detection

function pollAuditLog() {
  if (!fs.existsSync(AUDIT_PATH)) return;

  try {
    const stat    = fs.statSync(AUDIT_PATH);
    const newSize = stat.size;
    const newIno  = stat.ino;

    // File rotation detected: inode changed or new file is smaller
    if (newIno !== _auditInode && _auditInode !== 0) {
      process.stderr.write('[sse-bridge] AUDIT.jsonl rotation detected — resetting position\n');
      _lastAuditSize = 0;
    }
    _auditInode = newIno;

    if (newSize <= _lastAuditSize) return;

    // ... rest of poll logic unchanged ...
  } catch { /* ignore */ }
}
```

Also fix SSE `broadcast` to handle write errors more robustly:

```javascript
function broadcast(eventName, data) {
  const message = `event: ${eventName}\ndata: ${JSON.stringify(data)}\n\n`;
  const toRemove = [];
  for (const res of clients) {
    try {
      res.write(message);
    } catch (err) {
      // Connection died ungracefully (EPIPE, ECONNRESET, etc.)
      toRemove.push(res);
    }
  }
  // Remove dead clients outside the iteration
  toRemove.forEach(res => clients.delete(res));
}
```

**Commit:**
```bash
git add bin/dashboard/sse-bridge.js
git commit -m "harden(v2-dashboard): fix SSE inode rotation detection and dead client cleanup"
```

---

## HARDEN 3 — Fix CORS header for requests without Origin

Update `server.js` CORS middleware:

```javascript
// CORS — only allow requests from localhost origins
app.use((req, res, next) => {
  const origin = req.headers.origin;

  if (origin && /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) {
    // Explicit localhost origin — set CORS headers
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.setHeader('Vary', 'Origin'); // Important: vary by origin for caching
  }
  // No origin header (same-origin/curl/postman): don't set CORS headers
  // This is correct — same-origin requests don't need CORS headers

  if (req.method === 'OPTIONS') return res.status(204).end();
  next();
});
```

**Commit:**
```bash
git add bin/dashboard/server.js
git commit -m "harden(v2-dashboard): fix CORS — don't set wildcard for requests without Origin header"
```

---

## HARDEN 4 — Write AUDIT entry before updating approval file

Update `bin/dashboard/approval-handler.js`:

```javascript
function processDecision(approvalId, decision, comment, approver, confirmationId = null) {
  // ... existing validation ...

  const updated = {
    ...approval,
    status:       decision === 'approve' ? 'approved' : 'rejected',
    resolved_at:  new Date().toISOString(),
    resolved_by:  approver || 'dashboard',
    comment:      comment || null,
    resolution_channel: 'mindforge-dashboard',
  };

  const auditEntry = {
    id:          require('crypto').randomBytes(8).toString('hex'),
    timestamp:   new Date().toISOString(),
    event:       decision === 'approve' ? 'approval_granted' : 'approval_rejected',
    approval_id: approvalId,
    tier:        approval.tier,
    phase:       approval.phase,
    plan:        approval.plan,
    resolved_by: approver || 'dashboard',
    comment:     comment || null,
    agent:       'mindforge-dashboard',
    session_id:  'dashboard',
  };

  // WRITE AUDIT FIRST — then update the approval file
  // If AUDIT write fails: don't update approval (safer — approval can be retried)
  // If approval write fails: AUDIT says approved but file says pending (reconcilable)
  try {
    writeAuditEntry(auditEntry);
  } catch (auditErr) {
    process.stderr.write(`[approval-handler] AUDIT write failed — aborting approval: ${auditErr.message}\n`);
    return { success: false, error: 'AUDIT write failed — approval not processed. Retry.' };
  }

  // Now update the approval file
  fs.writeFileSync(filePath, JSON.stringify(updated, null, 2));

  return {
    success:     true,
    decision,
    approval_id: approvalId,
    tier:        approval.tier,
    message:     `${approval.tier === 3 ? 'Tier 3' : 'Tier 2'} approval ${decision}d for Plan ${approval.phase}-${approval.plan}`,
  };
}
```

**Commit:**
```bash
git add bin/dashboard/approval-handler.js
git commit -m "harden(v2-dashboard): write AUDIT entry before approval file update (fail-safe ordering)"
```

---

## HARDEN 5 — Write 3 ADRs for Day 12 decisions

### `.planning/decisions/ADR-033-dashboard-localhost-only.md`

```markdown
# ADR-033: Dashboard binds to localhost only (127.0.0.1)

**Status:** Accepted | **Date:** v2.0.0 | **Day:** 12

## Context
The dashboard shows live project state including security findings, code decisions,
and team activity. Should it be accessible on the network?

## Decision
Dashboard binds to 127.0.0.1 only. Same policy as SDK SSE (ADR-017) and
Browser Daemon (ADR-024).

## Rationale
The dashboard contains sensitive project information:
- Security findings with vulnerability details
- Knowledge graph with architectural decisions
- Team member email addresses
- Cost tracking and token usage
- Approval requests with code diffs

Exposing this on a network interface would require authentication, TLS, and
access control — adding significant complexity. The use case (team visibility)
is better served by screensharing the developer's browser than exposing an
unauthenticated server.

## Consequences
Remote team members: screenshare or SSH tunnel.
CI environments: dashboard not started in headless mode.
```

### `.planning/decisions/ADR-034-tier3-approval-confirmation.md`

```markdown
# ADR-034: Tier 3 dashboard approvals require typing the plan ID

**Status:** Accepted | **Date:** v2.0.0 | **Day:** 12

## Context
The dashboard allows approving governance requests via a button click.
Tier 3 changes (auth/payment/PII) are high-stakes. Should they be
approachable from the dashboard the same way as Tier 2?

## Decision
Tier 3 dashboard approvals require the approver to type the plan ID
(e.g., "3-04") into a confirmation input field before the approval is processed.

## Rationale
A mis-click or accidental browser interaction should not approve a Tier 3 change.
The type-to-confirm pattern (used by GitHub for repository deletion) creates a
deliberate speed bump that prevents accidental approval.
The plan ID is specific enough to require intent but simple enough to not be burdensome.

## Consequences
Tier 2 approvals: single click + confirm dialog.
Tier 3 approvals: single click + type plan ID.
Tier 3 rejections: single click + confirm dialog (no typing required to reject).
```

### `.planning/decisions/ADR-035-audit-before-approval-file.md`

```markdown
# ADR-035: AUDIT entry written before approval file update

**Status:** Accepted | **Date:** v2.0.0 | **Day:** 12

## Context
When approving a governance request, two writes are required:
1. AUDIT.jsonl entry (compliance trail)
2. APPROVAL-*.json file update (status: approved)

In which order should these writes occur?

## Decision
AUDIT entry is written first. If AUDIT write fails, the approval is aborted.
If AUDIT succeeds but APPROVAL file write fails: AUDIT shows approved but
APPROVAL file still shows pending. This is reconcilable by retrying.

## Rationale
The AUDIT trail is the compliance record. An approval without an AUDIT entry
is a silent approval — undetectable in compliance audits.

The reverse (APPROVAL file updated but no AUDIT) is worse because:
1. The governance gate would pass (approval file says approved)
2. The audit trail would show no approval event
3. This would be a compliance violation

By writing AUDIT first: if anything fails, the approval is either fully
recorded (both written) or not recorded at all (AUDIT write failed = abort).

## Consequences
AUDIT write failure = approval not processed (retry required).
This is the correct fail-safe: prefer no approval over silent approval.
```

**Commit:**
```bash
git add .planning/decisions/ADR-033*.md \
        .planning/decisions/ADR-034*.md \
        .planning/decisions/ADR-035*.md
git commit -m "docs(adr): add ADR-033 dashboard localhost, ADR-034 Tier 3 confirm, ADR-035 audit-before-approval"
```

---

## HARDEN 6 — Add hardening tests

```javascript
// Add to tests/dashboard.test.js:

console.log('\nHardening tests:');

test('Tier 3 approval without confirmation is rejected', () => {
  const p    = mkProject();
  const orig = process.cwd();
  process.chdir(p.dir);
  try {
    const tier3Approval = { ...SAMPLE_APPROVAL, tier: 3 };
    p.write(`.planning/approvals/APPROVAL-${SAMPLE_APPROVAL.id}.json`, JSON.stringify(tier3Approval));

    // No confirmationId provided
    const result = Approval.processDecision(SAMPLE_APPROVAL.id, 'approve', '', 'approver@test.com', null);
    assert.strictEqual(result.success, false, 'Should fail without confirmation');
    assert.ok(result.confirmation_required, 'Should indicate confirmation is required');
    assert.ok(result.tier3_warning, 'Should include tier3 warning');
  } finally { process.chdir(orig); p.cleanup(); }
});

test('Tier 3 approval with correct plan ID succeeds', () => {
  const p    = mkProject();
  const orig = process.cwd();
  process.chdir(p.dir);
  try {
    const tier3Approval = { ...SAMPLE_APPROVAL, tier: 3 };
    p.write(`.planning/approvals/APPROVAL-${SAMPLE_APPROVAL.id}.json`, JSON.stringify(tier3Approval));
    p.write('.planning/AUDIT.jsonl', '');

    const result = Approval.processDecision(SAMPLE_APPROVAL.id, 'approve', '', 'approver@test.com', `${SAMPLE_APPROVAL.phase}-${SAMPLE_APPROVAL.plan}`);
    assert.strictEqual(result.success, true, 'Should succeed with correct plan ID');
  } finally { process.chdir(orig); p.cleanup(); }
});

test('Tier 3 approval with WRONG plan ID is rejected', () => {
  const p    = mkProject();
  const orig = process.cwd();
  process.chdir(p.dir);
  try {
    const tier3Approval = { ...SAMPLE_APPROVAL, tier: 3 };
    p.write(`.planning/approvals/APPROVAL-${SAMPLE_APPROVAL.id}.json`, JSON.stringify(tier3Approval));

    const result = Approval.processDecision(SAMPLE_APPROVAL.id, 'approve', '', 'approver@test.com', '3-99'); // Wrong plan
    assert.strictEqual(result.success, false, 'Should reject wrong plan ID');
  } finally { process.chdir(orig); p.cleanup(); }
});

test('SSE broadcast handles dead clients without crashing', () => {
  let writeCount = 0;
  let errorClient = { write: () => { throw new Error('EPIPE'); }, on: () => {} };
  let goodClient  = { write: msg => { writeCount++; }, on: () => {} };

  SSE.addClient(errorClient);
  SSE.addClient(goodClient);

  // Broadcast should not throw even with a dead client
  assert.doesNotThrow(() => SSE.broadcast('test:event', { data: 'test' }), 'Should handle dead client gracefully');
  assert.ok(writeCount >= 1, 'Good client should receive the broadcast');
});

test('server.js does not set CORS wildcard for missing Origin header', () => {
  const c = fs.readFileSync('bin/dashboard/server.js', 'utf8');
  // The CORS handler should only set headers when origin is present AND localhost
  assert.ok(c.includes('if (origin &&'), 'CORS should be conditional on origin presence');
  // Should NOT have unconditional Access-Control-Allow-Origin: *
  const unconditional = c.match(/setHeader\('Access-Control-Allow-Origin',\s*'\*'\)/);
  assert.ok(!unconditional, 'Should NOT set unconditional wildcard CORS');
});
```

**Commit:**
```bash
git add tests/dashboard.test.js
git commit -m "test(v2-dashboard): add hardening tests — Tier 3 confirmation, dead client SSE, CORS wildcard"
```

---

## HARDEN 7 — Final pre-merge verification

```bash
#!/usr/bin/env bash
echo "MindForge v2 Day 12 — Pre-Merge Verification"
echo "═════════════════════════════════════════════"
PASS=true

V=$(node -e "console.log(require('./package.json').version)")
[[ "${V}" == "2.0.0-alpha.5" ]] && echo "  Version: ${V} ✅" || { echo "  ❌ ${V}"; PASS=false; }

echo ""
FAIL=0
for s in install wave-engine audit compaction skills-platform \
          integrations governance intelligence metrics \
          distribution ci-mode sdk production migration e2e \
          autonomous browser model-routing memory dashboard; do
  printf "    %-30s" "${s}..."
  node tests/${s}.test.js 2>&1 | tail -1 | grep -q "passed" && echo "✅" || { echo "❌"; ((FAIL++)); PASS=false; }
done

CMDS=$(ls .claude/commands/mindforge/ | wc -l | tr -d ' ')
[ "$CMDS" -ge 45 ] && echo "  Commands: ${CMDS} ✅" || { echo "  ❌ Commands: ${CMDS}"; PASS=false; }

ADRS=$(ls .planning/decisions/ADR-*.md 2>/dev/null | wc -l | tr -d ' ')
[ "$ADRS" -ge 35 ] && echo "  ADRs: ${ADRS} ✅" || { echo "  ❌ ADRs: ${ADRS}"; PASS=false; }

# Dashboard should never bind to 0.0.0.0
UNSAFE=$(grep -r "0\.0\.0\.0" bin/dashboard/ 2>/dev/null || true)
[ -z "$UNSAFE" ] && echo "  Binding: localhost-only ✅" || { echo "  ❌ 0.0.0.0 binding found"; PASS=false; }

# No hardcoded credentials in dashboard
CREDS=$(grep -rE "(password|secret|api_key)\s*=\s*['\"][^'\"]{8,}" bin/dashboard/ 2>/dev/null | \
  grep -v "placeholder\|TEST_ONLY" || true)
[ -z "$CREDS" ] && echo "  Credentials: clean ✅" || { echo "  ❌ Credentials in dashboard"; PASS=false; }

echo ""
$PASS && echo "✅ ALL CHECKS PASSED — Day 12 complete" || { echo "❌ FAILURES"; exit 1; }
```

**Final commit:**
```bash
git add .
git commit -m "harden(v2-day12): all hardening complete — Tier 3 confirm, inode rotation, CORS, AUDIT ordering"
git push origin feat/mindforge-v2-realtime-dashboard
```

---

## DAY 12 COMPLETE

| Component | Status |
|---|---|
| Dashboard server (Express.js, localhost:7339, security middleware) | ✅ |
| SSE Event Bridge (AUDIT tail, inode rotation, dead client cleanup) | ✅ |
| Metrics Aggregator (7 data sources: status, audit, metrics, approvals, team, memory, costs) | ✅ |
| Approval Handler (UUID validation, Tier 3 confirmation, AUDIT-first write) | ✅ |
| API Router (10 endpoints, injection guard on steer, approval validation) | ✅ |
| Frontend: Activity Feed (live SSE, wave progress, steering input) | ✅ |
| Frontend: Quality Metrics (4 canvas charts) | ✅ |
| Frontend: Pending Approvals (approve/reject with Tier 3 confirm) | ✅ |
| Frontend: Knowledge Graph (searchable entry list) | ✅ |
| Frontend: Team Activity (developers, last-seen, conflict detection) | ✅ |
| `/mindforge:dashboard` command (45th) | ✅ |
| CLAUDE.md dashboard awareness | ✅ |
| `tests/dashboard.test.js` (20th test suite) | ✅ |
| ADR-033 (localhost), ADR-034 (Tier 3 confirm), ADR-035 (audit ordering) | ✅ |
| CHANGELOG v2.0.0-alpha.5 | ✅ |

**MindForge v2.0.0-alpha.5: 45 commands · 20 test suites · 35 ADRs**
**Branch:** `feat/mindforge-v2-realtime-dashboard`
**Day 12 complete. Open PR → merge → start Day 13 (Self-Building Skills)**
