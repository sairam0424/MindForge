---
name: mindforge:costs
description: Real-time cost tracking for AI model usage
argument-hint: [--phase N] [--session ID] [--window 7d]
allowed-tools:
  - view_file
  - run_command
---

<objective>
Monitor and control project expenses related to AI model usage, enforcing budget guardrails and providing granular spend analysis.
</objective>

<execution_context>
.claude/commands/mindforge/costs.md
</execution_context>

<context>
Metrics: Total spend, daily limit usage, per-model breakdown.
Sources: AUDIT.jsonl and local token logs.
</context>

<process>
1. **Gather Usage Data**: Parse logs for the specified phase, session, or time window.
2. **Calculate Spend**: Apply pricing models to the detected token counts per model.
3. **Enforce Budgets**: Compare current spend against configured daily and project limits.
4. **Display Report**: Present the total spend and limit usage as a percentage.
</process>
