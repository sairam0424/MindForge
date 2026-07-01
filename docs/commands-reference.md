# MindForge — Universal Commands Reference

MindForge commands are organized into functional pillars to support the entire software development lifecycle (SDLC), from initial architecture to final delivery at scale.

---

## 1. Project Management & Initialization

Commands to scaffold, orient, and prepare the framework for a specific repository context.

| Command | Description |
| :--- | :--- |
| `/mindforge:init-project` | Scaffolds the `.agent/` framework and initializes core planning files (`PROJECT.md`, `STATE.md`). |
| `/mindforge:init-org` | Standardizes MindForge at the organization level with global guardrails and security policies. |
| `/mindforge:map-codebase` | Performs deep architectural and semantic mapping of an existing codebase with parallel agents. |
| `/mindforge:new-runtime` | Scaffolds support for a new AI coding runtime (e.g., custom IDE or proprietary CLI). |

---

## 2. Core SDLC Lifecycle (The 4 Pillars)

The foundational MindForge workflow for predictable, high-quality development cycles.

| Command | Description |
| :--- | :--- |
| `/mindforge:plan-phase [N]` | Initiates strategic planning for a milestone: multi-agent discussion → research → atomic XML planning. |
| `/mindforge:execute-phase [N]` | Orchestrates the implementation of task plans via wave-based parallel execution with atomic commits. |
| `/mindforge:verify-phase [N]` | Triggers Human Acceptance Testing (UAT) and runs non-bypassable verification gates. |
| `/mindforge:ship [N]` | Finalizes delivery, generates a rich Pull Request body from artifacts, and prepares for merge. |

---

## 3. Specialized Design & Audit Phases

Mid-cycle protocols for ensuring architectural alignment and visual integrity.

| Command | Description |
| :--- | :--- |
| `/mindforge:ui-phase [N]` | Generates a declarative UI Design Contract (`UI-SPEC.md`) before implementation begins. |
| `/mindforge:ui-review [N]` | Performs a retroactive visual audit of implemented UI against the DESIGN_SYSTEM.md and UI-SPEC.md. |
| `/mindforge:validate-phase [N]` | Audits a completed phase for requirement coverage and Nyquist validation gaps. |
| `/mindforge:discuss-phase [N]` | Interactive requirements gathering and decision-locking before creating formal plans. |

---

## 4. Task, Idea & Backlog Management

Capturing and routing engineering intent with zero friction.

| Command | Description |
| :--- | :--- |
| `/mindforge:do <intent>` | Smart natural language dispatcher that routes freeform text to the correct MindForge workflow. |
| `/mindforge:note <text>` | Captures logic choices, todos, or preferences into session memory with automated promotion to tasks. |
| `/mindforge:add-backlog <desc>` | Parks speculative ideas in a "parking lot" to keep the active milestone focus lean. |
| `/mindforge:review-backlog` | Periodically audits and promotes backlog items into the active development roadmap. |
| `/mindforge:plant-seed <idea>` | Captures forward-looking ideas with triggers that surface automatically at the relevant milestone. |

---

## 5. Intelligence, Research & Code Review

Leveraging multi-model intelligence for deep codebase insights and quality assurance.

| Command | Description |
| :--- | :--- |
| `/mindforge:research <topic>` | Deep research using Gemini 1.5 Pro's 1-million-token window on the full codebase context. |
| `/mindforge:cross-review` | Simultaneous code diff review by multiple AI models with consensus detection and synthesis. |
| `/mindforge:pr-review` | Targeted AI review of a Pull Request with context loading and logic branch verification. |
| `/mindforge:benchmark` | Measures real-world skill effectiveness over time using standardized scoring vectors. |

---

## 6. Multi-Agent Workflows & Workstreams

Managing parallel feature tracks and autonomous execution clusters.

