---
name: mindforge:retrospective
description: Facilitate a structured retrospective with metrics and insights
argument-hint: [phase N|milestone M] [--template agile|4ls|starfish]
allowed-tools:
  - view_file
  - write_to_file
  - list_dir
---

<objective>
Guide the project team through a structured reflection session at the end of a phase or milestone, combining quantitative delivery data with qualitative feedback to drive process improvement.
</objective>

<execution_context>
.claude/commands/mindforge/retrospective.md
</execution_context>

<context>
Target: Specified Phase or Milestone.
Data: Task stats, pass rates, UAT results, security findings.
Knowledge: MINDFORGE.md (for potential config updates).
</objective>

<process>
1. **Signal Gathering**: Collect quantitative performance data for the target period.
2. **Facilitate Discussion**: Run the interview based on the selected template (Agile, 4Ls, etc.).
3. **Document**: Write the retrospective artifact in the phase or milestone directory.
4. **Action Items**: Create follow-up tasks for process improvements.
5. **Config Update**: Prompt the user to update `MINDFORGE.md` based on learnings (e.g., adjusting task limits).
6. **Log**: Record `retrospective_completed` in metrics.
</process>
