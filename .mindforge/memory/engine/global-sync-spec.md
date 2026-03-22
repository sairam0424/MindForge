# MindForge v2 — Global Knowledge Sync Specification

## Purpose

Allow knowledge to flow between projects via a machine-level global store.
Team members can promote project-specific insights to their global knowledge base,
which loads into every future project's session start.

## Storage locations

- **Project-local:** `.mindforge/memory/knowledge-base.jsonl` (per repo)
- **Global (machine):** `~/.mindforge/global-knowledge-base.jsonl` (per developer)

## Sync rules

- Promotion is MANUAL — nothing is auto-promoted to global
  (project-specific decisions should stay project-specific)
- Loading is AUTOMATIC — global entries load at every session start
- Project entries take precedence over global entries (same ID = local wins)
- Global entries get confidence penalty of 0.1 (less reliable than local decisions)

## What should be promoted to global

Good candidates for global promotion:

- Language-agnostic security practices ("always validate input before database queries")
- Technology-specific best practices learned through experience ("argon2id over bcrypt")
- Universal debugging patterns ("check the timezone mismatch before blaming async code")
- Cross-project architectural preferences ("Repository pattern over active record")

## Global entry metadata

When promoted to global, entries gain:

```json
{
  "global": true,
  "promoted_at": "ISO-8601",
  "promoted_from_project": "saas-app",
  "promoted_by": "git-config-user-email",
  "global_applicability": "all|typescript|nodejs|react|[specific]"
}
```
