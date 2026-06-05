# MindForge

**An agentic intelligence framework for Claude Code** — orchestrates multi-agent workflows with governance, memory, and autonomous execution. Production-hardened with true parallelism, streaming SDK, and zero-trust security. Install once, get structured AI-driven development with built-in quality gates.

---

## Latest: v11.3.1

- **v11.3.1 — Packaging hotfix.** Restores the full published payload: every `npx mindforge-cc` install now delivers all 174 slash commands, 73 skills, 154 subagents, and the complete `.mindforge/` framework. (v11.3.0 shipped a too-narrow npm allowlist that silently dropped commands and skills — fixed here, with a tarball regression test so it cannot recur.)
- **v11.3.0 — "Legion".** Imports 154 specialized Claude-Code-native subagents across 10 categories into `.claude/agents/`, fully rebranded and collision-safe. Additive and backward-compatible.

See [CHANGELOG.md](./CHANGELOG.md) for full release history.

## v11.0.0 — Sovereign Stability

MindForge v11.0.0 "Sovereign Stability" is a production-hardening release focused on reliability, performance, and real-world deployment readiness. Key highlights:

- **Memory-safe operations** — LRU-bounded caches, atomic writes, log rotation, and snapshot garbage collection eliminate resource leaks in long-running sessions.
- **True wave parallelism** — Semaphore-based concurrent execution with configurable max concurrency replaces sequential task dispatch.
- **Streaming SDK** — WebSocket event streaming, `streamExecution()` with AsyncIterable, and `batchExecute()` for high-throughput integrations.
- **Hardened security** — Ephemeral enclave keys, session-scoped agent isolation, time-limited RBAC elevation, dashboard rate limiting, and structured ZK proof returns.
- **Production observability** — `/api/v1/system` health endpoint, P95 latency tracking, heap health monitoring, and real EIS client with retry logic.
- **Graduated intelligence** — Adaptive tier escalation (+1/+2/MAX) with cost-awareness, 3-tier stuck detection, and adaptive context windows.

This release ships 211 personas, 73 skills, 154 specialized subagents, 174 commands, 18 pillars, and 49 swarm templates across 12 engineering domains.


## Installation & Setup

### 🚀 Quick Start (No Install)

Run MindForge immediately for a specific runtime without a permanent installation:

```bash
# For Claude Code
npx mindforge-cc@latest --claude --global

# For Antigravity
npx mindforge-cc@latest --antigravity --global
```

### 🌍 Global Installation

Enable system-wide `/mindforge` commands for your primary AI coding runtime:

```bash
npm install -g mindforge-cc@latest
```

### 📂 Local Project Setup

Initialize MindForge in an existing repository with specialized agent identities:

```bash
# For Claude Code
npx mindforge-cc@latest --claude --local

# For Antigravity
npx mindforge-cc@latest --antigravity --local
```

---

