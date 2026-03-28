# MindForge — Enterprise Agentic Framework (v4.3.0)

MindForge turns Claude Code and Antigravity into production-grade engineering
partners with governance, observability, and a reactive autonomous intelligence engine.
Release published: v4.3.0-stable.

## Installation & Setup

### 🚀 Quick Start (No Install)

Run MindForge immediately for a specific runtime without a permanent installation:

```bash
npx mindforge-cc@latest --claude --global
```

### 🌍 Global Installation

Enable system-wide `/mindforge` commands for your primary AI coding runtime:

```bash
npm install -g mindforge-cc@latest
```

### 📂 Local Project Setup

Initialize MindForge in an existing repository with specialized agent identities:

```bash
npx mindforge-cc@latest --claude --local
```

---

## Why MindForge

AI coding agents degrade over long sessions. Context fills up. Quality drops.
Decisions get forgotten. MindForge fixes that with:

- **Autonomous FinOps (v4.3)** — Dynamic **C2C** (Confidence-to-Cost) routing and Agentic ROI tracking (v4.3)
- **Proactive Equilibrium (v4.3)** — Real-time **Wave Divergence** monitoring and autonomous state recovery (v4.3)
- **MindForge Nexus (v4.1)** — High-fidelity **ART** (Agentic Reasoning Tracing) for the agentic mesh
- **Dynamic Swarm Orchestration (v4)** — parallel "Agentic Mesh" with shared state (v4)
- **Zero-Trust Identity (v4.2)** — DID-signed non-repudiable audit logs with HSM/Enclave support (v4.3)
- **Global Intelligence Mesh (v4.2)** — Cross-repo knowledge sharing and Ghost Pattern Detection (v4.3)
- **Context Sharding (v3)** — relevance-dense memory management (40% token savings)
- **Adversarial Synthesis (v3)** — zero-drift logic through red/blue model debate
- **Temporal Vision (v3)** — full history scrubbing and hindsight state repair
- **RAG 2.0 (v3)** — automatic semantic shadowing for background pattern retrieval
- **Role personas** — specialised agent modes for each task type
- **Specialized Identities** — custom `/agents/` workspace with enriched `IDENTITY.md` protocols
- **Skills** — just-in-time domain knowledge loaded on demand
- **Wave execution** — parallelism with dependency safety
- **Autonomous Engine** — walk-away execution with steerability
- **Real-time Dashboard** — web-based observability with Temporal Slider
- **Browser Runtime** — headful/headless visual QA and sessions

- **Multi-Model Intelligence** — dynamic routing, adversarial reviews, and deep research (v2)
- **Persistent Knowledge Graph** — long-term memory across all engineering sessions (v2)
- **Self-Building Skills** — automatically capture knowledge from any source into reusable skills (v2)
- **Quality gates** — compliance and security are non-bypassable
- **Audit trail** — append-only history of every action

---


## 🛠️ Configuration & Runtimes

MindForge adapts to your existing engineering environment via runtime flags:

| Runtime | Global Command | Local Setup |
| :--- | :--- | :--- |
| **Claude Code** | `mindforge-cc --claude --global` | `mindforge-cc --claude --local` |
| **Antigravity** | `mindforge-cc --antigravity --global` | `mindforge-cc --antigravity --local` |
| **Cursor** | `mindforge-cc --cursor --global` | `mindforge-cc --cursor --local` |
| **GitHub Copilot** | `mindforge-cc --copilot --global` | `mindforge-cc --copilot --local` |
| **Gemini CLI** | `mindforge-cc --gemini --global` | `mindforge-cc --gemini --local` |

### Advanced Setup Options
- **Combined Runtimes**: `mindforge-cc --runtime claude,cursor --local`
- **With Utilities**: `mindforge-cc --local --with-utils` (Installs specialized bin scripts)
- **Minimalist**: `mindforge-cc --local --minimal` (Only basic protocols, no persona library)

---


## Verify

Open Claude Code or Antigravity in your project directory and run:

```bash
/mindforge:health
```

