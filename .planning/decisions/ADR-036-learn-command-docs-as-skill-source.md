# ADR-036: Documentation is the authoritative source for skill content

**Status:** Accepted | **Date:** v2.0.0 | **Day:** 13

## Context
Where should skill content come from — human-authored or AI-generated?

## Decision
Skill content is AI-generated from authoritative documentation (official docs,
internal runbooks, npm READMEs, or session analysis). The AI reads the docs
and writes down what it learned, following the SKILL.md authoring template.

## Rationale
Documentation is the authoritative, maintained, versioned source of truth for
any technology. Human-authored skills get stale and diverge from reality.
Documentation-sourced skills automatically reflect the current state of the
technology when regenerated.

The AI's role: transform documentation into the MindForge SKILL.md format
(structured rules, trigger keywords, code examples, checklist) — not to
invent patterns that don't exist in the documentation.

## Consequences
Skills should be regenerated when documentation is updated (major versions).
The quality of skills depends on the quality of source documentation.
Internal documentation produces the most project-specific, valuable skills.
