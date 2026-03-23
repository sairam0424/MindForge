# ADR-037: Pattern frequency ≥ 2 tasks as the auto-capture threshold

**Status:** Accepted | **Date:** v2.0.0 | **Day:** 13

## Context
What frequency of pattern appearance should trigger auto-capture?

## Decision
Auto-capture triggers when a pattern appears in ≥ 2 tasks (default).
Exception: a pattern in 1 task can also qualify if difficulty = "high" AND
generality ≠ "low" (important patterns worth capturing even on first occurrence).

Configurable via AUTO_CAPTURE_MIN_PATTERN_COUNT in MINDFORGE.md.

## Rationale
A single occurrence is high-noise — it could be a one-off approach or
something specific to that task's edge case. Two occurrences strongly
suggest a reusable pattern. The exception for "high difficulty + non-low
generality" catches important one-time discoveries (security patterns, tricky
library APIs) that are hard to rediscover and broadly applicable.

## Consequences
Most phases will produce 0-3 capture candidates (not noisy).
High-activity phases with many similar tasks may produce more.
The user always approves before any skill is created — auto-capture is a
suggestion, never automatic skill creation.