- **Production Hardening (v11.0.0)** — LRU caches, atomic JSON writes, log rotation, HANDOFF validation, and temporal snapshot GC for crash-safe long-running sessions.
- **True Wave Parallelism (v11.0.0)** — Semaphore-based concurrent wave execution with configurable max concurrency replaces sequential dispatch.
- **Streaming SDK (v11.0.0)** — WebSocket event streaming, `streamExecution()` AsyncIterable, `batchExecute()`, model streaming across Anthropic/OpenAI/Gemini providers.
- **Graduated Intelligence (v11.0.0)** — Adaptive tier escalation (+1/+2/MAX) with cost-awareness, 3-tier stuck detection, and adaptive context windows (10/20/30).
- **Security Hardening (v11.0.0)** — Ephemeral enclave keys, session-scoped ZTAI, time-limited RBAC elevation, dashboard rate limiting (100 req/min/IP), token expiration.
- **Observability (v11.0.0)** — `/api/v1/system` health endpoint, P95 latency ring buffer, heap health monitoring, real EIS client with exponential backoff.
- **Grounded Wave Execution (v9.0.0)** — AutoRunner reads HANDOFF.json wave groups, dispatches tasks with audit tracing, persists progress, and resumes on restart (Pillar XXIV).
- **Model Topology Modernization (v9.0.0)** — All model references updated to the Claude 4.x family: claude-opus-4-7, claude-sonnet-4-6, claude-haiku-4-5 (Pillar XXV).
- **Unified Memory Architecture (v9.0.0)** — Knowledge and graph edges consolidated into SQLite (celestial.db) with FTS5 search. Four JSONL stores replaced by one queryable store (Pillar XXVI).
- **Schema Migration Engine (v9.0.0)** — `_migrations` table with versioned migration tracking and transaction-wrapped bulk imports (Pillar XXVII).
- **Integration Test Chain (v9.0.0)** — 27-assertion end-to-end test suite validating the full execution pipeline (Pillar XXVIII).
- **Sovereign Identity Synthesis (v8.1.1)** — Autonomous `SOUL.md` generation derived from reasoning traces and interaction sentiment (Pillar XIX).
- **Autonomous SRE Layer (v8.2.0)** — Self-healing production reliability engine with reactive sentinel observability and adversarial remediation auditing (Pillars XX-XXIII).
- **Unified Persistence Layer (v8.0)** — Centralized SQLite/FTS5 engine for sub-millisecond reasoning audits and semantic reasoning (Pillar XV).
- **Federated Mesh Synthesis (v8.0)** — Signed knowledge handoffs via MindForge Bundles (`.mfb`) and federated intelligence synchronization (Pillar XVI).
- **Autonomous Skill Evolution (v8.0)** — Self-generating persistent skills from reasoning traces with logic-drift mining (Pillar XVII).
- **Orbital Governance (v8.0)** — Hardware-bound (HSM/Biometric) attestation for high-blast-radius security gates (Pillar XVIII).
- **Post-Quantum Agentic Security (v7.0)** — Lattice-based (Dilithium-5) signatures and ZK-Proof bypasses (Pillar XI).
- **Proactive Semantic Homing (v7.0)** — Autonomous "Intent Hunting" and peer-healing mesh behavior (Pillar XII).
- **Autonomous Resource Harvesting (v7.0)** — Real-time token arbitrage and dynamic task routing (Pillar IX).
- **Neural Drift Remediation (v7.0)** — Semantic density heuristics and automated reasoning recovery (Pillar X).
- **Interactive Temporal Steering (v5.10)** — Full history scrubbing, hindsight state repair, and real-time temporal slider navigation (Pillar VII).
- **AgRevOps Hub (v6.0)** — Dynamic ROI tracking ($100/hr mapping), Milestone Velocity forecasting, and Governance Debt monitoring (Pillar VIII).
- **Sovereign Reason Enclave (v5.8)** — TEE-simulated reasoning isolation with Zero-Knowledge (ZK) Audit Trails (Pillar VI).
- **Multi-Cloud Arbitrage (v5.7)** — Dynamic routing across Vertex AI, Bedrock, and Azure with intelligence-first task affinity (Pillar V).
- **Sentinel Execution (v5.6)** — JIT Binary Runtime Attestation and Zero-Trust Skill Enforcement (Pillar IV).
- **Predictive Agentic Reliability (v5.5)** — Advanced loop detection and self-healing resonance (Pillar III).
- **Dynamic Blast Radius (v5.3)** — Real-time impact analysis and circuit-breaker safety in the federated sync (Pillar II).
- **Semantic Vector Consensus (v5.2)** — FIM v2 with cosine-similarity conflict resolution (Pillar I).
- **Human-Agent Handover (v5.0)** — Nexus State Bundles and mid-wave steering injection.
- **Autonomous FinOps (v4.3)** — Dynamic **C2C** (Confidence-to-Cost) routing.
- **Proactive Equilibrium (v4.3)** — Real-time **Wave Divergence** monitoring and autonomous state recovery.
- **MindForge Nexus (v4.1)** — High-fidelity **ART** (Agentic Reasoning Tracing).
- **Zero-Trust Identity (v4.2)** — DID-signed non-repudiable audit logs with HSM/Enclave support.
- **Global Intelligence Mesh (v4.2)** — Cross-repo knowledge sharing and Ghost Pattern Detection.
- **Context Sharding (v3)** — relevance-dense memory management (40% token savings)
- **Adversarial Synthesis (v3)** — zero-drift logic through red/blue model debate
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
/mindforge:migrate --from v10.7.0 --to v11.0.0
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

## 📜 Framework Evolution & Version History

<details>
<summary><b>v11.0.0 — Sovereign Stability (Production Hardening)</b></summary>

