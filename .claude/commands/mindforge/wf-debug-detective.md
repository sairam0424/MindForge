---
description: "4-hypothesis parallel investigation → evidence gathering → scientific RCA"
---
# /mindforge:wf-debug-detective

Runs the **Debug Detective** dynamic workflow.

## Usage
`/mindforge:wf-debug-detective <bug description, symptoms, and context>`

## What it does
- **Intake**: Document symptoms, context, and reproduction steps
- **Hypothesize**: 4 parallel hypothesis agents from different angles
- **Evidence**: Parallel evidence gathering per hypothesis
- **RCA**: Scientific root cause analysis from evidence
- **Fix**: Targeted fix plan with regression test spec

## Running

Invoke via Claude Code's Workflow tool:

```
Workflow({
  scriptPath: ".mindforge/dynamic-workflows/scripts/debug-detective.js",
  args: "<your input>"
})
```

Or discover via CLI:
```bash
node bin/mindforge-cli.js workflow info debug-detective
```
