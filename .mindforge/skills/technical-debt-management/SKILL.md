---
name: technical-debt-management
version: 1.0.0
min_mindforge_version: 10.0.9
status: stable
triggers: technical debt management, debt inventory, debt interest, refactoring ROI, debt prioritization, debt budget, tech debt tracker, code health score, debt payoff plan, maintenance burden, debt classification, technical liability
---

# Skill — Technical Debt Management

## When this skill activates
Any task involving debt identification, classification, prioritization,
ROI-based refactoring, budget allocation, code health scoring, or payoff planning.

## Mandatory actions when this skill is active

### Before writing any code
1. Classify the debt (deliberate vs inadvertent, prudent vs reckless).
2. Estimate interest rate (hours lost per sprint due to this debt).
3. Calculate payoff ROI before prioritizing.

### During implementation
- Track all debt in backlog with `tech-debt` label + severity + affected area.
- Boy-scout rule: leave code cleaner than found.
- Never create debt without acknowledgment and payoff timeline.
- Fix debt in atomic PRs — never bundle with feature work.

### After implementation
- Update debt inventory with resolved items.
- Recalculate code health score after significant payoffs.
- Document lessons to prevent similar accumulation.

## Debt Classification

| Type | Description | Example |
|------|-------------|---------|
| Deliberate + Prudent | "We know, ship now, fix Sprint N" | Hardcoded config needing config service |
| Deliberate + Reckless | "We know, don't care" | Skipping auth "because VPN" |
| Inadvertent + Prudent | "Didn't know better then" | Hand-rolled state before finding library |
| Inadvertent + Reckless | "Didn't know what we were doing" | N+1 queries from ORM misuse |

## Interest Calculation

```
Weekly Interest = incidents_caused * avg_hours
               + developer_workaround_time
               + onboarding_friction
               + blocked_feature_delays
```

- **High** (>4 hrs/sprint): fix immediately.
- **Medium** (1-4 hrs/sprint): schedule within 2 sprints.
- **Low** (<1 hr/sprint): fix opportunistically.

## Prioritization Formula

```
Priority Score = interest_per_sprint / effort_to_fix_hours
Higher score = fix first (best ROI)
```

## Debt Budget (The 20% Rule)
- 20% of sprint capacity for debt payoff (non-negotiable).
- 10% targeted high-interest debt. 5% boy-scout cleanup. 5% prevention tooling.
- Increase when: health score < 60, velocity declining 3+ sprints, incidents rising.

## Code Health Score (0-100)

```
Health = test_coverage(25%) + dependency_freshness(20%)
       + complexity(25%) + documentation(15%) + incident_inverse(15%)
```

- Test coverage: 80%+ = 100pts, 60-80% = 75, 40-60% = 50, <40% = 25.
- Complexity: avg cyclomatic per function. <5 = 100, 5-10 = 75, >10 = 50.
- Track monthly. Alert if drops >10 points in one month.

## Self-check before task completion

- [ ] Is all identified debt logged with classification and severity?
- [ ] Is interest rate estimated for each item?
- [ ] Is payoff prioritized by ROI (interest / effort)?
- [ ] Is the 20% debt budget respected in sprint planning?
- [ ] Are new debts acknowledged with a payoff timeline?
- [ ] Is code health score calculated and tracked?
- [ ] Are debt fixes in isolated PRs (not bundled with features)?
