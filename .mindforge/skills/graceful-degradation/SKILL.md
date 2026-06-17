---
name: graceful-degradation
version: 1.0.0
min_mindforge_version: 10.0.9
status: stable
triggers: graceful degradation, circuit breaker cascade, fallback hierarchy, reduced functionality mode, health-based routing, partial availability, degraded response, feature shedding, load shedding, priority-based degradation, degradation strategy, availability tier
---

# Skill — Graceful Degradation

## When this skill activates
Any task involving resilience under failure, circuit breakers, fallback hierarchies,
load shedding, feature shedding, or priority-based degradation design.

## Mandatory actions when this skill is active

### Before writing any code
1. Classify all features into availability tiers (critical/important/nice-to-have).
2. Define fallback hierarchy for each external dependency.
3. Identify degradation triggers and corresponding responses.

### During implementation
- Circuit breakers on all external service calls.
- Fallback responses for every dependency (cache → static → error).
- Feature flags to disable non-critical features under load.
- Load shedding with priority-based request classification.

### After implementation
- Chaos test: kill dependencies, spike load, verify partial functionality.
- Verify system remains usable when any single dependency fails.
- Document degradation playbook for on-call.

## Availability Tiers

| Tier | Policy | Examples |
|------|--------|----------|
| Tier 1: Critical | Never shed | Auth, payments, data persistence, core API |
| Tier 2: Important | Shed under extreme load | Search, recommendations, notifications |
| Tier 3: Nice-to-have | Shed early | Personalization, A/B tracking, social features |

## Load Shedding

```
Priority 1 (Critical):  Health checks, auth, payment finalization
Priority 2 (High):      Core reads/writes, search
Priority 3 (Normal):    Recommendations, analytics, batch
Priority 4 (Low):       Prefetching, enrichment, non-critical webhooks
```

- At 80% capacity: reject P4. At 90%: reject P3+P4. At 95%: P1 only.
- Return 503 with `Retry-After`. Never reject P1 (that means full outage).

## Fallback Hierarchies

```
Live data → Cached (recent) → Static default → Graceful error (hide widget)
```

- Each level independently deployable and testable.
- Fallback data pre-computed and stored close to consumer.
- Never let fallback failure cascade. Log fallback frequency as health signal.

## Circuit Breaker Design

- **Closed** (normal): requests flow, track failure rate.
- **Open** (tripped): return fallback immediately, no calls to dependency.
- **Half-Open** (probing): allow 1 request to test recovery.
- Config: 5 failures/30s → OPEN, 30s timeout → HALF-OPEN, 3 successes → CLOSED.

### Cascade Prevention
- Timeout hierarchy: A→B=2s, B→C=500ms. When C trips in B, B returns fallback to A.
- A never sees C's failure — only potentially degraded but fast responses from B.

## Health-Based Routing
- Each instance reports health score (0-100) based on CPU, errors, latency, memory.
- Score >80: full traffic. 50-80: reduced traffic. <50: no new traffic, drain.

## Feature Shedding (Shed First)
1. Search-as-you-type / autocomplete.
2. Personalized recommendations (ML model calls).
3. Real-time analytics / activity feeds.
4. Image/video transcoding.
5. Non-critical webhooks.

Automated via feature flags tied to system load. Re-enable gradually after recovery.

## Self-check before task completion

- [ ] Are all features classified into availability tiers?
- [ ] Is there a fallback for every dependency (cache → static → error)?
- [ ] Are circuit breakers on all external calls?
- [ ] Is load shedding priority-based with correct request classification?
- [ ] Does the system remain usable when any single dependency fails?
- [ ] Are feature flags in place for non-critical shedding?
- [ ] Is the degradation playbook documented for on-call?
