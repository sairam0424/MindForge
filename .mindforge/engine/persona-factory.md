# MindForge Engine — Persona Factory

## Purpose

Dynamically generate specialized "Micro-Personas" by combining base persona definitions with real-time "Context Patches" (from Context7 or task context).

## The Factory Loop

1. **Base Layer:** Load the base persona file from `.mindforge/personas/[base].md`.
2. **Context Patching:**
   - Query `Context7` for library-specific best practices matching the task's `files` list.
   - Example: `mcp__context7__get-library-docs("zod")` → extract validation patterns.
3. **Rule Synthesis:**
   - Append the fetched documentation as a `<specialist_knowledge>` block.
   - Add task-specific `<imperative_rules>` (e.g., "Must use strict typing for all new interfaces").
4. **Validation:** Ensure the resulting micro-persona is semantically valid and fits within the agent's context window.

## Micro-Persona Schema (Extended)

```markdown
---
name: [base-persona]-specialist-[id]
base: [path/to/base.md]
specialization: [library/topic]
---

<role>
You are the [base-persona] specialized in [topic].
[Incorporates base role + specialization]
</role>

<specialist_knowledge>
[Dynamic docs from Context7]
</specialist_knowledge>

<imperative_rules>
[Dynamic rules for this specific task]
</imperative_rules>
```

## Persona Persistence

- Micro-personas are stored in `.planning/phases/[N]/micro-personas/` for the duration of the task.
- They are auto-pruned after the task SUMMARY is written to minimize workspace clutter.
- If a task is resumed, the persona factory re-generates the micro-persona to ensure fresh context from Context7.
