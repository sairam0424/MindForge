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
