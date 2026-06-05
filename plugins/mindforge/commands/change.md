---
name: "mindforge:change"
description: "Plan change management for technical migration. Usage: /mindforge:change [migration] [--scope team|org|platform] [--urgency low|medium|high]"
argument-hint: "[migration] [--scope team|org|platform] [--urgency low|medium|high]"
allowed-tools:
  - list_dir
  - view_file
---

<objective>
Design change management strategies for technical migrations (framework upgrades, platform migrations, architecture rewrites). Balances migration velocity with team stability and system reliability.
</objective>

<execution_context>
@.mindforge/skills/change-management/SKILL.md
</execution_context>

<context>
Skills Directory: `.mindforge/skills/change-management/`
State: Evaluates migration scope, user impact, team capacity, designs phased rollout with rollback triggers, training plans, and success metrics.
</context>

<process>
1. **Migration Impact Assessment**: Classify change magnitude (cosmetic UI refresh vs database migration vs rewrite). Map affected systems (frontend/backend/data/infra). Identify user-facing changes (API contracts, UI patterns, performance characteristics). Estimate blast radius (10 users vs 1000 users vs entire platform).

2. **Rollout Strategy Selection**: Big bang (cut over in one release, acceptable for low-risk cosmetic changes). Phased (rollout in waves by user cohort, standard for moderate risk). Parallel run (old + new coexist with feature flag, required for high-risk data migrations). Strangler fig (gradually replace old system piece by piece, for rewrites).

3. **Phase Decomposition**: Phase 0 (foundation) → infra + logging + kill switches. Phase 1 (alpha) → 1% internal users, validate happy path. Phase 2 (beta) → 10% friendly external users, surface edge cases. Phase 3 (GA) → 100% rollout with automated rollback if error rate >threshold. Each phase requires explicit go/no-go decision.

4. **Rollback Design**: Define rollback triggers (error rate >2%, latency >500ms, complaint rate >5%). Implement kill switch (feature flag to instantly revert to old code). Test rollback procedure before each phase. Document runbook with exact rollback steps. Assign rollback decision maker (on-call engineer or release manager).

5. **Communication Plan**: T-30d → announce migration to eng team, share technical RFC. T-14d → email affected users with "what's changing, when, what to expect". T-1d → final reminder + support channel link. T+0 → rollout begins, status page live. T+7d → retrospective on what worked/failed. Tailor message density to urgency (high urgency = daily updates).

6. **Training & Enablement**: For eng team → brown bag session on new patterns + runbook. For support team → FAQ doc + escalation paths. For users → migration guide with before/after examples. For stakeholders → one-pager on timeline + risk mitigation. Schedule training 2 weeks before rollout, not 2 months (recency matters).

7. **Success Metrics & Monitoring**: Define success criteria before migration starts (zero data loss, latency within 10% of baseline, <5 support tickets). Set up real-time monitoring dashboard. Alert on anomaly detection (sudden spike in errors). Run comparison reports (old vs new performance). Plan for post-migration optimization sprint (address performance regressions found in production).
</process>
