---
description: "Structural map → domain extraction → architecture patterns → guided narrative tour for onboarding"
---
# /mindforge:wf-code-explainer

Runs the **Code Explainer** dynamic workflow.

## Usage
`/mindforge:wf-code-explainer <codebase path or module to explain>`

## What it does
- **Structure**: Map file structure, entry points, and module boundaries
- **Domain**: Extract domain concepts, business logic, and key abstractions
- **Architecture**: Identify architectural patterns, data flow, and design decisions
- **Tour**: Synthesize a guided narrative tour for a new developer

## Running

Invoke via Claude Code's Workflow tool:

```
Workflow({
  scriptPath: ".mindforge/dynamic-workflows/scripts/code-explainer.js",
  args: "<your input>"
})
```

Or discover via CLI:
```bash
node bin/mindforge-cli.js workflow info code-explainer
```
