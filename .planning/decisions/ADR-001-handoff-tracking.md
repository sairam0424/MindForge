# ADR-001: Track HANDOFF.json in git

**Status:** Accepted
**Date:** 2026-03-20
**Deciders:** MindForge core team

## Context
HANDOFF.json stores the current session state for agent continuity.
It needs to be readable by the next agent session. The question is whether
it should be committed to git (team-visible) or gitignored (local-only).

## Decision
Track HANDOFF.json in git.

## Options considered

### Option A — Track in git (chosen)
Pros:
- Any team member or new machine can pick up where the last session left off
- Git history shows the evolution of session state
- No risk of losing state on machine failure

Cons:
- File changes create noise in git history
- Risk of accidentally committing sensitive session data

Mitigations:
- Added `_warning` field to prevent accidental secret storage
- SUMMARY.md captures human-readable history; HANDOFF.json is machine state only

### Option B — Gitignore
Pros: No git noise, no secret exposure risk
Cons: State lost on machine switch or re-clone; breaks team continuity

## Rationale
Team continuity outweighs the git noise concern. The warning field and
documentation mitigate the secret exposure risk sufficiently.

## Consequences
Team must be educated to never write secrets into HANDOFF.json.
CI should include a secret-scanning step that checks HANDOFF.json.
