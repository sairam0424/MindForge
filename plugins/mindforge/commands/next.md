---
description: "Auto-detect the current project state and execute the appropriate next step."
---

# MindForge — Next Command
# Usage: /mindforge:next

Auto-detect the current project state and execute the appropriate next step.
The user does not need to know the workflow. MindForge figures it out.

## HANDOFF.json priority rule
Check HANDOFF.json BEFORE running the decision tree.

If HANDOFF.json exists AND `updated_at` is within 48 hours AND `next_task` is not null:
present the HANDOFF state first. Only run the decision tree if the user declines
or the HANDOFF.json is stale.

## State detection logic

Read STATE.md and HANDOFF.json. Then follow this decision tree:

### Decision tree

```
Does .planning/PROJECT.md exist AND have content?
  NO  → Run /mindforge:init-project
  YES → Continue

Does .planning/ROADMAP.md exist AND have phases defined?
  NO  → Tell user: "Project is initialised but no phases are defined yet.
         Describe what Phase 1 should accomplish and I'll plan it."
         Then run /mindforge:plan-phase 1
  YES → Continue

Read the phase status from STATE.md.

Does the current phase have plans? (check .planning/phases/[N]/PLAN-[N]-*.md)
  NO  → Run /mindforge:plan-phase [N]
  YES → Continue

Do SUMMARY files exist for all plans in the current phase?
  NO  → Run /mindforge:execute-phase [N]
  YES → Continue

Does VERIFICATION.md exist for the current phase?
  NO  → Run /mindforge:verify-phase [N] (automated part)
  YES → Continue

Does UAT.md exist and show all tests passing?
  NO  → Run /mindforge:verify-phase [N] (UAT part)
  YES → Continue

Is this phase marked as shipped in STATE.md?
  NO  → Run /mindforge:ship [N]
  YES → Continue

Are there more phases in ROADMAP.md?
  YES → Increment phase number. Run /mindforge:plan-phase [N+1]
  NO  → Tell user: "All phases complete! Run /mindforge:ship [N] for the final release."
```

## Partial phase execution handling
In the decision tree step "Do SUMMARY files exist for all plans?":

Do not treat this as binary. Check individually:

```
PLAN-[N]-01.md exists?          SUMMARY-[N]-01.md exists?
PLAN-[N]-02.md exists?          SUMMARY-[N]-02.md exists?
PLAN-[N]-03.md exists?          SUMMARY-[N]-03.md exists?
```

If some SUMMARY files exist and some don't: this is a partially-executed phase.
Report: "Phase [N] is partially executed: plans [X, Y] are done, [Z] is not."
Ask: "Resume execution from Plan [Z]? (yes/no)"
Do not restart the entire phase — resume from the first missing SUMMARY.

## Before auto-executing: always confirm
Before running any command automatically, tell the user:

```
MindForge next step detected:
  Current state : [description of current state]
  Next action   : [what will be run]
  Command       : /mindforge:[command] [args]

Run this now? (yes/no/different)
```

If user says "different": ask what they want to do instead.
If user says "yes": proceed with the detected command.

## Handling HANDOFF.json (session restart)
If HANDOFF.json has a `next_task` field from a previous session:
Present it prominently:

```
Previous session found:
  Saved at  : [updated_at from HANDOFF.json]
  Left off  : [last_completed_task]
  Next task : [next_task]

Options:
  1. Continue from where we left off
  2. Check current state and determine next step fresh
  3. Tell me what you want to do

Choose 1, 2, or 3:
```
