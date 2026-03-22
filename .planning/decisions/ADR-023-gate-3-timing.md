# ADR-023: Gate 3 Timing

## Status: Proposed
## Deciders: MindForge Architecture Team
## Date: 2026-03-22

## Context
Gate 3 (Secret Detection) used to run post-wave. In autonomous mode, the agent makes multiple commits per wave. A secret committed to git history is an immediate security incident even if never pushed.

## Decision
Gate 3 must run **PRE-COMMIT** on the staged diff for every task in autonomous mode. If a secret pattern is detected, the commit is blocked, the changes are unstaged, and the engine ESCALATES immediately.

## Consequences
- Prevents accidental leakage of credentials into the local git history.
- Adds slight latency to the commit process, which is acceptable for the security gain.
