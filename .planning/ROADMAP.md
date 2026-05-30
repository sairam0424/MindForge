# MindForge Roadmap

### v11.0.1 — Stability Patch ✅ (2026-05-30)
**Goal:** Reconcile version drift, lint-clean CI, fix SDK executeCommand no-op.
**Status:** Shipped.

### v11.1.0 — Beast Mode ✅ (2026-05-31)
**Goal:** Make integrity claims true, align with native Claude Code, add cost-aware routing.
**Status:** Implemented (awaiting push + CI + publish).

**Pillars delivered:**
- [x] Pillar I: Integrity & Trust (UC-09, UC-04/04b, UC-24)
- [x] Pillar II: Orchestration Correctness (UC-03, UC-14, UC-10)
- [x] Pillar III: Cost-Aware Routing (UC-05, UC-21, UC-06)
- [x] Pillar IV: Native Alignment + Observability (UC-19a, UC-11, UC-18, UC-20)

### v11.2.0 — Verification & Trust Boundaries (next)
**Goal:** Unified verification runner, eval harness, tool/MCP trust boundaries.
**Depends on:** v11.1.0
**Plans:**
- [ ] UC-08 + UC-25: Unified verification-runner.js + eval harness (recall@k, LLM-as-judge)
- [ ] UC-22: Tool/MCP trust boundaries (manifest pinning, untrusted output tagging, HITL gate)
- [ ] Coverage ratchet 30% → 60% (stepwise)
- [ ] Wire runCouncil to /mindforge:council command

### v12.0.0 — Oceans (future)
**Goal:** Breaking/transformative changes requiring a major bump.
**Plans:**
- [ ] Real post-quantum crypto (liboqs/ML-DSA FIPS 204) + WebAuthn/FIDO2
- [ ] Full swarm-controller runtime
- [ ] Dense/learned embeddings (local BERT/Ollama)
- [ ] Default DAG ordering (opt-in → default, backward-incompatible)
- [ ] Persisted DID→publicKey store enabling cross-process signature verification
- [ ] Per-wave commit-SHA tracking for real atomic rollback
