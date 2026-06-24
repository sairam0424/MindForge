---
description: "Parallel per-dependency audit (CVEs / licenses / staleness / maintenance) → risk matrix"
---
# /mindforge:wf-dependency-health

Runs the **Dependency Health** dynamic workflow.

## Usage
`/mindforge:wf-dependency-health <target or question>`

## What it does
- **Inventory**: Extract full dependency tree from package manifests
- **Audit**: Parallel audit per batch: CVEs, license risk, staleness, maintenance status
- **RiskMatrix**: Consolidate into risk matrix with severity tiers
- **Action**: Prioritized upgrade / replace / accept recommendations

## Running

Invoke via Claude Code's Workflow tool:

```
Workflow({
  scriptPath: ".mindforge/dynamic-workflows/scripts/dependency-health.js",
  args: "<your input>"
})
```

Or discover via CLI:
```bash
node bin/mindforge-cli.js workflow info dependency-health
```
