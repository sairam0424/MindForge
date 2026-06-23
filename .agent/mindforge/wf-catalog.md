---
description: "Browse the MindForge dynamic workflow library — 33 pre-built multi-agent workflows across 5 tiers"
---
# /mindforge:wf-catalog

Browse and discover the MindForge **Dynamic Workflow Library** — 33 pre-built multi-agent workflows that run via Claude Code's Workflow tool.

## Usage
`/mindforge:wf-catalog` — show all workflows grouped by tier

## Tiers

**Research** — Fan-out search, adversarial verification, cited synthesis
- `/mindforge:wf-deep-research` — Multi-source fact-checked research report
- `/mindforge:wf-competitive-analysis` — SWOT and positioning summary
- `/mindforge:wf-tech-evaluation` — Scored technology comparison matrix
- `/mindforge:wf-ai-model-eval` — Benchmark AI models → scoring matrix → recommendation
- `/mindforge:wf-ux-heuristic-audit` — 10 Nielsen heuristics parallel audit → fix brief
- `/mindforge:wf-competitive-teardown` — 5 competitor angles → positioning report

**Dev** — Coding-assistant power workflows
- `/mindforge:wf-code-audit` — Parallel security + quality + performance audit
- `/mindforge:wf-feature-planner` — Brief → PRD → architecture → user stories
- `/mindforge:wf-pr-review` — 4-dimensional parallel PR review
- `/mindforge:wf-tdd-sprint` — Strict Red-Green-Refactor TDD loop
- `/mindforge:wf-refactor-plan` — Technical debt scan → safe refactor plan
- `/mindforge:wf-test-coverage-gap` — Per-module coverage analysis → test-writing plan
- `/mindforge:wf-api-contract-test` — Spec vs impl Writer/Reviewer → violation report
- `/mindforge:wf-debug-detective` — 4-hypothesis parallel investigation → scientific RCA
- `/mindforge:wf-writer-reviewer` — Implement → fresh context review → verdict
- `/mindforge:wf-mutation-testing` — Mutant generator → parallel kill-test → score
- `/mindforge:wf-code-explainer` — Structure → domain → architecture → narrative tour
- `/mindforge:wf-design-system-audit` — 5-dimension parallel audit → consistency score

**Ops** — Infrastructure and release workflows
- `/mindforge:wf-incident-response` — Parallel investigation → RCA → postmortem
- `/mindforge:wf-release-prep` — Tests → changelog → version bump → PR
- `/mindforge:wf-dependency-health` — CVE + license + staleness audit → risk matrix
- `/mindforge:wf-database-migration` — Schema diff → risk → scripts → runbook
- `/mindforge:wf-multi-repo-sync` — Per-repo audit → divergence map → sync plan
- `/mindforge:wf-cost-analysis` — Infra/API/query/bundle cost agents → ROI plan

**Intelligence** — Deep analysis and optimization
- `/mindforge:wf-onboard-codebase` — Map → domain → architecture → guided tour
- `/mindforge:wf-perf-optimize` — Profile → bottleneck hunt → prioritized fix plan
- `/mindforge:wf-architecture-modernization` — Legacy map → 3 designs → migration roadmap
- `/mindforge:wf-documentation-gen` — Parallel doc gen → normalize → publish-ready
- `/mindforge:wf-api-migration` — Breaking change detection → guide → compat matrix
- `/mindforge:wf-data-pipeline-validate` — Stage-by-stage validation → quality gates

**Beast** — Compound workflows (5 phases, 8+ agents, adversarial verification)
- `/mindforge:wf-security-hardening` — 5-angle OWASP scout → 3-vote verify → STRIDE → roadmap
- `/mindforge:wf-accessibility-audit` — WCAG 2.2 per-criterion → 3-vote verify → remediation spec
- `/mindforge:wf-security-threat-model` — Asset inventory → STRIDE x6 → mitigations → CVSS matrix

## CLI Discovery
```bash
node bin/mindforge-cli.js workflow list
node bin/mindforge-cli.js workflow info <name>
```
