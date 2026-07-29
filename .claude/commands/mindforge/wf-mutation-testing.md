---
description: "Mutant generator → parallel kill-test agents → mutation score + survival report"
---
# /mindforge:wf-mutation-testing

Runs the **Mutation Testing** dynamic workflow.

## Usage
`/mindforge:wf-mutation-testing <source file or module to mutation-test>`

## What it does
- **Analyze**: Identify mutable source lines: conditions, operators, return values
- **Mutate**: Generate 10-15 specific mutation descriptions
- **Kill**: Parallel kill-test per mutation — would existing tests catch it?
- **Report**: Mutation score report with killed/survived/timeout breakdown

## Running

Invoke via Claude Code's Workflow tool:

```
Workflow({
  scriptPath: ".mindforge/dynamic-workflows/scripts/mutation-testing.js",
  args: "<your input>"
})
```

Or discover via CLI:
```bash
node bin/mindforge-cli.js workflow info mutation-testing
```
