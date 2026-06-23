---
description: "Scored technology evaluation across DX, performance, security, ecosystem, community"
---
# /mindforge:wf-tech-evaluation

Runs the **Tech Evaluation** dynamic workflow.

## Usage
`/mindforge:wf-tech-evaluation <TechA vs TechB vs TechC for [use case]>`

## What it does
- **Scope**: Parses candidates and evaluation criteria from your input
- **Evaluate**: 5 parallel dimension agents — DX, performance, security, ecosystem, community
- **Score**: Builds a weighted 1-10 scoring matrix per dimension
- **Recommend**: Produces ranked recommendation with trade-offs for each option

## Running

Invoke via Claude Code's Workflow tool:

```
Workflow({
  scriptPath: ".mindforge/dynamic-workflows/scripts/tech-evaluation.js",
  args: "<your input>"
})
```

Or discover via CLI:
```bash
node bin/mindforge-cli.js workflow info tech-evaluation
```
