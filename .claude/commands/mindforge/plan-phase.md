---
name: mindforge:plan-phase
description: Plan a project phase by generating atomic task plans
argument-hint: [N]
allowed-tools:
  - view_file
  - write_to_file
  - list_dir
---

<objective>
Generate a series of atomic, verifiable task plans for a specific project phase, incorporating domain research and captured implementation decisions.
</objective>

<execution_context>
.claude/commands/mindforge/plan-phase.md
</execution_context>

<context>
Arguments: $ARGUMENTS (Phase N)
Prerequisites: PROJECT.md, REQUIREMENTS.md, ARCHITECTURE.md, STATE.md, and optionally CONTEXT.md.
Output: .planning/phases/phase-[N]/PLAN-[N]-[NN].md
</context>

<process>
1. **Pre-read**: Resolve phase number and read all foundational context files. If `CONTEXT.md` exists, respect prior decisions.
2. **Domain Research**: Investigate best libraries, pitfalls, and patterns. Save to `RESEARCH.md`.
3. **Task Planning**: Create 3-6 atomic PLAN files using the MindForge XML task format. Each plan must be:
    - Completatable in one window.
    - Targeted at <6 files.
    - Verifiable via a deterministic command.
4. **Validation**: Cross-reference plans against requirements and architecture. Ensure `<verify>` steps are runnable.
5. **Finalize**: Update `STATE.md` and display the list of generated plans to the user.
</process>
