# MindForge Skills API — Reference (v1.0.0)

## Overview
Skills are domain knowledge packs loaded on demand. They are stored as
`SKILL.md` files with frontmatter and optional assets.

## File structure
```
.mindforge/skills/<skill-name>/
  SKILL.md
  assets/
  references/
```

## SKILL.md schema (frontmatter)
Required fields:
- `name`: string (stable in 1.x.x)
- `description`: string
- `triggers`: array of keywords
- `version`: semver string
- `owner`: string (team or org)

Optional fields:
- `scope`: `core | org | project`
- `severity`: `low | medium | high`
- `links`: array of URLs

Example:
```yaml
---
name: security-review
version: 1.0.0
description: Secure coding review checklist and threat modeling prompts
triggers: ["auth", "payment", "pii", "encryption"]
owner: mindforge-core
scope: core
---
```

## Loading rules
- Skills load only when trigger keywords match the task description
- At most 3 skills are loaded at full size; others are summarized
- Skills can be force-loaded via `ALWAYS_LOAD_SKILLS` in `MINDFORGE.md`

## Validation
`/mindforge:skills validate` enforces:
- Valid frontmatter
- No injection patterns in content
- Required fields present

## Publishing
Skills can be published to the npm registry under `mindforge-skill-*`.
See `docs/skills-publishing-guide.md` for full workflow.

## Stability contract
As of v1.0.0, the `name` values of the 10 core skills are stable. New optional
fields may be added in minor versions; removals require a major version bump.
