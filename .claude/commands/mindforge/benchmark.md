---
name: mindforge:benchmark
description: Measure skill effectiveness and project metrics over time
argument-hint: [--skill skill-name] [--compare skill-a skill-b]
allowed-tools:
  - view_file
  - list_dir
---

<objective>
Analyze command and skill performance by correlating usage data with verify pass rates and project quality scores, facilitating data-driven decisions on tool improvements.
</objective>

<execution_context>
.claude/commands/mindforge/benchmark.md
</execution_context>

<context>
Sources: AUDIT.jsonl, skill-usage.jsonl
Metrics: Pass rate, load frequency, anti-pattern reduction, quality lift.
</context>

<process>
1. **Gather Data**: Extract usage and outcome logs for the target skill(s).
2. **Calculate Trends**: Determine pass rate vs baseline and session quality improvement.
3. **Generate Assessment**:
    - For single skill: Provide a usage distribution and quality lift report.
    - For comparison: Provide a head-to-head comparison on cost and effectiveness.
4. **Recommendation**: Advise on whether to keep, improve, or deprecate the targeted skills.
</process>
