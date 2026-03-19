# MindForge — Day 2 Implementation Prompt
# Branch: `feat/mindforge-wave-engine`
# Prerequisite: `feat/mindforge-core-scaffold` merged to `main`

---

## BRANCH SETUP (run before anything else)

```bash
git checkout main
git pull origin main
git checkout -b feat/mindforge-wave-engine
```

Verify Day 1 is present before starting:

```bash
ls .claude/CLAUDE.md                           # must exist
ls .mindforge/personas/developer.md            # must exist
ls .claude/commands/mindforge/execute-phase.md # must exist
node tests/install.test.js                     # must pass
```

If any of these fail — stop. Merge Day 1 first.

---

## DAY 2 SCOPE

Day 2 builds the **execution intelligence layer** of MindForge.
Day 1 created the structure. Day 2 makes it actually run.

| Component | Description |
|---|---|
| Wave Execution Engine | Dependency graph parser + wave grouping algorithm |
| Parallel Orchestration | Subagent spawning with isolated context injection |
| Context Compaction Engine | Automated 70% threshold detection and state preservation |
| AUDIT.jsonl Pipeline | Append-only tamper-evident audit log for every agent action |
| `/mindforge:next` command | Auto-detects project state and routes to the correct next step |
| `/mindforge:quick` command | Ad-hoc task execution without full lifecycle overhead |
| `/mindforge:status` command | Rich project dashboard — phases, tasks, health, blockers |
| `/mindforge:debug` command | Debug Specialist workflow with systematic RCA protocol |
| Phase verification pipeline | Automated requirement tracing from REQUIREMENTS.md to code |
| Session handoff automation | HANDOFF.json written automatically at compaction threshold |

**Do not** implement on Day 2:
- Jira / Confluence / Slack integrations (Day 4)
- GUI dashboard or web interface (Day 5+)
- Multi-repo support (Day 6+)
- Team collaboration features (Day 4+)

---

## TASK 1 — Scaffold Day 2 additions to directory structure

Add these new directories and files to the existing scaffold:

```bash
# Wave execution engine
mkdir -p .mindforge/engine
touch .mindforge/engine/wave-executor.md
touch .mindforge/engine/dependency-parser.md
touch .mindforge/engine/context-injector.md
touch .mindforge/engine/compaction-protocol.md

# Audit system
mkdir -p .mindforge/audit
touch .mindforge/audit/AUDIT-SCHEMA.md
touch .planning/AUDIT.jsonl

# New commands
touch .claude/commands/mindforge/next.md
touch .claude/commands/mindforge/quick.md
touch .claude/commands/mindforge/status.md
touch .claude/commands/mindforge/debug.md

# Mirror to Antigravity
cp .claude/commands/mindforge/next.md   .agent/mindforge/next.md
cp .claude/commands/mindforge/quick.md  .agent/mindforge/quick.md
cp .claude/commands/mindforge/status.md .agent/mindforge/status.md
cp .claude/commands/mindforge/debug.md  .agent/mindforge/debug.md

# Phase verification
touch .mindforge/engine/verification-pipeline.md

# Test expansions
touch tests/wave-engine.test.js
touch tests/audit.test.js
touch tests/compaction.test.js
```

**Commit:**
```bash
git add .
git commit -m "chore(day2): scaffold Day 2 directory additions"
```

---

## TASK 2 — Write the Wave Execution Engine

The wave execution engine is the most architecturally significant component in
MindForge. It transforms a flat list of PLAN files into a dependency-aware
execution graph, groups independent tasks into parallel waves, and coordinates
subagent spawning.

Write this as an engine specification document AND update the
`execute-phase.md` command to use it.

---

### `.mindforge/engine/dependency-parser.md`

```markdown
# MindForge Engine — Dependency Parser

## Purpose
Parse all PLAN files for a given phase and build a directed acyclic graph (DAG)
of task dependencies. This graph is the input to the wave grouping algorithm.

## Input
All files matching: `.planning/phases/[N]/PLAN-[N]-*.md`

## Parsing protocol

### Step 1 — Read all plan files
For each PLAN file in the phase directory:
1. Read the full file content
2. Extract the `<task>` XML block
3. Parse these fields:
   - `<n>` → task name (string)
   - `<plan>` → plan ID (e.g., "01", "02")
   - `<dependencies>` → comma-separated list of plan IDs, or "none"
   - `<files>` → newline-separated list of file paths

### Step 2 — Build the dependency graph
Represent the graph as an adjacency list:

```
Graph = {
  "01": { name: "...", dependsOn: [],         blockedBy: [] },
  "02": { name: "...", dependsOn: [],         blockedBy: [] },
  "03": { name: "...", dependsOn: ["01"],     blockedBy: [] },
  "04": { name: "...", dependsOn: ["01","02"],blockedBy: [] },
  "05": { name: "...", dependsOn: ["03","04"],blockedBy: [] },
}
```

### Step 3 — Validate the graph
Before proceeding, validate:

**Circular dependency check:**
Perform a depth-first traversal. If any node is visited twice in the same
traversal path, a cycle exists. Stop and report:
"Circular dependency detected: [plan A] → [plan B] → [plan A]"
A cycle makes execution impossible. The user must fix the PLAN files.

**Missing dependency check:**
For every plan ID in any `<dependencies>` list, verify that a corresponding
PLAN file exists. If not:
"Plan [N]-[M] declares dependency on [X] but PLAN-[N]-[X].md does not exist."

**File conflict check:**
If two plans in the same potential wave touch the same file, they CANNOT
run in parallel — they must be in different waves. Flag any such conflicts:
"Plans [A] and [B] both modify [file]. Placing [B] in a later wave."
Automatically adjust wave assignment to resolve file conflicts.

### Step 4 — Output the dependency report
Write to `.planning/phases/[N]/DEPENDENCY-GRAPH-[N].md`:

```markdown
# Dependency Graph — Phase [N]

## Tasks
| Plan | Name                  | Depends On    | File Conflicts |
|------|-----------------------|---------------|----------------|
| 01   | Create user model     | none          | none           |
| 02   | Create product model  | none          | none           |
| 03   | User API endpoints    | 01            | none           |
| 04   | Product API endpoints | 02            | none           |
| 05   | Checkout UI           | 03, 04        | none           |

## Validation
- Circular dependencies: None ✅
- Missing dependencies: None ✅
- File conflicts resolved: [list any that were adjusted]

## Execution order
Wave 1 → Wave 2 → Wave 3
(see wave-executor.md for wave grouping)
```
```

---

### `.mindforge/engine/wave-executor.md`

```markdown
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
```

---

### `.mindforge/engine/context-injector.md`

