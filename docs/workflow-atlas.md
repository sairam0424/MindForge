# 🗺️ MindForge Workflow Atlas

This document classifies every workflow and action in the MindForge `.github/` directory, explaining their triggers, roles, and governance tiers.

---

## 🏗️ The 5-Layer Plane Architecture (v2.0.0 — Recommended)

These workflows form the modular "Enterprise" architecture implemented for enterprise-grade autonomy.

### 1. Control Plane (`control-plane.yml`)
- **Primary Trigger**: `push` or `pull_request` to `main` or `develop`.
- **Role**: The Central Nervous System. It runs the `change-classifier.js` to assign a **Governance Tier (1-3)**. It enforces security gates and routes execution to other planes.
- **Priority**: High. This is the non-bypassable entry point.

### 2. Execution Plane (`execution-plane.yml`)
- **Primary Trigger**: `workflow_call` (Exclusively invoked by the Control Plane).
- **Role**: The Muscle. It handles the environment setup, project health checks (`mindforge-cli.js health`), and executes the agent in `--headless` mode.
- **Verification**: Runs `npm test` and `npm run lint`.

### 3. AI Intelligence Layer (`ai-intelligence.yml`)
- **Primary Trigger**: `workflow_call` (Invoked by Control Plane specifically on Pull Requests).
- **Role**: The Brain. Performs adversarial code reviews using **Claude** and **GPT-4o**. Posts a combined architectural review as a PR comment.

### 4. Release Plane (`release-plane.yml`)
- **Primary Trigger**: `push` of a version tag (e.g., `git push origin v1.2.3`).
- **Role**: The Logistics. Automates building the package, publishing to **npm**, and drafting a GitHub Release with changelogs.

### 5. Observability Plane (`observability-plane.yml`)
- **Primary Trigger**: `workflow_run` (Auto-runs whenever the "MindForge Control Plane" completes).
- **Role**: The Memory. Collects metrics on token costs, success rates, and audit logs to generate a summary of CI effectiveness.

---

## 🏛️ Maintenance & Legacy Workflows

These are existing workflows that provide secondary check-points or manual controls.

| Workflow | Trigger | Role | Status |
| :--- | :--- | :--- | :--- |
| `mindforge-ci.yml` | `push` to `main` or `feat/**` | Basic health/test check for feature branches. | **Active** |
| `mindforge-autonomous.yml` | `schedule` (Daily) or Manual | Runs deep maintenance or long-running tasks. | **Active** |
| `mindforge-ai-review.yml` | PR Label: `needs-review` | Label-triggered deep AI review. | **Fallback** |
| `mindforge-release.yml` | Tag: `v*` | Original release script. | **Redundant** |
| `mindforge-observability.yml`| `workflow_run` of "Core CI" | Original observability collector. | **Redundant** |

---

## 🚦 Trigger Logic Summary

| Event | Workflow Triggered | Primary Action |
| :--- | :--- | :--- |
| **New PR** | `control-plane.yml` | Classify → Security Scan → AI PR Review |
| **Commit to main** | `control-plane.yml` | Governance check → Execution |
| **Push Tag (v*)** | `release-plane.yml` | Publish to npm → Create GitHub Release |
| **Manual Reset** | `mindforge-autonomous.yml` | Run /mindforge:auto on specific phase |
| **Midnight** | `mindforge-autonomous.yml` | Daily health & autonomous cleanup |

---

## Complete Workflow Reference (v11.8.3)

MindForge ships **32 pre-built dynamic workflows** across 5 tiers. Each runs via the Claude Code `Workflow` tool using `parallel()`, `pipeline()`, `phase()`, and `agent()` primitives.

### How to run any workflow
```bash
# Discover:
node bin/mindforge-cli.js workflow list
node bin/mindforge-cli.js workflow info security-hardening

# Via slash command (Claude Code):
/mindforge:wf-code-audit

# Via Workflow tool:
Workflow({ name: "code-audit", args: "target: auth module" })
```

### Research Tier — Fan-out search, adversarial verification, cited synthesis
| Workflow | Phases | Best for |
|----------|--------|----------|
| `competitive-analysis` | Scope->Research->SWOT->Position | Evaluating products against competitors |
| `tech-evaluation` | Scope->Evaluate->Score->Recommend | Choosing frameworks or platforms |
| `ai-model-eval` | Scope->Benchmark->Score->Compare | Choosing between AI models |
| `ux-heuristic-audit` | Scope->Audit->Score->Brief | UI usability review |
| `competitive-teardown` | Scope->Research->Analyse->Report | Deep competitive intelligence |

### Dev Tier — Coding-assistant power workflows
| Workflow | Phases | Best for |
|----------|--------|----------|
| `code-audit` | Scope->Audit->Verify->Report | Pre-release code review |
| `feature-planner` | Brief->PRD->Arch->Stories | Starting a new feature |
| `pr-review` | Scope->Review->Consensus->Verdict | Thorough pull request review |
| `tdd-sprint` | Spec->Red->Green->Refactor | Test-driven implementation |
| `refactor-plan` | Scan->Prioritize->Sequence->Plan | Safe refactoring |
| `test-coverage-gap` | Analyse->Gap->Plan->Write | Finding and fixing test gaps |
| `api-contract-test` | Write->Review->Validate->Report | API contract validation |
| `debug-detective` | Hypothesize->Investigate->Verify->RCA | Hard-to-reproduce bugs |
| `writer-reviewer` | Implement->Review->Verdict->Revise | Unbiased code review |
| `mutation-testing` | Generate->Kill->Score->Report | Test suite effectiveness |
| `code-explainer` | Structure->Domain->Arch->Tour | Onboarding unfamiliar codebases |
| `design-system-audit` | Scan->Audit->Score->Recommendations | Design system health |

### Ops Tier — Infrastructure and release workflows
| Workflow | Phases | Best for |
|----------|--------|----------|
| `incident-response` | Alert->Investigate->Mitigate->RCA | Production incidents |
| `release-prep` | Check->Changelog->Bump->PR | Preparing a production release |
| `dependency-health` | Scan->CVE->License->Risk | Pre-release dependency review |
| `database-migration` | Diff->Risk->Scripts->Runbook | Database schema migrations |
| `multi-repo-sync` | Audit->Diverge->Map->Plan | Multi-repo consistency |
| `cost-analysis` | Profile->Analyse->Model->Plan | Cloud and API cost reduction |

### Intelligence Tier — Deep analysis and optimization
| Workflow | Phases | Best for |
|----------|--------|----------|
| `onboard-codebase` | Map->Domain->Arch->Tour | New team member onboarding |
| `perf-optimize` | Profile->Identify->Plan->Benchmark | Performance bottleneck investigation |
| `architecture-modernization` | Analyse->Design->Migrate->Validate | Monolith-to-services rewrites |
| `documentation-gen` | Scan->Generate->Normalise->Publish | Generating or refreshing docs |
| `api-migration` | Detect->Guide->Compat->Validate | API versioning and migration |
| `data-pipeline-validate` | Stage->Validate->Gate->Report | Data pipeline correctness |

### Beast Tier — Compound workflows (5 phases, 8+ agents, adversarial 3-vote verification)
| Workflow | Phases | Best for |
|----------|--------|----------|
| `security-hardening` | Scout->Verify->STRIDE->Roadmap->Validate | Pre-launch security hardening |
| `accessibility-audit` | Map->Audit->Verify->Remediate->Sign-off | WCAG 2.2 compliance |
| `security-threat-model` | Assets->STRIDE->Mitigate->CVSS->Report | Architecture threat modeling |
