---
description: "Design A/B test with statistical rigor. Usage: /mindforge:experiment [feature] [--metric conversion|engagement|revenue] [--duration 2w]"
---

<objective>
Design a statistically rigorous A/B experiment with proper hypothesis formation, sample size calculation, guardrail metrics, and pre-registered decision rules to avoid p-hacking and ensure valid conclusions.
</objective>

<execution_context>
@.mindforge/skills/experiment-design/SKILL.md
</execution_context>

<context>
Arguments: $ARGUMENTS (feature or change being tested, optional --metric, optional --duration)
Knowledge: Current baseline metrics, traffic volume, previous experiment results, business goals.
</context>

<process>
1. **Form Hypothesis**: Write a falsifiable hypothesis in the format: "If we [change X], then [metric Y] will [increase/decrease] by [minimum detectable effect Z%], because [theory]." Distinguish between exploratory and confirmatory experiments.
2. **Define Primary Metric and Guardrails**: Select one primary metric (the decision metric) and 2-4 guardrail metrics that must not degrade. Define what "degradation" means quantitatively for each guardrail.
3. **Calculate Required Sample Size**: Using baseline conversion rate, minimum detectable effect, significance level (default alpha=0.05), and power (default 0.8), calculate the required sample size per variant. Account for multiple comparisons if testing more than 2 variants.
4. **Choose Randomization Unit**: Select the randomization unit (user, session, device, organization). Consider: consistency of experience, network effects, and statistical independence. Document why.
5. **Set Experiment Duration**: Run for at least 1 full business cycle (typically 1-2 weeks minimum). Account for day-of-week effects, novelty effects, and learning effects. Never peek at results before predetermined end date.
6. **Design Variants**: Define control and treatment(s) precisely. Document the exact user experience for each variant. Ensure only one variable changes between variants (isolation).
7. **Configure Analysis Plan**: Pre-register the statistical test (t-test, chi-squared, Mann-Whitney), correction method for multiple comparisons (Bonferroni, Holm), and segmentation plan. Document before launching.
8. **Define Success Criteria**: Specify the exact threshold for shipping: primary metric improvement is statistically significant AND guardrails are not violated AND practical significance (effect size) justifies the complexity.
9. **Document Decision Rules**: Pre-commit to outcomes: if significant positive = ship; if significant negative = kill; if inconclusive = extend duration or iterate on treatment. Define "inconclusive" precisely.
</process>
