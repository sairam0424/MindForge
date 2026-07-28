---
description: "4-dimensional parallel PR review: correctness, security, performance, style → consensus verdict"
---
# /mindforge:wf-pr-review

Runs the **Pr Review** dynamic workflow.

## Usage
`/mindforge:wf-pr-review [diff target or 'current HEAD~1']`

## What it does
- **Scope**: Reads the diff and gathers review context
- **Review**: 4 parallel reviewers — correctness, security, performance, code style
- **Consensus**: Merges all findings, deduplicates, assigns severity (blocking/major/minor)
- **Verdict**: APPROVED / APPROVED_WITH_SUGGESTIONS / CHANGES_REQUIRED / BLOCKING

## Running

Invoke via Claude Code's Workflow tool:

```
Workflow({
  scriptPath: ".mindforge/dynamic-workflows/scripts/pr-review.js",
  args: "<your input>"
})
```

Or discover via CLI:
```bash
node bin/mindforge-cli.js workflow info pr-review
```
