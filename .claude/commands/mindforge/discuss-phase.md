---
name: mindforge:discuss-phase
description: Capture implementation decisions before planning begins
argument-hint: [N] [--batch] [--auto]
allowed-tools:
  - view_file
  - list_dir
  - write_to_file
---

<objective>
Capture critical implementation decisions (UI/UX, architecture, choice of libraries) through a structured discussion before generating plans. This prevents generic planning and ensures the output matches the user's vision.
</objective>

<execution_context>
.claude/commands/mindforge/discuss-phase.md
</execution_context>

<context>
Arguments: $ARGUMENTS (Phase N, optional flags for batch or auto mode)
Sources: ROADMAP.md, REQUIREMENTS.md, ARCHITECTURE.md.
Output: .planning/phases/phase-[N]/CONTEXT.md
</context>

<process>
1. **Analyze Scope**: Read roadmap, requirements, and architecture to identify the primary domain (UI, API, Data, etc.).
2. **Structured Discussion**:
    - If `--auto`: Skip discussion and warn the user.
    - If `--batch`: Group questions by domain.
    - Default: Ask domain-specific questions one at a time (e.g., visual layout, error handling, data volume).
3. **Generate CONTEXT.md**:
    - Document all captured decisions and their rationale.
    - Note implications for the upcoming planning phase.
    - List any unresolved "open questions".
4. **Guide**: Confirm completion and point the user to `/mindforge:plan-phase [N]`.
</process>
