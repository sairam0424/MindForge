# MindForge Publishing Guide

This guide outlines the standard procedure for publishing a new version of `mindforge-cc` and its associated SDK to npm. Following this process ensures stability, correct versioning, and structural integrity.

## Prerequisites

1. **NPM Permissions**: You must have publish access to the `mindforge-cc` and `@mindforge/sdk` packages.
2. **Clean State**: Ensure all changes are committed and your working directory is clean.
3. **Authentication**: Run `npm whoami` to verify you are logged into the correct account.

## Step-by-Step Workflow

### 1. Pre-Flight Verification & Adversarial Review
Before any release, ensure the following is completed:

- **Structural Integrity**: Run `npm test` to verify layout and command mirroring.
- **Security Check**: Run `/mindforge:security-scan` to ensure no keys or CVEs are present.
- **Mult-Model Review**: Run `/mindforge:cross-review` to have multiple models (Claude, GPT, Gemini) audit the new features for edge cases.

### 2. Versioning Strategy
MindForge follows SemVer. Update `package.json` and `CHANGELOG.md` first.

### 3. Automated Release Workflow
MindForge provides a built-in workflow to handle the heavy lifting:

1. Run the slash command: `/publish-release`
2. Follow the interactive prompts to execute tests and dry runs.

### 4. Manual Publishing (Fallback)
If the workflow is unavailable:

```bash
npm publish --tag alpha --access public
```

### 5. Git Tagging & Origin Sync
```bash
git tag v[version]
git push origin --tags
```

---
*Last Updated: 2026-03-22*
