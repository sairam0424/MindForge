---
name: mindforge:quick
description: Execute an ad-hoc task without full lifecycle management
argument-hint: [--research] [--review] [--full]
allowed-tools:
  - run_command
  - view_file
  - write_to_file
  - list_dir
---

<objective>
Provide a lightweight workflow for small bug fixes, documentation updates, or dependency maintenance that bypasses the formal phase planning while maintaining strict security and quality guardrails.
</objective>

<execution_context>
.claude/commands/mindforge/quick.md
</execution_context>

<context>
Scope: < 6 files, < 2 hours of work.
Storage: .planning/quick/[NNN]-[slug]/
Flags: --research (add pre-analysis), --review (add quality check), --full (add comprehensive tests/linting).
</context>

<process>
1. **Intake**: Verify the task fits within the "Quick" scope. Redirect to `/mindforge:plan-phase` if too large.
2. **Research (Optional)**: If `--research` is set, spawn a subagent to investigate the approach and write a research note.
3. **Plan**: Generate an XML-based task plan in the `.planning/quick/` directory with a sequential ID.
4. **Security Check**: Automatically load `security-review/SKILL.md` if the task touches sensitive keywords (Auth, PII, Secrets).
5. **Execute**: Implement the plan, run the specified verify command, and fix any lint errors.
6. **Review (Optional)**: If `--review` is set, perform a code quality audit on the diff.
7. **Finalize**: Commit the changes with the `quick/[NNN]` prefix and write a `SUMMARY.md`.
8. **Audit**: Log `quick_task_completed` with file counts and flag usage.
</process>
