---
description: "Pipeline stage-by-stage validation → data quality gates → anomaly detection report"
---
# /mindforge:wf-data-pipeline-validate

Runs the **Data Pipeline Validation** dynamic workflow.

## Usage
`/mindforge:wf-data-pipeline-validate <pipeline directory or description>`

## What it does
- **Map**: Map all pipeline stages from source to sink
- **Validate**: Parallel validation per stage (schema / completeness / transforms / outputs)
- **Quality**: Data quality gate assessment — freshness, completeness, consistency
- **Report**: Validation report with stage health scores and fix recommendations

## Running

Invoke via Claude Code's Workflow tool:

```
Workflow({
  scriptPath: ".mindforge/dynamic-workflows/scripts/data-pipeline-validate.js",
  args: "<your input>"
})
```

Or discover via CLI:
```bash
node bin/mindforge-cli.js workflow info data-pipeline-validate
```