- **Phase 1: Foundation** — LRU-bounded caches, atomic JSON writes, AUDIT.jsonl log rotation, HANDOFF.json structural validation, temporal snapshot garbage collection.
- **Phase 2: Intelligence** — BM25 scoring with document-length normalization, full remediation strategy implementations, graduated intelligence interlock (+1/+2/MAX), 3-tier stuck detection, adaptive context windows.
- **Phase 3: Security** — Structured ZK proof returns, ephemeral SRE enclave keys, session-scoped ZTAI agent registry, time-limited RBAC elevation, dashboard rate limiting and token expiration, optional GPG approval verification.
- **Phase 4: Observability** — Async temporal I/O, `/api/v1/system` health endpoint, P95 latency ring buffer, heap health monitoring, EIS client de-stub with real fetch and retry logic.
- **Phase 5: SDK/Distributed** — Semaphore-based wave parallelism, WebSocket event streaming with auto-reconnect, `batchExecute()`, model streaming (Anthropic/OpenAI/Gemini), migration script from v10.7.0.
</details>

<details>
<summary><b>v10.x — The 200-Skills Expansion (Council → Platform Sovereign)</b></summary>

- **Council Awakens (v10.0.3)**: Council decision framework, Instinct Engine, Cost-Aware Routing, 6-phase Verification Loop, Multi-LLM Consult.
- **Skills Expansion (v10.0.4–v10.7.0)**: From 20 to 200+ core skills across 12 domains — AI/ML, data engineering, platform engineering, mobile, leadership, industry verticals, and more.
- **400+ Personas**: Comprehensive specialist coverage with domain-expert identity protocols.
- **49 Swarm Templates**: Task-aware parallel specialist clusters covering every engineering discipline.
</details>

<details>
<summary><b>v9.x — Grounded Execution & SQLite Persistence</b></summary>

- **Grounded Wave Execution (Pillar XXIV)**: AutoRunner reads HANDOFF.json wave groups with audit tracing and restart persistence.
- **Model Topology Modernization (Pillar XXV)**: Claude 4.x family (opus-4-7, sonnet-4-6, haiku-4-5).
- **Unified Memory Architecture (Pillar XXVI)**: SQLite (celestial.db) with FTS5 search replacing JSONL stores.
- **Schema Migration Engine (Pillar XXVII)**: Versioned migration tracking with transaction-wrapped imports.
- **Integration Test Chain (Pillar XXVIII)**: 27-assertion end-to-end pipeline validation.
</details>

<details>
<summary><b>v8.1.x — Sovereign Identity (Pillar XIX)</b></summary>

- **Pillar XIX: Sovereign Identity Synthesis**: Autonomous creation and evolution of `SOUL.md` from execution traces.
- **Soul Mirroring**: Agent personality and decision-heuristics that self-adapt based on persistent user interaction sentiment.
- **Identity Enforcement**: Mandatory alignment of subagents with the instance's unique Sovereign Identity.
</details>

<details>
<summary><b>v8.0.x — Celestial Orchestration (SQLite & FMS)</b></summary>

- **Pillar XV: Unified Persistence Layer**: Transition from file-based JSONL state to a high-performance SQLite engine with FTS5 semantic search.
- **Pillar XVI: Federated Mesh Synthesis (FMS)**: Inter-project knowledge sharing via cryptographically signed `.mfb` (MindForge Bundles).
- **Pillar XVII: Autonomous Skill Evolution (ASE)**: Automated mining of "Golden Traces" to synthesize reusable `.skill.md` artifacts.
- **Pillar XVIII: Orbital Governance**: Hardware-locked security gates requiring HSM/Biometric attestation for high-impact mutations (>95).
</details>

<details>
<summary><b>v7.x — Sovereign Intelligence (PQAS & Homing)</b></summary>

- **Pillar XI: Post-Quantum Agentic Security (PQAS)**: Lattice-based (Dilithium-5) signatures and ZK-Proof bypasses for Tier 4 agent identities.
- **Pillar XII: Proactive Semantic Homing**: Autonomous "Intent Hunting" where agents proactively claim tasks and peer-heal logic drift (>80) in the mesh.
- **Pillar IX: Autonomous Resource Harvesting (ARH)**: Real-time token arbitrage and dynamic task routing based on MIR (Min-Intelligence-Requirement).
- **Pillar X: Neural Drift Remediation (NDR)**: Semantic density heuristics and automated reasoning recovery to break logic loops and hallucinations.
- **Agentic Learning Loop**: Mandatory "Read Before, Record After" protocol for all agentic actions, ensuring a persistent, self-improving engineering memory.
</details>

<details>
<summary><b>v6.x — AgRevOps & Stability Patterns</b></summary>

- **AgRevOps ROI Engine (Pillar VIII)**: Real-time value attribution ($100/hr dev saving mapping) for every autonomous reasoning cycle.
- **FIM Expansion**: Aggregation of collective project health metrics via `PillarHealthTracker`.
- **CADIA Optimizer (Pillar II Upgrade)**: Dynamic risk scoring (0-100) and session entropy guardrails to prevent rogue behaviors.
- **Homing Signal Injection**: Automated capture of high-efficacy SCS homing instructions as durable, sharable knowledge.
</details>

