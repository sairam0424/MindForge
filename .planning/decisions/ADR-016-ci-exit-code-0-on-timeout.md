# ADR-016: CI timeout exits with code 0 (soft stop)

**Status:** Accepted
**Date:** 2026-03-21

## Context
MindForge CI may run out of time before completing all phases.
The question is: should timeout exit with code 0 (success) or non-zero (failure)?

## Decision
Timeout exits with code 0. State is saved. Next CI run resumes.

## Rationale
A MindForge CI timeout is not a code failure — it is a resource limit.
Failing the build on timeout would:
1. Block the PR with a failure that has no fix (the code is fine — time ran out)
2. Force teams to either increase CI limits or split phases artificially
3. Make MindForge feel unreliable ("it randomly fails when there's a lot to do")

The correct behaviour: save progress, exit cleanly, let the next run continue.
The CI pipeline is designed for continuation, not completion in a single run.

## Consequences
- CI pipelines may run multiple times for a single phase
- HANDOFF.json must be committed during CI runs (CI has write access)
- Teams must monitor CI for timeout patterns (frequent timeouts → split phases)
- GitHub Actions step summary provides visibility into timeout state
