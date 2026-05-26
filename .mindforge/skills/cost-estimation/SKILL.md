---
name: cost-estimation
version: 1.0.0
min_mindforge_version: 10.0.9
status: stable
triggers: cost estimation, cloud cost modeling, finops, reserved instance, spot instance, cost forecast, infrastructure cost, cost per request, pricing model, cost optimization plan, resource right-sizing, cost allocation
---

# Skill — Cost Estimation

## When this skill activates
Any task involving cloud cost modeling, FinOps, instance strategy selection,
cost forecasting, per-request cost analysis, right-sizing, or cost allocation.

## Mandatory actions when this skill is active

### Before writing any code
1. Estimate costs BEFORE building: compute + storage + network + managed services.
2. Identify cost-dominant components (usually storage or network egress).
3. Define budget constraints and alerting thresholds.

### During implementation
- Choose instances based on workload profile (compute/memory/IO bound).
- Implement resource tagging for cost allocation from day one.
- Use auto-scaling with min/max bounds.
- Prefer managed services when ops cost exceeds infrastructure savings.

### After implementation
- Set cost alerts at 50%, 80%, 100% of budget.
- Create per-service cost dashboard.
- Schedule monthly cost review for drift and optimization.

## FinOps Phases

- **Inform**: tag all resources, build dashboards, implement showback/chargeback.
- **Optimize**: right-size, reserve steady workloads, spot for batch, eliminate waste.
- **Operate**: automate (scheduled scaling, auto-stop dev), embed cost in PR review.

## Cost Modeling

```
Monthly = Compute + Storage + Network + Managed + Support
Compute: instances * hours * $/hour
Storage: GB * $/GB + IOPS * $/IOP
Network: GB egress * $/GB (ingress usually free)
Cost/Request: total_monthly / total_requests
```

## Instance Strategy

| Type | Discount | Use For | Never For |
|------|----------|---------|-----------|
| On-Demand | 0% | Variable, dev, testing | Steady production (wasteful) |
| Reserved (1-3yr) | 30-72% | Steady production (>70% util for 6+ months) | Uncertain workloads |
| Spot/Preemptible | 60-90% | Batch, CI/CD, fault-tolerant workers | Databases, user-facing |

## Right-Sizing Indicators
- CPU < 40% consistently = oversized.
- Memory < 50% consistently = oversized.
- Process: collect 2-4 weeks metrics → find binding constraint → resize to peak + 20%.

## Cost Allocation Tags (Minimum)
- `team`, `service`, `environment`, `cost-center`.
- Optional: `feature` for per-feature attribution.
- Shared infra: divide proportionally by request count or CPU time.

## Forecasting
```
Next Month = Current * (1 + organic_growth) + planned_launch_impact
```
- Inputs: historical trend (3-6 months), planned launches, seasonal patterns.
- Weekly: check for anomalies. Monthly: forecast vs actual. Quarterly: re-evaluate commitments.

## Self-check before task completion

- [ ] Did I estimate costs before proposing infrastructure?
- [ ] Are resources tagged for cost allocation?
- [ ] Is instance strategy appropriate (on-demand vs reserved vs spot)?
- [ ] Are cost alerts configured at budget thresholds?
- [ ] Is right-sizing based on actual utilization data?
- [ ] Is there a cost visibility mechanism (dashboard)?
- [ ] Are managed-vs-self-hosted trade-offs documented?