```markdown
# MindForge Engine — Context Injector

## Purpose
Define exactly what context each subagent receives when spawned during
wave execution. The context injector enforces the principle of minimum
necessary context — giving subagents only what they need, nothing more.

## Why minimum context matters
Each subagent has 200K tokens. Wasting tokens on irrelevant files means less
capacity for actual reasoning about the task. A subagent that receives only
its PLAN, its persona, and relevant conventions will produce better output than
one buried under the entire project's context.

## Context injection template

When spawning a subagent for PLAN-[N]-[M].md, construct this system message:

```
You are a MindForge agent executing a specific task. Read these instructions completely.

## Your identity
[Full contents of the persona file specified in <persona> field]

## Your conventions
[Full contents of CONVENTIONS.md]

## Your security requirements  
[Full contents of SECURITY.md]

## Your task
[Full contents of PLAN-[N]-[M].md]

## Architecture context
[Contents of ARCHITECTURE.md sections relevant to the files in <files> field]
[Only include sections, not the entire file]

## Relevant decisions
[Contents of any ADR files referenced in the plan's <context> field]
[Only the referenced ones]

## Active skills
[Contents of any SKILL.md files listed in the plan's <context> field]
[Only the listed ones]

## Execution rules (mandatory)
1. Implement ONLY what is specified in your <task> block. Nothing more.
2. Touch ONLY the files listed in <files>. Nothing else.
3. Run the <verify> step. Report its exact output.
4. If the verify step fails: describe what failed and why. Do not mark done.
5. Write your SUMMARY after completion (template below).
6. Commit with: type(scope): [task name from <n>]

## SUMMARY template
File: .planning/phases/[N]/SUMMARY-[N]-[M].md
[Use the standard SUMMARY template from execute-phase.md]

## Important constraints
- You are one task in a larger wave. Other tasks are running in parallel.
- You do not know what the other tasks are doing. That is intentional.
- Do not read files outside your <files> list. You may read them to
  understand existing code context, but your writes are scoped to <files>.
- If you encounter something unexpected that requires scope expansion:
  stop, describe what you found, and wait for orchestrator input.
```

## Context size budget

Before injecting, estimate the total context size:
- Persona file: ~1-3K tokens
- CONVENTIONS.md: ~2-5K tokens  
- SECURITY.md: ~2-4K tokens
- PLAN file: ~500-2K tokens
- ARCHITECTURE sections: ~2-10K tokens
- ADR files: ~1-3K tokens each
- SKILL files: ~2-5K tokens each

Target: under 30K tokens for context injection.
This leaves 170K tokens for actual implementation work.

If the context package would exceed 30K tokens:
1. Summarise ARCHITECTURE.md to only the directly relevant sections
2. Reference ADRs by title rather than full content if not critical
3. Never compress the PLAN file or security/conventions files

## Subagent completion protocol

After the subagent completes, the orchestrator must receive:
1. Status: completed ✅ / failed ❌ / blocked 🚫
2. The verify step output (exact text)
3. The git commit SHA
4. The path to SUMMARY-[N]-[M].md
5. Any decisions made that deviated from the plan (for escalation)

If status is failed or blocked: the orchestrator stops the wave and
reports to the user before taking any further action.
```

---

Now update `.claude/commands/mindforge/execute-phase.md` to incorporate the
wave engine. Replace the entire file with:

```markdown
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
3. Run `<verify>` — capture exact output
4. If verify PASSES:
   - Write SUMMARY-[N]-[M].md
   - Execute commit: `git add [files] && git commit -m "[type]([scope]): [task name]"`
   - Capture git SHA
   - Write AUDIT entry for task completion
5. If verify FAILS:
   - Write SUMMARY-[N]-[M].md with failure details
   - Write AUDIT entry for task failure
   - STOP this wave immediately
   - Report: "Task [plan ID] failed: [verify output]. Stopping Phase [N]."
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
```
```

**Commit:**
```bash
git add .mindforge/engine/ .claude/commands/mindforge/execute-phase.md .agent/mindforge/execute-phase.md
git commit -m "feat(engine): implement wave executor, dependency parser, context injector"
```

---

## TASK 3 — Write the Context Compaction Engine

Context compaction is what allows MindForge to survive long, complex sessions
without degrading. It is an automated protocol, not a manual intervention.

### `.mindforge/engine/compaction-protocol.md`

```markdown
# MindForge Engine — Context Compaction Protocol

## Purpose
Preserve agent session state when the context window approaches its limit,
enabling seamless continuation in a fresh context with full awareness of
prior work.

## Trigger conditions
Initiate compaction when ANY of the following are true:
- Context window usage reaches 70% of capacity
- User explicitly requests: "compact context" or "save state and continue"
- A task that would significantly expand context is about to begin
- The agent detects it cannot recall details from early in the session

DO NOT wait for 90%+ context before compacting. By then, the agent may have
already lost critical early context. 70% is the safe threshold.

## Compaction procedure — execute in strict order

### Step 1 — Capture current task state
Before writing anything, record exactly where work currently stands:
- Which PLAN file is active
- Which step within the plan is in progress
- Which files have been modified since the last commit
- Any uncommitted changes and their intent
- Any decisions made that haven't been documented yet

### Step 2 — Commit any uncommitted work-in-progress
If there are uncommitted changes:
```bash
git add -A
git commit -m "wip(phase-[N]-plan-[M]): compaction checkpoint — [brief description]"
```
This ensures no work is lost. WIP commits are acceptable at compaction points.

### Step 3 — Update STATE.md
Append to the current STATE.md (do not overwrite — append):

```markdown
---
## Compaction checkpoint — [ISO-8601 timestamp]

### Session summary
[2-4 sentences summarising what was accomplished in this session]

### Decisions made this session
- [Decision 1]: [rationale]
- [Decision 2]: [rationale]

### Current position
- Phase: [N]
- Plan: [M]
- Step within plan: [description of where execution stopped]

### Files modified this session
- [file 1]: [what changed]
- [file 2]: [what changed]

### What the next session must know
[Any critical context that doesn't live in a file — implicit knowledge,
workarounds discovered, gotchas found, things that seemed like they would
work but did not]
```

### Step 4 — Write HANDOFF.json
Overwrite `.planning/HANDOFF.json` with complete current state:

```json
{
  "schema_version": "1.0.0",
  "project": "[project name from PROJECT.md]",
  "phase": [N],
  "plan": [M],
  "plan_step": "[exact step description — be precise enough to restart from here]",
  "last_completed_task": {
    "description": "[task description]",
    "commit_sha": "[git sha or 'wip-checkpoint']",
    "verified": true/false
  },
  "next_task": "[exact instruction for the next session to execute]",
  "in_progress": {
    "file": "[file being modified]",
    "intent": "[what the modification is trying to achieve]",
    "completed_steps": ["step 1", "step 2"],
    "remaining_steps": ["step 3", "step 4"]
  },
  "blockers": [],
  "decisions_needed": [],
  "context_refs": [
    ".planning/PROJECT.md",
    ".planning/STATE.md",
    ".planning/REQUIREMENTS.md",
    ".planning/ARCHITECTURE.md",
    ".planning/phases/[N]/PLAN-[N]-[M].md",
    "[any other files critical for the next session]"
  ],
  "recent_commits": [
    "[sha1]: [message]",
    "[sha2]: [message]"
  ],
  "recent_files": [
    "[most recently touched file 1]",
    "[most recently touched file 2]",
    "[most recently touched file 3]",
    "[most recently touched file 4]",
    "[most recently touched file 5]"
  ],
  "agent_notes": "[anything the agent knows that isn't captured elsewhere]",
  "_warning": "Never store secrets, tokens, or passwords in this file. It is tracked in git.",
  "updated_at": "[ISO-8601 timestamp]"
}
```

### Step 5 — Write compaction AUDIT entry
```json
{
  "id": "[uuid-v4]",
  "timestamp": "[ISO-8601]",
  "event": "context_compaction",
  "phase": [N],
  "plan": [M],
  "context_usage_pct": [70-85],
  "session_summary": "[1 sentence]",
  "handoff_written": true,
  "agent": "mindforge-orchestrator"
}
```

### Step 6 — Compact and continue
After all state is written:
1. Inform the user: "Context compacted and state saved. Continuing with fresh context."
2. Discard the accumulated tool call history from working context
3. Reload only: ORG.md + PROJECT.md + STATE.md + HANDOFF.json + current PLAN file
4. Continue from the exact step documented in `plan_step` field of HANDOFF.json

## Session restart from HANDOFF.json

When a new session begins and HANDOFF.json exists:

1. Read HANDOFF.json completely
2. Read every file in `context_refs` list
3. Run `git log --oneline -10` to verify recent history matches `recent_commits`
4. Report to user: "Resuming from: [next_task field]"
5. Ask: "Shall I continue from where we left off? (yes/no)"
6. If yes: begin from the `plan_step` position
7. If no: ask what the user wants to do instead

## What NOT to compact
Never compact:
- Uncommitted work (commit it first as WIP)
- The contents of PLAN files (they are files — they survive context resets)
- The SUMMARY files (already written to disk)
- Any information that is already in a file on disk

Compaction is about capturing IMPLICIT knowledge — the things in the agent's
working context that haven't been written to disk yet.
```

**Commit:**
```bash
git add .mindforge/engine/compaction-protocol.md
git commit -m "feat(engine): implement context compaction protocol"
```

---

## TASK 4 — Write the AUDIT System

The audit system is the enterprise governance backbone of MindForge.
Every significant agent action leaves an immutable, structured trace.

### `.mindforge/audit/AUDIT-SCHEMA.md`

```markdown
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
```

Now update CLAUDE.md to include the audit writing requirement. Add this section
after the "State Artifacts" table:

```markdown
## Audit logging (mandatory)

Write an AUDIT entry to `.planning/AUDIT.jsonl` for:
- Every task started (event: task_started)
- Every task completed (event: task_completed)
- Every task failed (event: task_failed)
- Every security finding (event: security_finding)
- Every quality gate failure (event: quality_gate_failed)
- Every context compaction (event: context_compaction)
- Every architectural decision (event: decision_recorded)

Use the schemas in `.mindforge/audit/AUDIT-SCHEMA.md`.
Append only. Never modify existing entries.
```

**Commit:**
```bash
git add .mindforge/audit/ .planning/AUDIT.jsonl .claude/CLAUDE.md .agent/CLAUDE.md
git commit -m "feat(audit): implement AUDIT.jsonl append-only audit pipeline with full schema"
```

---

## TASK 5 — Write the Phase Verification Pipeline

### `.mindforge/engine/verification-pipeline.md`

```markdown
# MindForge Engine — Verification Pipeline

## Purpose
Automatically verify that a completed phase has actually delivered what it
promised in REQUIREMENTS.md. This is the agent's self-audit before human UAT.

## Four verification stages

### Stage 1 — Automated test suite
```bash
# Run the project's test suite (adapt command to project)
npm test
# or
pytest
# or
cargo test
```

Pass criteria: ALL tests pass, zero failures.
If any fail: stop. Do not proceed to Stage 2.
Record in VERIFICATION.md: "Stage 1: FAILED — [X] tests failing"

### Stage 2 — Requirement traceability
For each functional requirement tagged v1 for this phase in REQUIREMENTS.md:

1. Read the requirement and its acceptance criterion
2. Search the codebase for the implementation:
   ```bash
   grep -r "[key term from requirement]" src/ --include="*.ts"
   ```
3. Find a test that covers this requirement:
   ```bash
   grep -r "[acceptance criterion term]" tests/ --include="*.test.ts"
   ```
4. Classify:
   - ✅ Implemented and tested
   - ⚠️  Implemented but no test
   - ❌ Not found

Any ❌ result: create a fix plan before proceeding to Stage 3.
Any ⚠️  result: create a test task for the next phase backlog.

### Stage 3 — Type safety and linting (TypeScript/Python projects)
```bash
# TypeScript
npx tsc --noEmit
npx eslint . --ext .ts,.tsx --max-warnings 0

# Python
mypy .
ruff check .
```

Pass criteria: Zero errors, zero warnings.
If any errors: create targeted fix tasks. Do not proceed to Stage 4 with errors.

### Stage 4 — Security regression check
Activate `security-reviewer.md` persona.
Run the OWASP checklist from `security-review/SKILL.md` against all files
modified in this phase.

Specifically look for:
- Any new endpoints without authentication (if the project uses auth)
- Any new database queries without parameterisation
- Any new file handling without MIME type validation
- Any new environment variables without validation at startup

Write findings to `.planning/phases/[N]/SECURITY-REVIEW-[N].md`.

## VERIFICATION.md template

Write to `.planning/phases/[N]/VERIFICATION.md`:

```markdown
# Phase [N] Verification Report

## Date
[ISO-8601]

## Stage 1 — Test suite
- Command: `[test command]`
- Result: [X] tests passing, [Y] failing
- Status: ✅ PASS / ❌ FAIL

## Stage 2 — Requirement traceability

| FR ID | Requirement                   | Status | Evidence                        |
|-------|-------------------------------|--------|---------------------------------|
| FR-01 | [requirement text]            | ✅     | `src/auth/login.ts:47` + test   |
| FR-02 | [requirement text]            | ✅     | `src/auth/register.ts:23` + test|
| FR-03 | [requirement text]            | ⚠️     | `src/auth/reset.ts:15`, no test |

## Stage 3 — Static analysis
- TypeScript errors: [0 / N]
- ESLint warnings: [0 / N]
- Status: ✅ PASS / ❌ FAIL

## Stage 4 — Security regression
- New endpoints reviewed: [X]
- New database queries reviewed: [X]
- Findings: [None / see SECURITY-REVIEW-[N].md]
- Status: ✅ PASS / ❌ FAIL

## Overall status
✅ All stages passed — ready for human UAT
❌ [N] stages failed — fix plans created

## Fix plans created (if any)
- `PLAN-[N]-FIX-01.md`: [what it fixes]
```
```

**Commit:**
```bash
git add .mindforge/engine/verification-pipeline.md
git commit -m "feat(engine): implement 4-stage automated verification pipeline"
```

---

## TASK 6 — Write `/mindforge:next` command

The `next` command is the single most important UX improvement in Day 2.
It makes MindForge usable by someone who doesn't remember the exact workflow.

### `.claude/commands/mindforge/next.md`

```markdown
# MindForge — Next Command
# Usage: /mindforge:next

Auto-detect the current project state and execute the appropriate next step.
The user does not need to know the workflow. MindForge figures it out.

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
```

**Copy to Antigravity:**
```bash
cp .claude/commands/mindforge/next.md .agent/mindforge/next.md
git add .claude/commands/mindforge/next.md .agent/mindforge/next.md
git commit -m "feat(commands): add /mindforge:next auto-detection command"
```

---

## TASK 7 — Write `/mindforge:quick` command

The `quick` command handles work that does not fit into the phase lifecycle —
urgent fixes, small improvements, and one-off tasks.

### `.claude/commands/mindforge/quick.md`

```markdown
# MindForge — Quick Command
# Usage: /mindforge:quick [--research] [--review] [--full]
# For ad-hoc tasks that don't need full lifecycle management.

## When to use quick vs plan-phase
Use QUICK for:
- Bug fixes not tied to a current phase
- Small improvements (< 3 files, < 2 hours)
- Dependency updates
- Documentation corrections
- One-off scripts or utilities

Use PLAN-PHASE for:
- Feature development
- Anything touching more than 6 files
- Anything requiring research before implementation
- Anything with external dependencies or stakeholder requirements

## Step 1 — Task intake

Ask the user:
"What do you want to do?"

Listen to the description. If the task sounds larger than "quick" scope
(more than 6 files, architectural change, new feature), say:
"This sounds like more than a quick task. I recommend using /mindforge:plan-phase
 instead to ensure it's properly planned and verified. Want to proceed with quick anyway?"

## Step 2 — Optional research (--research flag or user requests it)

If `--research` is provided or the task involves unfamiliar libraries:
Spawn a focused research subagent. Give it:
- The task description
- The current tech stack from PROJECT.md
Ask it to: investigate the best approach, identify gotchas, recommend specific
libraries (with versions), and write a brief research note.

Report research findings to the user before proceeding.

## Step 3 — Create a quick plan

Create `.planning/quick/[NNN]-[slug]/PLAN.md` where NNN is a sequential number
and slug is a 2-4 word kebab-case description.

Example: `.planning/quick/001-fix-login-null-check/PLAN.md`

Use the standard XML plan format:
```xml
<task type="quick">
  <n>[task name]</n>
  <persona>[appropriate persona]</persona>
  <files>[files to touch]</files>
  <context>[relevant context]</context>
  <action>[implementation instructions]</action>
  <verify>[verification command]</verify>
  <done>[definition of done]</done>
</task>
```

Show the plan to the user. Wait for approval before executing.

## Step 4 — Execute the quick plan

1. Load persona from `.mindforge/personas/`
2. Load any relevant skills based on task keywords
3. Execute the plan
4. Run `<verify>` — must pass before committing
5. Commit: `[type](quick/[NNN]): [task name]`
6. Write `.planning/quick/[NNN]-[slug]/SUMMARY.md`

## Step 5 — Optional review (--review flag)

If `--review` is provided:
Activate `code-quality.md` skill on the diff.
Report any issues before committing.
If BLOCKING issues found: fix before commit.

## Step 6 — Optional full mode (--full flag)

If `--full` is provided, additionally:
- Run the project's full test suite (not just task-specific verify)
- Run the type checker and linter
- Activate `security-reviewer.md` if the task touches any security-sensitive code
- Write an AUDIT entry for the quick task

## Flags are composable
```
/mindforge:quick                     # minimal — task, plan, execute
/mindforge:quick --research          # adds domain research step
/mindforge:quick --review            # adds code quality review of diff
/mindforge:quick --full              # adds full test suite + linting + security
/mindforge:quick --research --full   # all of the above
```

## AUDIT entry for quick tasks
```json
{
  "id": "uuid",
  "timestamp": "ISO-8601",
  "event": "quick_task_completed",
  "agent": "mindforge-orchestrator",
  "phase": null,
  "session_id": "sess_abc",
  "quick_id": "001",
  "task_name": "Fix login null check",
  "commit_sha": "abc1234",
  "files_changed": ["src/auth/login.ts"],
  "flags_used": ["--review"]
}
```
```

**Commit:**
```bash
git add .claude/commands/mindforge/quick.md .agent/mindforge/quick.md
git commit -m "feat(commands): add /mindforge:quick ad-hoc task command with flags"
```

---

## TASK 8 — Write `/mindforge:status` command

### `.claude/commands/mindforge/status.md`

```markdown
# MindForge — Status Command
# Usage: /mindforge:status

Display a rich dashboard of the current project state.
Pull data from STATE.md, AUDIT.jsonl, REQUIREMENTS.md, and the phases directory.

## Dashboard sections

### Section 1 — Project header
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⚡ MindForge Status — [Project Name]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Last updated : [STATE.md last updated timestamp]
  Current phase: Phase [N] — [phase description]
  Status       : [status from STATE.md]
```

### Section 2 — Phase progress
```
Phase Progress
───────────────────────────────────────────────────────
  Phase 1  [████████████████████] 100% — Complete ✅
  Phase 2  [████████░░░░░░░░░░░░]  40% — In progress
  Phase 3  [░░░░░░░░░░░░░░░░░░░░]   0% — Not started
  Phase 4  [░░░░░░░░░░░░░░░░░░░░]   0% — Not started
```
Calculate percentage from: tasks with SUMMARY files / total tasks in phase.

### Section 3 — Requirements coverage
Read REQUIREMENTS.md and count:
- Total v1 requirements
- Requirements with a passing test (from VERIFICATION.md files)
- Requirements implemented but untested
- Requirements not yet started

```
Requirements (v1)
───────────────────────────────────────────────────────
  Total        : [N]
  ✅ Done + tested  : [N]
  ⚠️  Done, no test : [N]
  🔴 Not started   : [N]
```

### Section 4 — Recent activity (from AUDIT.jsonl)
Read the last 10 entries from AUDIT.jsonl and display:
```
Recent Activity
───────────────────────────────────────────────────────
  [timestamp]  task_completed  Plan 03: User API endpoints ✅
  [timestamp]  task_completed  Plan 02: Product model ✅
  [timestamp]  task_started    Plan 03: User API endpoints
  [timestamp]  task_completed  Plan 01: User model ✅
  [timestamp]  context_compaction  Phase 2, Plan 03 (72% context)
```

### Section 5 — Open issues
Check for:
- Any open SECURITY-REVIEW files with CRITICAL or HIGH findings
- Any BUGS.md files with open issues
- Any failed tasks in WAVE-REPORT files
- Any blockers in STATE.md

```
Open Issues
───────────────────────────────────────────────────────
  🔴 CRITICAL: [if any — from SECURITY-REVIEW]
  🟠 HIGH:     [if any]
  ✅ No open issues
```

### Section 6 — Next action
```
Next Action
───────────────────────────────────────────────────────
  [What STATE.md says the next action is]
  Run: /mindforge:next
     to auto-execute the next step.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

## Data sources (in priority order)
1. STATE.md — authoritative for current status
2. AUDIT.jsonl — authoritative for history
3. REQUIREMENTS.md — authoritative for scope
4. VERIFICATION.md files — authoritative for test coverage
5. WAVE-REPORT files — authoritative for execution history
6. HANDOFF.json — authoritative for session state
```

**Commit:**
```bash
git add .claude/commands/mindforge/status.md .agent/mindforge/status.md
git commit -m "feat(commands): add /mindforge:status rich project dashboard command"
```

---

## TASK 9 — Write `/mindforge:debug` command

### `.claude/commands/mindforge/debug.md`

```markdown
# MindForge — Debug Command
# Usage: /mindforge:debug [description]

Systematic debugging using the Debug Specialist persona with full RCA protocol.

## Activation

Load `.mindforge/personas/debug-specialist.md` immediately.
This command runs entirely in that persona for its full duration.

## Step 1 — Intake

Ask the user:
1. "Describe the problem. What is happening vs. what should happen?"
2. "Can you reproduce it reliably? If yes: what are the exact steps?"
3. "When did this start? Was it working before? What changed?"
4. "Do you have an error message or stack trace? Paste it here."

Capture all answers before proceeding.

## Step 2 — Triage

Classify the issue immediately:
- **Regression** (was working, now broken) → check recent commits
- **Never worked** (new feature failing) → check the plan and verify step
- **Environment issue** (works locally, fails in CI) → check environment diffs
- **Data issue** (specific data causes failure) → check data shape assumptions
- **Integration issue** (fails when calling external service) → check contracts

Report classification to user: "This looks like a [type] issue. Here's my approach..."

## Step 3 — Follow Debug Specialist protocol

Execute the full protocol from `debug-specialist.md`:
1. Reproduce
2. Isolate
3. Read the error
4. Check recent changes
5. Instrument
6. Form hypothesis
7. Test hypothesis (write a failing test)
8. Fix
9. Verify (test from step 7 now passes, no regressions)
10. Document

At each step, report what was found before moving to the next step.
Do not skip steps or combine them.

## Step 4 — Check recent git history

```bash
git log --oneline -20
git diff HEAD~[N] HEAD -- [suspected file]
```

If a recent commit is the likely cause, show the user the specific diff.

## Step 5 — Write the RCA report

Create `.planning/phases/[current-phase]/DEBUG-[timestamp].md`:

```markdown
# Debug Report — [short description]

## Date
[ISO-8601]

## Problem
[User's description + what was verified during debugging]

## Root cause category
[Logic error / Data error / Integration error / Concurrency error /
Configuration error / Dependency error]

## Root cause
[Precise description of what the actual cause was]

## Evidence
- [How the root cause was confirmed]
- [Failing test that proved the bug: file:line]

## Fix applied
- File: [path]
- Change: [description]
- Commit: [SHA]

## Regression test
[Test written to prevent this from recurring: file:line]

## Prevention
[What should change in process/code to prevent this class of bug]
```

## Step 6 — Write AUDIT entry

```json
{
  "id": "uuid",
  "timestamp": "ISO-8601",
  "event": "debug_completed",
  "agent": "mindforge-debug-specialist",
  "phase": [current phase or null],
  "session_id": "sess_abc",
  "issue_type": "regression",
  "root_cause_category": "Logic error",
  "root_cause_summary": "[one sentence]",
  "commit_sha": "[fix commit sha]",
  "regression_test_added": true,
  "report_path": ".planning/phases/[N]/DEBUG-[timestamp].md"
}
```

## When the bug cannot be reproduced

Ask:
1. "Does it happen every time or intermittently?"
2. "Does it happen in specific environments only? (dev/staging/prod)"
3. "Does it happen for specific users or all users?"

If intermittent: focus on concurrency, caching, and race conditions.
Write a monitoring/logging plan to catch the next occurrence.
Document the inconclusive investigation in the DEBUG report with evidence gathered.
```

**Commit:**
```bash
git add .claude/commands/mindforge/debug.md .agent/mindforge/debug.md
git commit -m "feat(commands): add /mindforge:debug systematic RCA debug command"
```

---

## TASK 10 — Update CLAUDE.md with Day 2 capabilities

Update `.claude/CLAUDE.md` to add Day 2 engine awareness.
Add these sections to the existing CLAUDE.md:

```markdown
---

## WAVE EXECUTION ENGINE

When executing phases, always use the full wave engine protocol:
1. Run dependency parser: `.mindforge/engine/dependency-parser.md`
2. Build execution waves: `.mindforge/engine/wave-executor.md`
3. Inject subagent context: `.mindforge/engine/context-injector.md`
4. Run verification pipeline: `.mindforge/engine/verification-pipeline.md`

Never execute plans sequentially without first checking for parallel opportunities.
Parallel execution in isolated subagent contexts produces higher quality output.

---

## CONTEXT COMPACTION

Follow `.mindforge/engine/compaction-protocol.md` exactly when context reaches 70%.
Do not wait. Do not skip the protocol. Compacting at 85%+ risks losing critical context.

---

## AUDIT LOGGING

Every significant action must produce an AUDIT entry.
Schema: `.mindforge/audit/AUDIT-SCHEMA.md`
File: `.planning/AUDIT.jsonl` (append only — never modify existing entries)

---

## QUICK TASKS

For ad-hoc work outside the phase lifecycle: use `/mindforge:quick`.
Quick tasks still get plans, verifications, commits, summaries, and audit entries.
They skip the phase management overhead only.

---

## AUTO-DETECTION

When unsure what to do next: run the state detection logic from
`.claude/commands/mindforge/next.md` internally to determine the correct action.
This is the same logic `/mindforge:next` uses — it can be applied any time.
```

Mirror the changes to `.agent/CLAUDE.md`.

**Commit:**
```bash
git add .claude/CLAUDE.md .agent/CLAUDE.md
git commit -m "feat(core): update CLAUDE.md with Day 2 engine awareness and audit requirements"
```

---

## TASK 11 — Write Day 2 test suite

Write comprehensive tests covering all Day 2 components.

### `tests/wave-engine.test.js`

```javascript
/**
 * MindForge Wave Engine Tests
 * Tests: dependency parsing, wave grouping, and execution planning
 * Run: node tests/wave-engine.test.js
 */

const fs = require('fs');
const path = require('path');
const assert = require('assert');

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`  ✅ ${name}`);
    passed++;
  } catch (err) {
    console.error(`  ❌ ${name}`);
    console.error(`     ${err.message}`);
    failed++;
  }
}

