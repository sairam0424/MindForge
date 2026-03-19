# ADR-003: Keyword-trigger model for skill discovery

**Status:** Accepted
**Date:** 2026-03-20
**Deciders:** MindForge core team

## Context
Skills need to be loaded by the agent at the right time. The question is
how the agent knows which skills are relevant for a given task.

## Decision
Keyword matching against a `triggers:` list in skill frontmatter.

## Options considered

### Option A — Keyword triggers in frontmatter (chosen)
Pros: Simple, transparent, editable by anyone, no dependency on AI judgment
Cons: Can miss contextual relevance; false positives on common words

### Option B — AI decides which skills to load
Pros: Contextually accurate matching
Cons: Non-deterministic; different sessions might load different skills
      for the same task; hard to debug; requires extra model call

### Option C — Explicit user invocation only
Pros: Precise control
Cons: Loses the "just-in-time" benefit; users forget to invoke skills

## Rationale
Determinism is more valuable than perfect accuracy for a framework.
Teams need to be able to predict what skills will activate. Keyword triggers
provide that predictability. False positives are acceptable — loading a skill
unnecessarily has low cost; missing a needed skill has high cost.

## Consequences
Trigger keyword lists must be maintained as skills evolve.
A skill with too-narrow triggers will be missed. Err on the side of more triggers.
