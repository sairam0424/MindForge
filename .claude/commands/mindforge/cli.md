---
description: Design CLI command structure and UX. Usage - /mindforge:cli [app-name] [--style verb-noun|git-style]
---

<objective>
Design a complete CLI application with intuitive command hierarchy, consistent
flag conventions, rich help text, and proper error handling. Prioritizes
discoverability, composability, and non-interactive CI compatibility.
</objective>

<execution_context>
@.mindforge/skills/cli-design/SKILL.md
</execution_context>

<context>
$ARGUMENTS
</context>

<process>
1. Define the command hierarchy based on --style flag. Verb-noun (e.g., `create project`, `list users`) for CRUD-heavy CLIs; git-style (e.g., `init`, `commit`, `push`) for workflow-oriented CLIs. Map all commands in a tree structure.
2. Design flag conventions: short flags (-v) for common options, long flags (--verbose) for all options, boolean flags without values, repeated flags for lists. Use GNU-style -- for positional separator.
3. Write comprehensive help text for every command: one-line description, usage pattern, flag descriptions with defaults, and 2-3 examples showing real usage. Ensure `--help` works at every level.
4. Implement argument parsing with a battle-tested library (commander, yargs, cobra, clap). Define required vs optional args, validate types, and provide suggestions for typos.
5. Define exit codes following conventions: 0 success, 1 general error, 2 usage error, 126 permission denied, 130 interrupted (SIGINT). Document all exit codes.
6. Add interactive prompts for missing required information when running in a TTY. Detect non-TTY (CI) and fail with clear error messages instead of hanging on stdin.
7. Design error messages that are actionable: what went wrong, why, and how to fix it. Include the failed command, relevant context, and a suggested next step.
8. Test in CI (non-interactive mode): verify all commands work with flags only (no prompts), exit codes are correct, stdout/stderr separation is clean, and output is parseable (--json flag).
9. Add shell completion generation (bash, zsh, fish) and man page generation. Configure auto-update checking with opt-out.
10. Log cli invocation in AUDIT with: app name, style, command count, flag conventions defined.
</process>
