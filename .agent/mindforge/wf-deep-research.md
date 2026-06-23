---
description: "Fan-out web research with adversarial claim verification and cited synthesis"
---
# /mindforge:wf-deep-research

Runs the **Deep Research** dynamic workflow.

## Usage
`/mindforge:wf-deep-research <your research question>`

## What it does
- **Scope**: Decomposes your question into 5 independent search angles
- **Search**: 5 parallel web search agents, one per angle (~30s)
- **Fetch**: Deduplicates URLs, fetches top 15 sources, extracts falsifiable claims
- **Verify**: 3-vote adversarial verification per claim — 2/3 refutes kills a claim
- **Synthesize**: Merges confirmed findings, ranks by confidence, cites all sources

## Running

Invoke via Claude Code's Workflow tool:

```
Workflow({
  scriptPath: ".mindforge/dynamic-workflows/scripts/deep-research.js",
  args: "<your input>"
})
```

Or discover via CLI:
```bash
node bin/mindforge-cli.js workflow info deep-research
```
