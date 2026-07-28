---
description: "Anthropic Writer/Reviewer pattern: implement in Context A → fresh Context B reviews the diff"
---
# /mindforge:wf-writer-reviewer

Runs the **Writer Reviewer** dynamic workflow.

## Usage
`/mindforge:wf-writer-reviewer <implementation task description>`

## What it does
- **Implement**: Writer agent implements the requested change
- **Review**: Fresh reviewer agent inspects only the diff without implementation context
- **Verdict**: Accept / request-changes verdict with specific actionable feedback

## Running

Invoke via Claude Code's Workflow tool:

```
Workflow({
  scriptPath: ".mindforge/dynamic-workflows/scripts/writer-reviewer.js",
  args: "<your input>"
})
```

Or discover via CLI:
```bash
node bin/mindforge-cli.js workflow info writer-reviewer
```
