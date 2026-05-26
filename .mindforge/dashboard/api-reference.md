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
