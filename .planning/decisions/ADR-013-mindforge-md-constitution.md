# ADR-013: MINDFORGE.md is configurable but cannot disable governance primitives

**Status:** Accepted
**Date:** 2026-03-20

## Context
Project-level customization is required, but unrestricted overrides would allow
accidental or malicious disabling of core safety guarantees.

## Decision
Allow MINDFORGE overrides only for configurable preferences and thresholds.
Keep secret detection, security auto-trigger, plan-first, and audit-writing
as non-overridable primitives.

## Consequences
Customization remains flexible while governance stays enforceable.
