---
description: "Inventory and prioritize technical debt with payoff ROI. Usage - /mindforge:tech-debt [--audit] [--budget 20%] [--prioritize]"
---

<objective>
Systematically inventory technical debt across the codebase, classify by type
and severity, calculate the ongoing interest cost (time lost per sprint), compute
payoff ROI for each item, and allocate sprint budget to maximize debt reduction
impact while maintaining feature velocity.
</objective>

<execution_context>
@.mindforge/skills/technical-debt-management/SKILL.md
</execution_context>

<context>
$ARGUMENTS
</context>

<process>
1. Scan for debt signals across the codebase: TODO/FIXME/HACK comments, skipped tests (@skip, .skip()), outdated dependencies (major versions behind), high cyclomatic complexity (>15), duplicated code blocks (>30 lines), and missing type coverage (<80%).
2. Classify each debt item by type: deliberate (conscious trade-off documented in ADR), inadvertent (accidental, discovered post-hoc), bit-rot (gradual decay from ecosystem changes), or reckless (no justification, likely under time pressure). Tag with affected domain.
3. Calculate interest for each item: estimate time lost per sprint due to the debt (slower development, extra bugs, onboarding friction, workarounds). Express as hours/sprint and annualized cost at team rate ($).
4. Compute payoff ROI for each item: (annual interest saved - one-time fix cost) / one-time fix cost. Items with ROI > 3x are high-priority, 1-3x are medium, <1x are low-priority or acceptable debt.
5. Rank all items by payoff ratio descending, with tiebreakers: items blocking new features first, items causing production incidents second, items affecting developer happiness third.
6. Allocate sprint budget based on --budget flag (default 20%): assign top-ranked items to the debt budget, ensure each item is completable within one sprint, create stories with clear acceptance criteria and definition of done.
7. Assign debt items to sprints: distribute across team members based on domain expertise, pair high-risk items with thorough test coverage requirements, and schedule refactoring spikes for items needing design exploration.
8. Track reduction trend over time: maintain a debt ledger with total estimated interest, plot interest reduction sprint-over-sprint, celebrate when annual interest drops below threshold, and flag when new debt outpaces reduction.
9. Establish debt prevention gates: complexity threshold in CI (fail on cyclomatic > 20), dependency update cadence (monthly minor, quarterly major), test coverage floor (never decrease), and mandatory ADR for deliberate debt.
10. Log tech-debt audit in AUDIT with: total items found, classification breakdown, top 5 by ROI, sprint budget allocation, and estimated interest reduction.
</process>
