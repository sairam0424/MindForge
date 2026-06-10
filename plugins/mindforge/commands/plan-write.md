---
description: "Generate no-placeholder implementation plan with complete steps. Usage: /mindforge:plan-write [spec-or-description] [--steps N] [--verify]"
---

<objective>
Produce a complete, zero-placeholder implementation plan where every step contains exact file paths, complete code, and verification commands. No TODOs, no "implement here", no ambiguity — every step is directly executable.
</objective>

<execution_context>
@.mindforge/skills/writing-plans/SKILL.md
</execution_context>

<context>
Arguments: $ARGUMENTS (specification text or file path, optional --steps N for target step count, optional --verify to include verification per step)
Knowledge: ARCHITECTURE.md, CONVENTIONS.md, current codebase structure, dependency graph.
</context>

<process>
1. **Parse spec**: Read and understand the specification or description:
   - If argument is a file path: read the file content
   - If argument is inline text: parse as the requirement
   - Identify the scope: what files need to change, what new files are needed
   - Identify constraints: performance, security, backward compatibility
   - Determine target step count (--steps N, default: auto-size based on complexity)

1.5. **EXPLORE the codebase BEFORE decomposing** (per `writing-plans/SKILL.md` →
   "EXPLORE — Structured Codebase Discovery"): run a structured discovery pass
   across the 8 search categories — existing patterns, similar features,
   conventions, dependencies, tests, configs, error handling, integration points.
   - Capture **Patterns to Mirror** as real `file:line` snippet references (quote
     the actual code; never invent a convention).
   - Apply the **"No Prior Knowledge" gate**: the plan must be executable by
     someone with zero repo knowledge — every convention the plan references must
     be cited from the actual codebase. If you cannot cite it, explore more.
   - Feed these mirrored snippets into each step's code/Details below.

2. **Decompose into bite-sized steps**: Break the work into atomic steps where each step:
   - Changes 1-3 files maximum
   - Can be verified independently
   - Builds on the previous step (no forward references)
   - Is small enough to hold entirely in working memory
   - Has a clear "done" state visible from the outside

3. **For each step — specify exact file paths**: Every step must state:
   - Full absolute file path(s) being created or modified
   - Whether the file is new (create) or existing (modify)
   - The specific location within the file (after which function, which line range)
   - Import/dependency changes needed for this step

4. **For each step — provide complete code**: Every step must include:
   - The exact code to write or the exact diff to apply
   - No placeholder comments ("// TODO: implement this")
   - No ellipsis ("...")  or abbreviated code
   - No "similar to above" references — repeat if needed
   - Complete import statements at the top of new files
   - Full function signatures with types

5. **Add verification per step** (always if --verify, otherwise for critical steps):
   - Command to run that proves the step works (test, build, lint, curl)
   - Expected output or success criteria
   - What to do if verification fails (specific fix, not "debug")
   - Verification must be automated (no manual "check in browser")

6. **Number dependencies**: For each step, declare:
   - `depends_on: [step numbers]` — which steps must complete first
   - `parallelizable_with: [step numbers]` — which steps can run concurrently
   - `blocks: [step numbers]` — which steps are waiting on this one
   - This enables parallel execution where possible

7. **Handle existing code**: When modifying existing files:
   - Show the exact lines being replaced (old code)
   - Show the exact replacement (new code)
   - Include enough context (3-5 surrounding lines) for unambiguous placement
   - Note if the change requires changes in other files (ripple effects)

8. **Include rollback instructions**: For risky steps:
   - What to revert if the step causes problems
   - Git command to undo (specific commit or file checkout)
   - Whether downstream steps need adjustment after rollback

9. **Output plan document**: Write the plan in structured format:
   ```
   # Implementation Plan: [title]
   ## Metadata
   - Total steps: N
   - Estimated effort: [time]
   - Risk level: low|medium|high
   - Parallelizable steps: [list]
   
   ## Step 1: [descriptive title]
   - Files: [exact paths]
   - Depends on: none
   - Code: [complete implementation]
   - Verify: [command + expected output]
   
   ## Step 2: ...
   ```

10. **Final validation**: Before outputting, verify the plan:
    - Every file referenced actually exists (for modifications) or has a create step
    - No circular dependencies between steps
    - Import graph is consistent (nothing imports from a file not yet created)
    - All types/interfaces referenced are defined somewhere in the plan
    - Running all steps in order produces a working, compilable result
    - No placeholders, TODOs, or ambiguous instructions remain
</process>
