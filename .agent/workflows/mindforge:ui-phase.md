---
description: Generate a UI Design Contract (UI-SPEC.md) for the current phase
---
<objective>
Generate a detailed UI design contract (UI-SPEC.md) for a frontend development phase to ensure consistent spacing, typography, color palettes, and accessibility standards before implementation.
</objective>

<execution_context>
.claude/commands/mindforge/ui-phase.md
</execution_context>

<context>
Arguments: $ARGUMENTS (The phase number [N], optional)
Configuration: MINDFORGE.md `UI_PHASE_ACCESSIBILITY_STANDARD`
State: Resolves the phase from STATE.md if N is not provided.
</context>

<process>
1. **Identify Phase**: Get the current or targeted phase number.
2. **Read Inputs**: Read `REQUIREMENTS.md` and `DESIGN_SYSTEM.md`.
3. **Generate UI-SPEC.md**:
    - Define component-level spacing and layout for the phase.
    - Specify required colors and typography from the design system.
    - List accessibility requirements (WCAG level).
4. **Finalize**: Write `UI-SPEC.md` to the phase's planning directory or the root `.planning/`.
5. **Confirm**: Provide a link to the user for review.
</process>
