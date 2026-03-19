Execute all task plans for a phase. Usage: /mindforge:execute-phase [N]

## Pre-check
Verify these files exist before starting:
- `.planning/phases/[N]/PLAN-[N]-01.md` (at minimum one plan)
- `.planning/STATE.md`
- `.planning/PROJECT.md`

If plans are missing: stop and instruct the user to run /mindforge:plan-phase [N] first.

## Step 1 — Build execution order
Read all PLAN files for phase N.
Parse the `<dependencies>` field of each plan.
Group plans into waves:
- Wave 1: plans with no dependencies
- Wave 2: plans whose dependencies are all in Wave 1
- Wave N: plans whose dependencies are all in earlier waves

## Step 2 — Execute wave by wave

For each wave (in order):
  For each plan in the wave:

    1. Load the plan's `<persona>` file from `.mindforge/personas/`
    2. Load any skills listed in the plan's `<context>` from `.mindforge/skills/`
    3. Read every file listed in `<files>` before touching anything
    4. Execute the `<action>` precisely as written
    5. Run the `<verify>` step — if it fails, stop and do not proceed
    6. Commit: `git add [files] && git commit -m "feat([scope]): [task name]"`
    7. Write `.planning/phases/[N]/SUMMARY-[N]-[NN].md`:

```markdown
# Summary — Phase [N], Plan [NN]: [Task Name]

## Status
Completed ✅

## What was done
[Description of what was implemented]

## Files changed
- `path/to/file.ts` — [what changed and why]

## Verify result
[Output of the verify command]

## Decisions made
[Any implementation decisions not in the plan, with rationale]

## Commit
[git SHA]

## Completed at
[ISO 8601 timestamp]
```

    8. After each plan in a wave completes, check: does the next plan
       in this wave depend on the output of this one? If yes: sequential.
       If no: can run in parallel (spawn separate subagent context).

## Step 3 — Post-phase verification
After all waves complete:
1. Read every REQUIREMENTS.md item tagged v1 for this phase
2. Confirm each is implemented (check the code, not just the plan)
3. Run the project's full test suite
4. Write `.planning/phases/[N]/VERIFICATION.md`:

```markdown
# Phase [N] Verification

## Requirements check
| FR ID | Requirement        | Implemented | Evidence          |
|-------|--------------------|-------------|-------------------|
| FR-01 | ...                | ✅ / ❌     | file:line or test |

## Test results
[Output of test run]

## Status
All requirements met ✅ / Issues found ❌ (see below)

## Issues
[Any failed requirements with notes]
```

## Step 4 — Update state
Update STATE.md: current phase = N, status = "Phase N complete, verification passed".
Update HANDOFF.json with completed phase and next phase number.

Tell the user:
"✅ Phase [N] execution complete.

  Tasks completed: [X]
  Commits made: [X]
  Test results: [pass/fail summary]

Run /mindforge:verify-phase [N] for human acceptance testing."
