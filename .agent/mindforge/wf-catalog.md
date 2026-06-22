---
description: "Browse the MindForge dynamic workflow library — 12 pre-built multi-agent workflows"
---
# /mindforge:wf-catalog

Browse and discover the MindForge **Dynamic Workflow Library** — 12 pre-built multi-agent workflows that run via Claude Code's Workflow tool.

## Usage
`/mindforge:wf-catalog` — show all workflows grouped by tier

## Tiers

**Research** — Fan-out search, adversarial verification, cited synthesis
- `/mindforge:wf-deep-research` — Multi-source fact-checked research report
- `/mindforge:wf-competitive-analysis` — SWOT and positioning summary
- `/mindforge:wf-tech-evaluation` — Scored technology comparison matrix

**Dev** — Coding-assistant power workflows
- `/mindforge:wf-code-audit` — Parallel security + quality + performance audit
- `/mindforge:wf-feature-planner` — Brief → PRD → architecture → user stories
- `/mindforge:wf-pr-review` — 4-dimensional parallel PR review
- `/mindforge:wf-tdd-sprint` — Strict Red-Green-Refactor TDD loop
- `/mindforge:wf-refactor-plan` — Technical debt scan → safe refactor plan

**Ops** — Infrastructure and release workflows
- `/mindforge:wf-incident-response` — Parallel investigation → RCA → postmortem
- `/mindforge:wf-release-prep` — Tests → changelog → version bump → PR

**Intelligence** — Deep analysis and optimization
- `/mindforge:wf-onboard-codebase` — Map → domain → architecture → guided tour
- `/mindforge:wf-perf-optimize` — Profile → bottleneck hunt → prioritized fix plan

## CLI Discovery
```bash
node bin/mindforge-cli.js workflow list
node bin/mindforge-cli.js workflow info <name>
```
