# MindForge — Project State

## Status
🟢 Active — v11.2.0 (Verification & Trust)

## IMPORTANT
HANDOFF.json is committed to git. Never write secrets or credentials into it.
Write "see .env" or "stored in secrets manager" if a note needs to reference credentials.


## Current version
v11.2.0 — Verification & Trust release. Makes quality measurable (unified verification runner, eval harness with recall@k/nDCG), defends trust boundaries (manifest pinning, untrusted output tagging, high-impact command gating), and cleans tech debt.

## Current phase
v11.2.0 implemented. Ready for release (push + PR + CI + publish gated on human approval).

## Last completed task
v11.2.0 — UC-08 (verification runner), UC-25 (eval harness), UC-22 (trust boundaries), council CLI wiring, tech debt batch (5 fixes).

## Next action
Push branch, open PR to develop, let CI validate, then tag + publish v11.2.0 with human approval.

## Decisions made
- Verification runner orchestrates test/lint/audit/typecheck (security stage TBD)
- Eval harness uses binary relevance for recall@k; LLM-as-judge gated behind config flag (default off)
- Trust-gate hook fails-open on parse errors (don't block user on hook bugs)
- isHighImpact uses case-insensitive regex; conservative (may over-block, but safer)
- Golden set seeds 10 queries — operators expand over time
- Coverage ratchet deferred to CI configuration (not enforced in-code this release)

## Active blockers
None (branch needs git push).

## Context for next session
MindForge v11.2.0 "Verification & Trust" fully implemented on branch `feat/v11.2.0-verification-trust`. 56 test files passing (0 failed, 2 skipped). v11.3.0 work: flip shadow-mode routing (requires eval pass), coverage ratchet enforcement, dense embeddings exploration.

## Last updated
2026-05-31T12:00:00Z
