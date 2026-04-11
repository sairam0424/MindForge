# MINDFORGE.md — Parameter Registry (v6.2.0-alpha)

## 1. IDENTITY & VERSIONING

[NAME]    = MindForge
[VERSION] = 8.1.0-IDENTITY
[STABLE]  = true
[MODE]    = "Sovereign Intelligence Mesh"
[REQUIRED_CORE_VERSION] = 8.1.0
[SOVEREIGN_IDENTITY] = true

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

### Persona to Model mapping

[PLANNER]  = claude-opus-4-5
[EXECUTOR] = claude-sonnet-4-5
[REVIEWER] = claude-sonnet-4-5
[VERIFIER] = claude-sonnet-4-5
[SECURITY] = claude-opus-4-5
[DEBUG]    = claude-opus-4-5
[RESEARCH] = gemini-1.5-pro
[QA]       = claude-4-5-sonnet

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
