---
description: "Parallel per-module coverage analysis → gap map → prioritized test-writing plan"
---
# /mindforge:wf-test-coverage-gap

Runs the **Test Coverage Gap** dynamic workflow.

## Usage
`/mindforge:wf-test-coverage-gap <target or question>`

## What it does
- **Discover**: Map modules and identify testable units
- **Analyze**: Parallel coverage analysis per module
- **GapMap**: Synthesize gaps by severity and risk
- **Plan**: Prioritized test-writing plan with concrete test cases

## Running

Invoke via Claude Code's Workflow tool:

```
Workflow({
  scriptPath: ".mindforge/dynamic-workflows/scripts/test-coverage-gap.js",
  args: "<your input>"
})
```

Or discover via CLI:
```bash
node bin/mindforge-cli.js workflow info test-coverage-gap
```
