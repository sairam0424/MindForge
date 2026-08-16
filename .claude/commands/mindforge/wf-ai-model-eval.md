---
description: "4-parallel model benchmark agents → scoring matrix → cost/performance recommendation"
---
# /mindforge:wf-ai-model-eval

Runs the **AI Model Evaluation** dynamic workflow.

## Usage
`/mindforge:wf-ai-model-eval <use case description>`

## What it does
- **Scope**: Define evaluation criteria and test prompts for the use case
- **Benchmark**: 4 parallel model evaluators (quality / reasoning / speed / cost)
- **Score**: Scoring matrix across all dimensions
- **Recommend**: Ranked recommendation with break-even cost analysis

## Running

Invoke via Claude Code's Workflow tool:

```
Workflow({
  scriptPath: ".mindforge/dynamic-workflows/scripts/ai-model-eval.js",
  args: "<your input>"
})
```

Or discover via CLI:
```bash
node bin/mindforge-cli.js workflow info ai-model-eval
```
