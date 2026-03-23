---
name: mindforge:next
description: Auto-detect the current state and execute the appropriate next step
argument-hint: none
allowed-tools:
  - list_dir
  - view_file
---

<objective>
Simplify the developer workflow by automatically determining the most logical next action based on the current project state, guided by `STATE.md` and `HANDOFF.json`.
</objective>

<execution_context>
.claude/commands/mindforge/next.md
</execution_context>

<context>
Priority: `HANDOFF.json` is used for session continuity if updated within 48 hours.
State Awareness: Detects missing initialisation, missing plans, partial execution, or pending verification/shipping.
</context>

<process>
1. **Session Check**: Read `HANDOFF.json`. If a fresh `next_task` exists, offer to resume.
2. **State Analysis**: Run the decision tree against `STATE.md`:
    - Not initialised? → `init-project`.
    - No phases? → `plan-phase 1`.
    - Plan missing? → `plan-phase [N]`.
    - Partial execution? → Offer to resume `execute-phase [N]`.
    - Pending verification? → `verify-phase [N]`.
    - Pending shipping? → `ship [N]`.
3. **Handling Partially Executed Phases**: Identify specifically which plans lack SUMMARY files and offer targeted resumption.
4. **Confirm**: Present the detected next step and command to the user for confirmation before acting.
</process>
