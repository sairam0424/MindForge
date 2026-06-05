---
description: "Benchmark agent performance end-to-end. Usage: /mindforge:agent-eval [agent] [--tasks N] [--compare baseline] [--metrics quality|cost|speed]"
---

<objective>
Systematically benchmark an agent's end-to-end performance using stratified task datasets, statistical rigor with confidence intervals, and multi-dimensional metrics covering quality, cost, and speed to drive data-informed optimization decisions.
</objective>

<execution_context>
@.mindforge/skills/agent-evaluation-framework/SKILL.md
</execution_context>

<context>
Arguments: $ARGUMENTS (agent name or config, optional --tasks count, optional --compare baseline, optional --metrics focus)
Knowledge: Agent configuration, available task datasets, baseline performance numbers, cost per invocation.
</context>

<process>
1. **Define Evaluation Metrics**: Establish the metrics framework: task completion rate (binary success), output quality score (1-5 rubric), cost per task (tokens in + out), time to completion (wall clock), and error rate (crashes, timeouts, hallucinations).
2. **Build Task Dataset**: Create a stratified dataset with tasks across difficulty levels (easy/medium/hard), task types (research, code, analysis, creative), and edge cases. Minimum 30 tasks per stratum for statistical significance.
3. **Run Agent N Times Per Task**: Execute each task multiple times (minimum 3, ideally 5) to measure variance. Use different random seeds if applicable. Record all outputs and intermediate steps for analysis.
4. **Compute Metrics With Confidence Intervals**: Calculate mean and 95% confidence interval for each metric. Report variance — high variance on the same task indicates reliability issues. Use bootstrap resampling if sample size is small.
5. **Compare To Baseline**: If a baseline exists, compute the delta for each metric with statistical significance testing (paired t-test or Wilcoxon signed-rank). Report effect size (Cohen's d) alongside p-value. Visualize improvements and regressions.
6. **Identify Regression And Improvement Patterns**: Analyze which task types improved and which regressed. Cluster failures by error type. Identify if improvements in one area came at the cost of another (quality-cost tradeoff).
7. **Generate Benchmark Report**: Produce a structured report: executive summary (1 paragraph), metrics table with CIs, task-level breakdown, failure analysis, comparison to baseline, and trend over time (if historical data exists).
8. **Recommend Optimizations**: Based on the evaluation data, recommend specific optimizations: prompt changes for quality issues, caching for cost issues, parallelization for speed issues, or guardrails for reliability issues. Prioritize by impact-to-effort ratio.
</process>
