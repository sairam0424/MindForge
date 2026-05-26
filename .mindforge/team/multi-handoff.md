# MindForge Team — Multi-Developer HANDOFF

## Purpose
Allow multiple developers or agent sessions to collaborate without silently
 stomping shared state.

## Shared coordination rules
When a developer starts a plan, first check shared `HANDOFF.json` state. If the
 same plan already appears under `active_developers`, stop and ask for
 clarification before proceeding.

Developers with `last_seen` older than 4 hours are considered stale and may be
 removed automatically on the next session start.

## Required shared state fields
- `active_developers`
- current phase and plan ownership
- recent files
- blockers and decisions needed

## Audit discipline
Each task completion or failure commit must include any new AUDIT entries so
 shared history is not stranded in an uncommitted worktree.