If issues are found, run:
```bash
/mindforge:health --repair
```

---


## Quick start (new project)

```bash
/mindforge:init-project
/mindforge:plan-phase 1
/mindforge:execute-phase 1
/mindforge:verify-phase 1
/mindforge:ship 1
```


## Quick start (existing codebase)

```bash
/mindforge:map-codebase
/mindforge:do I want to plan the next phase
/mindforge:plan-phase 1
```

---


## Core workflow

```bash
/mindforge:init-project
    → Requirements interview
    → Creates PROJECT.md, REQUIREMENTS.md, STATE.md

/mindforge:do <text>
    → Smart natural language dispatcher (v2)

/mindforge:note <text>
    → Zero-friction idea capture and todo promotion (v2)

/mindforge:ui-phase 1
    → Create UI design contract (UI-SPEC.md) (v2)

/mindforge:plan-phase 1 [--ads]
    → Discuss scope and decisions
    → Research domain (parallel)
    → Create atomic XML task plans
    → (Optional) Run Adversarial Decision Synthesis (ADS) loop

/mindforge:execute-phase 1
    → Wave-based parallel execution
    → One commit per task
    → Automated verification

/mindforge:ui-review 1
    → Retroactive 6-pillar visual audit (v2)

/mindforge:validate-phase 1
    → Requirement coverage and test gap audit (v2)

/mindforge:session-report
    → Automated post-session stakeholder summary (v2)

/mindforge:add-backlog <desc>
    → Park ideas in 999.x "parking lot" (v2)

/mindforge:review-backlog
    → Review and promote backlog items (v2)

/mindforge:plant-seed <idea>
    → Capture speculative ideas with triggers (v2)

/mindforge:workstreams
    → Parallel feature tracks with isolated state (v2)

/mindforge:execute-phase 1
    → Wave-based parallel execution
    → One commit per task
    → Automated verification

/mindforge:verify-phase 1
    → Human acceptance testing
    → Debug agent on failures
    → UAT sign-off

/mindforge:ship 1
    → Changelog generation
    → Final quality gates
    → PR creation

/mindforge:auto --phase 1
    → Walk-away autonomous execution (v2)
    → Intelligent stuck detection and node repair
    → External steering via steering-queue

/mindforge:qa
    → Systematic visual verification of UI changes (v2)
    → Automated regression test generation
    → Persistent browser sessions and daemon

/mindforge:cross-review
    → Adversarial multi-model code review and synthesis (v2)
    → Consensus detection and severity normalization

/mindforge:research
    → Deep research using Gemini 1.5 Pro 1M context (v2)
    → Codebase-wide context packaging and SSRF protection

/mindforge:costs
    → Real-time token usage and cost profiling (v2)
    → Daily budget tracking across all providers

/mindforge:remember
    → Manual knowledge management and search (v2)
    → Persistent knowledge graph retrieval and promotion

/mindforge:dashboard
    → Real-time web observability and governance at localhost:7339 (v2)
    → Live audit logs, metrics, activity, and team feed

/mindforge:learn
    → Automatically capture skills from Docs, Sessions, or npm (v2)
    → 7-dimension quality scoring and injection protection

/mindforge:marketplace
    → Search, install, and publish community skills (v2)
    → Verified installation via npm-based registry

/mindforge:new-runtime
    → Scaffold custom runtime configurations for any AI agent (v2)
```

---

## Execution Modes

MindForge supports multiple interaction models to fit your engineering workflow:

- **In-IDE Orchestration**: Use `/mindforge:agent <persona>` for real-time delegation.
- **Enterprise Workflows**: Specialized commands like `/mindforge:tdd`, `/mindforge:architecture`, and `/mindforge:planner`.
- **CLI Automation**: Run `node bin/mindforge-cli.js spawn <persona>` for scripted tasks.

---

## Updates and migrations
```bash
/mindforge:update
/mindforge:update --apply
/mindforge:migrate --from v0.6.0 --to v1.0.0
```

---

