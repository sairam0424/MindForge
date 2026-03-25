---
description: Initialize a new project under the FORGE framework.
---
Initialize a new project under the FORGE framework.

Follow these steps in order:

1. Ask the user these questions one at a time (wait for each answer before asking the next):
   - What is this project? (1-2 sentence description)
   - Who is the target user?
   - What is the core problem it solves?
   - What tech stack do you want to use? (or "help me decide")
   - What is absolutely NOT in scope for v1?
   - What does success look like at the end of v1?

2. If the user said "help me decide" on tech stack, ask 3 clarifying questions then recommend a stack with brief reasoning.

3. Create `.planning/PROJECT.md` with:
   - Project name and one-line description
   - Problem statement
   - Target user
   - Tech stack (with brief rationale for each choice)
   - v1 scope (what's in)
   - Out of scope (what's explicitly not in v1)
   - Success criteria

4. Create `.planning/STATE.md` with:
   - Status: Project initialized
   - Current phase: None (not started)
   - Last action: Project initialization
   - Next step: Run /forge:plan-phase 1

5. Create `.planning/REQUIREMENTS.md` (blank template with sections)

6. Tell the user: "Project initialized. Run /forge:plan-phase 1 to begin planning your first phase."
