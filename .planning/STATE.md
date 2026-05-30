# MindForge — Project State

## Status
🟢 Active — v11.1.0 (Beast Mode)

## IMPORTANT
HANDOFF.json is committed to git. Never write secrets or credentials into it.
Write "see .env" or "stored in secrets manager" if a note needs to reference credentials.


## Current version
v11.1.0 — Beast Mode release. Integrity-first upgrade: tamper-evident signed audit chain, opt-in dependency-DAG wave planning, unified cost-aware routing with prompt-cache accounting, native Claude Code alignment (real hooks, instinct capture, OTel tracing, RRF retrieval fusion).

## Current phase
v11.1.0 implemented. Ready for release (push + tag + publish gated on human approval).

## Last completed task
v11.1.0 beast-mode — 4 pillars: Integrity & Trust (UC-09/04/04b/24), Orchestration Correctness (UC-03/14/10), Cost-Aware Routing (UC-05/21/06), Native Alignment + Observability (UC-19a/11/18/20).

## Next action
Push branch, open PR, let CI validate, then tag + publish v11.1.0 with human approval.

## Decisions made
- Align-first strategy: delegate orchestration substrate to native Claude Code; concentrate on differentiated layer.
- Version: 11.1.0 minor (new backward-compatible capability, per SemVer).
- Kahn DAG ships opt-in only (explicit .wave always wins); never default this release.
- Difficulty routing in shadow-mode (logs, doesn't gate); requires eval before flipping.
- Ed25519 signing deferred (in-memory keys can't verify cross-process); hash-chain alone delivers tamper-evidence.
- Simulated PQC off live trust path by default; gated behind experimental.pqc_demo.
- Audit rotation retired (broke hash chain); unbounded growth accepted short-term.

## Active blockers
None (branch needs git push — DestructiveGuard hook routes to user).

## Context for next session
MindForge v11.1.0 "Beast Mode" fully implemented on branch `fix/v11.0.1-stability-patch` (51 commits, 53 tests). Stretch items (UC-08/25 verification runner, UC-22 trust boundaries) deferred to v11.2.0.

## Last updated
2026-05-31T00:00:00Z
