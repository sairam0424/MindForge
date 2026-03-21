# ADR-019: Self-update preserves the original installation scope

**Status:** Accepted | **Date:** v1.0.0 | **Day:** 7

## Context
`/mindforge:update --apply` must update the correct installation.

## Decision
Detect original scope from filesystem (local before global per priority).
Apply update using the detected scope. Per ADR-019.

## Rationale
Principle of least surprise. A local install user should get a local update.
Unexpected global install is confusing and may affect other projects.
