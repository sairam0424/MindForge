# ADR-038: Minimum quality score of 60 for skill registration

**Status:** Accepted | **Date:** v2.0.0 | **Day:** 13

## Context
What quality score should be required before a skill can be registered?

## Decision
Minimum score of 60/100 for project/org registration.
Minimum score of 80/100 for community marketplace publication.
Injection check failure (dimension 5 = 0) = absolute block regardless of total score.

## Rationale
60 is the "minimum viable" threshold — a skill at 60 has enough triggers,
content, and examples to be useful, but is below the "good" tier (80).
The gap between 60 and 80 allows registration for internal use while protecting
the public marketplace from mediocre skills.

The injection check is absolute — a skill that contains "IGNORE ALL PREVIOUS
INSTRUCTIONS" must NEVER be registered regardless of its other quality dimensions.
Even a score of 95 with an injection pattern is blocked. This is the same
non-negotiable principle as Gate 3 (secret detection) in compliance-gates.md.

## Consequences
The AI-generated learn pipeline is tuned to produce skills scoring ≥ 80.
Skills below 60 get improvement suggestions but cannot be registered.
Teams can lower this threshold via SKILL_QUALITY_MIN_SCORE in MINDFORGE.md.
