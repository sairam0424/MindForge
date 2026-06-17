---
description: "1. Read STATE.md — confirm phase [N] is in \"planned\" status."
---

# MindForge — Execute Phase Command
# Usage: /mindforge:execute-phase [N]

## Pre-checks (all must pass before execution starts)

1. Read STATE.md — confirm phase [N] is in "planned" status.
   If STATE.md shows phase [N] as already "complete": ask user to confirm re-execution.

2. Verify plan files exist:
   ```
   .planning/phases/[N]/PLAN-[N]-01.md   (minimum one plan required)
   ```
   If missing: stop. Tell user: "No plans found for Phase [N]. Run /mindforge:plan-phase [N] first."

3. Verify REQUIREMENTS.md exists and has content.
   If empty: warn user but allow continuation.

4. Run the dependency parser (`.mindforge/engine/dependency-parser.md`).
   If validation fails (circular deps, missing deps): stop and report. Do not execute.

## Step 1 — Build and display the execution plan

After dependency parsing succeeds, display the wave plan to the user:

```
Phase [N] Execution Plan
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  Wave 1 (parallel)     Wave 2 (parallel)     Wave 3
  ┌─────────────┐       ┌─────────────┐       ┌─────────────┐
  │ Plan 01     │       │ Plan 03     │       │ Plan 05     │
  │ User model  │──┐    │ User API    │──┐    │ Checkout UI │
  └─────────────┘  │    └─────────────┘  │    └─────────────┘
  ┌─────────────┐  │    ┌─────────────┐  │
  │ Plan 02     │──┘    │ Plan 04     │──┘
  │ Product     │       │ Product API │
  └─────────────┘       └─────────────┘

  Total tasks: 5    Waves: 3    Est. time: depends on model speed

Proceed? (yes/no)
```

If the user says no: stop. Do not execute anything.

## Step 2 — Write pre-execution audit entry

Append to `.planning/AUDIT.jsonl`:
```json
{
  "id": "[uuid-v4]",
  "timestamp": "[ISO-8601]",
  "event": "phase_execution_started",
  "phase": [N],
  "wave_count": [total waves],
  "task_count": [total tasks],
  "agent": "mindforge-orchestrator",
  "session_id": "[session identifier]"
}
```

## Step 3 — Execute waves using the wave executor

Follow the complete protocol in `.mindforge/engine/wave-executor.md`.

For each wave:

### Wave start
Write to console:
```
━━━ Wave [W] of [total] ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Starting [X] tasks in parallel...
```

### Per-task execution (inject context per `context-injector.md`)
For each plan in the wave:
1. Load context package (per `context-injector.md`)
2. Execute the plan instructions
   - Run the **5-Level Escalating Validation Ladder** (see below) as the `<verify>` body.
     Capture exact output at each level.
   - If all levels PASS:
     - Run `<verify-visual>` via `visual-verify-executor.js`
     - If visual verify FAILS: stop and report (treat as verify failure)
     - Write SUMMARY-[N]-[M].md (include the Deviation Report block, see below)
   - Execute commit: `git add [files] && git commit -m "[type]([scope]): [task name]"`
   - Capture git SHA
   - Write AUDIT entry for task completion

#### 5-Level Escalating Validation Ladder (per task)

> Adapted from the PRP-implement validation loops (PRPs-agentic-eng by Wirasm).
> Run levels **in order**. **Fix immediately** — never proceed past a failing
> level, never accumulate broken state. Each higher level is more expensive and
> more end-to-end than the last.

- **Level 1 — Static**: formatter + linter + type-check (`[project lint command]`,
  `[project lint-fix command]`, `[project type-check command]`).
  EXPECT: zero lint errors, zero type errors. Auto-fix first, then fix manually.
- **Level 2 — Unit**: run unit tests for the affected area (`[project test command]`).
  EXPECT: all green; every new function has at least one test; plan edge cases covered.
  If a test fails, fix the implementation (not the test, unless the test is wrong).
- **Level 3 — Build**: `[project build command]`. EXPECT: build succeeds, zero errors.
- **Level 4 — Integration**: start the service, hit it end-to-end, stop it
  (`[project dev/integration command]`). EXPECT: integration assertions pass.
  Skip with an explicit "N/A — no integration surface" note if not applicable.
- **Level 5 — Edge / Manual**: walk the edge-case checklist from the plan's Testing
  Strategy (empty input, max size, invalid types, concurrency, failure paths) plus
  any manual checks the plan flags. EXPECT: all edge cases handled.

