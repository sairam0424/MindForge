---
description: Plan a phase of the project. Usage: /forge:plan-phase [N]
---

Plan a phase of the project. Usage: /forge:plan-phase [N]

If N is not provided, check STATE.md for the current phase and use that.

Steps:
1. Read PROJECT.md, REQUIREMENTS.md, and STATE.md.
2. Ask the user: "Describe what phase [N] should accomplish in 2-3 sentences."
3. Ask: "Are there any specific implementation decisions you've already made for this phase?"
4. Spawn a research subagent: Read the project's tech stack from PROJECT.md and research the best patterns, libraries, and pitfalls for implementing this phase. Write findings to `.planning/phases/phase-[N]/RESEARCH.md`.
5. Create 3-6 atomic task plans in `.planning/phases/phase-[N]/`. Each PLAN file must use this XML format:
```xml
<plan>
  <task>Task name</task>
  <files>
    specific/file/paths/to/touch.ts
  </files>
  <instructions>
    Precise implementation instructions. Include:
    - Which library to use and why (mention specific version if relevant)
    - Any gotchas or anti-patterns to avoid
    - The exact approach, not just "implement X"
  </instructions>
  <verify>Specific command or check that confirms this task is done</verify>
  <done>One sentence definition of done for this task</done>
</plan>
```

6. Check each plan against REQUIREMENTS.md. If a plan implements something out of scope, revise it.
7. Update STATE.md: current phase = N, status = "Phase [N] planned, ready to execute"
8. Tell the user: "Phase [N] has [X] task plans ready. Run /forge:execute-phase [N] to begin execution."
