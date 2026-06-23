---
description: "Profile → parallel bottleneck hunt across DB/network/CPU/memory → prioritized fix plan"
---
# /mindforge:wf-perf-optimize

Runs the **Perf Optimize** dynamic workflow.

## Usage
`/mindforge:wf-perf-optimize [application or path description]`

## What it does
- **Profile**: Establishes baseline, identifies slowest paths, forms bottleneck hypothesis
- **Identify**: 4 parallel agents — DB queries, network, CPU/compute, memory
- **Plan**: Prioritizes fixes by impact-to-effort ratio with implementation guidance
- **Benchmark**: Defines before/after benchmark tests and success criteria for each fix

## Running

Invoke via Claude Code's Workflow tool:

```
Workflow({
  scriptPath: ".mindforge/dynamic-workflows/scripts/perf-optimize.js",
  args: "<your input>"
})
```

Or discover via CLI:
```bash
node bin/mindforge-cli.js workflow info perf-optimize
```
