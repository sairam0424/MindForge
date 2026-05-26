---
name: experiment-design
version: 1.0.0
min_mindforge_version: 10.0.4
status: stable
triggers: experiment design, A/B testing architecture, statistical significance, sample size calculator, guardrail metric, experiment lifecycle, hypothesis testing, control variant, experiment analysis, metric sensitivity, experiment duration, randomization unit
---

# Skill — Experiment Design (Rigorous A/B Testing Architecture)

## When this skill activates
When designing, planning, or analyzing A/B tests, multivariate experiments, or
any controlled experiment that requires statistical rigor. Use for feature rollout
decisions, conversion optimization, pricing tests, or any scenario where you need
to measure the causal impact of a change.

Core principle: **Hypothesis-first** — never launch an experiment without a written
hypothesis that specifies the expected effect direction, magnitude, and mechanism.

## Mandatory actions when this skill is active

### Before experiment begins

1. **Write the hypothesis in structured format:**
   ```
   If we [change X],
   then [metric Y] will [improve/degrade] by [Z amount]
   because [causal mechanism].
   ```
   - The hypothesis must be falsifiable
   - The expected effect size must be realistic (based on prior data or industry benchmarks)
   - The causal mechanism must be articulated (not just "it will be better")

2. **Calculate sample size:**
   ```
   Inputs:
   - Baseline conversion rate (current metric value)
   - Minimum Detectable Effect (MDE): smallest improvement worth detecting
   - Statistical significance level (alpha): typically 0.05
   - Statistical power (1-beta): typically 0.80
   - Number of variants (control + treatments)

   Output:
   - Required sample size per variant
   - Estimated duration = required_N / daily_traffic_per_variant
   ```

   Rules:
   - MDE should be the smallest PRACTICALLY significant effect (not just statistically significant)
   - If duration > 8 weeks: increase MDE or find higher-traffic surface
   - Never compromise on power — underpowered experiments waste everyone's time

3. **Define guardrail metrics:**
   ```json
   {
     "primary_metric": "conversion_rate",
     "secondary_metrics": ["revenue_per_user", "engagement_time"],
     "guardrail_metrics": [
       {"name": "page_load_time_p95", "threshold": "+200ms", "action": "stop"},
       {"name": "error_rate", "threshold": "+0.5%", "action": "stop"},
       {"name": "revenue_per_session", "threshold": "-2%", "action": "alert"}
     ]
   }
   ```
   - Guardrails are metrics that MUST NOT degrade beyond threshold
   - Violation of a guardrail = experiment stopped regardless of primary metric
   - Always include: performance, error rate, and revenue as guardrails

4. **Choose randomization unit:**
   - **User-level**: Default for most experiments (consistent experience across sessions)
   - **Session-level**: For UI experiments where cross-session contamination is acceptable
   - **Page-level**: Only for layout experiments with no carryover effects
   - **Device-level**: When logged-out users are significant traffic
   - Rule: randomization unit >= analysis unit (never analyze at user level if randomized at page level)

### During experiment

1. **Minimum duration rules:**
   - Run for at least 1 full business cycle (typically 7 days minimum)
   - Recommended: 2 full weeks to capture weekday/weekend variation
   - NEVER stop early because results "look significant" (peeking problem)
   - If using sequential testing: define stopping rules BEFORE launch

2. **Monitoring protocol:**
   - Check guardrail metrics daily
   - Do NOT check primary metric significance until planned end date
   - If peeking is necessary: use group sequential methods with alpha spending
   - Log any system issues that may contaminate results (outages, bugs, other launches)

3. **Sample Ratio Mismatch (SRM) check:**
   - Verify variant assignment is balanced (chi-square test, p < 0.001 = SRM)
   - SRM invalidates the experiment — do not trust results
   - Common causes: bot filtering, redirect failures, bucketing bugs

### After experiment (analysis)

1. **Statistical analysis checklist:**
   - [ ] Confirm no SRM
   - [ ] Check primary metric: p-value < 0.05 AND confidence interval excludes 0
   - [ ] Check practical significance: is the effect size large enough to matter?
   - [ ] Check guardrail metrics: no violations
   - [ ] Check segment consistency: does the effect hold across key segments?
   - [ ] Check novelty/primacy effects: is the effect stable over time?

2. **Decision framework:**
   ```
   IF p < 0.05 AND practical significance AND no guardrail violations:
     → SHIP (roll out to 100%)
   IF p < 0.05 BUT guardrail violation:
     → ITERATE (fix guardrail issue, re-run)
   IF p >= 0.05 AND confidence interval includes meaningful effects:
     → EXTEND (underpowered, run longer or increase traffic)
   IF p >= 0.05 AND confidence interval excludes meaningful effects:
     → KILL (the change doesn't work, move on)
   ```

3. **Document the result:**
   ```markdown
   ## Experiment Result: [name]
   - Hypothesis: [statement]
   - Duration: [days] | Sample: [N per variant]
   - Primary metric: [baseline] → [variant] ([+/-X%], p=[value])
   - Guardrails: [all clear / violations]
   - Decision: SHIP / ITERATE / EXTEND / KILL
   - Learning: [what did we learn about user behavior?]
   ```

## Self-check before task completion

Before marking a task done when this skill was active:

- [ ] Did I write a structured hypothesis with expected effect size and mechanism?
- [ ] Did I calculate required sample size based on MDE and baseline?
- [ ] Did I define guardrail metrics with explicit thresholds?
- [ ] Did I choose an appropriate randomization unit?
- [ ] Did I set minimum duration (>= 1 business cycle)?
- [ ] Did I plan for the peeking problem (no early stopping without sequential testing)?
- [ ] Did I document the decision framework (ship/iterate/extend/kill)?
- [ ] Is the experiment design reproducible by another engineer?
