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

### v11.2.0 — Verification & Trust Boundaries ✅ (2026-05-31)
**Goal:** Unified verification runner, eval harness, tool/MCP trust boundaries.
**Status:** Implemented (awaiting push + CI + publish).

**Delivered:**
- [x] UC-08: Unified verification-runner.js (test/lint/audit/typecheck stages + CLI + VERIFICATION.md report)
- [x] UC-25: Eval harness (recall@k, nDCG, runEval orchestrator + 10-query golden set seed)
- [x] UC-22: Tool/MCP trust boundaries (manifest pinning, untrusted tagging, high-impact detection + PreToolUse hook)
- [x] Wire runCouncil to /mindforge:council command (council-cli.js)
- [x] Tech debt batch: singleton bug, dead CLI command, stale version strings, Dilithium-5 labeling

**Deferred to a future minor:**
- [ ] Coverage ratchet 30% → 60% (stepwise CI enforcement)
- [ ] Flip shadow-mode routing to active (requires eval pass first)
- [ ] LLM-as-judge reranker (gated, needs cost/quality measurement)

### v11.3.0 — "Legion" (154-subagent expansion) ✅ (2026-06-04)
**Goal:** Import the full Claude-Code subagent collection into MindForge, rebranded and collision-safe.
**Status:** Shipped (the v11.3.0 npm artifact had a packaging defect — see v11.3.1).
**Delivered:**
- [x] 154 subagents across 10 categories → `.claude/agents/`, fully rebranded (VoltAgent → MindForge)
- [x] 16 persona-name collisions resolved with `-cc` suffix
- [x] `bin/spawn-agent.js subagent <name>` loader mode + hardened allowlist + path-traversal guards
- [x] `.mindforge/imported-agents.jsonl` generated index + `tests/subagent-import.test.js`

### v11.3.1 — Packaging hotfix ✅ (2026-06-05)
**Goal:** Restore the full published payload that v11.3.0's narrow npm allowlist dropped.
**Status:** Shipped and verified end-to-end from the live npm artifact. v11.3.0 deprecated.
**Delivered:**
- [x] Widened npm `files[]` to ship commands (174), skills (73), entry CLAUDE.md, full `.mindforge/`
- [x] Negated runtime state in `files[]` (celestial.db, telemetry jsonl) since `files[]` beats `.npmignore`
- [x] `.planning/` installs from clean `examples/starter-project/.planning` (no dev-state leak)
- [x] Fixed docs/References + docs/Templates case-sensitivity (Linux/npm)
- [x] `tests/packaging-allowlist.test.js` — packs the real tarball, asserts full payload ships

### v11.4.0 — Measured Routing + Coverage (next)
**Goal:** Flip difficulty routing from shadow to active (after eval validates), enforce coverage ratchet.
**Depends on:** v11.2.0 eval harness proving routing quality
**Plans:**
- [ ] Run eval harness on golden set, validate difficulty-scorer accuracy
- [ ] Flip `cost_routing.shadow_mode: false` if eval passes threshold
- [ ] Coverage ratchet: CI gate at 40% → 50% → 60% stepwise
- [ ] LLM-as-judge reranker for retrieval (behind flag, measure cost vs quality gain)
- [ ] Re-enable GitHub Actions so releases publish via signed CI (`--provenance`)

### v12.0.0 — Oceans (future)
**Goal:** Breaking/transformative changes requiring a major bump.
**Plans:**
- [ ] Real post-quantum crypto (liboqs/ML-DSA FIPS 204) + WebAuthn/FIDO2
- [ ] Full swarm-controller runtime
- [ ] Dense/learned embeddings (local BERT/Ollama)
- [ ] Default DAG ordering (opt-in → default, backward-incompatible)
- [ ] Persisted DID→publicKey store enabling cross-process signature verification
- [ ] Per-wave commit-SHA tracking for real atomic rollback
