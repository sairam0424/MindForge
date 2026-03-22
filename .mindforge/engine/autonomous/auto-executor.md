# MindForge v2 — Auto-Executor Engine

## Purpose
Orchestrate complete autonomous execution of a MindForge phase without
human intervention. The auto-executor is the brain behind `/mindforge:auto`.

## Design principles

### Principle 1 — Fresh context per task
Every task is executed by a new subagent with a fresh context window.
Never accumulate context across tasks. The only state that persists between
tasks is written to `.planning/` files (HANDOFF.json, AUDIT.jsonl, SUMMARY files).

### Principle 2 — Durable execution
Auto mode is designed to survive interruption. Every task completion writes
to HANDOFF.json before moving to the next. If the session dies:
- HANDOFF.json shows exactly where execution stopped
- Next `/mindforge:auto` call resumes from the last completed task
- No work is repeated, no work is lost

### Principle 3 — Governance is non-negotiable
Compliance gates run between every wave. CRITICAL security findings stop
the loop immediately. Tier 3 changes (auth/payment/PII code patterns) trigger
ESCALATE — they are never auto-approved in autonomous mode.

### Principle 4 — Signal over silence
Auto mode never silently fails. Every decision (RETRY, DECOMPOSE, PRUNE,
ESCALATE) is written to AUDIT.jsonl with full context. The progress stream
reports every state change in real time.

---

## Auto-executor state machine

```
IDLE
  │
  ▼ /mindforge:auto [phase N]
PRE_FLIGHT_CHECK
  │ fail → ESCALATE with specific error
  │ pass
  ▼
PHASE_ASSESSMENT
  │ PLAN files exist?
  │   NO → AUTO_PLAN (discuss if ambiguity > 3.5, then plan)
  │   YES → check if any are incomplete
  ▼
DEPENDENCY_RESOLUTION
  │ Build wave DAG from PLAN files
  │ Identify completed tasks (SUMMARY files exist)
  │ Resume from first incomplete task
  ▼
WAVE_EXECUTION_LOOP ←──────────────────────────────┐
  │                                                 │
  │ For each wave:                                  │
  │   Dispatch N tasks in parallel (subagents)      │
  │   Each task: EXECUTE → VERIFY → COMMIT          │
  │                                                 │
  │   Task result:                                  │
  │     SUCCESS → write SUMMARY, AUDIT, HANDOFF     │
  │     FAILURE → NODE_REPAIR (see node-repair.md)  │
  │       REPAIR result:                            │
  │         RECOVERED → continue                   │
  │         DEFERRED  → add to DEFERRED-ITEMS.md    │
  │         ESCALATE  → stop, notify, write report  │
  │                                                 │
  │ Poll steering-queue.jsonl at task boundaries    │
  │ Apply any queued steering guidance              │
  │                                                 │
  │ After each wave:                                │
  │   Run compliance gates (Gate 1-5)               │
  │   CRITICAL finding → ESCALATE                  │
  │   Update HANDOFF.json wave completion           │
  │   Push if AUTO_PUSH_ON_WAVE_COMPLETE=true        │
  │                                                 │
  └─────────────── all waves complete ─────────────┘
  │
  ▼
POST_EXECUTION
  │ Run automated verification (no human UAT in auto mode)
  │ Write AUTONOMOUS-REPORT-[phase]-[timestamp].md
  │ Update STATE.md
  │ Send Slack notification (if configured)
  ▼
COMPLETE (or ESCALATED)
```

---

## Pre-flight check protocol

Before starting any autonomous execution, verify:

```bash
# 1. Health check — must be healthy
/mindforge:health
# Expected: ✅ Installation integrity, ✅ State consistency

# 2. Schema version check
SCHEMA_VER=$(node -e "try{const h=require('./.planning/HANDOFF.json');
  console.log(h.schema_version)}catch{console.log('missing')}")
[ "${SCHEMA_VER}" = "1.0.0" ] || {
  echo "⚠️  HANDOFF.json schema outdated (${SCHEMA_VER}). Run /mindforge:migrate"
  exit 1
}

# 3. Uncommitted changes check
# HARDENED: Exclude .planning/ and MINDFORGE.md
DIRTY=$(git status --porcelain | \
  grep -v "^??" | \
  grep -v "^.. \.planning/" | \
  grep -v "^.. MINDFORGE\.md" | \
  wc -l | tr -d ' ')

if [ "${DIRTY}" -gt 0 ]; then
  echo "❌ ${DIRTY} uncommitted change(s) in application code."
  echo "   Commit or stash before running auto mode:"
  git status --porcelain | grep -v "^??" | grep -v "^.. \.planning/"
  exit 1
fi
echo "✅ Working tree clean (application code)"

# 4. Phase PLAN files check
PLAN_COUNT=$(ls .planning/phases/${PHASE_NUM}/PLAN-${PHASE_NUM}-*.md 2>/dev/null | wc -l | tr -d ' ')
if [ "${PLAN_COUNT}" -eq 0 ]; then
  echo "ℹ️  No PLAN files for Phase ${PHASE_NUM}. Will auto-plan first."
  # Trigger auto-plan path
fi

# 5. Governance configuration check — warn if Tier 2/3 approvers not configured
APPROVERS=$(grep "TIER2_APPROVERS=" .mindforge/governance/GOVERNANCE-CONFIG.md 2>/dev/null | \
  grep -v "senior-engineer" | head -1)
[ -n "${APPROVERS}" ] || {
  echo "⚠️  Tier 2/3 approvers not configured. Tier 3 changes will ESCALATE immediately."
}

# 6. Timeout sanity check
TIMEOUT_MINS="${AUTO_MODE_DEFAULT_TIMEOUT_MINUTES:-120}"
echo "ℹ️  Timeout: ${TIMEOUT_MINS} minutes from now ($(date -d "+${TIMEOUT_MINS} minutes" '+%H:%M'))"
```

