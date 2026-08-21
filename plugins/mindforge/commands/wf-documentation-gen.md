---
description: "Parallel per-file doc generation → style normalization → publish-ready documentation"
---
# /mindforge:wf-documentation-gen

Runs the **Documentation Generation** dynamic workflow.

## Usage
`/mindforge:wf-documentation-gen <codebase or module path>`

## What it does
- **Scope**: Discover files needing documentation
- **Generate**: Parallel doc generation per file/module
- **Normalize**: Style consistency pass across all generated docs
- **Publish**: Assemble README, API reference, and changelog entries

## Running

Invoke via Claude Code's Workflow tool:

```
Workflow({
  scriptPath: ".mindforge/dynamic-workflows/scripts/documentation-gen.js",
  args: "<your input>"
})
```

Or discover via CLI:
```bash
node bin/mindforge-cli.js workflow info documentation-gen
```
