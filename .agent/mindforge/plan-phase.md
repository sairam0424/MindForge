Plan a project phase. Usage: /mindforge:plan-phase [N]

## Pre-check
If N is not given, read STATE.md for the current phase number and increment by 1.
Read PROJECT.md, REQUIREMENTS.md, ARCHITECTURE.md, and STATE.md before proceeding.

## Step 1 — Discuss phase scope
Ask:
1. "Describe what Phase [N] should accomplish. 2-3 sentences."
2. "Have you already made any implementation decisions for this phase?
    (libraries, patterns, approaches) If yes, list them."
3. "Are there any constraints I should know about?
    (deadlines, dependencies on other teams, tech limitations)"

Write answers to `.planning/phases/phase-[N]/CONTEXT.md`.

If `.planning/phases/phase-[N]/CONTEXT.md` already exists:
1. Read it first.
2. If it has "Open questions", ask the user to resolve them before planning.
3. Update CONTEXT.md with the answers and mark those questions as resolved.

## Step 2 — Domain research (spawn subagent)
Spawn a research subagent with this context only:
- The tech stack from PROJECT.md
- The phase scope from CONTEXT.md
- CONVENTIONS.md

Instruct it to investigate:
1. Best available libraries for this phase's requirements (with version numbers)
2. Common pitfalls and anti-patterns for this tech domain
3. Relevant architectural patterns (with tradeoffs)
4. Any known security considerations specific to this domain

Write findings to `.planning/phases/phase-[N]/RESEARCH.md`.

## Step 3 — Create atomic task plans
Based on CONTEXT.md and RESEARCH.md, create 3-6 PLAN files.
Each plan must be completable in a single fresh context window.
Each plan targets specific files — no plan should touch more than 6 files.

File naming: `.planning/phases/phase-[N]/PLAN-[N]-[NN].md`
Example: `.planning/phases/1/PLAN-1-01.md`

Each plan uses this XML format:

```xml
<task type="auto">
  <n>Short descriptive task name</n>
  <persona>developer</persona>
  <phase>[N]</phase>
  <plan>[NN]</plan>
  <dependencies>List any PLAN files that must complete before this one, or "none"</dependencies>
  <files>
    src/exact/file/path.ts
    src/another/file.ts
  </files>
  <context>
    Relevant decisions from ARCHITECTURE.md:
    - [decision]
    Skills to load before starting:
    - [skill name if applicable, or "none"]
  </context>
  <action>
    Precise implementation instructions.
    Include exact library names and versions.
    Include the approach, not just the goal.
    Include specific anti-patterns to avoid.
  </action>
  <verify>
    [Exact runnable command or check]
    Example: curl -X POST localhost:3000/api/auth/login -d '{"email":"test@test.com","password":"test"}' | jq .status
    Must produce a deterministic pass/fail result.
  </verify>
  <done>One sentence definition of done.</done>
</task>
```

## Step 4 — Validate plans
Check every plan against REQUIREMENTS.md:
- Does this plan implement anything out of scope? If yes: revise.
- Does this plan contradict ARCHITECTURE.md? If yes: create an ADR first.
- Is the `<verify>` step actually runnable? If no: rewrite it.

## Step 5 — Update state and confirm
Update STATE.md: current phase = N, status = "Phase N planned, ready to execute".

Tell the user:
"✅ Phase [N] planned. [X] task plans created.

Plans:
  PLAN-[N]-01: [task name]
  PLAN-[N]-02: [task name]
  ...

Run /mindforge:execute-phase [N] to begin execution."
