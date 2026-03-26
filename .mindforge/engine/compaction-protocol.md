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

### Step 4 — Write HANDOFF.json (Hot Context)
Overwrite `.planning/HANDOFF.json` with the current **Hot** state. This file should only contain high-SRD items required for immediate task resumption.

```json
{
  "schema_version": "2.1.0",
  "project": "[project name]",
  "phase": [N],
  "plan": [M],
  "plan_step": "[exact step description]",
  "next_task": "[exact instruction for next session]",
  "hot_context": {
    "active_decisions": [],
    "recent_discoveries": [],
    "file_offsets": {}
  },
  "blockers": [],
  "context_refs": [
    ".planning/STATE.md",
    ".planning/HANDOFF.json",
    ".planning/memories/WARM-SHARD-LATEST.jsonl"
  ],
  "shard_ref": ".planning/memories/WARM-SHARD-N.jsonl",
  "updated_at": "[ISO-8601]"
}
```

### Step 4.5 — Semantic Sharding (Warm/Cold Context)
Invoke the [Shard Controller](shard-controller.md) to offload lower-SRD items:
1. Identify items with SRD < 0.8 (Decisions from earlier in the phase, transient research).
2. Append these to `.planning/memories/WARM-SHARD-N.jsonl`.
3. If any item has matured into a Project-wide pattern (SRD > 0.9 + repeated usage), move it to `.mindforge/memory/`.
4. Ensure `HANDOFF.json` remains under 10KB.

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

### Compaction when near 85%+ context
If compaction was not triggered at 70% and context is now at 85%+:
1. This is an error condition — the 70% trigger was missed.
2. Emergency compact immediately: skip the "summarise last 20 tool calls" step.
3. Write HANDOFF.json from whatever state is available.
4. Restart immediately with the minimum viable context.
5. Add an AUDIT entry with `"event":"compaction_late"` to flag this for review.
