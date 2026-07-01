# MindForge Dynamic Workflow Registry

32 pre-built multi-agent workflows across 5 tiers. Each runs via Claude Code's `Workflow` tool using `parallel()`, `pipeline()`, `phase()`, and `agent()` primitives to fan out work across concurrent subagents and synthesize results.

**Trigger:** Use `/mindforge:wf-catalog` to browse interactively, or invoke any `/mindforge:wf-<name>` command directly.

## Research tier — Fan-out search, adversarial verification, cited synthesis

| Workflow | Command | Description | Best for |
|----------|---------|-------------|----------|
| competitive-analysis | /mindforge:wf-competitive-analysis | SWOT and positioning from 5 research angles | Evaluating products/companies against competitors |
| tech-evaluation | /mindforge:wf-tech-evaluation | Scored technology evaluation across 5 dimensions | Choosing frameworks, libraries, or platforms |
| ai-model-eval | /mindforge:wf-ai-model-eval | 4-parallel model benchmark → scoring matrix | Choosing between AI models or providers |
| ux-heuristic-audit | /mindforge:wf-ux-heuristic-audit | 10 Nielsen heuristics parallel audit → fix brief | UI usability review |
| competitive-teardown | /mindforge:wf-competitive-teardown | 5 competitor angles → positioning report | Deep competitive intelligence |

## Dev tier — Coding-assistant power workflows

| Workflow | Command | Description | Best for |
|----------|---------|-------------|----------|
| code-audit | /mindforge:wf-code-audit | Parallel security + quality + performance audit | Pre-release or pre-pentest code review |
| feature-planner | /mindforge:wf-feature-planner | Brief → PRD → architecture → user stories | Starting a new feature |
| pr-review | /mindforge:wf-pr-review | 4-dimensional parallel PR review → verdict | Thorough pull request review |
| tdd-sprint | /mindforge:wf-tdd-sprint | Strict Red-Green-Refactor TDD loop | Implementing with test-driven development |
| refactor-plan | /mindforge:wf-refactor-plan | Debt scan → risk-sorted → safe refactor plan | Planning safe refactoring |
| test-coverage-gap | /mindforge:wf-test-coverage-gap | Per-module coverage analysis → test-writing plan | Finding and fixing test gaps |
| api-contract-test | /mindforge:wf-api-contract-test | Writer/Reviewer spec vs impl → violation report | API contract validation |
| debug-detective | /mindforge:wf-debug-detective | 4-hypothesis parallel investigation → scientific RCA | Hard-to-reproduce bugs |
| writer-reviewer | /mindforge:wf-writer-reviewer | Implement → fresh context review → verdict | Unbiased code review |
| mutation-testing | /mindforge:wf-mutation-testing | Mutant generator → parallel kill-test → score | Test suite effectiveness |
| code-explainer | /mindforge:wf-code-explainer | Structure → domain → architecture → narrative tour | Onboarding to unfamiliar codebases |
| design-system-audit | /mindforge:wf-design-system-audit | 5-dimension parallel audit → consistency score | Design system health checks |

## Ops tier — Infrastructure and release workflows

| Workflow | Command | Description | Best for |
|----------|---------|-------------|----------|
| incident-response | /mindforge:wf-incident-response | Parallel investigation → mitigation → RCA → postmortem | Production incidents |
| release-prep | /mindforge:wf-release-prep | Tests → changelog → version bump → PR | Preparing a production release |
| dependency-health | /mindforge:wf-dependency-health | CVE + license + staleness audit → risk matrix | Pre-release dependency review |
| database-migration | /mindforge:wf-database-migration | Schema diff → risk → scripts → runbook | Database schema migrations |
| multi-repo-sync | /mindforge:wf-multi-repo-sync | Per-repo audit → divergence map → sync plan | Multi-repo consistency |
| cost-analysis | /mindforge:wf-cost-analysis | Infra/API/query/bundle cost agents → ROI plan | Cloud and API cost reduction |

## Intelligence tier — Deep analysis and optimization

| Workflow | Command | Description | Best for |
|----------|---------|-------------|----------|
| onboard-codebase | /mindforge:wf-onboard-codebase | Map → domain → architecture → guided tour | New team member onboarding |
| perf-optimize | /mindforge:wf-perf-optimize | Profile → bottleneck hunt → prioritized fix plan | Performance bottleneck investigation |
| architecture-modernization | /mindforge:wf-architecture-modernization | Legacy map → 3 designs → migration roadmap | Monolith-to-services, major rewrites |
| documentation-gen | /mindforge:wf-documentation-gen | Parallel doc gen → normalize → publish-ready | Generating or refreshing docs |
| api-migration | /mindforge:wf-api-migration | Breaking change detection → guide → compat matrix | API versioning and migration |
| data-pipeline-validate | /mindforge:wf-data-pipeline-validate | Stage-by-stage validation → quality gates | Data pipeline correctness checks |

## Beast tier — Compound workflows (5 phases, 8+ agents, adversarial verification)

| Workflow | Command | Description | Best for |
|----------|---------|-------------|----------|
| security-hardening | /mindforge:wf-security-hardening | 5-angle OWASP scout → 3-vote verify → STRIDE → roadmap | Pre-launch security hardening |
| accessibility-audit | /mindforge:wf-accessibility-audit | WCAG 2.2 per-criterion → 3-vote verify → remediation spec | WCAG 2.2 compliance |
| security-threat-model | /mindforge:wf-security-threat-model | Asset inventory → STRIDE x 6 → mitigations → CVSS matrix | Architecture threat modeling |
