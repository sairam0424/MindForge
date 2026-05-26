# MindForge v2 — Steering Manager

## Purpose
Allow a human to "steer" the autonomous agent without stopping it.
Steering guidance is injected at the next task boundary, allowing for
mid-course corrections, scope changes, or specific technical preferences.

---

## Steering protocol

### 1. Queuing guidance
Human uses `/mindforge:steer "[instruction]"` or writes to `.planning/steering-queue.jsonl`.
Instructions are timestamped and queued.

```json
{ "id": "steer-uuid", "timestamp": "ISO-8601", "instruction": "Use PostgreSQL instead of SQLite", "scope": "global|current_phase|current_task" }
```

### 2. Injection point
The Auto-Executor checks for queued steering guidance MUST happen at
every task boundary (before starting a new subagent).

```javascript
// auto-executor injection logic
const guidance = await steeringManager.popPending();
if (guidance) {
  const currentPlan = await loadCurrentPlan();
  const modifiedPlan = applyGuidanceToPlan(currentPlan, guidance);
  await savePlan(modifiedPlan);
  writeAudit('steering_applied', guidance);
}
```

### 3. Application logic — HARDENED
When guidance is applied to a task:

- **Constraint:** Steering cannot override core security constraints (Gears 1-5).
- **Injection:** Guidance is added to the `<action>` field of the PLAN-N-MM.md,
  prefixed with `[STEERING GUIDANCE — DO NOT IGNORE]`.
- **Precedence:** Steering instruction takes precedence over the original
  plan description if they conflict.

---

## Steering commands

### `/mindforge:steer "..."`
Adds global guidance to the queue. Available even if auto mode is not running.

### `/mindforge:steer --task 3-05 "..."`
Targeted guidance for a specific future task.

### `/mindforge:steer --cancel`
Clear the entire steering queue.

---

## Steering feedback loop

When steering is applied, the Progress Reporter (terminal UI) shows:
`🚢 Steering applied: "Use PostgreSQL instead of SQLite"`

The applied guidance is also recorded in `AUTONOMOUS-REPORT.md`.
