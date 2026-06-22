---
description: "Sequential pipeline: brief → PRD → architecture → user stories"
---
# /mindforge:wf-feature-planner

Runs the **Feature Planner** dynamic workflow.

## Usage
`/mindforge:wf-feature-planner <feature description>`

## What it does
- **Brief**: Clarifies goals, target users, success criteria, and out-of-scope items
- **PRD**: Generates functional + non-functional requirements with priorities
- **Architecture**: Designs technical approach, components, data flow, files to create/modify
- **Stories**: Breaks feature into user stories with Given/When/Then and t-shirt estimates

## Running

Invoke via Claude Code's Workflow tool:

```
Workflow({
  scriptPath: ".mindforge/dynamic-workflows/scripts/feature-planner.js",
  args: "<your input>"
})
```

Or discover via CLI:
```bash
node bin/mindforge-cli.js workflow info feature-planner
```
