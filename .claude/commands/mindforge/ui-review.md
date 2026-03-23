---
name: mindforge:ui-review
description: Perform a retroactive visual audit of implemented UI against the DESIGN_SYSTEM.md and UI-SPEC.md
argument-hint: [N]
allowed-tools:
  - view_file
  - write_to_file
  - read_browser_page
  - open_browser_url
---

<objective>
Perform a retroactive, multi-pillar visual audit of implemented UI features against the defined Design System and UI-SPEC.md to ensure pixel-perfect fidelity and accessibility compliance.
</objective>

<execution_context>
.claude/commands/mindforge/ui-review.md
</execution_context>

<context>
Arguments: $ARGUMENTS (The phase number [N], optional)
Sources: `DESIGN_SYSTEM.md`, `UI-SPEC.md`, and the live application UI.
</context>

<process>
1. **Identify Target**: Determine the phase to review.
2. **Audit Application**:
    - Use the browser tool to inspect the implemented features.
    - Compare against the `UI-SPEC.md` for spacing, colors, and layout.
    - Audit for accessibility (ARIA labels, contrast, keyboard navigation).
3. **Generate UI-REVIEW.md**:
    - Grade each pillar (Layout, Color, Typography, etc.).
    - List specific "Needs Work" items.
    - Provide "Approved" status if all criteria are met.
4. **Finalize**: Notify the user of the audit results.
</process>
