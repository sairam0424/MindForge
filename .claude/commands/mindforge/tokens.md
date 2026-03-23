---
name: mindforge:tokens
description: Analyze token consumption profile and efficiency
argument-hint: [--phase N] [--session ID] [--window short|medium|long] [--optimise]
allowed-tools:
  - view_file
  - run_command
---

<objective>
Deeply analyze how tokens are being consumed across the project to identify waste, improve prompt efficiency, and optimize context budgeting.
</objective>

<execution_context>
.claude/commands/mindforge/tokens.md
</execution_context>

<context>
Analysis Focus: Input vs Output tokens, cache hits/misses, compaction efficiency.
</context>

<process>
1. **Fetch Profiles**: Read token usage data for the specified scope.
2. **Identify Waste**: Detect large, repetitive context injections or missed cache opportunities.
3. **Optimization Advice**: If `--optimise` is set, provide specific recommendations (e.g., "Summarize ARCHITECTURE.md to save 2k tokens/session").
4. **Report**: Display the token consumption profile and efficiency score.
</process>
