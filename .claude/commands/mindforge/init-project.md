---
name: mindforge:init-project
description: Initialise a new project under the MindForge framework
argument-hint: none
allowed-tools:
  - view_file
  - write_to_file
  - list_dir
---

<objective>
Initialise a new project by conducting a structured requirements interview, setting up the `.planning/` directory, and creating the foundational context files (PROJECT.md, REQUIREMENTS.md, STATE.md, HANDOFF.json).
</objective>

<execution_context>
.claude/commands/mindforge/init-project.md
</execution_context>

<context>
Target Directory: .planning/
State: Checks if .planning/PROJECT.md already exists before re-initialising.
</context>

<process>
1. **Pre-check**: Read `.planning/PROJECT.md`. If it exists, ask the user if they want to re-initialise.
2. **Requirements Interview**: Ask the following 7 questions one by one:
    - Description of the project.
    - Primary user description.
    - Problem statement.
    - Tech stack (recommend one if requested).
    - Scope exclusions (v1).
    - Success criteria.
    - Compliance requirements.
3. **Generate Context Files**:
    - Write `.planning/PROJECT.md` with the interview results.
    - Write `.planning/REQUIREMENTS.md` with functional and non-functional tables.
    - Write `.planning/STATE.md` set to "Project initialised".
    - Write `.planning/HANDOFF.json` with initial state and context references.
4. **Finalize**: Confirm the creation of files and guide the user to the next step (`/mindforge:plan-phase 1`).
</process>
