# MindForge Skills Engine — Versioning

## Purpose
Define how skill versions work, what constitutes a breaking change, and how
agents handle version mismatches between what is installed and what is needed.

## Versioning scheme
Skills use Semantic Versioning (semver.org): MAJOR.MINOR.PATCH

| Increment | When | Example |
|---|---|---|
| MAJOR | Breaking change to skill interface (removed triggers, changed output format, changed mandatory actions) | 1.0.0 → 2.0.0 |
| MINOR | New trigger keywords, new optional sections, new examples | 1.0.0 → 1.1.0 |
| PATCH | Clarifications, typo fixes, improved examples with no behaviour change | 1.0.0 → 1.0.1 |

## Frontmatter version fields

Every SKILL.md must have these frontmatter fields:

```yaml
---
name: security-review
version: 1.2.0
min_mindforge_version: 0.1.0
status: stable
deprecated_at:         # ISO-8601 date if deprecated, empty if not
replacement:           # skill name if deprecated, empty if not
breaking_changes:
  - "2.0.0: removed 'xss' as standalone trigger (now part of 'injection' trigger)"
changelog:
  - "1.2.0: added supply chain security check"
  - "1.1.0: expanded OWASP checklist to include A08-A10"
  - "1.0.0: initial stable release"
---
```

## Compatibility check protocol

Before loading any skill, verify compatibility:

### Check 1 — MindForge version compatibility
Read `min_mindforge_version` from the skill's frontmatter.
Compare against the current MindForge version (from `package.json`).

If skill's `min_mindforge_version` > current MindForge version:
- Log a warning: "Skill [name] v[X] requires MindForge v[min] but current is v[current]."
- Load the skill anyway (do not block execution)
- Add to AUDIT entry: `"compatibility_warning": "skill requires newer MindForge"`

### Check 2 — Deprecation check
If the skill's `deprecated_at` field is set:
- Warn: "Skill [name] was deprecated on [date]. Use [replacement] instead."
- Load the replacement skill (if available) in addition to the deprecated one
- Add to AUDIT entry: `"deprecated_skill_loaded": true`

### Check 3 — Breaking change awareness
If the skill has a MAJOR version bump since it was last used in this project:
- List the breaking changes from the `breaking_changes` field
- Alert: "Skill [name] has breaking changes since your last usage.
  Review these before continuing: [list changes]"

## Skill upgrade protocol

When `/mindforge:skills update [skill-name]` is run:

1. Check current version from MANIFEST.md
2. Compare against the latest version in the MindForge repository
3. If a newer version exists:
   a. Show the diff in behaviour (changelog entries)
   b. If MINOR or PATCH: auto-update, no confirmation needed
   c. If MAJOR: show breaking changes, require explicit confirmation
4. After update: re-validate all PLAN files that reference this skill
   (check if any `<context>` fields would be affected by the breaking changes)
5. Update MANIFEST.md with new version
6. Commit: `chore(skills): upgrade [name] v[old] → v[new]`