**Fix-immediately rule**: A failing level halts the task. Diagnose, fix, re-run
that level from the top, and only then climb to the next. Do NOT move to the next
task with any level red.

#### Deviation Report (record in each task's SUMMARY-[N]-[M].md)

If implementation deviated from the plan, append a Deviation Report — never deviate
silently:

```markdown
## Deviation Report
| What changed | Why | Plan step affected | Re-validated? |
|---|---|---|---|
| [what differed from the plan] | [reason / root cause] | [task/step id] | [levels re-run] |
```

If there were no deviations, write `## Deviation Report\nNone — implemented exactly as planned.`

5. If any validation level FAILS (and cannot be fixed in place per the fix-immediately rule):
   - Write SUMMARY-[N]-[M].md with failure details (which level, exact output, Deviation Report)
   - Write AUDIT entry for task failure
   - STOP this wave immediately
   - Report: "Task [plan ID] failed at Level [1-5]: [verify output]. Stopping Phase [N]."
   - Do not start next wave
   - Ask user: "Spawn debug agent to diagnose? (yes/no)"

### Wave completion (before starting next wave)
After all tasks in wave complete:
1. Run: `[project test command]`
2. If tests fail:
   - Identify failing tests
   - Run `git log --oneline -[wave-task-count]` to see wave commits
   - Report which commit likely introduced the failure
   - Stop. Ask user how to proceed.
3. If tests pass:
   - Report: "Wave [W] complete. All [X] tasks passed. Tests passing. ✅"
   - Run `/mindforge:record-learning` if any architectural "Aha!" moments or significant anti-patterns were discovered during this wave.
   - Write WAVE-REPORT update

## Step 4 — Phase-level verification

After all waves complete, run the verification pipeline:

1. Read every v1 requirement from REQUIREMENTS.md for this phase
2. For each requirement, verify it is implemented:
   - Search the codebase for the implementation
   - Check if a test covers it
   - Mark: ✅ implemented + tested | ⚠️ implemented, no test | ❌ not found
3. Write `.planning/phases/[N]/VERIFICATION.md`
4. Run the full test suite one final time
5. If any requirement is ❌: create a fix plan and report to user

## Step 5 — Update state and write wave report

Write `.planning/phases/[N]/WAVE-REPORT-[N].md` (per template in wave-executor.md)

Update STATE.md:
```markdown
## Current phase
[N] — Execution complete ✅

## Last completed task
Phase [N]: All [X] tasks completed across [W] waves.

## Next action
Run /mindforge:verify-phase [N] for human acceptance testing.
```

Update HANDOFF.json with completed phase info.

## Step 5.1 — Final Intelligence Sync
1. Read `AGENTS_LEARNING.md` one last time.
2. Run `/mindforge:record-learning` to capture the final phase-level learnings (Mistakes discovered during UAT, architectural refinements).
3. Commit `AGENTS_LEARNING.md` if updated.

Write final AUDIT entry:
```json
{
  "id": "[uuid-v4]",
  "timestamp": "[ISO-8601]",
  "event": "phase_execution_completed",
  "phase": [N],
  "tasks_completed": [X],
  "waves_executed": [W],
  "commits": ["sha1", "sha2", "..."],
  "test_result": "passing",
  "agent": "mindforge-orchestrator"
}
```

## Step 6 — Report to user

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ Phase [N] execution complete

  Tasks completed : [X] / [X]
  Waves executed  : [W]
  Commits made    : [X]
  Tests           : All passing
  Requirements    : [X] / [X] implemented

Next step: Run /mindforge:verify-phase [N] for UAT sign-off.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## Step 7 — Auto-capture check (when AUTO_CAPTURE_SKILLS=true)

After all gates pass and the phase is verified:

```bash
# Check if auto-capture is enabled
CAPTURE=$(grep -m1 "^AUTO_CAPTURE_SKILLS=" MINDFORGE.md 2>/dev/null | cut -d= -f2 | tr -d ' ')
if [ "$CAPTURE" = "true" ]; then
  node -e "
    const { detectPatterns, formatForPresentation } = require('./bin/skills-builder/pattern-detector');
    detectPatterns(${PHASE_NUM}).then(result => {
      const display = formatForPresentation(result);
      console.log(display);
    }).catch(err => console.error('[auto-capture] Error:', err.message));
  "
fi
```

If patterns are found: display the prompt and await user input.
If user selects yes: run `/mindforge:learn --session` targeting this phase's SUMMARY files.
If user selects no: write AUDIT entry `auto_capture_skipped` and continue.
If no patterns found: exit silently (no noise in the output).
```
