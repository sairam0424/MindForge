# ADR-011: Multi-developer handoff must remain append-only and conflict-aware

**Status:** Accepted
**Date:** 2026-03-20

## Decision
Use append-only handoff records with staleness checks and explicit ownership of
files/plans to reduce merge-time coordination failures.
