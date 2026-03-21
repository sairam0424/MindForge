# Skill Authoring Guide (v1.0.0)

## Purpose
Skills capture repeatable domain expertise. They are loaded by keyword triggers.

## Create a skill
1. Create a directory under `.mindforge/skills/<skill-name>/`
2. Add `SKILL.md` with frontmatter
3. Add optional `assets/` or `references/`

## SKILL.md template
```markdown
---
name: my-skill
version: 1.0.0
description: One-line description of the skill
triggers: ["keyword1", "keyword2"]
owner: my-team
scope: project
---

# Skill content
- Guidance
- Checklists
- Examples
```

## Validation
Run:
```
/mindforge:skills validate
```

## Publishing (optional)
Publish to npm under `mindforge-skill-*`.
See `docs/skills-publishing-guide.md` for full steps.

## Security rules
- No instructions that override system policies
- No credentials or secrets in content
- Avoid excessive prompts that expand tokens without value