<details>
<summary><b>v5.10.x — Nexus Steering & AgRevOps</b></summary>

- **Interactive Temporal Steering (Pillar VII)**: Hindsight injection and temporal slider navigation via the Nexus Dashboard.
- **ROI Engine (Pillar VIII)**: Automated financial governance and cumulative agentic ROI tracking.
- **Velocity Forecaster**: Statistical ETA prediction for milestones based on live telemetry.
</details>

<details>
<summary><b>v5.9.x — Enterprise Level Hardening</b></summary>

- **Unified NexusTracer**: Single, high-fidelity ART protocol singleton with a core asynchronous drive.
- **Merkle-Style Audit Integrity**: Hardened SRE and ZTAI logs with cumulative Merkle-hash chains.
- **MCA Circuit Breakers**: Stateful provider blacklisting in the `CloudBroker` with automated failure remediation.
</details>

<details>
<summary><b>v5.7.x - v5.8.x — SRE & MCA Protocols</b></summary>

- **Sovereign Reason Enclaves (v5.8)**: ZK-Proof compliance certificates for confidential reasoning cycles.
- **Multi-Cloud Arbitrage (v5.7)**: Intelligence-first routing using persistent Task-to-Model success matrices.
</details>

<details>
<summary><b>v5.1.x - v5.6.x — The "Enterprise" Era (Protocols & Trust)</b></summary>

- **Sentinel Execution (v5.6)**: Binary Runtime Attestation and Reasoning Entropy Scoring (RES).
- **Predictive Agentic Reliability (v5.5)**: Advanced loop detection (Semantic Mirroring) and self-healing triggers.
- **Dynamic Blast Radius (v5.3/v5.4)**: Real-time impact analysis and circuit-breaker safety in the federated sync.
- **Semantic Vector Consensus (v5.2)**: FIM v2 with cosine-similarity conflict resolution.
- **Enterprise Edition Protocols (v5.1)**: 14 advanced agentic protocols (Brainstorming, Swarm, Parallel Mesh) integrated from Superpowers.
</details>

<details>
<summary><b>v4.x — The Mesh & Nexus Revolution</b></summary>

- **Enterprise Mesh (v4.3)**: Autonomous FinOps and Proactive Equilibrium (Wave Monitoring).
- **Identity & Memory (v4.2)**: Zero-Trust Agentic Identity (ZTAI) with Ed25519 signing.
- **MindForge Nexus (v4.1)**: Hierarchical ART tracing and trace context propagation.
- **Mesh Dynamic Swarms (v4.0)**: Parallel, task-aware specialist clusters and micro-persona factory.
</details>

<details>
<summary><b>v3.x — Reactive Autonomous Intelligence</b></summary>

- **Context Sharding (SRD)**: 40% reduction in token waste via relevance-dense Hot/Warm/Cold context tiers.
- **Adversarial Decision Synthesis (ADS)**: Zero-drift architectural logic through Red-Blue model debate.
- **Temporal Vision**: Full-fidelity history navigation, hindsight injection, and automated state repair.
- **RAG 2.0 (Auto-Shadowing)**: Background pattern retrieval from the local knowledge graph.
</details>

<details>
<summary><b>v2.x — The Autonomous Enterprise & Knowledge Graph</b></summary>

- **Multi-Runtime Support**: Official adapters for Claude Code, Antigravity, Cursor, Gemini, and Copilot.
- **RAG 2.0**: Typed-edge Local Knowledge Graph with proactive context shadowing and TF-IDF search.
- **Temporal Vision**: Full-fidelity history navigation, state snapshotting, and hindsight injection.
- **Self-Building Skills**: Automated skill capture from documentation and phase outputs via `/mindforge:learn`.
</details>

<details>
<summary><b>v1.x — Framework Foundation & Core Protocols</b></summary>

- **Unified 4-Pillar Workflow**: Standardized `plan` → `execute` → `verify` → `ship` lifecycle.
- **Specialized Persona Library**: 32+ high-performance engineering agents with defined capability matrices.
- **Zero-Trust Logic**: Initial protocol enforcement and audit-trail persistence.
</details>

---

## Security
MindForge never stores credentials in files. Review:
- `docs/security/SECURITY.md`
- `docs/security/threat-model.md`

---

## ⚖️ License
MIT © 2026 MindForge Team
eam
