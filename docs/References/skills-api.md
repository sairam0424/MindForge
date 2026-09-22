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
Required fields, enforced by `scripts/ci/validate-assets.js` and `tests/skills-platform.test.js`:
- `name`: string (stable in 1.x.x)
- `version`: semver string
- `status`: string (e.g. `stable`)
- `triggers`: comma-separated keyword string, minimum 10 terms, unique across all engine skills

`description` and `owner` are commonly present but are **not** enforced as required fields.

Optional fields:
- `scope`: `core | org | project`
- `severity`: `low | medium | high`
- `links`: array of URLs

Example:
```yaml
---
name: security-review
version: 1.0.0
status: stable
description: Secure coding review checklist and threat modeling prompts
triggers: auth, payment, pii, encryption, secrets, credential, oauth, token, session, permission
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
As of v1.0.0, the `name` values of the 232 engine-tier skills (`.mindforge/skills/`) are stable.
New optional fields may be added in minor versions; removals require a major version bump.