// ── Simulate the dependency parser and wave grouper ───────────────────────────

/**
 * Simulates parsing a PLAN file's dependency field
 * In real execution, this reads from the actual XML PLAN files
 */
function parseDependencies(depString) {
  if (!depString || depString.trim().toLowerCase() === 'none') return [];
  return depString.split(',').map(d => d.trim()).filter(Boolean);
}

/**
 * Simulates the wave grouping algorithm (Kahn's topological sort)
 * Input: { "01": { dependsOn: [] }, "02": { dependsOn: ["01"] }, ... }
 * Output: [["01"], ["02"], ...]
 */
function groupIntoWaves(graph) {
  const remaining = new Set(Object.keys(graph));
  const completed = new Set();
  const waves = [];

  while (remaining.size > 0) {
    const wave = [];
    for (const id of remaining) {
      const deps = graph[id].dependsOn;
      if (deps.every(d => completed.has(d))) {
        wave.push(id);
      }
    }

    if (wave.length === 0 && remaining.size > 0) {
      throw new Error(`Circular dependency detected among: ${[...remaining].join(', ')}`);
    }

    waves.push(wave.sort()); // sort for determinism
    wave.forEach(id => { completed.add(id); remaining.delete(id); });
  }

  return waves;
}

/**
 * Detects circular dependencies
 */