| Command | Description |
| :--- | :--- |
| `/mindforge:workstreams` | Manages parallel feature tracks with isolated state and independent planning artifacts. |
| `/mindforge:agent <persona>` | Invokes or spawns a specialized enterprise persona from the MindForge library (e.g., `sre`, `architect`). |
| `/mindforge:auto --phase [N]` | Starts the Autonomous Execution Engine for 100% hands-free implementation and state recovery. |

---

## 7. Observability, Metrics & FinOps

Real-time governance of the AI agent's behavior, costs, and project velocity.

| Command | Description |
| :--- | :--- |
| `/mindforge:dashboard` | Starts the local web dashboard for real-time observability and temporal steering. |
| `/mindforge:status` | Displays a reach terminal dashboard of project state, pending tasks, and recent audit events. |
| `/mindforge:metrics` | Analyzes session and phase quality trends with automated early warning signals. |
| `/mindforge:costs` | Tracks real-time token consumption and financial impact across all AI providers. |
| `/mindforge:tokens` | Profiles token usage efficiency and provides compaction recommendations. |

---

## 8. Skills, Knowledge & Marketplace

Managing the framework's intelligence capabilities and the global community registry.

| Command | Description |
| :--- | :--- |
| `/mindforge:remember <term>` | Retrieval-augmented search through the local knowledge graph and session memory. |
| `/mindforge:learn <source>` | Converts documentation, source code, or npm packages into validated, reusable MindForge skills. |
| `/mindforge:skills --list` | Lists all active skill packs with tier-based status (Core/Org/Project). |
| `/mindforge:marketplace` | Discover, evaluate, and install community-published skills from the npm-based registry. |
| `/mindforge:publish-skill` | Validates, versions, and publishes local skills to the central registry. |
| `/mindforge:install-skill` | Fetches and configures a skill from the marketplace into the local project. |

---

## 9. Governance, Integrations & Maintenance

Connecting MindForge to enterprise systems and keeping the framework hardened.

| Command | Description |
| :--- | :--- |
| `/mindforge:approve [event]` | Issues a manual Tier 3 cryptographic signature for a sensitive or high-risk operation. |
| `/mindforge:health` | Runs comprehensive framework diagnostics across 7 categories with auto-repair loops. |
| `/mindforge:update` | Checks for, diffs, and applies MindForge framework updates in a safe, scope-preserving way. |
| `/mindforge:migrate` | Executes schema migrations for `.planning/` files across framework versions. |
| `/mindforge:plugins` | Manages the framework plugin system and installs `mindforge-plugin-*` extensions. |

---

## 10. Advanced Engineering Protocols

High-fidelity behaviors ported from the Superpowers library and hardened for production.

| Command | Description |
| :--- | :--- |
| `/mindforge:brainstorming` | Deep exploratory protocol for intent clarification and architectural ideation. |
| `/mindforge:swarm-execution` | Wave-based implemention for independent, non-conflicting tasks. |
| `/mindforge:parallel-mesh` | Orchestrates a mesh of agent waves with automated dependency compaction. |
| `/mindforge:workspace` | Manages isolated development environments via git worktrees with smart safety checks. |
| `/mindforge:tdd` | Strict Test-Driven Development (Red-Green-Refactor) with automated test generation. |
| `/mindforge:debug` | Systematic debugging using persistent state tracking and Root Cause Analysis. |
| `/mindforge:verify-work` | Multi-level truth verification protocol (substance, existence, wiring). |
| `/mindforge:retrospective` | Facilitates structured team retrospectives with objective telemetry and metrics. |

---

## 11. Council, Verification & Intelligence (v11.8.3)

New commands introduced in the "Council Awakens" release for multi-voice decision-making, verification rigor, and self-evolving agent behavior.

