---
description: "5 parallel competitor angle agents → pipeline synthesis into competitive positioning report"
---
# /mindforge:wf-competitive-teardown

Runs the **Competitive Teardown** dynamic workflow.

## Usage
`/mindforge:wf-competitive-teardown <your product and competitors to analyze>`

## What it does
- **Scope**: Identify competitors and define evaluation framework
- **Research**: 5 parallel competitor angle agents: product/tech/pricing/hiring/community
- **Analyze**: Synthesize competitive landscape from all angles
- **Synthesis**: Competitive positioning report with differentiation opportunities

## Running

Invoke via Claude Code's Workflow tool:

```
Workflow({
  scriptPath: ".mindforge/dynamic-workflows/scripts/competitive-teardown.js",
  args: "<your input>"
})
```

Or discover via CLI:
```bash
node bin/mindforge-cli.js workflow info competitive-teardown
```
