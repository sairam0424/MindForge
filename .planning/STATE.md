# MindForge — Project State

## Status
🟢 Active — v11.2.1 (Security & Integrity Hardening) — PUBLISHED to npm

## IMPORTANT
HANDOFF.json is committed to git. Never write secrets or credentials into it.
Write "see .env" or "stored in secrets manager" if a note needs to reference credentials.


## Current version
v11.2.1 — Security & integrity hardening patch on top of v11.2.0. Closes every
exploitable security defect and false-assurance stub from the post-v11.2.0
end-to-end audit. No new features, no breaking changes. Published to npm
(latest = 11.2.1).

## Current phase
v11.2.1 published to npm. develop has the release commit + v11.2.1 tag (push
of develop + tag is human-gated). PR #123 (security hardening) merged to develop.

## Last completed task
v11.2.1 release — ~25 of 70 audit findings fixed: Tier-0 security bypasses
(trust-gate multi-line, orbital forged-attestation, policy reasoning_proof,
shadow-mirror injection, isHighImpact), Tier-1 false-assurance stubs
(ztai-archiver Merkle, mesh-self-healer, logic-validator, reason-source-aligner,
sre-manager, eis-client, installer, finding-synthesizer, logic-drift-detector,
session-manager, shadow-mirror docker, regression-writer, skill-registry),
Tier-2/3 hygiene (release-workflow guards, version-drift, dead-code).

## Next action
Push develop + v11.2.1 tag (human-gated). Then v11.3.0 planning.

## Decisions made
- v11.2.1 = patch (fixes + honest-labeling only, no features/breaking changes per SemVer)
- Published manually via `npm publish` from develop (proven path); annotated git tag for history
- Honest-label + real-when-available strategy for stubs (not "make everything real" — avoids heavy deps)
- Worktree isolation only for disjoint-file parallel work; main-tree for edits to recently-changed files (worktree base can lag HEAD)

## Active blockers
None (develop + tag need git push — DestructiveGuard routes to human).

## Context for next session
MindForge v11.2.1 published. ~45 of 70 audit findings remain, all DEFERRED-by-design
(no security risk): #6 Write/Edit gating (UX policy decision), #36 CI coverage 30→80
(needs real test-writing), #45 flip cost_routing.shadow_mode active (gated on eval),
dense embeddings, real PQC, full swarm runtime (v12.0.0 oceans). Full backlog in
agent memory (mindforge-remaining-backlog).

## Last updated
2026-05-31T18:00:00Z