| Command | Description |
| :--- | :--- |
| `/mindforge:council` | Invoke 4-voice decision council for architectural and strategic deliberation. |
| `/mindforge:consult` | Multi-LLM second opinion — routes a question to parallel models and synthesizes consensus. |
| `/mindforge:verify-loop` | Run 6-phase verification gates (substance, existence, wiring, integration, regression, acceptance). |
| `/mindforge:introspect` | Debug agent behavior and diagnose reasoning failures with structured trace analysis. |
| `/mindforge:cost-report` | Token usage analytics with per-provider breakdown and budget tracking. |
| `/mindforge:threat-model` | STRIDE/DREAD threat modeling with automated attack surface enumeration. |
| `/mindforge:learn-instinct` | Capture learned behavior patterns as instincts for future session priming. |
| `/mindforge:evolve-skills` | Promote validated instincts into full reusable skills with quality scoring. |

---

## 12. CLI Commands (`mindforge` binary)

After installation, the `mindforge` binary provides direct access to runtime operations. Use `--verbose` (`-v`) on any command for detailed output.

```bash
mindforge <command> [options]
```

| Command | Description |
| :--- | :--- |
| `security-scan` | Validate configuration and run security checks |
| `health` | Verify project health and installation integrity |
| `headless` | Run MindForge agent in headless (non-interactive) mode |
| `pr-review` | Run standard PR review logic |
| `cross-review` | Run advanced cross-model architecture review |
| `classify` | Classify changes into governance tiers |
| `approve` | Generate a governance approval signature to unblock Tier 3 gates |
| `validate-skill` | Run Level 1 & 2 validation on a SKILL.md file |
| `install-skill` | Install a skill to the correct tier folder |
| `register-skill` | Register a skill in MANIFEST.md |
| `audit-skill` | Record skill life cycle events in audit log |
| `remember` | Manage the long-term memory (knowledge graph) |
| `learn-skill` | Ingest source and generate a validated SKILL.md |
| `marketplace` | Search and install community skills |
| `spawn` | Spawn a persona essence (e.g., mf-planner) [v1.0: stub — dispatch not yet implemented] |
| `identity` | Invoke a specialized identity from /agents/ [v1.0: stub — dispatch not yet implemented] |
| `temporal` | Manage time-travel debugging and state history |
| `hindsight` | Inject a fix into a past point and regenerate state |
| `harvest` | Proactively harvest semantic intent from the intelligence mesh |
| `self-heal` | Auto-detect and repair reasoning drifts in the active swarm |
| `quantum-verify` | Verify framework integrity using post-quantum signatures |
| `metrics` | Display real-time velocity and quality metrics |
| `tokens` | Analyze token consumption and cost efficiency |
| `learning` | Consult or initialize the project agentic learning memory |
| `record-learning` | Append a new Learning Entry to the Evolution Log |
| `workflow list` | List all available dynamic workflows with descriptions |
| `workflow info <name>` | Show phases and metadata for a specific workflow |
| `workflow run <name> [args]` | Display invocation instructions for a workflow |

---

## 🚀 Dynamic Workflow Library

Pre-built multi-agent workflow scripts triggered via `/mindforge:wf-*` commands. Each runs via Claude Code's `Workflow` tool with true parallel agent execution. **32 pre-built multi-agent workflows** across 5 tiers.

