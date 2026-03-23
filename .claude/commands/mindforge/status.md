---
name: mindforge:status
description: Display a rich dashboard of the current project state
argument-hint: none
allowed-tools:
  - list_dir
  - view_file
  - run_command
---

<objective>
Provide a high-level visual summary of the project's health, progress, requirement coverage, and recent activity by synthesizing data from the `.planning/` directory.
</objective>

<execution_context>
.claude/commands/mindforge/status.md
</execution_context>

<context>
Sources: STATE.md, AUDIT.jsonl, REQUIREMENTS.md, and phase directories.
Focus: Real-time visibility into phase completion and open issues.
</context>

<process>
1. **Gather Phase Data**: Read `STATE.md` and calculate progress percentage for active/planned phases.
2. **Audit Requirements**: Count total, completed (verified), implemented (untested), and pending requirements from `REQUIREMENTS.md`.
3. **Extract Recent Activity**: Parse the last few entries of `AUDIT.jsonl` (using efficient tail read).
4. **Monitor Issues**: Check for critical security findings, open bugs, or execution blockers.
5. **Render Dashboard**: Display the multi-section summary including header, progress bars, requirement counts, and activity logs.
</process>