function hasCircularDependency(graph) {
  try {
    groupIntoWaves(graph);
    return false;
  } catch {
    return true;
  }
}

/**
 * Detects file conflicts between plans
 */
function findFileConflicts(plans) {
  const fileMap = {};
  const conflicts = [];

  plans.forEach(({ id, files }) => {
    files.forEach(file => {
      if (fileMap[file]) {
        conflicts.push({ file, plans: [fileMap[file], id] });
      } else {
        fileMap[file] = id;
      }
    });
  });

  return conflicts;
}

// ── Tests ─────────────────────────────────────────────────────────────────────

console.log('\nMindForge Day 2 — Wave Engine Tests\n');

console.log('Dependency parsing:');

test('parses "none" as empty dependencies', () => {
  assert.deepStrictEqual(parseDependencies('none'), []);
  assert.deepStrictEqual(parseDependencies('None'), []);
  assert.deepStrictEqual(parseDependencies('NONE'), []);
});

test('parses single dependency', () => {
  assert.deepStrictEqual(parseDependencies('01'), ['01']);
});

test('parses multiple dependencies', () => {
  assert.deepStrictEqual(parseDependencies('01, 02, 03'), ['01', '02', '03']);
});

test('handles whitespace in dependency list', () => {
  assert.deepStrictEqual(parseDependencies('01,02,  03'), ['01', '02', '03']);
});

