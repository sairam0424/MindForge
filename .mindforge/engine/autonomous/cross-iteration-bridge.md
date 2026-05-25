# Autonomous Engine — Cross-Iteration Bridge

## Purpose
Provides semantic context bridging across autonomous mode iterations via
a shared notes file. Complements the structural `HANDOFF.json` (which tracks
task state) with reasoning context (WHY decisions were made).

## The Problem
In autonomous mode, each task gets a fresh context window. While HANDOFF.json
preserves structural state (what tasks remain, what was completed), it loses:
- Why a particular approach was chosen over alternatives
- Observations that inform subsequent tasks
- Warnings discovered during earlier tasks
- Cross-task patterns that only emerge over multiple iterations

## Solution: SHARED_TASK_NOTES.md

### Location
`.planning/SHARED_TASK_NOTES.md` — single file, managed by the autonomous engine.

### Format
```markdown
# Shared Task Notes (Auto-Managed)
<!-- Entries are append-only during autonomous execution. Pruned after phase completion. -->

## [2026-05-25T10:30:00Z] Task: implement-auth-middleware
**Observation:** The existing session store uses Redis, not in-memory. All new auth code must use the Redis client at `src/lib/redis.ts`.
**Decision:** Chose JWT + Redis session store over pure stateless JWT because existing code already depends on session lookups.
**Warning:** The Redis connection pool is limited to 10 — avoid opening new connections per request.

## [2026-05-25T10:45:00Z] Task: add-rate-limiting  
**Observation:** Rate limiting should use the same Redis instance (discovered in previous task).
**Decision:** Implemented sliding window counter in Redis rather than in-memory Map.
**Cross-ref:** Auth middleware (previous task) sets `req.userId` which rate limiter needs.
```

### Entry Schema
Each entry contains:
- **Timestamp** — When the note was written
- **Task** — Which task produced this note
- **Observation** — Facts discovered (not opinions)
- **Decision** — Choices made and WHY (the reasoning)
- **Warning** (optional) — Hazards for future tasks
- **Cross-ref** (optional) — Dependencies on other tasks

## Lifecycle Rules

### Writing
- Auto-executor appends an entry after EACH task completion
- Only write if the task produced non-obvious insights
- Keep entries under 100 words each (concise, not verbose)
- Never write secrets, credentials, or full code blocks

### Reading
- Auto-executor reads SHARED_TASK_NOTES.md at the START of each new task
- Only the last 20 entries are loaded (FIFO window)
- Notes inform task execution but do NOT override task specifications

### Pruning
- After a phase completes: review all notes
- Notes with lasting value → migrate to knowledge base (`.mindforge/memory/`)
- Remaining notes → archive to `.planning/history/shared-notes-[phase]-[date].md`
- Clear SHARED_TASK_NOTES.md for next phase

### Size Limits
- Maximum entries: 50
- Maximum total size: 10K tokens
- When limit is reached: evict oldest entries (FIFO)
- Evicted entries are NOT archived (they served their purpose)

## Integration with HANDOFF.json

HANDOFF.json tracks WHAT (task state, completion, queue).
SHARED_TASK_NOTES tracks WHY (reasoning, context, warnings).

Both are read at task start:
1. Read HANDOFF.json → know what to do next
2. Read SHARED_TASK_NOTES.md → know what context to carry forward
3. Execute task with both structural and semantic context
4. Write HANDOFF.json → update task state
5. Write SHARED_TASK_NOTES.md → preserve reasoning for next iteration

## When NOT to Write Notes

- Trivial tasks (single-line changes, formatting)
- Tasks with no cross-task implications
- Duplicate information already in HANDOFF.json
- Information derivable from git history

## Failure Recovery

If SHARED_TASK_NOTES.md becomes corrupted or too large:
1. Archive current file as-is
2. Create fresh empty file
3. Log incident in AUDIT
4. Continue — notes are advisory, not required for execution
