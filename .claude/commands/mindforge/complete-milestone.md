---
name: mindforge:complete-milestone
description: Archive a completed milestone and prepare the next version
argument-hint: <name> <version>
allowed-tools:
  - list_dir
  - view_file
  - write_to_file
  - run_command
---

<objective>
Finalize a project milestone by summarizing shipped value, archiving phase artifacts, and preparing the environment for the next development cycle.
</objective>

<execution_context>
.claude/commands/mindforge/complete-milestone.md
</execution_context>

<context>
Validation: Ensures all included phases are verified and have no pending approvals.
Storage: Moves phase files to a milestone-specific archive.
</context>

<process>
1. **Validate**: Confirm every phase in the milestone is signed off and verified.
2. **Summarize**: Generate a MILESTONE-REPORT with shipped functionality, risks, and follow-ups.
3. **Archive**: Move the included `.planning/phases/` directories to a persistent milestone archive.
4. **Tag**: Create a git release tag for the milestone.
5. **State Reset**: Update `STATE.md` to reflect the milestone completion and target the next version.
6. **Audit**: Log `milestone_completed` event.
</process>