| Command | Tier | Description |
| :--- | :--- | :--- |
| `/mindforge:wf-catalog` | — | Browse all 32 workflows grouped by tier |
| **Research tier** | | |
| `/mindforge:wf-competitive-analysis` | research | Multi-angle competitive research producing a SWOT and positioning summary |
| `/mindforge:wf-tech-evaluation` | research | Scored technology evaluation across DX, performance, security, ecosystem, and community |
| `/mindforge:wf-ai-model-eval` | research | 4-parallel model benchmark agents → scoring matrix → cost/performance recommendation |
| `/mindforge:wf-ux-heuristic-audit` | research | 10 Nielsen heuristics parallel audit → severity ranking → fix brief |
| `/mindforge:wf-competitive-teardown` | research | 5 parallel competitor angle agents → pipeline synthesis into competitive positioning report |
| **Dev tier** | | |
| `/mindforge:wf-code-audit` | dev | Parallel security + quality + performance audit with adversarial finding verification |
| `/mindforge:wf-feature-planner` | dev | Sequential pipeline: brief → PRD → architecture → user stories |
| `/mindforge:wf-pr-review` | dev | 4-dimensional parallel PR review: correctness, security, performance, style → consensus verdict |
| `/mindforge:wf-tdd-sprint` | dev | Strict Red-Green-Refactor TDD loop with spec-first discipline |
| `/mindforge:wf-refactor-plan` | dev | Technical debt scan → risk-sorted sequence → safe refactor implementation plan |
| `/mindforge:wf-test-coverage-gap` | dev | Parallel per-module coverage analysis → gap map → prioritized test-writing plan |
| `/mindforge:wf-api-contract-test` | dev | Writer/Reviewer pattern: spec reader vs implementation reader → contract violation report |
| `/mindforge:wf-debug-detective` | dev | 4-hypothesis parallel investigation → evidence gathering → scientific RCA |
| `/mindforge:wf-writer-reviewer` | dev | Anthropic Writer/Reviewer pattern: implement in Context A → fresh Context B reviews the diff |
| `/mindforge:wf-mutation-testing` | dev | Mutant generator → parallel kill-test agents → mutation score + survival report |
| `/mindforge:wf-code-explainer` | dev | Structural map → domain extraction → architecture patterns → guided narrative tour for onboarding |
| `/mindforge:wf-design-system-audit` | dev | 5 parallel dimension auditors (spacing/color/typography/icons/a11y) → consistency score |
| **Ops tier** | | |
| `/mindforge:wf-incident-response` | ops | Parallel investigation across logs, metrics, traces, and code → mitigation → RCA → postmortem |
| `/mindforge:wf-release-prep` | ops | Automated release pipeline: tests → changelog → version bump → PR → announcement draft |
| `/mindforge:wf-dependency-health` | ops | Parallel per-dependency audit (CVEs / licenses / staleness / maintenance) → risk matrix |
| `/mindforge:wf-database-migration` | ops | Schema diff → risk analysis → migration scripts → rollback plan |
| `/mindforge:wf-multi-repo-sync` | ops | Parallel per-repo audit → cross-repo divergence map → sync plan |
| `/mindforge:wf-cost-analysis` | ops | Parallel infra/API/query/bundle cost agents → reduction plan with ROI estimates |
| **Intelligence tier** | | |
| `/mindforge:wf-onboard-codebase` | intelligence | Map structure → domain analysis → architecture → generate guided tour and onboarding docs |
| `/mindforge:wf-perf-optimize` | intelligence | Profile → parallel bottleneck hunt across DB/network/CPU/memory → prioritized fix plan |
| `/mindforge:wf-architecture-modernization` | intelligence | Legacy architecture map → target design → migration sequencing → risk gates |
| `/mindforge:wf-documentation-gen` | intelligence | Parallel per-file doc generation → style normalization → publish-ready documentation |
| `/mindforge:wf-api-migration` | intelligence | Breaking change detection → versioning strategy → migration guide → compatibility matrix |
| `/mindforge:wf-data-pipeline-validate` | intelligence | Pipeline stage-by-stage validation → data quality gates → anomaly detection report |
| **Beast tier** | | |
| `/mindforge:wf-security-hardening` | beast | 5-angle OWASP parallel scout → 3-vote adversarial verification → threat model + remediation roadmap |
| `/mindforge:wf-accessibility-audit` | beast | WCAG 2.2 parallel per-criterion audit → 3-vote adversarial verify failures → remediation spec |
| `/mindforge:wf-security-threat-model` | beast | Asset inventory → STRIDE threat enumeration → parallel mitigations → CVSS-style score matrix |

---

## Dynamic Workflow Library (32 workflows)

