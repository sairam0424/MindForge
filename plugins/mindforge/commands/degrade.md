---
description: "Design graceful degradation strategy with availability tiers. Usage - /mindforge:degrade [service] [--tiers 3] [--shed-at 80%]"
---

<objective>
Design a graceful degradation strategy that classifies all features into
availability tiers, implements fallback behaviors per tier, configures load
shedding thresholds, and ensures the system maintains core functionality
under extreme load or partial failure conditions.
</objective>

<execution_context>
@.mindforge/skills/graceful-degradation/SKILL.md
</execution_context>

<context>
$ARGUMENTS
</context>

<process>
1. Identify all features and external dependencies for the service: list every user-facing feature, background job, third-party integration, and internal service dependency. Map the dependency graph to understand cascade failure paths.
2. Classify into availability tiers based on --tiers flag (default 3): Tier 1 (critical — must always work: auth, core transactions, data integrity), Tier 2 (important — degrade gracefully: search, recommendations, analytics), Tier 3 (nice-to-have — shed first: notifications, personalization, non-essential UI).
3. Design fallback behavior per tier: Tier 1 has no fallback (must work or page), Tier 2 falls back to cached/stale data or simplified behavior, Tier 3 returns empty/disabled state with user-friendly messaging explaining reduced functionality.
4. Implement circuit breakers for each external dependency: configure failure threshold (5 failures in 10s), half-open retry interval (30s), and success threshold to close (3 consecutive successes). Use bulkhead pattern to isolate dependency failures.
5. Configure load shedding thresholds based on --shed-at flag (default 80%): at 80% capacity shed Tier 3, at 90% shed Tier 2, at 95% restrict Tier 1 to authenticated users only. Implement priority queuing — Tier 1 requests always processed first.
6. Test degradation modes systematically: inject failures for each dependency, simulate load at 80/90/95/100% capacity, verify tier shedding activates correctly, confirm no data corruption during degraded operation, and validate recovery when pressure relieved.
7. Document degraded states for operations: create runbook entries for each degradation level, define what users experience at each tier, specify which alerts fire at each transition, and provide manual override procedures.
8. Alert on tier transitions: notify on-call when any tier begins shedding, escalate when Tier 1 is under pressure, track time-in-degraded-state metrics, and auto-page if degradation exceeds 5 minutes without improvement.
9. Design recovery behavior: implement gradual ramp-up when pressure subsides (don't immediately restore all tiers), use hysteresis to prevent oscillation (restore at 70% if shed at 80%), and verify dependency health before reconnecting.
10. Log degradation design in AUDIT with: service, tier classification, shedding thresholds, circuit breaker configs, fallback behaviors, and recovery strategy.
</process>
