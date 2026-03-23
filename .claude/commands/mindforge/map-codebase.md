---
name: mindforge:map-codebase
description: Onboard MindForge to an existing project by mapping architecture and conventions
argument-hint: [area]
allowed-tools:
  - run_command
  - list_dir
  - view_file
  - write_to_file
---

<objective>
Rapidly bootstrap MindForge context for brownfield repositories by scanning files to infer architecture, technology stack, and actual coding conventions used by the existing team.
</objective>

<execution_context>
.claude/commands/mindforge/map-codebase.md
</execution_context>

<context>
Target: Existing repositories without MindForge initialization.
Security: Enforces strict exclusion list (secrets, keys, pems, ignores).
Strategy: Sampling for large codebases (>200 files).
</context>

<process>
1. **Inventory**: Count source files and decide on a reading strategy (Sampling vs. Full).
2. **Parallel Analysis**:
    - **Stack Agent**: Identify runtimes, frameworks, and databases.
    - **Architect Agent**: Discover architectural patterns and domain models.
    - **Convention Agent**: Document actual naming and error handling patterns found in code.
    - **Quality Agent**: Assess testing and linting status.
3. **Synthesis**: Write `ARCHITECTURE.md`, `PROJECT.md`, and a draft `CONVENTIONS.md`.
4. **Review**: Present findings to the user for correction and confirmation.
5. **Initialize**: Finalize `STATE.md` and transition the project to "Ready to plan".
</process>
