# MindForge Team — Session Merger

## Purpose
Merge concurrent session state safely after parallel work or multi-developer
 execution.

## Merge strategy
1. Merge `HANDOFF.json` through git, not ad hoc overwrite
2. Resolve conflicts explicitly when two sessions claim the same plan
3. Preserve both sides' blockers and decisions until reconciled
4. Keep AUDIT append-only; ensure entries were committed with the task commits

Git merge conflicts are the correct mechanism for contested shared state.

## Conflict rules
- Same plan claimed by two developers: escalate for human resolution
- Different plans touching shared files: merge carefully, then rerun verification
- Stale active developer entry: prune if `last_seen` is older than 4 hours
