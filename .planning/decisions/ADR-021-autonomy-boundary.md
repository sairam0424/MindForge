# ADR-021: Autonomy Boundary

## Status: Proposed
## Deciders: MindForge Architecture Team
## Date: 2026-03-22

## Context
MindForge v2 introduces an Autonomous Execution Engine. We need to define where the human's role ends and the agent's role begins to prevent loss of control while maximizing efficiency.

## Decision
We define the **Autonomy Boundary** as:
1. **Human = Mission Control**: Humans define the phase objectives, approve the initial plan, and provide mid-execution steering.
2. **Agent = Execution Engine**: The agent handles the mechanics of wave execution, parallel task dispatch, automated verification, and self-repair for low-risk failures.

## Consequences
- The agent will not ask for permission for individual tasks in a wave once the phase is started in `:auto` mode.
- Any decision involving security, payments, or PII (Tier 3) MUST escalate to the human, as it lies outside the autonomy boundary.
