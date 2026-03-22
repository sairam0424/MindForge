---
description: Publish a new version of MindForge to npm
---

# MindForge Publishing Workflow

This workflow automates the pre-verification and publishing of MindForge.

## Pre-Flight Checks

1. Verify structural integrity
// turbo
npm test

2. Check package contents
// turbo
npm pack --dry-run

## Publish Execution

**Note**: If this is a prerelease (alpha, beta, rc), you must specify the tag.

3. Publish to npm
```bash
# For stable:
npm publish --access public

# For alpha:
npm publish --tag alpha --access public
```

4. Create Git Tag
```bash
git tag v$(node -p "require('./package.json').version")
git push origin --tags
```
