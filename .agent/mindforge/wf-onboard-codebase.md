---
description: "Map structure → domain analysis → architecture → generate guided tour and onboarding docs"
---
# /mindforge:wf-onboard-codebase

Runs the **Onboard Codebase** dynamic workflow.

## Usage
`/mindforge:wf-onboard-codebase [repo path or description]`

## What it does
- **Map**: Discovers languages, frameworks, entry points, and key directory purposes
- **Domain**: Identifies business domains, core abstractions, and the software's purpose
- **Architecture**: Maps layers, data flow, key patterns, and developer gotchas
- **Tour**: Generates a 5-10 step guided tour, conventions guide, and quick-start

## Running

Invoke via Claude Code's Workflow tool:

```
Workflow({
  scriptPath: ".mindforge/dynamic-workflows/scripts/onboard-codebase.js",
  args: "<your input>"
})
```

Or discover via CLI:
```bash
node bin/mindforge-cli.js workflow info onboard-codebase
```