All workflow commands follow the pattern `/mindforge:wf-<name>`.

Invoke via CLI:
```bash
node bin/mindforge-cli.js workflow list              # browse all 32
node bin/mindforge-cli.js workflow info <name>       # phases + description
```

### Research Tier (5 workflows)
| Command | Description |
|---------|-------------|
| `/mindforge:wf-competitive-analysis` | SWOT and positioning from 5 parallel research angles |
| `/mindforge:wf-tech-evaluation` | Scored technology evaluation across 5 dimensions |
| `/mindforge:wf-ai-model-eval` | Benchmark AI models → scoring matrix → recommendation |
| `/mindforge:wf-ux-heuristic-audit` | 10 Nielsen heuristics parallel audit → fix brief |
| `/mindforge:wf-competitive-teardown` | 5 competitor angles → positioning report |

### Dev Tier (12 workflows)
| Command | Description |
|---------|-------------|
| `/mindforge:wf-code-audit` | Parallel security + quality + performance audit |
| `/mindforge:wf-feature-planner` | Brief → PRD → architecture → user stories |
| `/mindforge:wf-pr-review` | 4-dimensional parallel PR review → verdict |
| `/mindforge:wf-tdd-sprint` | Strict Red-Green-Refactor TDD loop |
| `/mindforge:wf-refactor-plan` | Technical debt scan → risk-sorted refactor plan |
| `/mindforge:wf-test-coverage-gap` | Per-module coverage analysis → test-writing plan |
| `/mindforge:wf-api-contract-test` | Spec vs impl Writer/Reviewer → violation report |
| `/mindforge:wf-debug-detective` | 4-hypothesis parallel investigation → scientific RCA |
| `/mindforge:wf-writer-reviewer` | Implement → fresh context review → verdict |
| `/mindforge:wf-mutation-testing` | Mutant generator → parallel kill-test → score |
| `/mindforge:wf-code-explainer` | Structure → domain → architecture → narrative tour |
| `/mindforge:wf-design-system-audit` | 5-dimension parallel audit → consistency score |

### Ops Tier (6 workflows)
| Command | Description |
|---------|-------------|
| `/mindforge:wf-incident-response` | Parallel investigation → RCA → postmortem |
| `/mindforge:wf-release-prep` | Tests → changelog → version bump → PR |
| `/mindforge:wf-dependency-health` | CVE + license + staleness audit → risk matrix |
| `/mindforge:wf-database-migration` | Schema diff → risk → scripts → runbook |
| `/mindforge:wf-multi-repo-sync` | Per-repo audit → divergence map → sync plan |
| `/mindforge:wf-cost-analysis` | Infra/API/query/bundle cost agents → ROI plan |

### Intelligence Tier (6 workflows)
| Command | Description |
|---------|-------------|
| `/mindforge:wf-onboard-codebase` | Map → domain → architecture → guided tour |
| `/mindforge:wf-perf-optimize` | Profile → bottleneck hunt → prioritized fix plan |
| `/mindforge:wf-architecture-modernization` | Legacy map → 3 designs → migration roadmap |
| `/mindforge:wf-documentation-gen` | Parallel doc gen → normalize → publish-ready |
| `/mindforge:wf-api-migration` | Breaking change detection → guide → compat matrix |
| `/mindforge:wf-data-pipeline-validate` | Stage-by-stage validation → quality gates |

### Beast Tier (3 workflows — 5 phases, 8+ agents, adversarial 3-vote verification)
| Command | Description |
|---------|-------------|
| `/mindforge:wf-security-hardening` | 5-angle OWASP scout → 3-vote verify → STRIDE → roadmap |
| `/mindforge:wf-accessibility-audit` | WCAG 2.2 per-criterion → 3-vote verify → remediation spec |
| `/mindforge:wf-security-threat-model` | Asset inventory → STRIDE x6 → mitigations → CVSS matrix |
