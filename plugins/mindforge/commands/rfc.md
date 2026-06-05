---
description: "Decompose a specification into an executable dependency DAG with parallel waves. Usage - /mindforge:rfc [spec-path] [--output DAG.json] [--worktree] [--execute]"
---

<objective>
Turn a specification document into a structured execution plan with explicit
dependency tracking, parallel wave assignment, and optional worktree isolation.
</objective>

<execution_context>
@.mindforge/skills/rfc-pipeline/SKILL.md
@.mindforge/engine/dependency-parser.md
@.mindforge/engine/wave-executor.md
</execution_context>

<context>
$ARGUMENTS
</context>

<process>
1. Load spec from provided path (or prompt for spec description if no path).
2. Parse spec into atomic tasks: each must have clear [input] → [output] definition.
3. Identify dependencies between tasks (which tasks need outputs from which other tasks).
4. Build directed acyclic graph (DAG) from dependencies.
5. Detect cycles — if found: ERROR with cycle description, halt.
6. Assign tasks to waves by dependency depth (depth 0 = no deps = wave 1, etc.).
7. Estimate effort per task (simple/medium/complex) for time projection.
8. If --worktree: plan git worktree creation for each parallel branch.
9. Pin each task to current HEAD commit SHA for reproducibility.
10. Write DAG to `.planning/rfc/[name]/DAG.json` (or --output path).
11. If --execute: write HANDOFF.json for auto-runner consumption and trigger execution.
12. Report: total tasks, wave count, critical path length, estimated time.
13. Log RFC decomposition in AUDIT.
</process>
