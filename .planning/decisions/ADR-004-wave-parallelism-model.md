# ADR-004: Wave-based parallel execution over full parallelism

**Status:** Accepted
**Date:** 2026-03-20
**Deciders:** MindForge core team

## Context
When executing multiple tasks in a phase, we can choose:
A) Run all tasks simultaneously (maximum parallelism)
B) Run tasks in dependency-ordered waves (wave parallelism — chosen)
C) Run tasks sequentially (no parallelism)

## Decision
Wave-based parallel execution. Tasks within a wave run in parallel.
Waves execute sequentially.

## Options considered

### Option A — Full parallelism
Pros: Maximum speed
Cons: Cannot handle dependencies safely. If Plan 03 depends on Plan 01's output
and both run simultaneously, Plan 03 reads stale data. Produces corrupt output.

### Option B — Wave parallelism (chosen)
Pros: Safely parallel within dependency constraints. Significantly faster than
sequential. Dependency correctness is guaranteed by wave ordering.
Cons: Some tasks that could theoretically run in parallel must wait for their
dependency wave to complete.

### Option C — Sequential
Pros: Simplest to implement and reason about.
Cons: Discards the primary quality advantage of parallel subagents — isolated
200K token contexts per task. In sequential mode, the orchestrator's context
fills up across tasks, degrading output quality over time.

## Rationale
Wave parallelism gives the correctness of sequential execution (dependency order
respected) with the quality benefits of parallel isolation (each task gets a
fresh 200K context). This is the optimal tradeoff.

## Consequences
- Plan authors must declare dependencies accurately — incorrect dependencies
  can cause parallel tasks to conflict.
- The dependency parser must catch cycles and conflicts before execution starts.
- A small planning overhead (building the wave graph) is incurred per phase.
