---
name: mindforge:execute-phase
description: Execute the wave-based execution plan for a specific phase
argument-hint: [N]
allowed-tools:
  - view_file
  - write_to_file
  - run_command
  - list_dir
---

<objective>
Coordinate the parallel execution of task plans for a phase using a wave-based approach, ensuring dependency integrity, automated verification, and audit logging.
</objective>

<execution_context>
.claude/commands/mindforge/execute-phase.md
</execution_context>

<context>
Arguments: $ARGUMENTS (Phase N)
Sources: .planning/phases/[N]/PLAN-*.md, STATE.md, REQUIREMENTS.md
Engine: wave-executor.md, dependency-parser.md, context-injector.md
</context>

<process>
1. **Pre-checks**: Verify phase status, plan existence, and requirement content. Run dependency parser.
2. **Display Wave Plan**: Present the wave-based execution graph and wait for user approval.
3. **Audit Initiation**: Log `phase_execution_started` in `AUDIT.jsonl`.
4. **Wave Execution**:
    - For each wave: Execute tasks in parallel.
    - For each task: Inject context, run implementation, run `<verify>`, and commit with SHA.
    - If any task fails: Stop the wave and offer debugging.
5. **Phase Verification**: Check requirement coverage in the implementation and write `VERIFICATION.md`.
6. **Update State**: Update `STATE.md`, `HANDOFF.json`, and write `WAVE-REPORT-[N].md`.
7. **Auto-capture**: If enabled, detect new patterns/skills from the implemented phase.
</process>
