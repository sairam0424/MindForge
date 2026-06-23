---
description: "Technical debt scan → risk-sorted sequence → safe refactor implementation plan"
---
# /mindforge:wf-refactor-plan

Runs the **Refactor Plan** dynamic workflow.

## Usage
`/mindforge:wf-refactor-plan [path or 'current codebase']`

## What it does
- **Scan**: 3 parallel scans — structural debt, complexity debt, maintenance debt
- **Prioritize**: Risk-sorts items by blast radius × test coverage inverse
- **Sequence**: Orders changes to minimize conflicts and risk
- **Plan**: Step-by-step refactor plan with verification gates and rollback procedures

## Running

Invoke via Claude Code's Workflow tool:

```
Workflow({
  scriptPath: ".mindforge/dynamic-workflows/scripts/refactor-plan.js",
  args: "<your input>"
})
```

Or discover via CLI:
```bash
node bin/mindforge-cli.js workflow info refactor-plan
```
