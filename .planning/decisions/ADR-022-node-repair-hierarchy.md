# ADR-022: Node Repair Hierarchy

## Status: Proposed
## Deciders: MindForge Architecture Team
## Date: 2026-03-22

## Context
Tasks in autonomous mode can fail due to various reasons (timeouts, lint errors, logic bugs). Sequential retrying is often insufficient.

## Decision
We implement a tiered **Node Repair Hierarchy**:
1. **RETRY**: Re-execute the same plan with a fresh context + error injection. (Budget: 1)
2. **DECOMPOSE**: Split a failing multi-domain or high-token task into smaller sub-tasks.
3. **PRUNE**: Skip non-critical path tasks and defer them to a `DEFERRED-ITEMS.md`.
4. **ESCALATE**: Stop execution, save state, and notify the human.

## Consequences
- Increases the survival rate of autonomous sessions without human intervention for trivial errors.
- Ensures complex failures are handled by human experts.
