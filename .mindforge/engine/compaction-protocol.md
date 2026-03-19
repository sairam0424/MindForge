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
git commit --no-verify -m "wip(phase-[N]-plan-[M]): compaction checkpoint — [brief description]"
```
This ensures no work is lost. WIP commits are acceptable at compaction points.
Document in STATE.md that hooks were bypassed for this WIP commit.

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
2. Check `updated_at`:
   - If older than 48 hours: warn the user and offer a fresh state detection
3. Read every file in `context_refs` list
4. Run `git log --oneline -10` to verify recent history matches `recent_commits`
   - If git shows commits not in HANDOFF: list them and ask how to proceed
5. Report to user: "Resuming from: [next_task field]"
6. Ask: "Shall I continue from where we left off? (yes/no)"
7. If yes: begin from the `plan_step` position
8. If no: ask what the user wants to do instead

## What NOT to compact
Never compact:
- Uncommitted work (commit it first as WIP)
- The contents of PLAN files (they are files — they survive context resets)
- The SUMMARY files (already written to disk)
- Any information that is already in a file on disk

Compaction is about capturing IMPLICIT knowledge — the things in the agent's
working context that haven't been written to disk yet.

## Edge case handling

### Compaction during active wave execution
If compaction is triggered while a wave is executing (subagents are running):
1. Do not interrupt running subagents. Let them complete their current task.
2. When the running subagent writes its SUMMARY file: trigger compaction
   immediately after, before starting the next task or wave.
3. Never compact mid-task. Always compact at task boundaries.

### Multiple session risk
HANDOFF.json is a shared file. If two agents read or write it concurrently,
the last writer wins. In team environments, each engineer should use their
own feature branch to avoid collisions.
