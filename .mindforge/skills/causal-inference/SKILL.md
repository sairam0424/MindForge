---
name: causal-inference
version: 1.0.0
min_mindforge_version: 10.6.0
status: stable
triggers: causal inference analysis, A/B test statistical analysis, uplift modeling, propensity score matching, counterfactual reasoning, treatment effect estimation, causal graph, instrumental variable, difference in differences, causal impact, experiment analysis methodology, selection bias correction
---

# Skill — Causal Inference

## When this skill activates
This skill activates when analyzing treatment effects, designing A/B tests with statistical rigor, building uplift models, or performing counterfactual reasoning. Use when you need to establish causation (not just correlation) between interventions and outcomes.

## Mandatory actions when this skill is active

### Before writing any code
1. Define the causal estimand precisely (ATE, ATT, CATE) and document all causal assumptions (SUTVA, ignorability, positivity)
2. Draw a Directed Acyclic Graph (DAG) identifying treatment, outcome, confounders, mediators, colliders, and instrumental variables
3. Select the appropriate causal inference method (RCT analysis, propensity scoring, instrumental variables, diff-in-diff, RDD, synthetic control) based on data structure and identification strategy
4. Calculate minimum detectable effect size and required sample size with power analysis (typically 80% power, 5% alpha)

### During implementation
- Validate the overlap/common support assumption by examining propensity score distributions across treatment groups
- Test for balance on all confounders after matching/weighting (standardized mean differences <0.1, variance ratios 0.5-2.0)
- Implement sensitivity analysis to assess robustness to unmeasured confounding (e.g., Rosenbaum bounds, E-values)
- Use doubly robust estimators when possible (combining outcome regression and propensity scoring for consistent estimates)
- Check for heterogeneous treatment effects across subgroups and report conditional average treatment effects (CATE)
- Validate parallel trends assumption for difference-in-differences designs with pre-treatment period analysis
- Report confidence intervals using robust standard errors (clustered at appropriate level) or bootstrap resampling

### After implementation
- Present results with effect sizes in original units (not just p-values) and practical significance interpretation
- Document all assumptions made, sensitivity analysis results, and potential violations of causal identification
- Create visualization showing treatment effect heterogeneity across covariates and subgroups
- Generate reproducible analysis pipeline with versioned data, code, and randomization logs

## Self-check before task completion
- [ ] Causal DAG documented with clear identification strategy and testable implications
- [ ] Balance diagnostics show adequate covariate balance (SMD <0.1) after adjustment
- [ ] Sensitivity analysis demonstrates results are robust to reasonable violations of assumptions
- [ ] Confidence intervals and effect sizes reported in interpretable units with business context
- [ ] All code is reproducible with seed setting for randomization and resampling procedures