test('parses empty string as no dependencies', () => {
  assert.deepStrictEqual(parseDependencies(''), []);
});

console.log('\nWave grouping algorithm:');

test('single task with no dependencies → 1 wave', () => {
  const graph = { '01': { dependsOn: [] } };
  const waves = groupIntoWaves(graph);
  assert.deepStrictEqual(waves, [['01']]);
});

test('two independent tasks → 1 wave with both', () => {
  const graph = {
    '01': { dependsOn: [] },
    '02': { dependsOn: [] },
  };
  const waves = groupIntoWaves(graph);
  assert.strictEqual(waves.length, 1);
  assert.deepStrictEqual(waves[0].sort(), ['01', '02']);
});

test('sequential dependency chain → 3 waves, 1 task each', () => {
  const graph = {
    '01': { dependsOn: [] },
    '02': { dependsOn: ['01'] },
    '03': { dependsOn: ['02'] },
  };
  const waves = groupIntoWaves(graph);
  assert.strictEqual(waves.length, 3);
  assert.deepStrictEqual(waves[0], ['01']);
  assert.deepStrictEqual(waves[1], ['02']);
  assert.deepStrictEqual(waves[2], ['03']);
});

test('diamond dependency (fan-out then fan-in)', () => {
  const graph = {
    '01': { dependsOn: [] },
    '02': { dependsOn: ['01'] },
    '03': { dependsOn: ['01'] },
    '04': { dependsOn: ['02', '03'] },
  };
  const waves = groupIntoWaves(graph);
  assert.strictEqual(waves.length, 3);
  assert.deepStrictEqual(waves[0], ['01']);
  assert.deepStrictEqual(waves[1].sort(), ['02', '03']);
  assert.deepStrictEqual(waves[2], ['04']);
});

