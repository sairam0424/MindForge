---
description: "Execute staged deployment rollout with canary and rollback. Usage - /mindforge:deploy [--depth quick|standard|deep] [--skip-canary] [--rollback]"
---

<objective>
Orchestrate a production deployment through progressive stages with health
monitoring, decision thresholds, and always-ready rollback.
</objective>

<execution_context>
@.mindforge/skills/deployment-workflow/SKILL.md
</execution_context>

<context>
$ARGUMENTS
</context>

<process>
1. Parse depth level: quick (5-10 min), standard (15-30 min), deep (30-60 min with canary).
2. If --rollback: execute rollback plan from last DEPLOYMENT.md, skip forward steps.
3. **Phase 1 — Pre-Deploy**: verify git clean, tests pass, changelog updated, rollback plan documented.
4. **Phase 2 — Build & Bundle**: compile, type check, bundle analysis (warn if >250KB main).
5. **Phase 3 — Staging**: deploy to staging, run health checks, smoke tests, wait for confirmation.
6. **Phase 4 — Production**: select strategy (quick=all-at-once, standard=rolling, deep=canary).
   - If canary: deploy to 5% traffic, monitor error rate for 15 min.
   - Check thresholds: error rate (green <10% above baseline), P95 latency, business metrics.
   - If green: promote to 25% → 50% → 100% (deep) or 100% directly (standard).
   - If red (>2x baseline): trigger automatic rollback.
7. **Phase 5 — Post-Deploy**: verify health endpoints, confirm error rate <1%, compare metrics to baseline.
8. Write DEPLOYMENT.md with: phase timestamps, commit hash, health status, rollback window.
9. Log deployment event in AUDIT with depth level and outcome.
</process>
