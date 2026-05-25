---
name: autonomous-loops
version: 1.0.0
min_mindforge_version: 10.0.3
status: stable
triggers: autonomous mode, headless, unattended, pipeline pattern, DAG execution, RFC-driven, infinite loop, agentic loop, auto mode, background execution
compose:
  - agent-loops
---

# Skill — Autonomous Loops

## When this skill activates
When designing or executing autonomous agent workflows that run without
human intervention across multiple tasks. Covers pattern selection, safety
rails, and state management for headless operation.

## Mandatory actions when this skill is active

### Before starting autonomous execution
1. Define the **exit conditions** — when does the loop STOP?
2. Define the **escalation path** — what triggers a human interrupt?
3. Checkpoint the current state — autonomous mode must be resumable
4. Verify SHARED_TASK_NOTES.md exists and is readable

### Loop Pattern Selection

**Pattern 1 — Sequential Pipeline**
```
Plan → Task 1 → Verify → Task 2 → Verify → ... → Ship
```
- Use when: tasks have strict ordering, output of one feeds next
- Safety: verify after EACH task, halt pipeline on failure
- State: HANDOFF.json tracks position in pipeline

**Pattern 2 — Parallel Wave Execution**
```
Wave 1: [Task A, Task B, Task C] → all verify → Wave 2: [Task D, Task E] → ...
```
- Use when: multiple independent tasks can run simultaneously
- Safety: all tasks in a wave must pass before next wave starts
- State: wave-executor.md manages group completion

**Pattern 3 — RFC-Driven DAG**
```
Spec → Decompose into dependency graph → Execute respecting dependencies
         ↓
   [A] → [B, C] → [D depends on B+C] → [E depends on D]
```
- Use when: complex feature with interdependent work units
- Safety: each node independently verifiable, DAG prevents circular deps
- State: DAG stored in HANDOFF.json with per-node status

**Pattern 4 — Infinite Agentic Loop (with stuck detection)**
```
while (work_exists):
    pick_next_task()
    execute()
    verify()
    if stuck_for(3_iterations): escalate()
```
- Use when: continuous improvement, ongoing maintenance
- Safety: stuck-detector.md monitors for non-progress
- CRITICAL: must have hard time limit OR task count limit

### Safety Rails (ALL patterns)

1. **Hard limits** — Set before starting, never removed during execution:
   - Max iterations: configurable (default 20 tasks)
   - Max duration: configurable (default 2 hours)
   - Max cost: from config.json `[COST_HARD_LIMIT_USD]`

2. **Stuck detection** — If 3 consecutive iterations produce no meaningful progress:
   - Write diagnostic to SHARED_TASK_NOTES.md
   - Attempt self-repair (different approach) ONCE
   - If self-repair fails: HALT and escalate to user

3. **Checkpoint protocol**:
   - Write state to HANDOFF.json after EVERY task completion
   - Write reasoning to SHARED_TASK_NOTES.md for cross-iteration context
   - On interruption: state is always resumable from last checkpoint

4. **Escalation triggers** (always halt for human):
   - Security-sensitive changes detected (auth/payment/PII)
   - Merge conflict requiring judgment
   - Test failures that resist 2 fix attempts
   - Any change scoring difficulty > 8

### During autonomous execution
- Fresh context per task (no context accumulation)
- Load HANDOFF.json + SHARED_TASK_NOTES.md at each task start
- Run verification-loop (minimum Phase 4+5+6) after each task
- Log every task completion/failure in AUDIT

### After autonomous execution completes
- Produce execution summary (tasks completed, failed, time, cost)
- Archive SHARED_TASK_NOTES.md to `.planning/history/`
- Run full verification-loop (all 6 phases) on combined changes
- Report results to user for review before any merge/push

## Self-check before task completion
- [ ] Did I define exit conditions BEFORE starting the loop?
- [ ] Did I verify stuck detection fires after 3 iterations of no progress?
- [ ] Did I confirm SHARED_TASK_NOTES.md is being written after each task?
- [ ] Did I run verification-loop on the combined changes before reporting complete?
