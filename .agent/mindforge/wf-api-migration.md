---
description: "Breaking change detection → versioning strategy → migration guide → compatibility matrix"
---
# /mindforge:wf-api-migration

Runs the **API Migration** dynamic workflow.

## Usage
`/mindforge:wf-api-migration <old API path or description of changes>`

## What it does
- **Detect**: Detect breaking vs non-breaking changes between old and new API versions
- **Version**: Propose versioning strategy: semver, URL versioning, or header versioning
- **Guide**: Generate migration guide for API consumers
- **Matrix**: Compatibility matrix: which client versions work with which API versions

## Running

Invoke via Claude Code's Workflow tool:

```
Workflow({
  scriptPath: ".mindforge/dynamic-workflows/scripts/api-migration.js",
  args: "<your input>"
})
```

Or discover via CLI:
```bash
node bin/mindforge-cli.js workflow info api-migration
```
