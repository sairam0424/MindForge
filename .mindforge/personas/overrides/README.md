# MindForge Persona Customisation System

## Purpose
Override default persona behaviour for specific projects or phases without
modifying the core persona files (which are versioned and shared).

## How overrides work

1. Create a file in `.mindforge/personas/overrides/` named after the persona:
   `developer.md`, `security-reviewer.md`, etc.

2. The override file uses an additive format — it extends, not replaces:

```markdown
# Developer Persona Override — [Project Name]
# This file ADDS to or MODIFIES developer.md. It does not replace it.

## Additional coding standards (project-specific)
- This project uses the Repository pattern. All database access via repositories.
- All API responses use the ApiResponse<T> wrapper type (see src/types/api.ts)
- Business logic belongs in src/services/ — never in src/routes/ or src/repositories/

## Modified conventions (overrides developer.md)
# Override: "Functions ≤ 40 lines" → this project permits up to 60 lines
# for service methods that handle complex orchestration.
MAX_FUNCTION_LINES: 60

## Additional forbidden patterns (project-specific)
- Never import from src/routes/ into src/services/ (one-way dependency rule)
- Never use moment.js — this project uses date-fns exclusively
- Never throw raw Error objects — use the AppError class (src/errors/AppError.ts)
```

3. At task execution time, the loader merges: `base persona` + `override file`.
   Additive sections stack. Override sections replace.

## Override resolution rules

| Override directive | Behaviour |
|---|---|
| `## Additional [section]` | Appended to the base persona's equivalent section |
| `## Modified [section]` | Replaces the base persona's equivalent section |
| `## Removed [section]` | Removes that section from the merged persona |
| `MAX_FUNCTION_LINES: 60` | Key-value style — overrides a specific parameter |

## Phase-level overrides

To override a persona for a specific phase only:
Create: `.planning/phases/[N]/persona-overrides/developer.md`

Phase-level overrides take priority over project-level overrides:
Phase override > Project override > Core persona

## When to use overrides vs. creating a new persona

Use an **override** when:
- You want to add project-specific coding conventions
- You want to adjust one or two rules (not rebuild the whole persona)
- The change is specific to this project and would not apply to others

Create a **new persona** when:
- You need a wholly different cognitive mode (e.g., "ML Engineer" persona)
- The persona would be useful across multiple projects (make it an Org persona)
- The change is so extensive it is easier to write from scratch than to override

## Override file template

```markdown
# [Persona Name] Override — [Project or Phase Name]
# Scope: project | phase-[N]
# Author: [who created this override]
# Created: [ISO-8601]

## Additional [conventions/standards/forbidden patterns/etc.]
[Add to the base persona without replacing]

## Modified [section name from base persona]
[Replace a specific section]

## Project-specific context
[Facts about this project the persona should always know]

## Project-specific forbidden patterns
[Anti-patterns specific to this codebase]
```
