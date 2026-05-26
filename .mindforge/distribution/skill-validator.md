# MindForge Skills Registry — Skill Validator

## Purpose
Validate a SKILL.md file before installation or publication.
Run as part of both `install-skill` and `publish-skill` commands.

## Validation levels

### Level 1 — Schema validation (always runs)
```bash
npx mindforge-cc validate-skill ./SKILL.md
```

Checks:
- [ ] File starts with `---` (YAML frontmatter delimiter)
- [ ] Frontmatter closes with `---`
- [ ] `name:` field present and matches kebab-case pattern `[a-z][a-z0-9-]+`
- [ ] `version:` field present and valid semver `\d+\.\d+\.\d+`
- [ ] `status:` is one of: `stable`, `beta`, `alpha`, `deprecated`
- [ ] `triggers:` field present and has >= 5 keywords
- [ ] No trigger keyword is fewer than 3 characters (too generic)
- [ ] `min_mindforge_version:` present and valid semver

### Level 2 — Content validation (runs after schema passes)
- [ ] File size between 1KB and 200KB (not too small, not too large)
- [ ] Contains `## Mandatory actions` or `## When this skill is active` section
- [ ] Contains at least one checklist item (`- [ ]`) for self-verification
- [ ] Does not contain any injection patterns (from `loader.md` guard)
- [ ] Code examples have language specifiers in code fences (not bare ```)
- [ ] No placeholder text: `[placeholder]`, `[your-name]`, `TODO`, `FIXME`, `[fill this in]`

### Level 3 — Quality validation (required for publish, recommended for public install)
- [ ] At least 3 code examples
- [ ] CHANGELOG in frontmatter has at least current version entry
- [ ] `breaking_changes:` field present (even if empty list)
- [ ] Examples directory has at least one example file
- [ ] README.md exists in the package

**Install rule:**
- Public registry installs: run Level 3 and warn on failures (do not block)
- Private registry installs: Level 2 is sufficient

## Validator output

```
MindForge Skill Validator — SKILL.md
──────────────────────────────────────────────────────────────

Schema validation:
  ✅ Frontmatter valid
  ✅ name: security-owasp (valid)
  ✅ version: 1.2.0 (valid semver)
  ✅ status: stable
  ✅ triggers: 31 keywords (min: 5)
  ✅ min_mindforge_version: 0.5.0

Content validation:
  ✅ File size: 8.4KB (1KB-200KB range)
  ✅ Mandatory actions section present
  ✅ Self-check checklist present (7 items)
  ✅ No injection patterns detected
  ✅ Code examples have language specifiers
  ✅ No placeholder text found

Quality validation:
  ✅ 5 code examples found
  ✅ CHANGELOG has version 1.2.0 entry
  ✅ Breaking changes documented
  ⚠️  Examples directory has 1 file (recommend: 3+)

──────────────────────────────────────────────────────────────
Result: VALID with 1 warning
Ready for: installation ✅ | publication ✅ (warning noted)
```
