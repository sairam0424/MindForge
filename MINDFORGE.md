# MINDFORGE.md — Parameter Registry (v11.9.3)

## 1. IDENTITY & VERSIONING

[NAME]    = MindForge
[VERSION] = 11.9.3
[STABLE]  = true
[MODE]    = "Platform Sovereign"
[REQUIRED_CORE_VERSION] = 11.9.1
[SOVEREIGN_IDENTITY] = true
[SRE_LAYER_ENABLED]  = true

## 2. INTELLIGENCE TOGGLES (V4 UPDATES)

[SWARM_ORCHESTRATION] = true
[AUTO_SWARM_THRESHOLD] = 7.0
[CONTEXT7_DEPTH] = "EXTENDED"
[DYNAMISM_LEVEL] = 5
[REACTIVE_MODE] = true
[CONTEXT_SHARDING] = true
[ADS_LOOP_ENFORCED]  = true
[TEMPORAL_VISION]    = true
[RAG_2_AUTO_SHADOW] = true
[ENABLE_ART_TRACING] = true
[ENABLE_ZTAI] = true
[ZTAI_KEY_TYPE] = "Dilithium-5"
[NEXUS_TRACE_RETENTION_DAYS] = 30
[CADIA_CORE] = true
[PQAS_ENFORCED] = false  # PQAS is SIMULATED/inactive by default (config: pqas_enabled=false, gated behind experimental.pqc_demo). Tier-3 trust uses real Ed25519. See .mindforge/config.json + bin/governance/quantum-crypto.js.
[PROACTIVE_HOMING] = true

---

## 3. MODEL TOPOLOGY

### Persona to Model mapping (v10: Claude 4.x aligned)

[PLANNER]  = claude-opus-4-7
[EXECUTOR] = claude-sonnet-4-6
[REVIEWER] = claude-sonnet-4-6
[VERIFIER] = claude-sonnet-4-6
[SECURITY] = claude-opus-4-7
[DEBUG]    = claude-opus-4-7
[RESEARCH] = gemini-2.5-pro
[QA]       = claude-sonnet-4-6

---

## 4. GOVERNANCE & ECONOMICS

### Limits and safety gates

[COST_WARN_USD]       = 2.00
[COST_HARD_LIMIT_USD] = 25.00
[ADS_DEBATE_ROUNDS]   = 2
[MIN_SOUL_SCORE]      = 7.0
[REQUIRE_ADR]         = true
[BLOCK_ON_SECURITY]   = true

---

## 5. RESOURCE GEOMETRY

### Paths and ports

[BROWSER_PORT]    = 7338
[DASHBOARD_PORT]  = 7339
[API_URL]         = <http://localhost:3000>
[SHARD_RETAIN_DAYS] = 7

---

## 6. PROJECT CONSTRAINTS

### Static rules for the agent

[FORBIDDEN] = """

- No direct DB access from frontend
- No synchronous I/O in API handlers
- No console.log in production services
- No TODO comments in committed code

"""

[INSTRUCTIONS] = """

- Check packages/shared before creating utilities.
- Backend middleware follows Fastify conventions.
- Date manipulation using date-fns only.

"""

---

## 7. NON-OVERRIDABLE

The following parameters cannot be overridden by plugins, agents, or session-level configuration:

- [MIN_SOUL_SCORE] — Minimum SOUL score required for architectural changes
- [BLOCK_ON_SECURITY] — DECLARED, UNREAD. `git grep -l BLOCK_ON_SECURITY -- bin/` returns nothing:
  no code reads this key, so it changes no behaviour and deleting it fails no validation (the schema
  lists it as `recommended`, not `required`). What actually blocks a config-weakening edit is the
  `mindforge-config-protection` hook, which is deny-class and fails closed — see SECURITY.md.
- [COST_HARD_LIMIT_USD] — **enforced as of 11.9.3** (COST-02). `bin/models/cost-tracker.js` `preflight()` reads this key, adds the call estimate to today's ledger spend, and throws `COST_LIMIT_REACHED`; `bin/models/model-client.js` re-throws it, so the model call is refused. Non-overridable means a plugin or session cannot raise the number — it does not mean a cap always exists: `0`, or the key being absent, legally disables the cap, because an upgrade never rewrites an existing MINDFORGE.md (`bin/installer-core.js:706`) and the schema lists this key as `recommended`, not `required`. A present-but-unreadable value (e.g. `= none`) is a hard config fault — `preflight()` throws `COST_LIMIT_MISCONFIGURED` instead of running uncapped
- [BLOCK_ON_SECURITY] is non-overridable; PQAS itself is simulated/experimental (inactive by default) and is NOT a non-overridable guarantee — do not rely on it as an enforced control
- [SOVEREIGN_IDENTITY] — DECLARED, UNREAD. No reader in `bin/`. No identity is verified as a result
  of this key being set.
- [ENABLE_ZTAI] — DECLARED, UNREAD, and the feature it gates is inactive. No reader in `bin/`;
  measured on a live 3116-entry AUDIT.jsonl, 0 entries carry a `signature` or `did`. "Cannot be
  bypassed" overstates a switch that is not wired to anything — see docs/security/ZTAI-OVERVIEW.md,
  which now leads with a status banner.
