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

## 11. Council, Verification & Intelligence (v10.0.3)

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
| `spawn` | Spawn a persona essence (e.g., mf-planner) |
| `identity` | Invoke a specialized identity from /agents/ |
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

Pre-built multi-agent workflow scripts triggered via `/mindforge:wf-*` commands. Each runs via Claude Code's `Workflow` tool with true parallel agent execution.

| Command | Tier | Description |
| :--- | :--- | :--- |
| `/mindforge:wf-catalog` | — | Browse all 12 workflows grouped by tier |
| `/mindforge:wf-deep-research` | research | Fan-out web research → adversarial verify → cited report |
| `/mindforge:wf-competitive-analysis` | research | 5× parallel angles → SWOT → positioning |
| `/mindforge:wf-tech-evaluation` | research | 5× dimensions → scored matrix → recommendation |
| `/mindforge:wf-code-audit` | dev | 3× parallel auditors → verified findings → risk report |
| `/mindforge:wf-feature-planner` | dev | Brief → PRD → architecture → user stories pipeline |
| `/mindforge:wf-pr-review` | dev | 4× parallel reviewers → consensus verdict |
| `/mindforge:wf-tdd-sprint` | dev | Spec → RED → GREEN → REFACTOR loop |
| `/mindforge:wf-refactor-plan` | dev | Debt scan → risk-sort → safe sequence → plan |
| `/mindforge:wf-incident-response` | ops | 4× parallel investigation → mitigate → RCA → postmortem |
| `/mindforge:wf-release-prep` | ops | Tests → changelog → version bump → PR → announcement |
| `/mindforge:wf-onboard-codebase` | intelligence | Map → domain → architecture → guided tour |
| `/mindforge:wf-perf-optimize` | intelligence | Profile → 4× bottleneck hunt → prioritized fix plan |