## Plugin system (v1.0.0)
Plugins extend MindForge via the `mindforge-plugin-*` namespace.

```
/mindforge:plugins list
/mindforge:plugins install mindforge-plugin-<name>
/mindforge:plugins validate
```

---

## Token usage profiling
```
/mindforge:tokens --profile
```
See `.mindforge/production/token-optimiser.md`.

---

## Documentation
- **User Guide:** `docs/user-guide.md`
- **Troubleshooting:** `docs/troubleshooting.md`
- **CI Quickstart:** `docs/ci-quickstart.md`
- **Requirements:** `docs/requirements.md`
- **Quick verify:** `docs/quick-verify.md`
- **Upgrade guide:** `docs/upgrade.md`
- **FAQ:** `docs/faq.md`
- **Release notes:** `RELEASENOTES.md`
- **Release checklist guide:** `docs/release-checklist-guide.md`
- **USPs and features:** `docs/usp-features.md`
- **Full tutorial:** `docs/tutorial.md`
- **Commands:** `docs/reference/commands.md`
- **Config reference:** `docs/reference/config-reference.md`
- **SDK:** `docs/reference/sdk-api.md`
- **Skills:** `docs/reference/skills-api.md`
- **Audit events:** `docs/reference/audit-events.md`
- **Security:** `docs/security/SECURITY.md`
- **Threat model:** `docs/security/threat-model.md`
- **Architecture:** `docs/architecture/README.md`
- **Contributing:** `docs/contributing/CONTRIBUTING.md`

---

## What's new in v4.3 (Enterprise Mesh & Equilibrium)

MindForge V4.3 matures the framework for enterprise mission-critical environments.

- **Autonomous FinOps Hub**: Automated budget enforcement and dynamic model selection based on task complexity (C2C).
- **Proactive Equilibrium**: Real-time divergence detection (Wave Monitoring) and autonomous repair loops.
- **Structural Reorganization**: Production-grade `bin/` directory architecture for all core implementation logic.
- **Enhanced ZTAI**: Asymmetric cryptographic signatures for all and simulated HSM support.

## What's new in v4.2 (Identity & Memory)

MindForge V4.2 focuses on **Identity** and **Memory** within the agentic swarm.

- **ZTAI Beast Mode**: Every agent action is cryptographically signed using asymmetric keys. Tier 3 agents use a simulated **Secure Enclave (HSM)** for top-level non-repudiation.
- **Audit Integrity**: High-fidelity audit manifests generated with **Merkle-root** cumulative hash chains.
- **Semantic Hub**: Synchronization between local repository memory and the global organizational store (`~/.mindforge/`).
- **Ghost Pattern Detection**: Proactive risk detection that warns agents when a proposed design matches a past organizational failure.

## What's new in v4.1 (Nexus)

🚀 **The High-Fidelity Observability Era**

MindForge V4.1 introduces **Nexus**, the definitive observability layer for autonomous agents.

- **Agentic Reasoning Tracing (ART)**: Deep visibility into "thought chains" and parallel mesh reasoning via hierarchical spans.
- **Trace Context Propagation**: OpenTelemetry-compatible trace IDs across waves, tasks, and swarm clusters.
- **Reasoning Heatmaps**: Automated visualization of adversarial disagreement and consensus synthesis.
- **Mesh Visibility**: Live tracing of ephemeral specialist clusters in the agentic mesh.

---

## What's new in v4.0.0 (Swarm)

---

## Evolution from v2.x

- **Expanded Persona Ecosystem**: 32+ specialized engineering personas.
- **Real-time Dashboard**: Web-based observability and governance.
- **Persistent Knowledge Graph**: Long-term project memory across sessions.
- **Multi-Model Intelligence**: Dynamic routing, adversarial reviews, and deep research.
- **Visual QA Engine**: Systematic visual audit and regression test generation.
- **Autonomous Execution**: Walk-away execution with real-time steerability.

---

## Security
MindForge never stores credentials in files. Review:
- `docs/security/SECURITY.md`
- `docs/security/threat-model.md`

---

## License
MIT
