# ADR-006: Three-tier skills architecture (Core → Org → Project)

**Status:** Accepted
**Date:** 2026-03-20

## Context
Skills need to be distributed at three scopes: universal best practices,
organisation-specific standards, and project-specific patterns.

## Decision
Three-tier architecture with explicit priority: Project (T3) > Org (T2) > Core (T1).

## Rationale
The tier system solves the key tension: MindForge provides sensible defaults
(Core), organisations customise for their standards (Org), and projects fine-tune
for their specific context (Project). Higher tiers override lower tiers by same name,
enabling intentional, documented overrides without modifying shared core skills.

## Consequences
- Skill authors must understand which tier is appropriate for their skill
- Conflict resolution rules must be well-documented (see conflict-resolver.md)
- Org-tier skills should be maintained in a shared repo, not per-project
