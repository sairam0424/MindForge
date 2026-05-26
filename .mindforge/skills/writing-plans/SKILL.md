---
name: writing-plans
version: 1.0.0
min_mindforge_version: 10.0.6
status: stable
triggers: writing plan, plan writing, task decomposition, implementation plan, step by step plan, plan template, planning guide, plan structure, bite-sized tasks, plan format, plan methodology, plan checklist
---

# Skill — Writing Plans

## When this skill activates
Any task that requires producing an implementation plan, task decomposition,
step-by-step instructions, or structured execution guide. This includes feature
plans, migration plans, refactoring plans, and any multi-step work breakdown.

## Mandatory actions when this skill is active

### Before writing any plan
1. **Gather complete context.** Read:
   - The specification or requirement being planned for.
   - The current codebase structure (file paths, existing patterns).
   - Any constraints (tech stack, timeline, dependencies on other work).
2. **Identify the scope boundary.** What is IN the plan vs OUT of scope?
3. **Identify dependencies.** Which steps depend on other steps? Which can be parallel?

### During plan writing

#### Core Principle: NO PLACEHOLDERS
Every step in the plan must contain **complete, executable instructions**. A plan
fails its purpose if the executor has to figure out what goes in a placeholder.

**Bad (placeholder):**
```
3. Add the authentication middleware to the routes.
```

**Good (complete):**
```
3. Add authentication middleware to API routes.
   File: src/middleware/auth.ts
   Create a new middleware function:
   - Import `verifyJWT` from `src/lib/jwt.ts`
   - Extract the `Authorization` header, strip "Bearer " prefix
   - Call `verifyJWT(token)` — if it throws, return 401 with `{ error: "Invalid token" }`
   - If valid, attach `req.user = decoded` and call `next()`

   File: src/routes/api.ts
   - Import `authMiddleware` from `src/middleware/auth.ts`
   - Add `router.use("/api/v1/protected", authMiddleware)` before the route definitions
     on line ~45 (after the public routes, before the protected group)

   Verify: Run `curl -H "Authorization: Bearer invalid" localhost:3000/api/v1/protected/me`
   Expected: 401 response with `{"error": "Invalid token"}`
```

#### Plan Structure Template

```markdown
# Plan: [Feature/Task Name]

## Context
[1-3 sentences: WHY this work exists. Link to spec/ticket if applicable.]

## Scope
- IN: [What this plan covers]
- OUT: [What is explicitly excluded]

## Prerequisites
- [ ] [Anything that must be true before starting step 1]

## Steps

### Step 1: [Verb + Object] (estimated: Xmin)
**What**: [One sentence summary]
**Files**:
- `path/to/file.ts` — [what changes]
- `path/to/other.ts` — [what changes]

**Details**:
[Complete instructions with exact code patterns, not pseudocode]

**Verify**: [Exact command or check to confirm this step worked]
Expected: [What success looks like]

---

### Step 2: [Verb + Object] (estimated: Xmin)
**Depends on**: Step 1
...

## Verification (End-to-End)
[How to verify the entire plan was executed correctly]

## Rollback
[How to undo this work if something goes wrong]
```

#### Step Design Rules
1. **Bite-sized**: Each step is independently verifiable. If you cannot verify a step
   without completing the next step, merge them or restructure.
2. **Atomic**: Each step makes one logical change. "Add the model AND the migration
   AND the API route AND the tests" is four steps, not one.
3. **Ordered by dependency**: Steps that depend on previous steps come after them.
   Independent steps are noted as parallelizable.
4. **Specific file paths**: Every step names exact files. Never say "the config file"
   when you mean `src/config/database.ts`.
5. **Include the WHY**: If a step has a non-obvious reason, explain it inline. The
   executor should never wonder "why are we doing this?"
6. **Verification after every step**: Each step ends with a concrete check. Prefer
   runnable commands (`npm test`, `curl`, `grep`) over subjective checks ("looks right").

#### Handling Complexity
- **If a step has > 10 lines of instructions**: Split it into sub-steps (1a, 1b, 1c).
- **If a plan has > 15 steps**: Group into phases with phase-level verification gates.
- **If there are conditional paths** ("if X then do Y, else do Z"): Write both paths
  explicitly. Note the decision criteria clearly.
- **If a step requires research** ("find the best library for X"): That is a separate
  pre-plan task. Plans should not contain open-ended research.

#### Estimations
- Include time estimates per step (in minutes).
- Be realistic: include time for verification and debugging.
- Total plan time = sum of steps + 20% buffer for unexpected issues.
- If total exceeds 4 hours: break into multiple plans with clear handoff points.

#### Dependencies and Parallelism
- Mark each step with `Depends on: Step N` or `Depends on: None (parallelizable)`.
- Group parallelizable steps explicitly:
  ```
  ### Steps 3-5 (parallelizable — no dependencies between them)
  ```
- Never leave implicit dependencies. If step 4 silently requires step 3's output,
  make it explicit.

### After writing the plan
1. **Self-review with the "zero context" test**: Could someone unfamiliar with this
   codebase follow these steps and produce a working result? If any step requires
   knowledge not in the plan, add it.
2. **Check for placeholder language**: Search for words like "appropriate", "relevant",
   "as needed", "etc.", "similar to". Replace each with specifics.
3. **Verify file paths exist**: Every path referenced in the plan should be a real file
   (or explicitly marked as "create new file").
4. **Confirm verification steps are runnable**: Each verify command should work
   copy-pasted into a terminal.

## Plan quality anti-patterns to flag

- "Update the configuration as appropriate" (what configuration? what value?)
- "Add error handling" (what errors? what handling? what response?)
- "Refactor the module" (which module? what pattern? what is the target state?)
- "Write tests" (what tests? what cases? what assertions?)
- Steps without verification (how do you know it worked?)
- Steps that combine 3+ unrelated changes (should be split)
- Vague time estimates ("a while", "some time") instead of minutes
- Missing rollback plan (what if step 7 fails and you need to undo steps 1-6?)

## Self-check before task completion

Before marking a task done when this skill was active:

- [ ] Every step has specific file paths (no "the relevant file").
- [ ] Every step has a verification check with expected output.
- [ ] No placeholder language ("as needed", "appropriate", "etc.").
- [ ] Dependencies between steps are explicit.
- [ ] Time estimates are included per step.
- [ ] A zero-context reader could follow the plan without asking questions.
- [ ] Rollback instructions are included.
- [ ] Plan scope (IN/OUT) is clearly defined.
- [ ] If > 15 steps, organized into phases with phase-level gates.
- [ ] All file paths verified to exist (or marked as "new file").
