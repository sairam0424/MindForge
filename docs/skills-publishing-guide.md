# MindForge Skills Publishing Guide

## Overview
Skills are distributed as npm packages with the `mindforge-skill-` prefix.

## Required files
- `SKILL.md`
- `package.json` with `mindforge` metadata
- `README.md`
- `CHANGELOG.md`

## Publish checklist
1. Run `npx mindforge-cc validate-skill ./SKILL.md --quality`
2. Verify `package.json` metadata is complete
3. Ensure `CHANGELOG.md` includes the current version
4. Run `npm pack --dry-run` to inspect files
5. Publish with `npm publish --access public`

## Private registries
Set `MINDFORGE_SKILL_REGISTRY` in `.mindforge/org/integrations/INTEGRATIONS-CONFIG.md`
for private registries (Verdaccio, Artifactory, GitHub Packages).
