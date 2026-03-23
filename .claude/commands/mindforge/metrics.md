---
name: mindforge:metrics
description: Display session and phase quality trends with early warning signals
argument-hint: [--phase N] [--window short|medium|long] [--export path]
allowed-tools:
  - list_dir
  - view_file
  - write_to_file
---

<objective>
Provide a dashboard of software delivery metrics, identifying quality trends and providing early warning signals for architectural or process decay.
</objective>

<execution_context>
.claude/commands/mindforge/metrics.md
</execution_context>

<context>
Sources: .mindforge/metrics/*.jsonl, .planning/AUDIT.jsonl
Sub-metrics: Session quality, phase metrics, skill usage, compaction quality.
</context>

<process>
1. **Fetch Metrics**: Read the relevant JSONL logs based on the requested window.
2. **Analyze Trends**: Correlate session quality with verify pass rates and security findings.
3. **Build Dashboard**:
    - Quality trends graph (text-based).
    - Failure/Compaction summary.
    - Early warnings (e.g., "Rising complexity in Wave 2").
4. **Export (Optional)**: If requested, write the aggregated metrics to the target path.
5. **Log**: Record `metrics_viewed` in the audit log.
</process>
