---
name: mindforge:ship
description: Create a release PR for a verified phase
argument-hint: [N]
allowed-tools:
  - run_command
  - list_dir
  - view_file
  - write_to_file
---

<objective>
Coordinate the final transition of a phase from "Verified" to "Released" by generating changelogs, running final quality gates, and prepping the pull request for merge.
</objective>

<execution_context>
.claude/commands/mindforge/ship.md
</execution_context>

<context>
Prerequisite: `UAT.md` must be marked as "All passed ✅".
Gates: Type checking, linting, full test suite, security audit.
Format: Follows "Keep a Changelog" and structured PR templates.
</context>

<process>
1. **Pre-check**: Abort if the phase N has not completed UAT or has blocking findings.
2. **Changelog Generation**: Sync SUMMARY files and REQUIREMENTS.md into a new `CHANGELOG.md` entry.
3. **Execution Oversight**: Run final gates (tsc, eslint, npm test, npm audit) and report results.
4. **Draft PR**: Generate a comprehensive PR description including delivered requirements and testing stats.
5. **Commit & Tag**: Commit the changelog changes and push the branch.
6. **State Transition**: Mark Phase [N] as shipped in `STATE.md` and increment the next target phase in `HANDOFF.json`.
7. **Audit**: Log `phase_shipped` with delivered requirement IDs.
</process>
