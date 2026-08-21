---
description: "Parallel per-repo audit → cross-repo divergence map → sync plan"
---
# /mindforge:wf-multi-repo-sync

Runs the **Multi-Repo Sync** dynamic workflow.

## Usage
`/mindforge:wf-multi-repo-sync <workspace path or comma-separated repo paths>`

## What it does
- **Discover**: List target repos and their relationships
- **Audit**: Parallel audit per repo for divergence from the reference
- **DivergenceMap**: Cross-repo divergence map with severity
- **SyncPlan**: Prioritized sync plan — what to align and how

## Running

Invoke via Claude Code's Workflow tool:

```
Workflow({
  scriptPath: ".mindforge/dynamic-workflows/scripts/multi-repo-sync.js",
  args: "<your input>"
})
```

Or discover via CLI:
```bash
node bin/mindforge-cli.js workflow info multi-repo-sync
```
