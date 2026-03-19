# ADR-007: Keyword-trigger model over AI-decided skill selection

**Status:** Accepted
**Date:** 2026-03-20

## Context
How should the agent decide which skills to load for a given task?
Options: keyword triggers in frontmatter vs. AI-decided relevance.

## Decision
Keyword triggers in frontmatter (same model as Day 1 ADR-003, confirmed at Day 3 scale).

## Additional rationale at Day 3 scale
With 10+ skills, AI-decided selection has a higher risk of selecting wrong skills
due to hallucinated relevance. Keyword triggers are deterministic — identical tasks
always load identical skills, enabling reproducible results across sessions.
The added specificity of file-name matching (not just text matching) improves
trigger accuracy without sacrificing determinism.

## Consequences
Trigger keyword lists require ongoing maintenance as skill content evolves.
The conflict resolver handles cases where multiple skills match.
