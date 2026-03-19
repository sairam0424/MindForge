# MindForge Engine — Wave Executor

## Purpose
Group tasks from the dependency graph into waves and execute each wave.
Within a wave, all tasks are independent and can run in parallel.
Between waves, execution is strictly sequential.

## Wave grouping algorithm

### Input
The dependency graph from `dependency-parser.md`.

### Algorithm — Kahn's topological sort (adapted for waves)

```
Initialize:
  remaining = all plan IDs
  completed = empty set
  waves = []

Repeat until remaining is empty:
  current_wave = []
  for each plan in remaining:
    if ALL of plan's dependencies are in completed:
      add plan to current_wave
  
  if current_wave is empty AND remaining is not empty:
    ERROR: circular dependency detected (should have been caught by parser)
  
  waves.append(current_wave)
  completed.add(all plans in current_wave)
  remaining.remove(all plans in current_wave)

Return waves
```

### Example output for the 5-plan example above:
```
Wave 1: [01, 02]          ← No dependencies — run in parallel
Wave 2: [03, 04]          ← Depend on Wave 1 — run in parallel after Wave 1
Wave 3: [05]              ← Depends on both Wave 2 tasks — runs after Wave 2
```

## Wave execution protocol

### Before starting a wave
1. Confirm all plans in previous wave have:
   - Status: Completed in SUMMARY file
   - Git commit SHA recorded
   - `<verify>` step passed
   
   If any plan in the previous wave failed: STOP the entire phase.
   Do not start the next wave. Report which plan failed and why.

### During a wave — parallel execution
For each plan in the current wave, spawn a subagent with this exact context
package (see `context-injector.md` for the injection protocol):

### Subagent invocation protocol (runtime-agnostic)
Use the runtime-specific mechanism, but keep the inputs identical:
- **Claude Code:** spawn a subagent with the context package and the PLAN file.
  Require the subagent to write `SUMMARY-[N]-[M].md` and report completion.
- **Antigravity:** spawn an agent via `.agent/` command with the same context
  package and the PLAN file. Require the same SUMMARY file output.

**Context package per subagent:**
```
REQUIRED (always inject):
  .mindforge/org/CONVENTIONS.md
  .mindforge/org/SECURITY.md
  The specific PLAN file (PLAN-[N]-[M].md)
  The persona file specified in <persona> field

CONDITIONAL (inject only if referenced in plan):
  .planning/ARCHITECTURE.md      ← if plan touches architecture
  .planning/decisions/ADR-*.md   ← only ADRs referenced in plan's <context>
  Relevant SKILL.md files        ← only skills listed in plan's <context>

NEVER inject to subagents:
  STATE.md        ← subagents do not need project-level state
  ROADMAP.md      ← subagents do not need project-level roadmap
  HANDOFF.json    ← subagents do not maintain session continuity
  Other plans     ← subagents must not see sibling task plans
```

### After each plan in a wave completes
The executing subagent must:
1. Run the `<verify>` step and capture output
2. Write SUMMARY-[N]-[M].md with verify output included
3. Commit with: `git add [files-in-plan] && git commit -m "type(scope): task name"`
4. Write an AUDIT entry (see `audit/AUDIT-SCHEMA.md`)
5. Report completion status back to the orchestrator

### Wave completion
After all plans in a wave complete:
1. Collect all SUMMARY files from this wave
2. Run the project's full test suite
3. If tests fail: identify which plan introduced the failure (use `git bisect`)
4. Do not start the next wave until all tests pass

### Phase completion
After all waves complete:
1. Run the phase verification pipeline (see `verification-pipeline.md`)
2. Write VERIFICATION.md
3. Update STATE.md: phase N = complete
4. Update HANDOFF.json with next phase information

## Wave execution report format

Write to `.planning/phases/[N]/WAVE-REPORT-[N].md`:

```markdown
# Wave Execution Report — Phase [N]

## Wave 1
| Plan | Task Name           | Status | Duration | Commit     |
|------|---------------------|--------|----------|------------|
| 01   | Create user model   | ✅     | ~8 min   | abc1234    |
| 02   | Create product model| ✅     | ~6 min   | def5678    |

**Wave 1 test results:** All passing ✅

## Wave 2
| Plan | Task Name             | Status | Duration | Commit     |
|------|-----------------------|--------|----------|------------|
| 03   | User API endpoints    | ✅     | ~12 min  | ghi9012    |
| 04   | Product API endpoints | ✅     | ~10 min  | jkl3456    |

**Wave 2 test results:** All passing ✅

## Wave 3
| Plan | Task Name     | Status | Duration | Commit     |
|------|---------------|--------|----------|------------|
| 05   | Checkout UI   | ✅     | ~15 min  | mno7890    |

**Wave 3 test results:** All passing ✅

## Phase summary
- Total tasks: 5
- Total commits: 5
- Elapsed: ~51 min
- Test results: All passing
- Status: Phase [N] complete ✅
```
