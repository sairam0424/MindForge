---
name: capacity-planning
version: 1.0.0
min_mindforge_version: 10.0.9
status: stable
triggers: capacity planning, growth forecasting, resource scaling trigger, headroom calculation, degradation curve, saturation point, scaling threshold, load projection, capacity model, bottleneck forecast, resource budget, traffic forecast
---

# Skill — Capacity Planning

## When this skill activates
Any task involving capacity modeling, growth forecasting, scaling triggers,
headroom calculation, saturation point analysis, or bottleneck forecasting.

## Mandatory actions when this skill is active

### Before writing any code
1. Measure current utilization across all system components.
2. Model growth using historical data and planned launches.
3. Identify the first bottleneck (component that saturates first).

### During implementation
- Define scaling triggers with thresholds and cooldown periods.
- Implement capacity metrics (utilization, queue depth, latency).
- Configure auto-scaling aligned with the capacity model.
- Maintain 30-40% headroom above expected peak.

### After implementation
- Validate model with load testing at projected future load.
- Set alerts for approaching saturation (70%, 85%, 95%).
- Schedule quarterly capacity review to recalibrate.

## Methodology

1. **Measure**: baseline CPU, memory, disk IO, network, app-level metrics (p50/p95/p99).
2. **Model**: organic growth + step functions (launches) + seasonal patterns.
3. **Identify**: map each component to its saturation point, find the first bottleneck.
4. **Plan**: define scaling triggers, budget infrastructure, document runbook.

## Growth Forecasting

```
projected_month_N = current * (1 + growth_rate)^N + planned_launch_impact
```

- Historical trend: last 3-6 months. Seasonal patterns: daily/weekly/yearly peaks.
- Peak-to-average ratio determines required vs baseline capacity.

## Headroom Calculation

```
Required Capacity = Expected Peak / (1 - headroom_fraction)
Example: 700 RPS peak, 30% headroom → 700/0.70 = 1000 RPS provisioned
```

- Fast auto-scaling (<2 min): 20-30% headroom.
- Slow scaling (>10 min): 40-50% headroom.
- No auto-scaling: 50%+ or accept degradation risk.

## Saturation Point
- The load at which p99 latency exceeds SLA or error rate exceeds threshold.
- Find via incremental load test (ramp 0 → 2x peak), plot load vs latency.
- The "knee" where the curve bends sharply = saturation. Operate well below it.

## Scaling Triggers

| Metric | Threshold | Action |
|--------|-----------|--------|
| CPU > 70% for 5 min | Scale out application tier |  |
| Memory > 80% | Scale up or out |  |
| Queue depth > 1000 for 3 min | Add consumers |  |
| p99 > 500ms for 2 min | Scale application |  |
| Error rate > 1% for 1 min | Investigate + possibly scale |  |

- Cooldown after scale-out: 5 min. After scale-in: 15 min (prevent flapping).
- Predictive: pre-scale before known peaks (Monday AM, campaign launch).

## Bottleneck Forecasting

| Component | Current Util | Saturation | Time to Sat |
|-----------|-------------|------------|-------------|
| API servers | 45% | 80% | 4 months |
| Database | 62% | 75% | 6 weeks |
| Cache | 30% | 85% | 8 months |

Focus on shortest time-to-saturation first.

## Self-check before task completion

- [ ] Is current utilization measured across all critical components?
- [ ] Is growth model based on historical data plus planned launches?
- [ ] Is the first bottleneck identified with time-to-saturation?
- [ ] Are scaling triggers defined with thresholds and cooldowns?
- [ ] Is 30-40% headroom maintained above expected peak?
- [ ] Has the model been validated with load testing?
- [ ] Are alerts configured for approaching saturation?