test('5-plan realistic example (user model → api → checkout)', () => {
  const graph = {
    '01': { dependsOn: [] },          // User model
    '02': { dependsOn: [] },          // Product model
    '03': { dependsOn: ['01'] },      // User API
    '04': { dependsOn: ['02'] },      // Product API
    '05': { dependsOn: ['03', '04'] },// Checkout UI
  };
  const waves = groupIntoWaves(graph);
  assert.strictEqual(waves.length, 3);
  assert.deepStrictEqual(waves[0].sort(), ['01', '02']);
  assert.deepStrictEqual(waves[1].sort(), ['03', '04']);
  assert.deepStrictEqual(waves[2], ['05']);
});

console.log('\nCircular dependency detection:');

test('detects direct circular dependency (A → B → A)', () => {
  const graph = {
    '01': { dependsOn: ['02'] },
    '02': { dependsOn: ['01'] },
  };
  assert.strictEqual(hasCircularDependency(graph), true);
});

test('detects indirect circular dependency (A → B → C → A)', () => {
  const graph = {
    '01': { dependsOn: ['03'] },
    '02': { dependsOn: ['01'] },
    '03': { dependsOn: ['02'] },
  };
  assert.strictEqual(hasCircularDependency(graph), true);
});

test('does not false-positive on valid DAG', () => {
  const graph = {
    '01': { dependsOn: [] },
    '02': { dependsOn: ['01'] },
    '03': { dependsOn: ['01'] },
    '04': { dependsOn: ['02', '03'] },
  };
  assert.strictEqual(hasCircularDependency(graph), false);
});

console.log('\nFile conflict detection:');

test('detects conflict when two plans modify the same file', () => {
  const plans = [
    { id: '01', files: ['src/models/user.ts', 'src/models/user.test.ts'] },
    { id: '02', files: ['src/models/product.ts'] },
    { id: '03', files: ['src/models/user.ts'] }, // conflict with 01
  ];
  const conflicts = findFileConflicts(plans);
  assert.strictEqual(conflicts.length, 1);
  assert.strictEqual(conflicts[0].file, 'src/models/user.ts');
  assert.deepStrictEqual(conflicts[0].plans.sort(), ['01', '03']);
});

