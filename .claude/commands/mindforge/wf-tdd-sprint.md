---
description: "Strict Red-Green-Refactor TDD loop with spec-first discipline"
---
# /mindforge:wf-tdd-sprint

Runs the **Tdd Sprint** dynamic workflow.

## Usage
`/mindforge:wf-tdd-sprint <feature or behavior to implement>`

## What it does
- **Spec**: Writes a precise Given-When-Then behavioral spec with edge cases
- **Red**: Writes a failing test that captures exactly the required behavior
- **Green**: Writes the MINIMAL implementation to make the test pass
- **Refactor**: Cleans up the passing implementation with specific improvements listed

## Running

Invoke via Claude Code's Workflow tool:

```
Workflow({
  scriptPath: ".mindforge/dynamic-workflows/scripts/tdd-sprint.js",
  args: "<your input>"
})
```

Or discover via CLI:
```bash
node bin/mindforge-cli.js workflow info tdd-sprint
```
