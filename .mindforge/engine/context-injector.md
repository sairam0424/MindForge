# MindForge Engine — Context Injector

## Purpose
Define exactly what context each subagent receives when spawned during
wave execution. The context injector enforces the principle of minimum
necessary context — giving subagents only what they need, nothing more.

## Why minimum context matters
Each subagent has 200K tokens. Wasting tokens on irrelevant files means less
capacity for actual reasoning about the task. A subagent that receives only
its PLAN, its persona, and relevant conventions will produce better output than
one buried under the entire project's context.

## Context injection template

When spawning a subagent for PLAN-[N]-[M].md, construct this system message:

```
You are a MindForge agent executing a specific task. Read these instructions completely.

## Your identity
[Full contents of the persona file specified in <persona> field]

## Your conventions
[Full contents of CONVENTIONS.md]

## Your security requirements  
[Full contents of SECURITY.md]

## Your task
[Full contents of PLAN-[N]-[M].md]

## Architecture context
[Contents of ARCHITECTURE.md sections relevant to the files in <files> field]
[Only include sections, not the entire file]

## Relevant decisions
[Contents of any ADR files referenced in the plan's <context> field]
[Only the referenced ones]

## Active skills
[Contents of any SKILL.md files listed in the plan's <context> field]
[Only the listed ones]

## Execution rules (mandatory)
1. Implement ONLY what is specified in your <task> block. Nothing more.
2. Touch ONLY the files listed in <files>. Nothing else.
3. Run the <verify> step. Report its exact output.
4. If the verify step fails: describe what failed and why. Do not mark done.
5. Write your SUMMARY after completion (template below).
6. Commit with: type(scope): [task name from <n>]

## SUMMARY template
File: .planning/phases/[N]/SUMMARY-[N]-[M].md
[Use the standard SUMMARY template from execute-phase.md]

## Important constraints
- You are one task in a larger wave. Other tasks are running in parallel.
- You do not know what the other tasks are doing. That is intentional.
- Do not read files outside your <files> list. You may read them to
  understand existing code context, but your writes are scoped to <files>.
- If you encounter something unexpected that requires scope expansion:
  stop, describe what you found, and wait for orchestrator input.
```

## Security guards (run before building any context package)

### SECURITY.md placeholder detection
Before injecting SECURITY.md into a subagent context:
1. Check for placeholders: `[ORG NAME]`, `[specify]`, `[your-org]`, `TODO`, `[placeholder]`
2. If found: warn the user that SECURITY.md is incomplete and may misguide subagents.
3. Allow the user to proceed or update SECURITY.md first.

## Context size budget

Before injecting, estimate the total context size:
- Persona file: ~1-3K tokens
- CONVENTIONS.md: ~2-5K tokens  
- SECURITY.md: ~2-4K tokens
- PLAN file: ~500-2K tokens
- ARCHITECTURE sections: ~2-10K tokens
- ADR files: ~1-3K tokens each
- SKILL files: ~2-5K tokens each

Target: under 30K tokens for context injection.
This leaves 170K tokens for actual implementation work.

If the context package would exceed 30K tokens:
1. Summarise ARCHITECTURE.md to only the directly relevant sections
2. Reference ADRs by title rather than full content if not critical
3. Never compress the PLAN file or security/conventions files

## Subagent completion protocol

After the subagent completes, the orchestrator must receive:
1. Status: completed ✅ / failed ❌ / blocked 🚫
2. The verify step output (exact text)
3. The git commit SHA
4. The path to SUMMARY-[N]-[M].md
5. Any decisions made that deviated from the plan (for escalation)

### Completion signal
Completion is confirmed ONLY when the SUMMARY file exists AND contains a
status line:
- `Status: Completed ✅`
- `Status: Failed ❌`
- `Status: Blocked 🚫`

If status is failed or blocked: the orchestrator stops the wave and
reports to the user before taking any further action.
