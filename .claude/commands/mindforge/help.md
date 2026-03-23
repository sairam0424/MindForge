---
name: mindforge:help
description: Show all available MindForge commands and current project summary
argument-hint: none
allowed-tools:
  - list_dir
  - view_file
---

<objective>
Provide a searchable, categorized directory of all accessible MindForge commands, along with a quick snapshot of the project's current state.
</objective>

<execution_context>
.claude/commands/mindforge/help.md
</execution_context>

<context>
Discovery: Scans `.claude/commands/mindforge/*.md`
State: PROJECT.md and STATE.md
</context>

<process>
1. **Command Scan**: List all markdown definitions in the command directory and extract their first-line descriptions or YAML metadata.
2. **Read Project Info**: Summarize the current project name, active phase, and recommended next step.
3. **Format Dashboard**: Render a clean table of commands and descriptions.
4. **Verify Context**: If `CLAUDE.md` hasn't been read in the current session, remind the user to load it as the agent's context.
5. **Display**: Present the help table and project summary.
</process>
