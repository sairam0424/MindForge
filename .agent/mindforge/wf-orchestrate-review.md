---
description: "4-lens parallel review — factual, domain, safety, style — coordinated as one panel and merged into a single verdict"
---
# /mindforge:wf-orchestrate-review

Runs the **Orchestrate Review** dynamic workflow.

## Usage
`/mindforge:wf-orchestrate-review [target artifact, or describe what to review]`

## What it does
- **Scope**: Pins the target and any domain context
- **Panel**: 4 parallel lenses — factual accuracy, domain correctness, safety, style/voice
- **Consensus**: Merges all findings, deduplicates, assigns severity (blocking/major/minor)
- **Verdict**: APPROVED / APPROVED_WITH_SUGGESTIONS / CHANGES_REQUIRED / BLOCKING

## Running

Invoke via Claude Code's Workflow tool:

```
Workflow({
  scriptPath: ".mindforge/dynamic-workflows/scripts/orchestrate-review.js",
  args: "<your input>"
})
```

`args` can be a plain string target, or `{ target, domainContext }` for reviews that need
subject-matter framing (e.g. "this is a medical dosage guide" so the domain lens knows
what expertise to check against).

Or discover via CLI:
```bash
node bin/mindforge-cli.js workflow info orchestrate-review
```
