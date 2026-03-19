# MindForge Audit System — Schema Reference

## Purpose
AUDIT.jsonl is an append-only, newline-delimited JSON log of every significant
MindForge agent action. It provides a complete, tamper-evident history of what
the agent did, when, and why.

## File location
`.planning/AUDIT.jsonl`

## Format
One JSON object per line. Never modify existing lines. Only append.

```
{"id":"...","timestamp":"...","event":"...","phase":1,...}
{"id":"...","timestamp":"...","event":"...","phase":1,...}
```

## Universal fields (present in every entry)

| Field | Type | Description |
|---|---|---|
| `id` | string | UUID v4. Unique per entry. |
| `timestamp` | string | ISO-8601 with timezone: `2026-03-20T14:32:10.000Z` |
| `event` | string | Event type (see Event Types below) |
| `agent` | string | Which agent wrote this: `mindforge-orchestrator`, `mindforge-subagent-[plan]`, `mindforge-security-reviewer`, etc. |
| `phase` | number/null | Phase number, or null if not in a phase |
| `session_id` | string | Identifies the current agent session (use a short random ID) |

## Event types and their additional fields

### `project_initialised`
```json
{
  "id": "uuid",
  "timestamp": "ISO-8601",
  "event": "project_initialised",
  "agent": "mindforge-orchestrator",
  "phase": null,
  "session_id": "sess_abc",
  "project_name": "my-saas-app",
  "tech_stack": "Next.js + PostgreSQL",
  "compliance": ["GDPR"]
}
```

### `phase_planned`
```json
{
  "id": "uuid",
  "timestamp": "ISO-8601",
  "event": "phase_planned",
  "agent": "mindforge-orchestrator",
  "phase": 1,
  "session_id": "sess_abc",
  "plan_count": 5,
  "wave_count": 3,
  "research_conducted": true
}
```

### `task_started`
```json
{
  "id": "uuid",
  "timestamp": "ISO-8601",
  "event": "task_started",
  "agent": "mindforge-subagent-01",
  "phase": 1,
  "plan": "01",
  "session_id": "sess_abc",
  "task_name": "Create user authentication model",
  "persona": "developer",
  "skills_loaded": ["security-review"],
  "files_in_scope": ["src/models/user.ts", "src/models/user.test.ts"]
}
```

### `task_completed`
```json
{
  "id": "uuid",
  "timestamp": "ISO-8601",
  "event": "task_completed",
  "agent": "mindforge-subagent-01",
  "phase": 1,
  "plan": "01",
  "session_id": "sess_abc",
  "task_name": "Create user authentication model",
  "commit_sha": "abc1234",
  "verify_result": "pass",
  "verify_output": "Tests: 8 passing (342ms)",
  "files_changed": ["src/models/user.ts", "src/models/user.test.ts"],
  "decisions_made": ["Used argon2id over bcrypt per SECURITY.md requirements"]
}
```

### `task_failed`
```json
{
  "id": "uuid",
  "timestamp": "ISO-8601",
  "event": "task_failed",
  "agent": "mindforge-subagent-02",
  "phase": 1,
  "plan": "02",
  "session_id": "sess_abc",
  "task_name": "Create product model",
  "failure_reason": "verify step failed: TypeError: Cannot read property 'id' of undefined",
  "files_modified_at_failure": ["src/models/product.ts"],
  "recovery_action": "debug_agent_spawned"
}
```

### `security_finding`
```json
{
  "id": "uuid",
  "timestamp": "ISO-8601",
  "event": "security_finding",
  "agent": "mindforge-security-reviewer",
  "phase": 1,
  "plan": "03",
  "session_id": "sess_abc",
  "severity": "HIGH",
  "owasp_category": "A03:Injection",
  "finding": "Parameterised query missing in user search endpoint",
  "file": "src/api/users/search.ts",
  "line": 47,
  "remediated": false,
  "report_path": ".planning/phases/1/SECURITY-REVIEW-1.md"
}
```

### `quality_gate_failed`
```json
{
  "id": "uuid",
  "timestamp": "ISO-8601",
  "event": "quality_gate_failed",
  "agent": "mindforge-orchestrator",
  "phase": 1,
  "session_id": "sess_abc",
  "gate": "test_suite",
  "detail": "4 tests failing after wave 2 completion",
  "blocking": true,
  "user_notified": true
}
```

### `context_compaction`
```json
{
  "id": "uuid",
  "timestamp": "ISO-8601",
  "event": "context_compaction",
  "agent": "mindforge-orchestrator",
  "phase": 1,
  "plan": "03",
  "session_id": "sess_abc",
  "context_usage_pct": 72,
  "session_summary": "Completed plans 01 and 02, started plan 03",
  "handoff_written": true
}
```

### `phase_completed`
```json
{
  "id": "uuid",
  "timestamp": "ISO-8601",
  "event": "phase_completed",
  "agent": "mindforge-orchestrator",
  "phase": 1,
  "session_id": "sess_abc",
  "tasks_completed": 5,
  "commits": ["abc1234", "def5678", "ghi9012", "jkl3456", "mno7890"],
  "requirements_met": 8,
  "requirements_total": 8,
  "uat_signed_off": true,
  "duration_estimate": "~51 minutes"
}
```

### `decision_recorded`
```json
{
  "id": "uuid",
  "timestamp": "ISO-8601",
  "event": "decision_recorded",
  "agent": "mindforge-orchestrator",
  "phase": 1,
  "session_id": "sess_abc",
  "decision_type": "architectural",
  "description": "Chose argon2id over bcrypt for password hashing",
  "rationale": "argon2id won PHC and is more memory-hard against GPU attacks",
  "adr_path": ".planning/decisions/ADR-004-password-hashing.md"
}
```

## Audit query guide (for `/mindforge:status` command)

To read the audit log effectively:

```bash
# All events for phase 1
grep '"phase":1' .planning/AUDIT.jsonl | python3 -m json.tool

# All security findings
grep '"event":"security_finding"' .planning/AUDIT.jsonl

# All task failures
grep '"event":"task_failed"' .planning/AUDIT.jsonl

# Today's activity
grep "$(date -u +%Y-%m-%d)" .planning/AUDIT.jsonl

# Count events by type
grep -o '"event":"[^"]*"' .planning/AUDIT.jsonl | sort | uniq -c | sort -rn
```

## Audit integrity rules

1. **Never delete lines** from AUDIT.jsonl. It is append-only.
2. **Never modify existing lines.** If an entry was wrong, write a correction entry.
3. **Every correction entry** must reference the ID of the entry it corrects:
   ```json
   {"id":"new-uuid","event":"correction","corrects_id":"original-uuid","correction":"..."}
   ```
4. **Write an entry for every significant action** — not just successes.
   Failures, blockers, and security findings are especially important.
5. **AUDIT.jsonl is committed to git.** Do not write secrets into it.
