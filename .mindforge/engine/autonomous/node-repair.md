# MindForge v2 — Node Repair Operator

## Purpose
When a task fails in auto mode, the node repair operator decides whether to
RETRY, DECOMPOSE, PRUNE, or ESCALATE — in that order of preference.
The goal: recover autonomously without escalating to the human unless truly necessary.

## The four repair strategies

### RETRY — Re-execute the same plan with a fresh context

**When to use:**
- First failure of any kind (default first response)
- Test failures that look transient (no deterministic root cause identifiable)
- Timeout (task ran > task timeout without completing)
- `error: Cannot find module` or similar environment setup errors

**How it works:**
1. Clear any partial file changes from the failed attempt: `git checkout -- .`
2. Read the failure output carefully for error signals
3. Inject the error output as additional context for the retry subagent:
   ```
   [RETRY CONTEXT — previous attempt failed]
   Error observed: [exact error message]
   This is attempt 2/2. Fix this specific error.
   ```
4. Re-dispatch the task with fresh context + error context
5. If retry succeeds: write `node_repair_type: RETRY` to AUDIT entry
6. If retry fails: proceed to DECOMPOSE

**Budget:** Max 1 retry per task (configurable via `AUTO_NODE_REPAIR_BUDGET`)

---

### DECOMPOSE — Split the failed task into smaller tasks

**When to use:**
- RETRY failed (scope was too broad for one pass)
- Context estimate > 60K tokens (before even attempting)
- Verify step fails on multiple distinct criteria simultaneously
- Task has files from 2+ distinct domains (auth + database + UI in one plan)

**How it works:**

Step 1 — Analyse the failed plan:
Read the `<action>` and `<files>` fields. Identify:
- How many distinct concerns are in this plan?
- What is the minimal first step that would unblock the rest?
- What is the logical split that creates two independent tasks?

Step 2 — Create two replacement PLAN files:

Original: `PLAN-3-05.md` (failed)
→ `PLAN-3-05a.md` (first part — the foundation)
→ `PLAN-3-05b.md` (second part — depends on 05a)

```xml
<!-- PLAN-3-05a.md -->
<task type="auto">
  <n>[Original name] — Part A: [foundation concern]</n>
  <persona>developer</persona>
  <phase>3</phase>
  <plan>05a</plan>
  <dependencies>04</dependencies>
  <decomposed_from>05</decomposed_from>
  <files>[subset of original files — foundation only]</files>
  <action>[Action for part A only — narrower scope]</action>
  <verify>[Verify step for part A specifically]</verify>
  <done>[Part A definition of done]</done>
</task>
```

Step 3 — Insert the new plans into the wave execution at the current position
Step 4 — Update dependency chain: any plan that depended on the original plan now depends on the second sub-plan (Xb). Xa gets original dependencies.
Step 5 — Write AUDIT: `{ "event": "node_decomposed", "original": "3-05", "into": ["3-05a", "3-05b"] }`
Step 6 — Execute 3-05a. If it succeeds, execute 3-05b.

**Budget:** Max 1 decomposition per original plan. If 3-05a also fails: PRUNE or ESCALATE.

---

### PRUNE — Skip and defer to a follow-up task

**When to use:**
- Plan is not on the critical path (other plans don't depend on it)
- RETRY and DECOMPOSE both failed
- Plan is a "nice-to-have" improvement, not core functionality

**How it works:**
1. Mark the plan as `status: PRUNED` in auto-state.json
2. Write to `.planning/phases/[N]/DEFERRED-ITEMS.md`:
   ```markdown
   # Deferred Items — Phase [N]

   ## PRUNED-[plan-id]: [task name]
   **Reason:** RETRY + DECOMPOSE both failed. Non-critical path.
   **Last error:** [error from final attempt]
   **Retry when:** [suggested condition — e.g., "after database schema is stable"]
   **Manual steps:** [what a human would need to do to complete this]
   ```
3. Log AUDIT: `{ "event": "node_pruned", "plan": "3-05", "reason": "..." }`
4. Send Slack notification if `AUTO_NOTIFY_ON_ESCALATION=true`:
   "⚠️ Auto mode pruned Plan 3-05 — non-critical, deferred to follow-up"
5. Continue auto mode with the next task

**Guard:** PRUNE only if no other plans declare `<dependencies>` on this plan (check wave DAG and physical PLAN files).
If other plans depend on this one: ESCALATE instead (cannot skip a critical path dependency).

---

### ESCALATE — Stop, save state, notify human

**When to use (ANY of these):**
- Tier 3 change detected (auth/payment/PII code — requires human compliance approval)
- CRITICAL security finding in compliance gates
- Plan is on critical path and RETRY + DECOMPOSE both failed
- Gate 3 violation (secrets detected in diff)
- Node repair budget exhausted (ALL RETRY and DECOMPOSE attempts failed)
- Timeout exceeded AND work in progress (clean timeout → exit 0, mid-task timeout → ESCALATE)
- Human explicitly requested via `CTRL+C` pause

**How it works:**
1. Stop execution immediately (do NOT start the next task)
2. `git stash` any uncommitted partial changes
3. Write comprehensive ESCALATION-[timestamp].md:
   ```markdown
   # Auto Mode Escalation — Phase [N]
   **Time:** [ISO-8601]
   **Trigger:** [exact escalation reason]
   **Last completed task:** Plan [N]-[MM] (commit: [sha])
   **Blocked on:** Plan [N]-[MM+1] — [task name]
   **Error details:** [full error output]
   **Required human action:** [exactly what needs to happen]
   **Resume command:** /mindforge:auto --phase [N] --resume
   ```
4. Update auto-state.json: `"status": "escalated"`
5. Update HANDOFF.json: `"next_task": "ESCALATED — see .planning/phases/[N]/ESCALATION-[ts].md"`
6. Write AUDIT: `{ "event": "auto_mode_escalated", "reason": "...", "resume_command": "..." }`
7. Send Slack notification with the ESCALATION.md content (if configured)
8. Exit auto mode with status message printed to terminal

## Repair decision tree

```
Task fails
    │
    ▼
Is this a Tier 3 governance trigger?
    YES → ESCALATE immediately (never auto-approve auth/payment/PII)
    NO
    │
    ▼
Is this attempt 1?
    YES → RETRY (inject error context)
    NO (retry also failed)
    │
    ▼
Is plan decomposable (2+ concerns)?
    YES → DECOMPOSE into sub-plans
    NO
    │
    ▼
Is plan on critical path (other plans depend on it)?
    YES → ESCALATE (cannot skip dependency)
    NO
    │
    ▼
PRUNE (defer to DEFERRED-ITEMS.md)
```

## Repair AUDIT schema

Every repair action writes an AUDIT entry:

```json
{
  "id": "uuid",
  "timestamp": "ISO-8601",
  "event": "node_repair",
  "session_id": "auto-sess-uuid",
  "phase": 3,
  "plan": "05",
  "repair_type": "RETRY|DECOMPOSE|PRUNE|ESCALATE",
  "attempt_number": 2,
  "original_error": "[first 200 chars of error output]",
  "repair_outcome": "recovered|failed|deferred|escalated",
  "decomposed_into": ["05a", "05b"],
  "agent": "mindforge-auto-repair"
}
```
