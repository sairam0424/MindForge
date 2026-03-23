---
name: mindforge:new-runtime
description: Scaffold support for a new AI coding runtime
argument-hint: [name]
allowed-tools:
  - run_command
  - list_dir
  - write_to_file
---

<objective>
Extend MindForge to support additional AI environments (Zed, Cursor, Void, etc.) by scaffolding the necessary instruction files and updating the global installer configuration.
</objective>

<execution_context>
.claude/commands/mindforge/new-runtime.md
</execution_context>

<context>
Config: bin/installer-core.js
Targets: Global and Local scopes.
</context>

<process>
1. **Identify**: Determine the specific instruction file format for the target runtime.
2. **Scaffold**: Create the directory structure and placeholder documentation for the new integration.
3. **Configure**: Update the central `installer-core.js` mapping to include the new runtime identifier.
4. **Onboard**: Generate customized first-run instructions for the user to enable the runtime immediately.
</process>