test('no conflicts when all plans touch different files', () => {
  const plans = [
    { id: '01', files: ['src/models/user.ts'] },
    { id: '02', files: ['src/models/product.ts'] },
    { id: '03', files: ['src/api/orders.ts'] },
  ];
  const conflicts = findFileConflicts(plans);
  assert.strictEqual(conflicts.length, 0);
});

// ── Results ───────────────────────────────────────────────────────────────────
console.log(`\n${'─'.repeat(50)}`);
console.log(`Results: ${passed} passed, ${failed} failed`);

if (failed > 0) {
  console.error(`\n❌ ${failed} test(s) failed.\n`);
  process.exit(1);
} else {
  console.log(`\n✅ All wave engine tests passed.\n`);
}
```

---

### `tests/audit.test.js`

```javascript
/**
 * MindForge Audit System Tests
 * Run: node tests/audit.test.js
 */

const fs = require('fs');
const path = require('path');
const assert = require('assert');

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`  ✅ ${name}`);
    passed++;
  } catch (err) {
    console.error(`  ❌ ${name}`);
    console.error(`     ${err.message}`);
    failed++;
  }
}

// ── Audit utility functions to test ──────────────────────────────────────────

function validateAuditEntry(entry) {
  const required = ['id', 'timestamp', 'event', 'agent', 'session_id'];
  const missing = required.filter(f => !entry[f]);
  if (missing.length > 0) {
    throw new Error(`Missing required fields: ${missing.join(', ')}`);
  }
  // Validate timestamp format
  const ts = new Date(entry.timestamp);
  if (isNaN(ts.getTime())) throw new Error(`Invalid timestamp: ${entry.timestamp}`);
  // Validate id looks like a UUID (basic check)
  if (!/^[0-9a-f-]{36}$/.test(entry.id)) throw new Error(`Invalid UUID format: ${entry.id}`);
}

function parseAuditLog(content) {
  return content.trim().split('\n')
    .filter(line => line.trim())
    .map((line, index) => {
      try {
        return JSON.parse(line);
      } catch (e) {
        throw new Error(`Line ${index + 1} is not valid JSON: ${line.slice(0, 50)}...`);
      }
    });
}

// ── Tests ─────────────────────────────────────────────────────────────────────

console.log('\nMindForge Day 2 — Audit System Tests\n');

console.log('AUDIT.jsonl file:');

test('AUDIT.jsonl exists', () => {
  assert.ok(fs.existsSync('.planning/AUDIT.jsonl'), 'AUDIT.jsonl not found');
});

test('AUDIT.jsonl is valid (empty or valid JSONL)', () => {
  const content = fs.readFileSync('.planning/AUDIT.jsonl', 'utf8');
  if (content.trim().length === 0) return; // empty is valid on day 1
  parseAuditLog(content); // throws if invalid
});

console.log('\nAudit entry validation:');

test('valid task_completed entry passes validation', () => {
  const entry = {
    id: '550e8400-e29b-41d4-a716-446655440000',
    timestamp: new Date().toISOString(),
    event: 'task_completed',
    agent: 'mindforge-subagent-01',
    phase: 1,
    plan: '01',
    session_id: 'sess_test',
    task_name: 'Create user model',
    commit_sha: 'abc1234',
    verify_result: 'pass'
  };
  assert.doesNotThrow(() => validateAuditEntry(entry));
});

test('entry missing required field fails validation', () => {
  const entry = {
    timestamp: new Date().toISOString(),
    event: 'task_completed',
    agent: 'mindforge-subagent-01',
    // missing: id, session_id
  };
  assert.throws(() => validateAuditEntry(entry), /Missing required fields/);
});

test('entry with invalid timestamp fails validation', () => {
  const entry = {
    id: '550e8400-e29b-41d4-a716-446655440000',
    timestamp: 'not-a-date',
    event: 'task_completed',
    agent: 'mindforge-subagent-01',
    session_id: 'sess_test',
  };
  assert.throws(() => validateAuditEntry(entry), /Invalid timestamp/);
});

test('JSONL parser handles multi-line audit log', () => {
  const multiLine = [
    '{"id":"550e8400-e29b-41d4-a716-446655440000","timestamp":"2026-03-20T10:00:00.000Z","event":"task_started","agent":"test","session_id":"s1"}',
    '{"id":"550e8400-e29b-41d4-a716-446655440001","timestamp":"2026-03-20T10:05:00.000Z","event":"task_completed","agent":"test","session_id":"s1"}',
  ].join('\n');
  const entries = parseAuditLog(multiLine);
  assert.strictEqual(entries.length, 2);
  assert.strictEqual(entries[0].event, 'task_started');
  assert.strictEqual(entries[1].event, 'task_completed');
});

test('JSONL parser rejects malformed JSON', () => {
  const badLine = '{"id":"abc","timestamp": bad json}';
  assert.throws(() => parseAuditLog(badLine), /not valid JSON/);
});

console.log('\nAudit schema files:');

test('AUDIT-SCHEMA.md exists and has content', () => {
  const schemaPath = '.mindforge/audit/AUDIT-SCHEMA.md';
  assert.ok(fs.existsSync(schemaPath), 'AUDIT-SCHEMA.md not found');
  const content = fs.readFileSync(schemaPath, 'utf8');
  assert.ok(content.length > 500, 'AUDIT-SCHEMA.md seems too short');
  assert.ok(content.includes('task_completed'), 'Missing task_completed event type');
  assert.ok(content.includes('security_finding'), 'Missing security_finding event type');
  assert.ok(content.includes('context_compaction'), 'Missing context_compaction event type');
});

test('HANDOFF.json has _warning anti-secret field', () => {
  const handoff = JSON.parse(fs.readFileSync('.planning/HANDOFF.json', 'utf8'));
  assert.ok(handoff._warning, 'Missing _warning anti-secret field in HANDOFF.json');
  assert.ok(handoff._warning.toLowerCase().includes('secret'), 'Warning should mention secrets');
});

// ── Results ───────────────────────────────────────────────────────────────────
console.log(`\n${'─'.repeat(50)}`);
console.log(`Results: ${passed} passed, ${failed} failed`);

if (failed > 0) {
  console.error(`\n❌ ${failed} test(s) failed.\n`);
  process.exit(1);
} else {
  console.log(`\n✅ All audit tests passed.\n`);
}
```

---

### `tests/compaction.test.js`

```javascript
/**
 * MindForge Context Compaction Tests
 * Run: node tests/compaction.test.js
 */

const fs = require('fs');
const assert = require('assert');

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`  ✅ ${name}`);
    passed++;
  } catch (err) {
    console.error(`  ❌ ${name}`);
    console.error(`     ${err.message}`);
    failed++;
  }
}

