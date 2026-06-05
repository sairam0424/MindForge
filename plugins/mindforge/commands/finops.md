---
description: "Estimate and optimize cloud infrastructure costs. Usage - /mindforge:finops [service] [--forecast 6m] [--target-savings 20%]"
---

<objective>
Estimate current cloud infrastructure costs, identify optimization opportunities,
model cost reduction alternatives, and create an actionable implementation plan
that achieves the target savings percentage without degrading service reliability
or performance within the forecast period.
</objective>

<execution_context>
@.mindforge/skills/cost-estimation/SKILL.md
</execution_context>

<context>
$ARGUMENTS
</context>

<process>
1. Inventory current resources by category: compute (instances, containers, serverless), storage (block, object, database), network (egress, load balancers, CDN), and managed services (queues, caches, search). Tag each with monthly cost and owner team.
2. Measure utilization for each resource: CPU average/peak, memory average/peak, storage used vs provisioned, network bandwidth vs capacity. Flag resources with average utilization below 30% as candidates for right-sizing.
3. Identify waste across categories: unused resources (no traffic for 7+ days), oversized instances (peak utilization < 50% of capacity), idle load balancers, unattached volumes, orphaned snapshots, and over-provisioned databases.
4. Model cost alternatives based on --target-savings: reserved instances (1yr/3yr commitment for steady-state), spot/preemptible for fault-tolerant workloads, smaller instance families, ARM-based options, and serverless conversion for spiky workloads. Calculate break-even for each.
5. Estimate savings per optimization: calculate monthly/annual savings, implementation effort (hours), risk level (low/medium/high), and payback period. Rank by savings-to-effort ratio.
6. Create implementation plan with phases: Phase 1 (quick wins, <1 day, no risk), Phase 2 (right-sizing, 1 week, low risk), Phase 3 (architectural changes, 1 month, medium risk). Include rollback plan for each phase.
7. Set up cost alerts and budgets: configure alerts at 80%/100%/120% of monthly budget, per-team cost allocation tags, anomaly detection for unexpected spikes (>20% day-over-day), and weekly cost reports to stakeholders.
8. Track reduction over --forecast period: establish baseline month, measure actual vs projected savings, identify new cost growth areas, and adjust plan quarterly. Report ROI of optimization effort (hours saved in cost / hours invested).
9. Design cost governance policies: mandatory resource tagging, auto-shutdown for dev/staging outside business hours, maximum instance size without approval, and reserved instance utilization monitoring.
10. Log FinOps analysis in AUDIT with: service, current monthly cost, identified savings, target savings percentage, implementation phases, and forecast period.
</process>
