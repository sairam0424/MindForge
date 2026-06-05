---
description: "Evaluate build vs buy decision with TCO analysis. Usage: /mindforge:build-vs-buy [capability] [--timeline N months] [--strategic high|low]"
---

<objective>
Evaluate whether to build a capability in-house or purchase/adopt an external solution, using total cost of ownership analysis, strategic alignment scoring, and vendor lock-in risk assessment.
</objective>

<execution_context>
@.mindforge/skills/build-vs-buy/SKILL.md
</execution_context>

<context>
Arguments: $ARGUMENTS (capability name, optional --timeline, optional --strategic)
Knowledge: Architecture docs, team capacity, existing vendor contracts, strategic roadmap.
</context>

<process>
1. **Define Capability Needed**: Clarify the exact capability, its boundaries, and who the internal consumers are. Document functional and non-functional requirements.
2. **Identify Buy Options**: Research vendor solutions (SaaS, managed services) and open-source alternatives. List at least 3 candidates with pricing models.
3. **Estimate Build Effort**: Calculate engineering effort (person-months), required expertise, timeline to MVP, and timeline to production-grade.
4. **Calculate Ongoing Maintenance**: For the build path, estimate annual maintenance cost (bug fixes, upgrades, on-call, infrastructure). Apply 20-40% of initial build cost as baseline.
5. **Calculate TCO For Each Option**: Project total cost over the specified timeline (default 36 months). Include: licensing, integration effort, training, migration cost, and opportunity cost of engineering time.
6. **Assess Vendor Lock-in Risk**: Score each buy option on data portability, API standardization, contract flexibility, and exit cost. Flag any single-vendor dependency.
7. **Evaluate Strategic Importance**: Score how core this capability is to the business (commodity vs differentiator). Core differentiators favor build; commodities favor buy.
8. **Score Decision Matrix**: Weight factors (cost 30%, strategic fit 25%, time-to-value 20%, risk 15%, team growth 10%) and produce a quantified recommendation.
9. **Recommend With Confidence Level**: State the recommendation (build/buy/hybrid) with a confidence percentage and the top 2 factors driving the decision.
10. **Document As ADR**: Write an Architecture Decision Record capturing the decision, context, options considered, and consequences.
</process>
