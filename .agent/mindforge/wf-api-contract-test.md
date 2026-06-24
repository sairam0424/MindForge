---
description: "Writer/Reviewer pattern: spec reader vs implementation reader → contract violation report"
---
# /mindforge:wf-api-contract-test

Runs the **API Contract Test** dynamic workflow.

## Usage
`/mindforge:wf-api-contract-test <target or question>`

## What it does
- **ReadSpec**: Parse the API specification (OpenAPI/GraphQL/Protobuf/docs)
- **ReadImpl**: Read the actual implementation in a fresh context
- **Diff**: Cross-reference spec contracts vs implementation
- **Report**: Violation report with severity and fix instructions

## Running

Invoke via Claude Code's Workflow tool:

```
Workflow({
  scriptPath: ".mindforge/dynamic-workflows/scripts/api-contract-test.js",
  args: "<your input>"
})
```

Or discover via CLI:
```bash
node bin/mindforge-cli.js workflow info api-contract-test
```
