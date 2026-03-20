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

## Archiving and rotation
When `.planning/AUDIT.jsonl` exceeds 10,000 lines, rotate it into
 `.planning/audit-archive/` instead of truncating or rewriting history.

Recommended archive naming:
- `AUDIT-2026-03-20T14-32-10Z.jsonl`
- `AUDIT-phase-4-rotation-001.jsonl`

Rotation procedure:
1. Validate the active log is valid JSONL
2. Copy it into `.planning/audit-archive/`
3. Replace the active log with a new empty `AUDIT.jsonl`
4. Write an AUDIT entry or rotation manifest noting archive filename, line count,
   and timestamp

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

### `phase_execution_started`
```json
{
  "id": "uuid",
  "timestamp": "ISO-8601",
  "event": "phase_execution_started",
  "agent": "mindforge-orchestrator",
  "phase": 1,
  "session_id": "sess_abc",
  "plan_count": 5,
  "wave_count": 3,
  "dependency_graph_path": ".planning/phases/1/DEPENDENCY-GRAPH-1.md"
}
```

### `phase_execution_completed`
```json
{
  "id": "uuid",
  "timestamp": "ISO-8601",
  "event": "phase_execution_completed",
  "agent": "mindforge-orchestrator",
  "phase": 1,
  "session_id": "sess_abc",
  "tasks_completed": 5,
  "tasks_failed": 0,
  "verify_status": "pass",
  "verification_path": ".planning/phases/1/VERIFICATION.md"
}
```

### `session_started`
```json
{
  "id": "uuid",
  "timestamp": "ISO-8601",
  "event": "session_started",
  "agent": "mindforge-orchestrator",
  "phase": null,
  "session_id": "sess_abc",
  "reason": "new_session"
}
```

### `quick_task_completed`
```json
{
  "id": "uuid",
  "timestamp": "ISO-8601",
  "event": "quick_task_completed",
  "agent": "mindforge-orchestrator",
  "phase": null,
  "session_id": "sess_abc",
  "quick_task_id": "003-fix-login",
  "commit_sha": "abc1234",
  "verify_result": "pass"
}
```

### `debug_completed`
```json
{
  "id": "uuid",
  "timestamp": "ISO-8601",
  "event": "debug_completed",
  "agent": "mindforge-debug-specialist",
  "phase": 2,
  "plan": "03",
  "session_id": "sess_abc",
  "root_cause": "Null pointer in auth middleware",
  "commit_sha": "def5678",
  "tests_run": true
}
```

### `uat_started`
```json
{
  "id": "uuid",
  "timestamp": "ISO-8601",
  "event": "uat_started",
  "agent": "mindforge-orchestrator",
  "phase": 1,
  "session_id": "sess_abc",
  "owner": "product"
}
```

### `uat_completed`
```json
{
  "id": "uuid",
  "timestamp": "ISO-8601",
  "event": "uat_completed",
  "agent": "mindforge-orchestrator",
  "phase": 1,
  "session_id": "sess_abc",
  "result": "pass",
  "notes": "Signed off by product"
}
```

### `ship_started`
```json
{
  "id": "uuid",
  "timestamp": "ISO-8601",
  "event": "ship_started",
  "agent": "mindforge-release-manager",
  "phase": 1,
  "session_id": "sess_abc",
  "version": "v0.1.0"
}
```

### `ship_completed`
```json
{
  "id": "uuid",
  "timestamp": "ISO-8601",
  "event": "ship_completed",
  "agent": "mindforge-release-manager",
  "phase": 1,
  "session_id": "sess_abc",
  "version": "v0.1.0",
  "release_tag": "v0.1.0"
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

### `integration_action`
```json
{
  "id": "uuid",
  "timestamp": "ISO-8601",
  "event": "integration_action",
  "agent": "mindforge-orchestrator",
  "phase": 2,
  "session_id": "sess_abc",
  "integration": "jira",
  "action": "create_ticket",
  "status": "success",
  "external_id": "ENG-42",
  "detail": "Created Epic for Phase 2",
  "attempts": 1
}
```

### `integration_credential_expired`
```json
{
  "id": "uuid",
  "timestamp": "ISO-8601",
  "event": "integration_credential_expired",
  "agent": "mindforge-orchestrator",
  "phase": null,
  "session_id": "sess_abc",
  "integration": "jira",
  "detail": "Health check returned 401"
}
```

### `change_classified`
```json
{
  "id": "uuid",
  "timestamp": "ISO-8601",
  "event": "change_classified",
  "agent": "mindforge-orchestrator",
  "phase": 4,
  "session_id": "sess_abc",
  "tier": 3,
  "classification_reason": "code pattern: jwt.sign found in src/utils/helper.ts",
  "signal_triggered": "code_content"
}
```

### `compliance_gate_failed`
```json
{
  "id": "uuid",
  "timestamp": "ISO-8601",
  "event": "compliance_gate_failed",
  "agent": "mindforge-security-reviewer",
  "phase": 4,
  "session_id": "sess_abc",
  "gate": "GDPR_retention",
  "detail": "PII field added without retention policy"
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

## Corruption recovery and archiving

If AUDIT.jsonl is corrupted (partial line from crash):
1. Restore the last clean version from git history, OR
2. Filter valid lines only:
   ```bash
   python3 -c "import sys,json;[print(l.strip()) for l in sys.stdin if l.strip() and json.loads(l)]" < .planning/AUDIT.jsonl > /tmp/AUDIT.clean.jsonl
   mv /tmp/AUDIT.clean.jsonl .planning/AUDIT.jsonl
   ```

If AUDIT.jsonl grows beyond 10,000 lines:
1. Archive to `.planning/AUDIT-archive-YYYY.jsonl`
2. Start a fresh `.planning/AUDIT.jsonl` with new entries
