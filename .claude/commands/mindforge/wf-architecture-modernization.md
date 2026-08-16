---
description: "Legacy architecture map → target design → migration sequencing → risk gates"
---
# /mindforge:wf-architecture-modernization

Runs the **Architecture Modernization** dynamic workflow.

## Usage
`/mindforge:wf-architecture-modernization <codebase or modernization goal>`

## What it does
- **Map**: Map current architecture: components, dependencies, coupling, pain points
- **Design**: 3 parallel target architecture proposals with trade-off analysis
- **Select**: Judge panel selects best design, synthesizes hybrid
- **Sequence**: Migration sequencing with risk gates and rollback checkpoints
- **Roadmap**: Sprint-by-sprint modernization roadmap

## Running

Invoke via Claude Code's Workflow tool:

```
Workflow({
  scriptPath: ".mindforge/dynamic-workflows/scripts/architecture-modernization.js",
  args: "<your input>"
})
```

Or discover via CLI:
```bash
node bin/mindforge-cli.js workflow info architecture-modernization
```
