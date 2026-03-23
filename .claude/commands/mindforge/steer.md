---
name: mindforge:steer
description: Inject mid-execution guidance into the running autonomous engine
argument-hint: "[instruction]"
allowed-tools:
  - write_to_file
  - view_file
---

<objective>
Provide a mechanism for human course-correction during long-running autonomous waves, allowing the user to redirect the agent's focus or update constraints without stopping the process.
</objective>

<execution_context>
.claude/commands/mindforge/steer.md
</execution_context>

<context>
Lifecycle: Applied at the next task boundary in `/mindforge:auto` mode.
Priority: Steering takes precedence over the original `PLAN.md` instructions.
</context>

<process>
1. **Queue Instruction**: Write the steering guidance to the active execution state.
2. **Target (Optional)**: Explicitly target a future task ID for modification.
3. **Validate**: Ensure steering does not violate core security or governance gates.
4. **Cancel**: Clear the steering queue if instructions are no longer relevant.
</process>
