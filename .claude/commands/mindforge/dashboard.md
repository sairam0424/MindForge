---
description: Start the MindForge real-time web dashboard — a live observability UI for the
---

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
