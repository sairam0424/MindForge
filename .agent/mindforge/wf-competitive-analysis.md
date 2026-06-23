---
description: "Multi-angle competitive research producing a SWOT and positioning summary"
---
# /mindforge:wf-competitive-analysis

Runs the **Competitive Analysis** dynamic workflow.

## Usage
`/mindforge:wf-competitive-analysis <product/company/technology>`

## What it does
- **Scope**: Defines the competitive landscape target
- **Research**: 5 parallel angles — product features, pricing, reviews, community, roadmap
- **SWOT**: Synthesizes strengths, weaknesses, opportunities, threats
- **Position**: Produces strategic positioning and differentiation recommendations

## Running

Invoke via Claude Code's Workflow tool:

```
Workflow({
  scriptPath: ".mindforge/dynamic-workflows/scripts/competitive-analysis.js",
  args: "<your input>"
})
```

Or discover via CLI:
```bash
node bin/mindforge-cli.js workflow info competitive-analysis
```
