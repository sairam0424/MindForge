---
description: "Parallel infra/API/query/bundle cost agents → reduction plan with ROI estimates"
---
# /mindforge:wf-cost-analysis

Runs the **Cost Analysis** dynamic workflow.

## Usage
`/mindforge:wf-cost-analysis <project or service to analyze>`

## What it does
- **Scope**: Identify cost centers and establish current baseline
- **Analyze**: 4 parallel cost dimension agents: infra / API / database / bundle
- **Model**: Cost model with reduction opportunities and ROI estimates
- **Plan**: Prioritized cost reduction plan with implementation steps

## Running

Invoke via Claude Code's Workflow tool:

```
Workflow({
  scriptPath: ".mindforge/dynamic-workflows/scripts/cost-analysis.js",
  args: "<your input>"
})
```

Or discover via CLI:
```bash
node bin/mindforge-cli.js workflow info cost-analysis
```
