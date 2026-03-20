# ADR-012: Intelligence outputs must feed back into behavior

**Status:** Accepted
**Date:** 2026-03-20

## Context
Day 5 introduces difficulty scoring, retrospectives, compaction quality, and
session metrics. Without explicit feedback connectors these become passive
reports.

## Decision
Use explicit loops:
- difficulty -> planning granularity
- retrospective -> MINDFORGE updates
- quality metrics -> session behavior adjustments
- compaction -> richer handoff continuity

## Consequences
Every intelligence artifact must define its downstream behavioral effect.
