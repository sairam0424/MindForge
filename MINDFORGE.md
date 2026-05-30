# MINDFORGE.md — Parameter Registry (v11.1.0)

## 1. IDENTITY & VERSIONING

[NAME]    = MindForge
[VERSION] = 11.1.0
[STABLE]  = true
[MODE]    = "Platform Sovereign"
[REQUIRED_CORE_VERSION] = 11.1.0
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
[PQAS_ENFORCED] = true
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
- [BLOCK_ON_SECURITY] — Security gate enforcement cannot be disabled
- [COST_HARD_LIMIT_USD] — Hard cost limit cannot be raised without human approval
- [PQAS_ENFORCED] — Post-quantum security cannot be disabled
- [SOVEREIGN_IDENTITY] — Identity verification is always required
- [ENABLE_ZTAI] — Zero-trust identity cannot be bypassed
