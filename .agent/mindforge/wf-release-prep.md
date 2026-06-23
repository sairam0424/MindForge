---
description: "Automated release pipeline: tests → changelog → version bump → PR → announcement draft"
---
# /mindforge:wf-release-prep

Runs the **Release Prep** dynamic workflow.

## Usage
`/mindforge:wf-release-prep [repo context]`

## What it does
- **Check**: Verifies readiness — no uncommitted changes, tests passing, no critical open bugs
- **Changelog**: Generates changelog from conventional commits since last release
- **Bump**: Determines next semver version based on breaking/feature/fix counts
- **PR**: Drafts the release PR body, release notes, and social announcement

## Running

Invoke via Claude Code's Workflow tool:

```
Workflow({
  scriptPath: ".mindforge/dynamic-workflows/scripts/release-prep.js",
  args: "<your input>"
})
```

Or discover via CLI:
```bash
node bin/mindforge-cli.js workflow info release-prep
```
