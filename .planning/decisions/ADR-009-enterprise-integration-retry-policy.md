# ADR-009: Standardized retry/backoff policy for enterprise integrations

**Status:** Accepted
**Date:** 2026-03-20

## Decision
Use bounded exponential backoff with jitter for integration APIs and stop retrying
on explicit authorization failures.