// ── Compaction state validator ─────────────────────────────────────────────────

function validateHandoffJson(obj) {
  const required = ['schema_version', 'next_task', '_warning', 'context_refs'];
  const missing = required.filter(f => obj[f] === undefined);
  if (missing.length > 0) throw new Error(`Missing: ${missing.join(', ')}`);
  if (!Array.isArray(obj.context_refs)) throw new Error('context_refs must be an array');
  if (!Array.isArray(obj.blockers)) throw new Error('blockers must be an array');
  if (obj._warning.toLowerCase().includes('password') === false &&
      obj._warning.toLowerCase().includes('secret') === false) {
    throw new Error('_warning must mention secrets/passwords');
  }
}

function validateStateHasCompactionCheckpoint(content) {
  // After compaction, STATE.md should have a checkpoint section
  return content.includes('Compaction checkpoint') || content.includes('compaction');
}

// ── Tests ─────────────────────────────────────────────────────────────────────

console.log('\nMindForge Day 2 — Context Compaction Tests\n');

console.log('HANDOFF.json schema validation:');

test('HANDOFF.json exists', () => {
  assert.ok(fs.existsSync('.planning/HANDOFF.json'));
});

test('HANDOFF.json is valid JSON', () => {
  const content = fs.readFileSync('.planning/HANDOFF.json', 'utf8');
  assert.doesNotThrow(() => JSON.parse(content));
});

test('HANDOFF.json has all required fields', () => {
  const obj = JSON.parse(fs.readFileSync('.planning/HANDOFF.json', 'utf8'));
  validateHandoffJson(obj);
});

test('HANDOFF.json schema_version is 1.0.0', () => {
  const obj = JSON.parse(fs.readFileSync('.planning/HANDOFF.json', 'utf8'));
  assert.strictEqual(obj.schema_version, '1.0.0');
});

test('HANDOFF.json context_refs is an array', () => {
  const obj = JSON.parse(fs.readFileSync('.planning/HANDOFF.json', 'utf8'));
  assert.ok(Array.isArray(obj.context_refs));
});

test('HANDOFF.json blockers is an array', () => {
  const obj = JSON.parse(fs.readFileSync('.planning/HANDOFF.json', 'utf8'));
  assert.ok(Array.isArray(obj.blockers));
});

test('HANDOFF.json decisions_needed is an array', () => {
  const obj = JSON.parse(fs.readFileSync('.planning/HANDOFF.json', 'utf8'));
  assert.ok(Array.isArray(obj.decisions_needed));
});

console.log('\nCompaction protocol file:');

test('compaction-protocol.md exists', () => {
  assert.ok(
    fs.existsSync('.mindforge/engine/compaction-protocol.md'),
    'compaction-protocol.md not found'
  );
});

test('compaction-protocol.md mentions 70% threshold', () => {
  const content = fs.readFileSync('.mindforge/engine/compaction-protocol.md', 'utf8');
  assert.ok(content.includes('70%'), 'Should specify 70% compaction threshold');
});

test('compaction-protocol.md has all 6 steps', () => {
  const content = fs.readFileSync('.mindforge/engine/compaction-protocol.md', 'utf8');
  assert.ok(content.includes('Step 1'), 'Missing Step 1');
  assert.ok(content.includes('Step 2'), 'Missing Step 2');
  assert.ok(content.includes('Step 3'), 'Missing Step 3');
  assert.ok(content.includes('Step 4'), 'Missing Step 4');
  assert.ok(content.includes('Step 5'), 'Missing Step 5');
  assert.ok(content.includes('Step 6'), 'Missing Step 6');
});

test('compaction-protocol.md covers session restart procedure', () => {
  const content = fs.readFileSync('.mindforge/engine/compaction-protocol.md', 'utf8');
  assert.ok(
    content.includes('Session restart') || content.includes('restart from HANDOFF'),
    'Should cover session restart from HANDOFF.json'
  );
});

// ── Results ───────────────────────────────────────────────────────────────────
console.log(`\n${'─'.repeat(50)}`);
console.log(`Results: ${passed} passed, ${failed} failed`);

if (failed > 0) {
  console.error(`\n❌ ${failed} test(s) failed.\n`);
  process.exit(1);
} else {
  console.log(`\n✅ All compaction tests passed.\n`);
}
```

**Commit:**
```bash
git add tests/
git commit -m "test(day2): add wave engine, audit, and compaction test suites"
```

---

## TASK 12 — Run all tests and verify Day 2 is complete

```bash
# Day 1 tests (must still pass)
node tests/install.test.js

# Day 2 tests
node tests/wave-engine.test.js
node tests/audit.test.js
node tests/compaction.test.js
```

All must show: "All tests passed."

If any fail: fix before proceeding.

**Final Day 2 commit:**
```bash
git add .
git commit -m "feat(day2): complete Day 2 MindForge wave engine — all components built"
git push origin feat/mindforge-wave-engine
```

---

## DAY 2 VERIFY — Complete this checklist before pushing

```bash
# 1. All new engine files exist
ls .mindforge/engine/            # 4 files
ls .mindforge/audit/             # 1 file
ls .planning/AUDIT.jsonl         # exists (empty is fine)

# 2. All new commands exist (both runtimes)
ls .claude/commands/mindforge/   # 10 files (6 original + 4 new)
ls .agent/mindforge/             # 10 files (must match exactly)
diff <(ls .claude/commands/mindforge/ | sort) <(ls .agent/mindforge/ | sort)
# expected: no output

# 3. All tests pass
node tests/install.test.js && node tests/wave-engine.test.js && node tests/audit.test.js && node tests/compaction.test.js

# 4. AUDIT.jsonl is valid (empty or valid JSONL)
node -e "
  const fs = require('fs');
  const c = fs.readFileSync('.planning/AUDIT.jsonl','utf8').trim();
  if(c) c.split('\n').forEach((l,i) => {try{JSON.parse(l)}catch(e){throw new Error('Line '+(i+1)+': '+e.message)}});
  console.log('AUDIT.jsonl valid');
"

# 5. HANDOFF.json schema is correct
node -e "
  const h = JSON.parse(require('fs').readFileSync('.planning/HANDOFF.json','utf8'));
  ['schema_version','next_task','_warning','context_refs','blockers'].forEach(f => {
    if(h[f] === undefined) throw new Error('Missing: ' + f);
  });
  console.log('HANDOFF.json valid');
"

# 6. Git log: all Day 2 commits present
git log --oneline | head -15
# Expect: 12 clean commits from today

# 7. No secrets anywhere
grep -r "password\s*=" . --include="*.md" --include="*.js" --include="*.json" \
  --exclude-dir=node_modules --exclude-dir=.git | grep -v "placeholder\|your-password\|example"
# expected: no output
```

---

**Branch:** `feat/mindforge-wave-engine`
**Day 2 implementation complete. Proceed to DAY2-REVIEW.md.**
