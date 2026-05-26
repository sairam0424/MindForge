# MindForge Skills Registry — Skill Publisher

## Purpose
Define the publish workflow for MindForge skills to npm (public or private).
Used by `/mindforge:publish-skill`.

## Publish workflow

1. Validate SKILL.md (Levels 1, 2, and 3).
2. Confirm `package.json` includes required `mindforge` metadata.
3. Verify `CHANGELOG.md` has an entry for the current version.
4. Check if version already exists on the registry.
5. Preview files with `npm pack --dry-run`.
6. Confirm with the user.
7. Publish.
8. Verify publish succeeded.
9. Write AUDIT entry.

## Commands

```bash
# Level 1 + 2 + 3 validation
npx mindforge-cc validate-skill ./SKILL.md --quality

# Version check
npm info ${PACKAGE_NAME}@${VERSION}

# Dry-run preview
npm pack --dry-run

# Publish
npm publish --access public
```

## Audit entry

```json
{
  "event": "skill_published",
  "package": "mindforge-skill-security-owasp",
  "version": "1.2.0",
  "registry": "https://registry.npmjs.org/"
}
```
