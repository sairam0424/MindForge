---
name: build-vs-buy
version: 1.0.0
min_mindforge_version: 10.1.0
status: stable
triggers: build vs buy, make or buy, vendor evaluation, total cost ownership, buy decision, vendor lock-in assessment, outsource vs build, third-party evaluation, SaaS vs self-hosted, dependency vs custom, commercial vs open-source, build internally
---

# Build vs Buy Decision Framework

## When this skill activates

This skill activates when the team faces a decision about whether to build a capability
internally or acquire it from an external vendor, open-source project, or SaaS provider.
It provides a structured framework for evaluating total cost of ownership, strategic
alignment, and long-term maintainability of both paths.

## Mandatory actions when this skill is active

### Before

1. **Identify the capability boundary** — Define exactly what the system needs to do.
   Separate the core problem from adjacent concerns.
2. **Gather constraints** — Timeline pressure, team capacity, budget ceiling, compliance
   requirements, and existing technology stack compatibility.
3. **Catalog candidates** — List all viable buy options (commercial SaaS, open-source
   libraries, managed services) alongside the build option.

### During

4. **Calculate Total Cost of Ownership (TCO) for BUY path:**
   - License/subscription fees (year 1 + projected 3-year)
   - Integration effort (API adapters, data transformation, auth hookup)
   - Ongoing maintenance (version upgrades, breaking changes, support tickets)
   - Opportunity cost of vendor limitations (features you cannot customize)
   - Exit cost (data migration, API decoupling, replacement timeline)

5. **Calculate Total Cost of Ownership (TCO) for BUILD path:**
   - Initial development effort (design + implementation + testing)
   - Ongoing maintenance (bug fixes, feature requests, security patches)
   - Ownership benefit (full control, no per-seat pricing, no vendor roadmap dependency)
   - Knowledge investment (team learns the domain deeply)

6. **Assess vendor lock-in risk:**
   - Data portability — Can you export all data in standard formats?
   - API coupling — How deeply does the vendor API penetrate your codebase?
   - Exit cost — What is the realistic effort to replace this vendor?
   - Contractual traps — Auto-renewal, price escalation clauses, minimum commitments.

7. **Apply the decision matrix:**
   - Strategic importance HIGH + Competitive advantage = **BUILD**
   - Strategic importance LOW + Commodity capability = **BUY**
   - Timeline pressure HIGH + Team capacity LOW = **BUY** (short-term), plan migration
   - Timeline pressure LOW + Team capacity HIGH = **BUILD**
   - Differentiating capability = **BUILD** (never outsource your moat)
   - Undifferentiated heavy lifting = **BUY**

8. **Evaluate team capacity:**
   - Does the team have domain expertise to build and maintain this?
   - Will building this distract from higher-priority work?
   - Is there a realistic staffing plan for long-term ownership?

### After

9. **Document the decision** — Record the rationale, TCO comparison, and risk assessment
   as an Architecture Decision Record (ADR).
10. **Define review triggers** — Set conditions that would cause re-evaluation (e.g.,
    vendor price increase >30%, team growth enabling build, vendor acquisition).
11. **Plan the exit path** — Even when buying, design integration layers that allow
    future replacement without full rewrite.

## Self-check before task completion

- [ ] TCO calculated for both paths with 3-year projection
- [ ] Vendor lock-in risk explicitly assessed with exit cost estimate
- [ ] Decision matrix applied with clear justification
- [ ] Team capacity and opportunity cost considered
- [ ] ADR written with rationale and review triggers
- [ ] Integration designed with abstraction layer regardless of buy/build choice
- [ ] Stakeholders informed of trade-offs, not just the recommendation