---

## Task dispatch model

### Subagent context package (fresh per task)
Each task's subagent receives ONLY:
1. CLAUDE.md (persona instructions)
2. The specific persona file (e.g., developer.md)
3. Relevant loaded skills (JIT-loaded per triggers)
4. The specific PLAN-N-MM.md file
5. CONVENTIONS.md (org coding standards)
6. Referenced architecture sections only (not full ARCHITECTURE.md)
7. Any steering guidance from steering-queue.jsonl
8. Implicit knowledge from HANDOFF.json relevant to this task

This is the minimum-context principle from the v1 context-injector — carried
forward and enforced strictly in auto mode to prevent context rot.

### Fresh context enforcement
```bash
# Auto mode subagent spawn — each task gets a new conversation
# (In Claude Code: each task is a new sub-session with /clear between tasks)
# Context budget per task: max 60,000 tokens
# If context estimate > 60K: DECOMPOSE the task before execution

CONTEXT_EST=$(estimate_task_context "${PLAN_FILE}")
if [ "${CONTEXT_EST}" -gt 60000 ]; then
  echo "Context estimate ${CONTEXT_EST} exceeds 60K — triggering pre-execution DECOMPOSE"
  decompose_plan "${PLAN_FILE}"
fi
```

### Compliance gate timing — CRITICAL DISTINCTION

### Gate 3 (secret detection) — runs PRE-COMMIT, not post-wave
Gate 3 must run on the STAGED diff before every commit.
A committed secret is a git history violation even if caught 30 seconds later.

```bash
# Before every git commit in auto mode:
STAGED_DIFF=$(git diff --cached)

# Secret detection on staged content
SECRET_FOUND=$(echo "${STAGED_DIFF}" | \
  grep -E "(sk-[a-zA-Z0-9]{20,}|AKIA[A-Z0-9]{16}|ghp_[a-zA-Z0-9]{36}|xoxb-[a-zA-Z0-9-]+)" | \
  head -1)

if [ -n "${SECRET_FOUND}" ]; then
  # DO NOT COMMIT
  git reset HEAD  # Unstage everything
  echo "🔴 GATE 3 VIOLATION: Secret detected in staged changes"
  echo "   Pattern: ${SECRET_FOUND:0:30}***"
  echo "   Auto mode ESCALATING — secret must be removed before continuing"
  write_escalation "Gate 3: secret credential pattern in staged diff"
  write_audit_gate3_violation
  notify_slack_critical
  exit 3  # Exit code 3 = gate failure
fi
```

### Gates 1, 2, 4, 5 — run POST-WAVE (as before)
These gates check the wave's overall output, not individual commits.
They run after all tasks in a wave complete.

---

## Progress state file: `.planning/auto-state.json`

Written after every task. The source of truth for progress display and resumption.

```json
{
  "schema_version": "2.0.0",
  "auto_mode_active": true,
  "session_id": "auto-sess-uuid",
  "phase": 3,
  "started_at": "ISO-8601",
  "timeout_at": "ISO-8601",
  "elapsed_ms": 1083000,
  "estimated_remaining_ms": 741000,
  "wave_current": 2,
  "wave_total": 3,
  "tasks_completed": 4,
  "tasks_total": 8,
  "tasks_failed": 0,
  "node_repairs": 0,
  "escalations": 0,
  "steering_items_applied": 1,
  "token_consumed_estimate": 82400,
  "last_commit": "abc1234ef",
  "last_task": "Plan 3-04",
  "current_task": "Plan 3-05",
  "current_task_started_at": "ISO-8601",
  "gate_failures": 0,
  "deferred_items": [],
  "status": "running|paused|completed|escalated|timeout",
  "_warning": "Never store secrets in this file."
}
```

---

## AUDIT entries for auto mode

Three new AUDIT event types:

```json
{ "event": "auto_mode_started",
  "phase": 3, "session_id": "auto-sess-uuid",
  "plans_total": 8, "waves_total": 3,
  "timeout_minutes": 120 }

{ "event": "auto_mode_completed",
  "phase": 3, "session_id": "auto-sess-uuid",
  "tasks_completed": 8, "tasks_total": 8,
  "node_repairs": 0, "escalations": 0,
  "duration_ms": 1834000, "commits": ["abc1234", "def5678"] }

{ "event": "auto_mode_escalated",
  "phase": 3, "session_id": "auto-sess-uuid",
  "reason": "CRITICAL security finding in Plan 3-06",
  "last_completed_task": "Plan 3-05",
  "next_task": "Plan 3-06",
  "resume_command": "/mindforge:auto --phase 3 --resume" }
```
