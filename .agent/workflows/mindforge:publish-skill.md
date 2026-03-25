---
description: Publish a skill to the npm registry (or private registry).
---
# MindForge — Publish Skill Command
# Usage: /mindforge:publish-skill [skill-dir] [--registry URL] [--dry-run]

Publish a skill to the npm registry (or private registry).

Pre-publication checklist:
1. Run full skill validation (Level 1 + 2 + 3 from skill-validator.md)
   Fail if Level 1 or 2 fails. Warn if Level 3 fails.
2. Verify package.json has `mindforge` field with all required sub-fields
3. Verify CHANGELOG.md has an entry for the current version
4. Check if version already published: `npm info [package-name]@[version]`
   If already published: error "Version already exists. Bump the version."
5. Run `npm pack --dry-run` to preview what will be published
6. Confirm with user: "These files will be published: [list]. Proceed? (yes/no)"
7. If --dry-run: stop here, show preview only
8. Publish: `npm publish --access public`
9. Verify: `npm info [package-name]@[version]` — confirm publication succeeded
10. Write AUDIT: `{ "event": "skill_published", "package": "...", "version": "..." }`
11. Report: "✅ [package-name]@[version] published to npm registry"
