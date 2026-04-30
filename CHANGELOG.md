# Changelog

## [9.0.0] - 2026-04-30

### Added (v9.0.0: Bedrock Meridian — Pillars XXIV-XXVIII)

- **Pillar XXIV: Grounded Wave Execution** — Replaced AutoRunner stubs with real HANDOFF-driven wave parsing, task dispatch, progress tracking, and state persistence. `hasNextWave()` reads HANDOFF.json wave groups. `executeWave()` iterates tasks with audit logging and repair-operator integration. `runPreFlight()` validates project state and restores progress from `auto-state.json`.
- **Pillar XXV: Model Topology Modernization** — Updated all model references from Claude 3.x to Claude 4.x family (`claude-opus-4-7`, `claude-sonnet-4-6`, `claude-haiku-4-5`). Updated `model-router.js`, `model-client.js`, `model-broker.js`, `cloud-broker.js`, and `MINDFORGE.md`. Aligned pricing tables and fallback chains.
- **Pillar XXVI: Unified Memory Architecture** — Added `knowledge` and `graph_edges` tables to VectorHub (SQLite). New `saveKnowledge()`, `searchKnowledge()`, `saveEdge()`, `getEdges()` methods. FTS5 index on knowledge content. Consolidates 4 JSONL-based memory systems into a single SQLite store.
- **Pillar XXVII: Schema Migration Engine** — Added `_migrations` table to VectorHub for tracking applied migrations. New `v9-unified-memory.js` migration script that reads legacy JSONL stores and imports into SQLite. Registered in `migrate.js` runner.
- **Pillar XXVIII: Integration Test Chain** — New `tests/v9-integration-chain.test.js` verifying the full pipeline: wave parsing, model topology, VectorHub schema, migration engine, and SDK sync. 17 assertions across all v9 pillars.

### Changed (v9.0.0)

- **SDK**: Bumped `@mindforge/sdk` VERSION to `9.0.0`. Added `WaveExecutionResult` and `MigrationResult` types. Added `readAutoState()` and `isDatabaseInitialized()` to client.
- **VectorHub**: Removed try/catch `ALTER TABLE` pattern (v8 legacy). Schema creation is now declarative via `createTable().ifNotExists()`.
- **MINDFORGE.md**: Version bumped to `9.0.0-BEDROCK`. Model topology section normalized to Claude 4.x.

---

## [8.2.1] - 2026-04-25

### Fixed (v8.2.1: Stability & Cleanup)

- **Payload Pruning**: Removed development-only test scripts from `bin/engine` and `bin/governance`.
- **State Sanitization**: Cleaned up local persistence files (`celestial.db`, `memory/*.jsonl`) and session-specific planning artifacts.
- **Structural Hardening**: Restored clean templates for `.planning/HANDOFF.json` and other core descriptors.
- **NPM Optimization**: Reduced package size by excluding unneeded build-time caches and logs.

## [8.2.0] - 2026-04-18

### Added (v8.2.0: Autonomous SRE Layer — Pillars XX-XXIII)

- **Sentinel Engine**: Implemented `bin/sre/sentinel.js` for continuous observability and anomaly detection in the audit stream.
- **Shadow Mirror Isolation**: Hybrid replication system supporting Level 1 (Git) and Level 2 (Docker) deterministic isolation.
- **Adversarial SRE Debate**: Three-way consensus protocol for high-fidelity remediation auditing.
- **SLI-Gating Protocol**: Metric-driven verification loops to prevent performance regressions during self-healing.
- **Persona Hardening**: Registered `sre-engineer` and `sre-auditor`, with the Auditor locked to **Claude 4.5 Opus**.

## [8.1.0] - 2026-04-13

### Added (v8.1.0: Sovereign Identity — Pillar XIX)

- **Sovereign Identity Synthesis**: Autonomous creation and evolution of `SOUL.md` from execution traces.
- **Identity Hegemony**: Promoted `SOUL.md` to #1 Source of Truth in the instruction hierarchy.
- **XML-Structured Workflows**: Standardized project initialization and identity management with high-fidelity XML prompting.
- **Identity Engine**: Implemented `bin/memory/identity-synthesizer.js` with v8.1 mirroring heuristics.

---

## [8.0.0] - 2026-04-12

### Added (v8.0.0: Celestial Orchestration - SQLite & FMS)

- **Pillar XV: Unified Persistence Layer**: Transitioned from file-based JSONL state to a high-performance **SQLite** engine (`celestial.db`) with **FTS5** semantic reasoning support.
- **Pillar XVI: Federated Mesh Synthesis (FMS)**: Inter-project knowledge sharing via signed **MindForge Bundles (`.mfb`)** using ZTAI-signed identities.
- **Pillar XVII: Autonomous Skill Evolution (ASE)**: Implemented `SkillEvolver` to mine "Golden Traces" and synthesize reusable agentic skills.
- **Pillar XVIII: Orbital Governance**: Hardware-bound (HSM/Biometric) attestation for catastrophic-risk mutations (>95).
- **Core Vector Expansion**: Upgraded `VectorHub` with `better-sqlite3` and `Kysely` for type-safe, sub-millisecond persistence.

---

## [7.0.0] - 2026-04-11

### Added (v7.0.0: Sovereign Intelligence - Post-Quantum & Homing)

- **Pillar IX: Autonomous Resource Harvesting (ARH)**: Real-time token arbitrage and dynamic task-to-model steering based on MIR.
- **Pillar X: Neural Drift Remediation (NDR)**: Logic-drift detection and automated reasoning recovery via semantic density heuristics.
- **Pillar XI: Post-Quantum Agentic Security (PQAS)**: Lattice-based (Dilithium-5) signatures and ZK-Proof bypasses for future-proof identity.
- **Pillar XII: Proactive Semantic Homing**: Autonomous "Intent Hunting" where agents proactively claim tasks from the Federated Intelligence Mesh (FIM).

---

## [6.7.0] - 2026-04-09

### Added (v6.7.0: Federated Intelligence Mesh - FIM Expansion)

- **Architectural Health Tracking**: Aggregates RSA and IDC scores into collective project health metrics via `PillarHealthTracker`.
- **Stability Pattern Extraction**: Captures high-efficacy SCS homing instructions as durable, sharable knowledge entries (`stability_pattern`).
- **AutoRunner Lifecycle Hooks**: Automated capture at phase completion for organizational sync.

---

## [6.6.0] - 2026-04-08

### Added (v6.6.0: Self-Corrective Synthesis - SCS)

- **Autonomous Self-Healing**: Integrated `SelfCorrectiveSynthesizer` into the `AutoRunner` wave loop.
- **Reasoning Drift Recovery**: Triggered when Mission Fidelity (RSA) drops below 0.50, synthesizing a "Homing Instruction" anchored to specific requirements.
- **Homing Signal Injection**: Automatically injects high-density refocus signals into the wave context to recover mission fidelity.

---

## [6.5.0] - 2026-04-08

### Added (v6.5.0: Reason-Source Alignment - RSA)

- **Requirement-to-Thought Mapping**: Integrated `ReasonSourceAligner` into the core Auto-Runner loop.
- **Mission Fidelity Tracking**: Every reasoning thought is now cross-referenced with `REQUIREMENTS.md` and tagged with a best-match REQ-ID.
- **Mission Drift Detection**: Real-time monitoring of "Mission Alignment" confidence scores to prevent autonomous side-questing.
- **Requirement Schema**: Established formal `[REQ-ID]` Markdown schema for project specs.

---

## [6.4.0] - 2026-04-08

### Added (v6.4.0: Context Entropy Guard - CEG)

- **Context Entropy Guard (CEG)**:
  - Implemented `context-entropy-guard.js` for active noise suppression and context pruning.
  - Added semantic compression to `HandoverManager`, automatically summarizing stagnant reasoning loops into digests.
  - Hardened Nexus Bundles against "Reasoning Entropy" (similarity-based token bloat).

---

## [6.3.0] - 2026-04-08

### Added (v6.3.0: Intelligence-Drift Coupling - IDC)

- **Dynamic Model Upgrading (IDC)**:
  - Implemented `intelligence-interlock.js` to bridge NDR (Neural Drift Remediation) and ARH (Resource Arbitrage).
  - Added "Critical Drift" alert thresholds to `LogicDriftDetector`.
  - Integrated IDC signals into `AutoRunner`, allowing for proactive model tier upgrades when reasoning decay is detected.
  - Hardened `RouterSteering` to respect mid-wave MIR overrides.

---

## [6.2.0] - 2026-04-02

### Added (v6.2.0: Sovereign Enterprise Stable)

- **Autonomous Agentic Learning (Double-Hook)**:
  - Implemented `AGENTS_LEARNING.md` as a persistent, project-level engineering memory.
  - Added automated hooks to capture architectural patterns and anti-patterns during phase execution.

- **Enterprise-Grade Professionalization**:
  - Hardened and professionalized the entire documentation suite (Architecture, Security, Universal Commands).
  - Hardened framework branding across all system identifiers and logs.
  - Updated agent registry and workflow atlas for v6 consistency.

- **Identity Layer Hardening**:
  - Professionalized source code logs and identifiers for enterprise-compliance.
  - Test suite branding and identity alignment.

---

## [6.2.0-alpha] - 2026-03-29

### Added (v6.2.0-alpha: Sovereign Pillars XI & XII)

- **Pillar XI: Post-Quantum Agentic Security (PQAS)**:
    - Implemented `QuantumCrypto` for simulated lattice-based (Dilithium-5) signatures and ZK-Proof generation.
    - Integrated `QuantumSafeKeyProvider` into `ZTAIManager` for Tier 4 (Quantum-Safe) agent identities.
    - Hardened `PolicyEngine` with dynamic Biometric Challenges for Risk > 95 and ZK-Proof verification for high-leverage bypasses.
- **Pillar XII: Proactive Semantic Homing**:
    - Implemented `IntentHarvester` for proactive, idle-state task claiming from the Federated Intelligence Mesh (FIM).
    - Implemented `MeshSelfHealer` for peer-to-peer collaborative reasoning and recovery from logic drift > 80.
    - Integrated proactive behaviors into the `AutoRunner` core loop.
- **Hardening & Verification**:
    - Constant-time signature verification and cycle-detection for mesh healing.
    - 100% pass rate on v7 specialized security and homing integration test suites.

## Top Summary (v6.2.0-alpha)

MindForge v6.2.0-alpha achieves full **Sovereign Intelligence** status by hardening the mesh against quantum-era threats and transitioning from reactive wave-processing to proactive agentic homing.

## Highlights (v6.2.0-alpha)

- **Quantum-Safe Identity (PQAS)**: Verifiable agentic signatures resistant to future cryptographic threats.
*   **Proactive Homing**: Autonomous "Intent Hunting" that eliminates idle latency in the agentic mesh.
*   **Edge-Case Biometrics**: Hardware-locked governance for catastrophic-risk operations (>95 Blast Radius).

---

## [6.1.0-alpha] - 2026-03-29

### Added (v6.1.0-alpha: Sovereign Intelligence)

- **Pillar IX: Autonomous Resource Harvesting (ARH)**: 
    - Implemented `MarketEvaluator` for real-time token arbitrage.
    - Dynamic task-to-model steering based on MIR (Min-Intelligence-Requirement).
    - ROI Telemetry integration for tracking agentic cost-savings.
- **Pillar X: Neural Drift Remediation (NDR)**:
    - Implemented `LogicDriftDetector` with semantic density and repetition heuristics.
    - Integrated `RemediationEngine` for automated reasoning recovery (Injection/Restart).
    - Hardened `NexusTracer` hooks for real-time drift sensing.
- **Hardened Sovereign Heuristics**: Improved repetitive logic detection using punctuation-aware token analysis.
- **ROI Arbitrage Ledger**: New audit event `roi_arbitrage_event` in `AUDIT.jsonl`.

## Top Summary (v6.1.0-alpha)

MindForge v6.1.0-alpha completes the **Sovereign Intelligence** phase. The framework now possesses the ability to quantify its own economic value through resource harvesting and self-heal from cognitive decay through neural drift remediation.

## Highlights (v6.1.0-alpha)

- **Autonomous FinOps (ARH)**: Real-time steering between tiered models based on task MIR.
- **Self-Healing Reasoning (NDR)**: Proactive interruption of logic loops and hallucinations.
- **Unified Integration**: Seamless integration of NDR/ARH into the core `NexusTracer` loop.

---

## [6.0.0-alpha] - 2026-03-29

The v6.0.0-alpha release introduces the final pillar of the MindForge Enterprise architecture: AgRevOps (Agentic Revenue Operations). This engine provides real-time ROI attribution for autonomous waves, enabling enterprises to quantify the business value of every agentic reasoning cycle.

## Highlights (v6.0.0-alpha)

- **AgRevOps ROI Engine**: Real-time value attribution for autonomous task execution.
- **ROI Telemetry**: New `roi-telemetry.jsonl` stream for tracking cost efficiency vs. outcome quality.
- **Nexus Steering Sync**: Final synchronization of the `NexusTracer` and `NexusSteering` protocols into the core execution loop.
- **Protocol Automation**: Automated activation of `_extended` mindforge skills via the Neural Orchestrator.

---

# MindForge v5.9.0 — Enterprise-Grade Hardening (Nexus Unification)

## Top Summary (v5.9.0)

The v5.9.0 release elevates the MindForge Enterprise architecture to "Enterprise-Grade" by unifying the tracing infrastructure into a single, high-fidelity asynchronous ART protocol and hardening the governance and arbitrage pillars with advanced cryptographic and resilience patterns.

## Highlights (v5.9.0)

- **Unified NexusTracer Singleton**: Migration of all tracing and reasoning capture to `bin/engine/nexus-tracer.js`. Standardized as a singleton with mandatory `async` methods to support ZTAI cryptographic signing.
- **Merkle-Style Audit Integrity**: Hardened SRE and ZTAI logs with Merkle-root cumulative hash chains, ensuring every audit entry is cryptographically linked to the entire session history.
- **MCA Circuit Breakers**: Stateful provider blacklisting in `CloudBroker` that automatically disables failing models for 10 minutes after 3 consecutive errors.
- **Intelligence Metrics Decay**: Historical performance data now favors recent trends via a 0.95 decay factor, ensuring routing adaptivity.
- **Async Test Suite**: 100% restoration of the core test suite (Nexus, SRE, RES) for the new asynchronous execution model.

---

# MindForge v5.8.0 — Sovereign Reason Enclaves (ZK-Audit)

## Top Summary (v5.8.0)

The v5.8.0 release implements the sixth pillar of the Hyper-Enterprise roadmap: Sovereign Reason Enclaves with Zero-Knowledge (ZK) Audit Trails. This enables agents to provide cryptographic proof of policy adherence for confidential reasoning without exposing proprietary content to global logs.

## Highlights (v5.8.0)

- **ZK-Proof Compliance Certificates**: Simulated zero-knowledge proofs (DID-signed) for SRE sessions.
- **Privacy-Preserving Auditing**: `NexusTracer` replaces raw thought traces with verifiable certificates for isolated tasks.
- **Enclave Verification**: New `verifyZKProof` utility for non-custodial audit integrity checks.
- Synchronized `mindforge-cc` documentation suite for Pillar VII & VIII.
- Updated `CLAUDE.md` with standard `_extended` protocol awareness.

## [5.9.0] - 2026-03-28

### Added (v5.9.0)

- **Pillar VII: Nexus Steering (Hierarchical Intent Orchestration)**.
- Implemented `NexusTracer` for multi-layered reasoning visualization.
- Added `NexusSteering` protocol for cross-session intent persistence.
- Hardened `SwarmController` with `context7-depth` logic for high-complexity tasks.

## [5.8.0] - 2026-03-28

### Added (v5.8.0)

- **Pillar VI: Sovereign Reason Enclaves (ZK-Proof Audit Trails)**.
- Implemented `SRE-ISOLATED` reasoning mode in `SREManager`.
- Generated **ZK-Proof Compliance Certificates** (signed by System DID) for confidential reasoning cycles.
- Integrated masked audit logging in `NexusTracer`, replacing raw thought traces with verifiable proofs.
- Added `verifyZKProof` utility for non-custodial audit verification.

## [5.7.0] - 2026-03-28

### Added (v5.7.0)

- **Pillar V: Multi-Cloud Arbitrage (Task-to-Model Affinity Routing)**.
- Implemented **Performance-Based Affinity Matrices** in `CloudBroker` for intelligence-first routing.
- Added `performance-stats.json` persistence to track cross-provider success rates by task taxonomy.
- Integrated automated result recording in `WaveFeedbackLoop`.
- Prioritized **Probability of Success** over raw cost/latency in routing scoring.

## [5.6.0] - 2026-03-28

### Added (v5.6.0)

- **Pillar IV: Supply Chain Trust (Binary Runtime Attestation)**.
- Cryptographic skill signing in `SkillRegistry` via ZTAIManager Tier 3 Enclaves.
- JIT Attestation in `SkillValidator` to verify skill integrity before agent execution.
- `SIGNATURES.json` tracking for all enterprise-grade skills.

## [5.5.0] - 2026-03-28

### Added (v5.5.0)

- **Pillar III: Predictive Agentic Reliability (Reasoning Entropy Monitoring)**.
- Reasoning Entropy Scoring (RES) in `NexusTracer` to detect semantic stagnation and loops.
- Proactive Self-Healing trigger for high-similarity thought sequences.
- Steering Vector generation in `TemporalHindsight` to break agentic deadlocks.

## [5.4.0] — Enterprise-Grade Hardening — 2026-03-28

# Release Notes - MindForge v5.4.0 — Enterprise Resilience (Hardened Edition)

This update elevates the v5.3.0 "Hyper-Enterprise" features to maximum robustness ("Production-Grade"), implementing critical safety systems and advanced observability.

### Added

- **Circuit Breaker Pattern**: Implemented a stateful `CircuitBreaker` in `federated-sync.js` to prevent network floods. Automatically disables mesh sync for 1 hour after 3 consecutive EIS failures.
- **Critical-Path Protection**: Automated "Blast Radius" score of 100 in `impact-analyzer.js` for sensitive files (`.env`, `*.pem`, `id_rsa`, `package-lock.json`, etc.).
- **Recursive Depth Penalty**: Introduced a 1.5x impact multiplier for actions deeper than 5 directory levels, preventing mass-scale silent modifications.
- **Failure Telemetry**: Added `sync-history.jsonl` and `sync-telemetry.jsonl` for detailed conflict resolution and error auditability.
- **Resilient Execution**: Raised default scores for `EXECUTE` and `GRANT` actions to increase governance oversight.

🚀 **MindForge v5.4.0 — Enterprise Resilience (Hardened Edition)**

This update elevates the v5.3.0 "Hyper-Enterprise" features to maximum robustness ("Production-Grade"), implementing critical safety systems and advanced observability.

### 🛡️ Enterprise-Grade Hardening (v5.4.0)

- **Circuit Breaker Pattern**: Implemented a stateful `CircuitBreaker` in `federated-sync.js` to prevent network floods. Automatically disables mesh sync for 1 hour after 3 consecutive EIS failures.
- **Critical-Path Protection**: Automated "Blast Radius" score of 100 in `impact-analyzer.js` for sensitive files (`.env`, `*.pem`, `id_rsa`, `package-lock.json`, etc.).
- **Recursive Depth Penalty**: Introduced a 1.5x impact multiplier for actions deeper than 5 directory levels, preventing mass-scale silent modifications.
- **Failure Telemetry**: Added `sync-history.jsonl` and `sync-telemetry.jsonl` for detailed conflict resolution and error auditability.
- **Resilient Execution**: Raised default scores for `EXECUTE` and `GRANT` actions to increase governance oversight.

## [5.3.0] — Dynamic Blast Radius — 2026-03-28

🚀 **MindForge v5.3.0 — Pillar II Implementation (APO v2)**

This update introduces real-time risk assessment for agentic actions, preventing high-impact regressions through dynamic guardrails.

### Pillar II: Dynamic Blast Radius (v5.3.0)

- **Impact Scoring Engine**: Implemented `impact-analyzer.js` to calculate the "Blast Radius" (0-100) of every intent based on action severity and target sensitivity.
- **Max-Impact Policy Enforcement**: Updated `policy-engine.js` to enforce `max_impact` thresholds, allowing granular control over destructive operations.
- **Fail-Safe Security**: Integrated "Default Deny" posture if impact analysis fails, defaulting to score 100 (CRITICAL).

## [5.2.0] — Semantic Vector Consensus — 2026-03-28

🚀 **MindForge v5.2.0 — Pillar I Implementation (FIM v2)**

This update transcends simple timestamp-based synchronization, moving to a vector-space consensus model for organizational knowledge.

### Pillar I: Semantic Vector Consensus (v5.2.0)

- **Hybrid Semantic Synthesis**: Refactored `federated-sync.js` to use `EmbeddingEngine` cosine similarity for knowledge merging.
- **4-Branch Resolution Protocol**:
    - **LWW (> 0.9)**: Auto-resolve near-identical entries.
    - **Autonomous ADS Merge (0.75 - 0.9)**: Proactive synthesis of overlapping knowledge.
    - **Nexus Handover (0.6 - 0.75)**: Human-agent conflict resolution.
    - **Topic Isolation (< 0.6)**: Prevention of ID collisions for disparate content.
- **Resilient Sync Architecture**: Hardened synchronization loop with robust error handling and TF-IDF fallback.

## [5.1.0] — The Enterprise Expansion — 2026-03-28

🚀 **MindForge v5.1.0 — Evolution of the Agentic Protocol Mesh**

This major update integrates 14 advanced agentic protocols and high-performance session hooks originally developed in the Superpowers framework, fully sanitized and hardened for the MindForge ecosystem.

### 🧩 Advanced Agentic Protocols (v5.1.0)

- **Extended Tactical Rigor**: Overlapping skills have been evolved into `_extended` variants (e.g., `mindforge-debug_extended`, `mindforge-tdd_extended`) with higher verification standards.
- **Neural Orchestration**: New `mindforge-neural-orchestrator` layer for intelligent protocol activation during session startup.
- **Autonomous Multi-Tasking**: Integrated `parallel-mesh` and `swarm-execution` for mass-scale phase execution.
- **Creative Intelligence**: New `mindforge:brainstorming` workflow for intent and architectural exploration.
- **Hardened QA Gates**: Evolution of `verify-work` and `ship` protocols with automated quality assurance and branch sanitization.
- **Isolated Workspaces**: Support for clean Git worktrees via `workspace-isolated`.

### 🛠️ Core Infrastructure Updates (v5.1.0)

- **Native Session Hooks**: Replaced legacy bash hooks with high-performance Node.js session-initialization drivers.
- **Workflow Synchronization**: Core command suite (/plan, /execute, /debug, /ship etc.) updated to mandate Step 0 Protocol Activation.
- **Full Sanitization**: 100% elimination of external branding across all documentation and system identifiers.

### Added (v5.1.0)

- `mindforge-brainstorming` (New)
- `mindforge-parallel-mesh_extended` (Extended)
- `mindforge-execute-phase_extended` (Extended)
- `mindforge-ship_extended` (Extended)
- `mindforge-review-inbound` (New)
- `mindforge-review-request` (New)
- `mindforge-swarm-execution` (New)
- `mindforge-debug_extended` (Extended)
- `mindforge-tdd_extended` (Extended)
- `mindforge-workspace-isolated` (New)
- `mindforge-neural-orchestrator` (New)
- `mindforge-verify-work_extended` (Extended)
- `mindforge-plan-phase_extended` (Extended)
- `mindforge-skill-creation` (New)

---

## [5.0.0-alpha.2] — Predictive Reliability & Supply Chain Trust — 2026-03-28

🚀 **MindForge v5.0.0 — Pillars III & IV Implementation**

This update adds the next two critical architectural pillars to the v5 Enterprise roadmap, focusing on long-term session reliability and a verifiable asset supply chain.

### Pillar III: Predictive Agentic Reliability (PAR)

- **Advanced Loop Detection**: Implemented **S03 (Semantic Mirroring)** and **S04 (Infinite Decomposition)** patterns in the `StuckMonitor`.
- **Context Density Refactorer**: New proactive utility that triggers context summarization and handoffs when reasoning-to-action density falls below 30%.
- **C2C Arbitrage**: Integrated **Confidence-to-Cost** threshold gating into the `AutoRunner` to prevent low-value autonomous drift.
- **Self-Healing Integration**: Automated triggering of "hindsight injection" and state repair when PAR patterns are detected.

### Pillar IV: Supply Chain Trust (ZTS)

- **Agentic SBOM**: Implemented the `NexusTracer` manifest generator, producing real-time `MANIFEST.sbom.json` files for every reasoning chain.
- **7-Dimension Certification (7D)**: Re-architected the `skill-validator` with a weighted scoring system covering Schema, Triggers, Security, Clarity, and Examples.
- **Enterprise-Grade Enforcement**: Strict `--enterprise` mode requirement for a minimum **7.0/10.0** certification score.
- **Model/Skill Telemetry**: Integrated real-time tracking of asset provenance and usage history in the audit stream.

## [5.0.0-alpha.1] — Federated Intelligence & Policy Orchestration — 2026-03-28

🚀 **MindForge v5.0.0 — The Sovereign Enterprise Release**

This landmark release transforms MindForge into a distributed, governable, and cryptographically verified agentic operating system. V5 introduces the first two pillars of the Enterprise Architecture: Federated Intelligence Mesh (FIM) and Agentic Policy Orchestrator (APO).

### Pillar I: Federated Intelligence Mesh (FIM)

- **Enterprise Intelligence Service (EIS)**: Implemented `eis-client.js` for secure, authenticated communication with the organizational knowledge hub.
- **Delta-Sync Protocol**: Implemented `federated-sync.js` with timestamp-based delta pulls, significantly reducing synchronization latency.
- **ZTAI-Signed Provenance**: Every knowledge item in the mesh is cryptographically tied to the DID of the originating agent.
- **Hybrid Knowledge Graph**: Extended `knowledge-graph.js` to seamlessly resolve local nodes and remote federated nodes.

### Pillar II: Agentic Policy Orchestrator (APO)

- **Policy-as-Code (PaC)**: Implemented `policy-engine.js` for intent-based evaluation of agent actions against organizational security rules.
- **RBAC Manager**: Implemented `rbac-manager.js` for mapping DIDs to project roles and binding permissions to ZTAI Trust Tiers.
- **Policy Interceptor**: Deep integration into `auto-runner.js`, enforcing a pre-flight governance gate before every autonomous wave.
- **Default Enterprise Policies**: Shipped with initial security guardrails for engine and infrastructure protection.
- **Dynamic Blast Radius (v5.3.0)**: Integrated `ImpactAnalyzer` to calculate and enforce risk-based thresholds for autonomous actions.

### Hardening (Enterprise Mode v5.0.0-alpha.1)

- **ZTAI Interlock**: All mesh and policy operations now utilize the hardware-enclave (simulated) signing engine for Tier 3 principals.
- **Dynamic Intent Extraction**: Autonomous intents are now derived in real-time from active session identities.
- **Conflict Resolution (v5.2.0)**: Uses **Hybrid Semantic Synthesis** (Pillar I v5.2.0). 
  - **Similarity > 0.9**: Near-identical; auto-resolve via **Last-Write-Wins (LWW)**.
  - **0.75 - 0.9**: Semantic Overlap; triggers **Autonomous ADS Merging**.
  - **0.6 - 0.75**: Conflict; triggers **Nexus Handover (DHH)** for human steering.
  - **< 0.6**: Topic Collision; isolates entries into unique IDs to prevent data loss.

---

## [4.3.0] — Enterprise Mesh & Proactive Equilibrium — 2026-03-28

🚀 **MindForge v4.3.0 — The Maturity Release**

This major update completes the **MindForge V4 Roadmap**, introducing autonomous financial governance and self-healing reliability engines. It also includes a comprehensive structural reorganization of the framework for enterprise scalability.

### Key Pillars (v4.3.0)

- **Autonomous FinOps Hub (Pillar V)**: Implemented `ModelBroker` for dynamic **C2C (Confidence-to-Cost)** routing and `FinOpsHub` for real-time ROI tracking.
- **Proactive Equilibrium (Pillar VI)**: Implemented `WaveFeedbackLoop` for divergence detection and `TemporalHindsight` for autonomous state recovery (RCA/Repair).
- **Structural Reorganization**: Migrated all core engine implementation files from `.mindforge/` logic directories to a standardized `bin/` domain architecture.
- **Global Memory Sync**: Enhanced `SemanticHub` to support organizational-level knowledge sharing via `~/.mindforge/`.
- **Hardened ZTAI Enterprise Mode**: HSM-simulated signing for Tier 3 principals and automated audit integrity manifests.

🚀 **MindForge v4.2.0 — The Security Revolution**

This update introduces **Zero-Trust Agentic Identity (ZTAI)**, a core pillar of the MindForge enterprise security architecture. It establishes a DID-based identity system with cryptographic signing for all agentic actions, ensuring non-repudiable audit trails and tiered governance.

### Key Pillars (v4.2.0)

- **ZTAI Identity Engine**: Core manager for DID generation (`did:mindforge:<uuid>`) and Ed25519 key pair lifecycle.
- **Cryptographic Audit Signing**: All reasoning traces and spans are signed by the originating agent, ensuring log integrity.
- **Trust-Tiered Governance**: 4-tier authorization model (0-3) for granular permission control across the agentic mesh.
- **Identity-Lock Engine**: Automated security gate in the `WaveExecutor` that blocks unauthorized Tier 3 actions.
- **Trust Verifier**: Real-time cryptographic validation of the `AUDIT.jsonl` log for cross-session integrity.
- **Enterprise-Grade Hardening**: session-based key rotation and hardware security module (HSM) hook placeholders.

---

## [4.1.0] — MindForge Nexus (Observability & Tracing) — 2026-03-27

🚀 **MindForge v4.1.0 — The Observability Revolution**

This update introduces **MindForge Nexus**, a high-fidelity observability and tracing system designed for the agentic mesh. It enables deep visibility into agentic "thought chains" and parallel swarm execution through OpenTelemetry-compatible tracing.

### Key Pillars (v4.1.0)

- **Nexus Tracer Engine**: Core engine for managing hierarchical spans and trace context propagation across the mesh.
- **Agentic Reasoning Tracing (ART)**: New audit event type `reasoning_trace` for capturing granular agentic thought cycles.
- **Hierarchical Span Orchestration**: Universal ART fields (`trace_id`, `span_id`, `parent_span_id`) integrated into all audit events.
- **Mesh-Integrated Tracing**: Direct injection of tracing protocols into the `Wave Executor` and `Swarm Controller`.
- **Nexus Dashboard Spec**: Architectural blueprint for real-time trace visualization and reasoning heatmaps.
- **ZTAI Observability**: Integrated trust-tier visibility for secure execution monitoring.

---

## [4.0.0] — Dynamic Multi-Agent Swarms (Agentic Mesh) — 2026-03-27

🚀 **MindForge v4.0.0 — The Mesh Revolution**

This landmark release introduces **Dynamic Multi-Agent Swarms (Agentic Mesh)**, shifting MindForge from sequential subagent execution to a parallel, task-aware, and verifiable cluster-based orchestration system. V4 enables mass-scale autonomous engineering through ephemeral specialist clusters and zero-trust resonance.

### Key Pillars (v4.0.0)

- **Dynamic Swarm Orchestration**: The new `SwarmController` analyzes task complexity and spawns ephemeral clusters of specialist personas in parallel.
- **Micro-Persona Factory**: On-the-fly persona specialization using task-specific knowledge injection via `Context7`.
- **Wave Executor (Mesh Mode)**: Refactored parallel execution engine with shared `SWARM-STATE` synchronization and leader-led synthesis.
- **ZTAI (Zero-Trust Agentic Identity)**: DID-based cryptographic signing for swarm actions and multi-tier trust enforcement.
- **Enterprise specialist Library**: 12+ pre-defined swarm templates including `AIEngineeringSwarm`, `IdentityTrustSwarm`, `DataMeshSwarm`, and `IncidentResponseSwarm`.
- **HITL Governance Gates**: Human-in-the-loop decision gates for high-risk (Tier 3) architectural and compliance-heavy operations.

---

## [3.0.0] — Reactive Autonomous Intelligence — 2026-03-27

🚀 **MindForge v3.0.0 — The Architecture Revolution**

This major release transforms MindForge from a "disciplined workflow engine" into a **Reactive Autonomous Intelligence**. By sharding context via semantic relevance and debating architectural decisions through adversarial model loops, V3 achieves sub-second reasoning and zero logic-drift in complex engineering sessions.

### Key Pillars (v3.0.0-rc1)

- **Context Sharding (SRD)**: 40% reduction in token waste via relevance-dense Hot/Warm/Cold context tiers.
- **Adversarial Decision Synthesis (ADS)**: Zero-drift architectural logic through Red-Team/Blue-Team debate and SOUL-scoring.
- **Temporal Vision**: Full-fidelity history navigation, hindsight injection, and automated state repair.
- **RAG 2.0 (Auto-Shadowing)**: Background pattern retrieval from the local knowledge graph without manual prompts.

---

## [2.6.0] — Temporal Vision (Time-Travel Debugging) — 2026-03-27

🚀 **MindForge v2.6.0 — The Observability Revolution**

This update introduces "Temporal Vision," a high-fidelity time-travel debugging system that allows developers to scrub through execution history, explore past states, and perform "Hindsight Injection" to repair architectural drift automatically.

### Added (v2.6.0)

- **Temporal Vision Engine**:
  - **Temporal Hub**: Synchronous state snapshotting of the `.planning/` directory at every significant audit point.
  - **State Snapshots**: High-fidelity records of `.md`, `.json`, and `.log` files stored in `.planning/history/[audit_id]/`.
  - **Hindsight Injection**: Automated state repair protocol that rolls back history to a specific point ($T_n$), injects a correction, and re-triggers autonomous execution.
- **Observability Interface (Dashboard Integration)**:
  - **Temporal API**: REST endpoints for history navigation, snapshot exploration, and remote hindsight injection.
  - **Auto-Runner Integration**: Unified event ID generation and automated state capture embedded in the core loop.
- **CLI Extensions**:
  - `/mindforge:temporal status`: View snapshot density and history stats.
  - `/mindforge:temporal inject`: Manual hindsight injection from the terminal.
  - `/mindforge:temporal cleanup`: Automated purge of stale history snapshots.
- **Governance**:
  - **Temporal Protocol (`temporal-protocol.md`)**: Definition of safety rules, recovery boundaries, and state integrity checks.

---

## [2.5.0] — Local-First Knowledge Graph (RAG 2.0) — 2026-03-27

🚀 **MindForge v2.5.0 — The Knowledge Graph Revolution**

This update introduces a sophisticated Local-First Knowledge Graph (RAG 2.0), moving beyond flat vector search to a typed-edge, traversable knowledge architecture with proactive context shadowing.

### Added (v2.5.0)

- **Local-First Knowledge Graph (RAG 2.0)**:
  - **Embedding Engine**: Custom local TF-IDF vectorizer with bigram detection and camelCase splitting. Zero external dependencies.
  - **Graph Engine**: Typed-edge graph (6 types) with BFS traversal, cycle detection, and SHA-256 edge integrity.
  - **Auto-Shadow Engine**: Proactive "ghost-pattern" context injection for subagents based on graph proximity and semantic similarity.
  - **Typed Edges**: Support for `RELATED_TO`, `CAUSED_BY`, `SUPERSEDES`, `DEPENDS_ON`, `INFORMS`, and `CONTRADICTS` relationships.
  - **Graph-Aware Capture**: Automatic edge inference during memory capture from bug patterns and review findings.
  - **Maintenance Tools**: Integrity verification, edge weight decay (time-based), and orphan node pruning.
- **SDK Extensions**:
  - Full TypeScript support for graph traversal, edge management, and hybrid similarity queries.

### Fixed (v2.5.0)

- **macOS App Sandbox Compatibility**: Implemented `setTestMode()` in memory engines to bypass nesting-related EPERM errors when running from sandboxed editors.

---

## [2.4.0] — The Core Pillars Optimization — 2026-03-27

🚀 **MindForge v2.4.0 — The Core Pillars Optimization**

This major architectural update introduces a dynamic, SRD-based memory sharding system and the Adversarial Decision Synthesis (ADS) protocol, replacing legacy monolithic handoffs with a hardened, high-fidelity Tri-Tier Memory model.

### Added (v2.4.0)

- **Adversarial Decision Synthesis (ADS)**:
  - **ADS Engine**: Integrated a 3-model synthesis loop (Architect/Auditor/Synthesizer) for peer-reviewed architectural planning.
  - **SOUL Scoring Engine**: New scoring metric `(Impact * Leverage * Reversibility) / (Effort * Risk * Cost)` for objective decision ranking.
  - **Red-Team Jailbreak**: Enforced architectural auditing that forces the identification of at least 3 critical system flaws.
  - **Automated ADR Workflow**: synthesis results are now persisted as SOUL-scored Decision Records in `.planning/decisions/`.
- **Semantic Context Sharding**:
  - **Tri-Tier Memory Controller**: Integrated `shard-controller.md` to manage memory transitions across Hot (`HANDOFF.json`), Warm (`.planning/memories/`), and Cold (`.mindforge/memory/`) tiers.
  - **SRD Scoring Engine**: New weighted Semantic Relevance Density (SRD) scoring for contextual items based on Decisiveness, Frequency, and Impact.
  - **Enterprise-Grade Hardening**: Implemented SHA-256 integrity verification and automated semantic tagging for all memory shards.
  - **Proactive Warm Retrieval**: Updated the context injector to automatically pull relevant shards based on task sub-context.
- **Shard Helper Utility**: New `bin/shard-helper.js` for standalone memory analysis and integrity auditing.

### Changed (v2.4.0)

- **Planning Protocol**: `/mindforge:plan-phase` now officially supports the `--ads` flag for high-fidelity synthesis cycles.
- **Compaction Protocol V3**: Upgraded the standard compaction flow to include `Step 4.5: Semantic Sharding`, preventing long-term context window pollution and reducing context overhead by ~35%.

---

## [2.3.5] — Intelligent Asset Sync & Merge — 2026-03-26

🚀 **MindForge v2.3.5 — Intelligent Asset Sync & Merge**

This release transforms the installation engine from a static "skip if exists" model to an intelligent "Merge & Sync" system, ensuring all framework assets, documentation, and advanced modules are correctly deployed even into existing project environments.

### Added (v2.3.5)

- **Intelligent Merging**: Refactored `copyDir` to support `noOverwrite` mode, allowing the installer to add missing subfolders and templates without disrupting user-customized files.
- **Advanced Module Sync**: Added explicit path mapping for `memory`, `plugins`, `intelligence`, and `dashboard` modules into the standard installation payload.
- **Expanded Asset Types**: Upgraded runtime definitions to include `memorySubdir` and `pluginsSubdir` for all supported IDE environments.

### Fixed (v2.3.5)

- **Sync Gating**: Removed restrictive directory existence checks that caused the installer to skip entire asset categories if the parent folder already existed.
- **Documentation Parity**: Hardened the documentation sync logic to ensure `references/` and `templates/` always reach the `.agents/docs/` target.

---

## [2.3.4] — Architectural Sync & Zero-GSD Purge — 2026-03-25

### Added (v2.3.4)

- **Comprehensive Planning Sync**: Expanded `.planning` deployment to include `ROADMAP.md`, `ARCHITECTURE.md`, `REQUIREMENTS.md`, and `RELEASE-CHECKLIST.md` by default.
- **Zero-GSD Standard**: Completed the removal of all "GSD" instances from the installer logic and internal system identifiers.

### Fixed (v2.3.4)

- **Documentation Payload**: Fixed a discrepancy in the path-mapping for documentation subdirectories (`references/`, `templates/`) ensuring they correctly sync into `.agents/docs/`.
- **Directory Persistence**: Ensured that empty planning subdirectories correctly persist with `.gitkeep` during fresh installations.

---

## [2.3.3] — Payload Cleanup & Enterprise Pruning — 2026-03-25

🚀 **MindForge v2.3.3 — Payload Cleanup & Enterprise Pruning**

This release strictly prunes the installation payload to remove legacy GSD artifacts, project-specific state, and development-only folders, ensuring a clean "out-of-the-box" enterprise experience.

### Fixed (v2.3.3)

- **Installation Payload**: Removed legacy migration folders (`01-migrate-legacy-to-mindforge`, `day1`, `day2`, `day3`).
- **State Leakage**: Excluded project-specific state files (`AUDIT.jsonl`, `HANDOFF.json`, `jira-sync.json`, `slack-threads.json`) from distribution.
- **Enterprise Pruning**: Updated `installer-core.js` to automatically filter out development-only framework folders (e.g., `distribution`, `monorepo`, `production`).

---

## [2.3.2] — Asset Sync Repair — 2026-03-25

🚀 **MindForge v2.3.2 — Asset Sync Repair**

This release fixes documentation asset synchronization and repairs logic corruption in the installer core.

### Added (v2.3.2)

- **Docs & Templates Sync**: Integrated `docs/references` and `docs/templates` into the standard installation payload.
- **Recursive Counting**: Implemented deep directory file counting for accurate manifest reporting.

### Fixed (v2.3.2)

- **Installer Logic**: Repaired syntax corruption and removed duplicated code blocks in `installer-core.js`.

---

## [2.1.2]*Status: V5.2.0 Semantic Consensus Implemented & Verified (2026-03-28)*

🚀 **MindForge v2.1.2 — Enterprise Branding & CI Fix**

This release transforms the MindForge installation experience with a high-impact "Enterprise-Grade" CLI interface and resolves critical CI/CD integration issues.

### Added (v2.1.2)

- **Enterprise CLI Branding**: New ultra-blocky ASCII "MINDFORGE" branding and high-contrast "Digital Architect" design system.
- **Payload Manifest Summary**: Architectural summary screen displaying dynamic counts of deployed Personas, Skills, and Integrations.
- **"TRY IT NOW" Utility**: Boxed terminal widget providing immediate post-install command guidance.
- **Enhanced Status Reporting**: Unified architectural status grid for environment detection.

### Fixed (v2.1.2)

- **CI/CD Permissions**: Resolved `RequestError [HttpError]: GitHub Actions is not permitted to create or approve pull requests` by adding `contents: write` to `auto-pr.yml`.

---

## [2.1.1] — Core Migration Finalization — 2026-03-25

🧩 **MindForge v2.1.1 — Core Migration Finalization**

This release completes the structural rebranding and migration of the MindForge framework into MindForge. It finalizes the path alignment for all 120+ assets, hardens the core configuration management, and fully integrates the expanded persona ecosystem.

### Added (v2.1.1)

- **Finalized Path Mapping**: All framework assets (skills, workflows, bin) now reside in a unified, flat `.agent/` structure for cross-IDE compatibility.
- **32-Persona Ecosystem**: Full integration of 32 specialized engineering personas with defined tool permissions and capability matrices.
- **Unified 4-Pillar Workflow**: Hardened `plan`, `execute`, `verify`, and `ship` logic with project-level `.agent/` integrity.
- **Enterprise Manifest**: New `file-manifest.json` serving as the single source of truth for multi-project codebase mapping.
- **Consolidated Configuration**: Unified framework settings and project-level governance in `.mindforge/` and `.agent/`.
- **Rebranded Lifecycle Hooks**: 5 new high-performance hooks for context monitoring, prompt guarding, and real-time status updates.

### Changed (v2.1.1)

- **Zero-Watermark Integrity**: 100% elimination of residual "MindForge" and "get-shit-done" identifiers from codebase, documentation, and metadata.
- **Documentation Overhaul**: Modernized the entire documentation suite, including Architecture, Personas, Skills Authoring, and Command References.
- **Hardened Settings**: `settings.json` now features dynamic hook pathing for increased portability across system environments.

---

## [2.1.0] — The Specialized Expansion — 2026-03-24

🧩 **MindForge v2.1.0 — The Specialized Expansion**

This release significantly expands the MindForge persona ecosystem, integrating 18+ high-performance specialized agents from the MindForge framework. This expansion doubles the framework's baseline capabilities in research, architecture, execution, and quality assurance.

### Added (v2.1.0)

- **18+ New Specialized Personas**: Integration of advanced agents including `nyquist-auditor`, `user-profiler`, `advisor-researcher`, `ui-auditor`, and more.
- **Extended Mapping & Strategy**: Enhanced `roadmapper-extend` and `codebase-mapper-extend` for deep project lifecycle management.
- **Comprehensive Permissions Audit**: Full tool-access transparency for all 32 personas in `docs/PERSONAS.md`.
- **Architectural State Update**: `Master-Context.md` now reflects the 32-persona structural foundation.

### Changed (v2.1.0)

- **Documentation Overhaul**: Complete update of `PERSONAS.md` and `Master-Context.md` to reflect the expanded ecosystem.
- **Branding Alignment**: All integrated MindForge personas rebranded and fully sanitized for MindForge native use.

---

## [2.0.0] — The Autonomous Enterprise — 2026-03-24

🚀 **MindForge v2.0.0 — The Autonomous Enterprise — Major Release**

This major release transforms MindForge from a Claude-centric framework into a universal AI agent operating system. With support for 6 major runtimes and a hardened autonomous execution engine, v2.0.0 is built for enterprise-scale AI orchestration.

### Added (v2.0.0)

- **6-Runtime Multi-Platform Support**: Official support for Claude Code, Antigravity, Cursor, OpenCode, Gemini CLI, and GitHub Copilot.
- **Runtime Adapters**: Automatic content transformation for Gemini (model/filename mapping) and preambles for non-slash runtimes (Cursor/Copilot).
- **`/mindforge:new-runtime`**: Rapidly scaffold custom AI agent runtimes with correct directory structures and command visibility.
- **Unified Migration Engine (v2.0.0)**: Additive schema upgrades for `AUDIT.jsonl` (runtime/agent_id) and `token-usage.jsonl` (model_group).
- **Hardened Self-Building Skills**: Automated skill capture from documentation and phase outputs.
- **7-Dimension Quality Scorer**: Enhanced static analysis for skill authoring.
- **MindForge Integration**: 10 new advanced commands for design-first planning, zero-friction capture, and smart routing.
- **`/mindforge:do`**: Smart natural language dispatcher that routes intent to the correct command.
- **`/mindforge:ui-phase` & `/mindforge:ui-review`**: Tier-1 visual design contract and visual audit engine.
- **`/mindforge:note`**: Instant idea capture with todo promotion.
- **`/mindforge:validate-phase`**: Requirement coverage and test gap identification.
- **`/mindforge:session-report`**: Professional stakeholder summary with token profiling.
- **Backlog & Seed Management**: `/mindforge:add-backlog`, `/mindforge:review-backlog`, and `/mindforge:plant-seed`.
- **Parallel Workstreams**: `/mindforge:workstreams` for concurrent milestone execution.
- **65-Point Production Checklist**: Exhaustive verification suite for enterprise readiness.

### Changed (v2.0.0)

- **Directory Standard**: Antigravity local workflows moved to `.agents/workflows/` with mandatory YAML frontmatter.
- **Migration Strategy**: Transitioned to an idempotent, backup-first migration mod- **ADR-039**: Multi-Runtime Platform Support.
- **ADR-040**: Additive Schema Migration Strategy.
- **ADR-041**: Stable Runtime Interface Contract.

---

## [2.0.0-alpha.12] — Self-Building Skills Platform — 2026-03-24

### Added (v2.0.0-alpha.12)

- **Self-Building Skills Platform**: Intelligent engine for automatically capturing skills from documentation, sessions, and npm packages.
- **`/mindforge:learn`**: High-level orchestration command for 7-step skill generation pipeline.
- **`/mindforge:marketplace`**: Seamless integration with npm registry for community skills discovery and installation.
- **7-Dimension Quality Scorer**: Static analysis tool ensuring high-quality, injection-safe skill authoring.
- **Auto-Capture Hook**: Automatic pattern detection from phase outputs (SUMMARY, ADR, HANDOFF).
- **CLI Commands**: `learn-skill` and `marketplace` added to `bin/mindforge-cli.js`.
- **ADR-036, ADR-037, ADR-038**: New architectural decisions for skill sourcing, capture thresholds, and quality gates.

---

## [2.0.0-alpha.11] — Persistent Knowledge Graph — 2026-03-24

### Added (v2.0.0-alpha.11)

- **Persistent Knowledge Graph**: Core engine for long-term memory across projects.
- **`remember` CLI**: New command for manual knowledge management and semantic search.
- **Automated Capture**: Hooks in `AutoRunner` and `CrossReviewEngine` to ingest insights automatically from phase completions and review reports.
- **Context Injection**: `installer-core.js` now auto-injects relevant historical context into `CLAUDE.md` during installation.
- **`test-memory` CLI**: New command for memory suite verification.

---

## [2.0.0-alpha.10] — Skill Installation & Validation CLI — 2026-03-24

### Added (v2.0.0-alpha.10)

- New CLI commands: `validate-skill`, `install-skill`, `register-skill`, `audit-skill`.
- Robust skill validation logic (Level 1 & 2) in `bin/skill-validator.js`.
- Automated manifest management and audit logging in `bin/skill-registry.js`.
- Integrated CLI commands into the `install-skill.md` agentic workflow for higher reliability.

---

## [2.0.0-alpha.9] — Verified Antigravity Compatibility — 2026-03-23

### Fixed (v2.0.0-alpha.9)

- Fixed critical installer regression where `files` variable was undefined during command installation.
- Fixed `resolveBaseDir` hardcoding that prevented `.agents/ relocation in non-standard environments.
- Verified end-to-end Antigravity fix for command visibility and YAML frontmatter.

---

## [2.0.0-alpha.8] — Antigravity Visibility Fix — 2026-03-23

### Fixed (v2.0.0-alpha.8)

- **Antigravity Command Visibility**: Relocated workflows to `.agents/workflows/` (from `agents/`) and injected mandatory YAML frontmatter (`description`) to ensure registration in Antigravity.
- **Zero-Config Sync**: Updated `init-project` command to reflect the new `.agents` directory standard.

---

## [2.0.0-alpha.7] — Day 12: Real-time Observability Dashboard — 2026-03-22

### Added (v2.0.0-alpha.7)

- [NEW] Real-time Dashboard Server (Express + SSE Bridge).
- [NEW] Premium 5-tab UI: Activity, Metrics, Approvals, Memory, Team.
- [NEW] Live Data Streaming for Audit Logs, Quality, Costs, and Team Activity.
- [NEW] Hardened Tier 3 Governance: Mandatory Plan ID typing for sensitive approvals.
- [NEW] Metrics Aggregator: Multi-source JSONL processing for observability.
- [NEW] CLI Command: `/mindforge:dashboard` for server lifecycle management.
- [NEW] ADR-033: Real-time Observability Architecture.
- [HARDENED] SSE Rotation Detection (Inode-based).
- [HARDENED] Localhost-only Security Model (Strict CORS/Binding).

---

## [2.0.0-alpha.4] — Day 11: Persistent Knowledge Graph (Long-Term Memory) — 2026-03-22

### Added (v2.0.0-alpha.4)

- [NEW] Persistent Knowledge Graph for long-term memory across sessions.
- [NEW] TF-IDF search engine with confidence-based relevance ranking.
- [NEW] Automated Knowledge Capture from ADRs, Debug Reports, and Retrospectives.
- [NEW] Global Knowledge Sync for machine-wide insight sharing (`~/.mindforge/global-knowledge-base.jsonl`).
- [NEW] Skill SDK integration for programmatic memory access.
- [NEW] Manual memory management command (`/mindforge:remember`).
- [NEW] Append-only audit-ready storage schema for all knowledge types.
- [NEW] ADR-030, ADR-031, ADR-032.

---

## [2.0.0-alpha.3] — Day 10: Multi-Model Intelligence Layer — 2026-03-22

### Added (v2.0.0-alpha.3)

- [NEW] Unified Multi-Model Intelligence Layer (Anthropic, OpenAI, Gemini).
- [NEW] Dynamic Model Router with Persona and Tier-based logic.
- [NEW] Real-time Cost Tracking and Daily Budget Enforcement.
- [NEW] Adversarial Cross-Model Code Review Engine (`/mindforge:cross-review`).
- [NEW] Deep Research Engine with Gemini 1.5 Pro 1M context support (`/mindforge:research`).
- [NEW] Model usage and cost reporting (`/mindforge:costs`).
- [NEW] Secure API handling with SSRF protection and header-based auth.
- [NEW] ADR-027, ADR-028, ADR-029.

---

## [2.0.0-alpha.2] — Day 9: Visual QA Engine (Browser Runtime Engine) — 2026-03-22

### Added (v2.0.0-alpha.2)

- [NEW] Persistent Browser Runtime (Playwright-powered Chromium daemon).
- [NEW] Visual Verification Hook (`<verify-visual>`) in PLAN files.
- [NEW] Systematic Visual QA Engine (`/mindforge:qa`).
- [NEW] Persistent Session Management for Browser Control.
- [NEW] ADR-024, ADR-025, ADR-026.

---

## [2.0.0-alpha.1] — Day 8: Autonomous Execution Engine — 2026-03-22

### Added (MindForge v2.0.0-alpha.1)

**Autonomous execution engine:**

- `/mindforge:auto` — walk-away autonomous phase/milestone execution
- `/mindforge:steer` — mid-execution guidance injection from second terminal
- Node repair operator: RETRY → DECOMPOSE → PRUNE → ESCALATE
- Stuck detection engine: 5 patterns (S01-S05)
- Headless CLI mode: `mindforge-cc headless --phase N`
- `.planning/steering-queue.jsonl` — steering instruction queue
- `.planning/auto-state.json` — real-time execution state

**MINDFORGE.md v2 settings:**

- AUTO_MODE_DEFAULT_TIMEOUT_MINUTES, AUTO_MODE_UAT
- AUTO_NODE_REPAIR_BUDGET, AUTO_RETRY_ON_VERIFY_FAIL
- AUTO_TASK_MAX_TOKENS, AUTO_TASK_TIMEOUT_MINUTES
- AUTO_PUSH_ON_WAVE_COMPLETE, AUTO_NOTIFY_ON_ESCALATION

### Hardened (v2.0.0-alpha.1)

- Gate 3 (secret detection) now runs PRE-COMMIT in auto mode
- Pre-flight dirty check excludes `.planning/` state files
- DECOMPOSE:- **Deny**: The action is blocked, and the violation is logged to `AUDIT.jsonl`.
- **Blast Radius Denial (v5.3.0)**: Action is blocked if the `Impact Score` exceeds the policy `max_impact` threshold.
- **Escalate**: The action requires a higher-tier DID signature or explicit HITL (Human-in-the-Loop) approval.
eserves module/package names
- Steering injection guard validates all instructions
- SIGTERM handler waits for task cleanup before saving state

### Architecture Decisions (v2.0.0-alpha.1)

- ADR-021: Autonomy Boundary
- ADR-022: Node Repair Hierarchy
- ADR-023: Gate 3 Timing

---

## [1.0.5] — v1.0.5 Minimal Install Option — 2026-03-22

### Added (v1.0.5)

- `--minimal` flag to install only essential project scaffolding.

---

## [1.0.4] — v1.0.4 Antigravity Install Fix — 2026-03-22

### Fixed (v1.0.4)

- Antigravity local install now correctly copies commands and CLAUDE.md into `agents/`.

---

## [1.0.3] — v1.0.3 Antigravity Agents Folder — 2026-03-22

### Changed (v1.0.3)

- Local Antigravity installs now target `agents/` by default (legacy `.agent/` detected and supported).

---

## [1.0.2] — v1.0.2 CLI Bin Fix — 2026-03-22

### Fixed (v1.0.2)

- npm bin entry now uses a path format accepted by npm publish.

---

## [1.0.1] — v1.0.1 Installer and Packaging Fixes — 2026-03-22

### Fixed (v1.0.1)

- Interactive setup now uses installer-core directly (no recursive wizard call).
- Package bin entry corrected to use `mindforge-cc` → `bin/install.js`.

### Changed (v1.0.1)

- Added publish whitelist to reduce package size and exclude build-only files.

---

## [1.0.0] — v1.0.0 First Stable Public Release — 2026-03-22

🎉 **MindForge v1.0.0 — Enterprise Agentic Framework — First Stable Release**

Release published: v1.0.0 (GitHub Releases).

Built over 7 focused sprints, MindForge transforms Claude Code and Antigravity
from powerful-but-unstructured AI tools into production-grade engineering
partners with full governance, observability, and enterprise integration.

### What ships in v1.0.0

- **36 commands** across 7 workflow categories
- **10 core skill packs** with three-tier registry (Core/Org/Project)
- **8 specialised agent personas** covering all engineering roles
- **Wave-based parallel execution** with dependency graph and automatic compaction
- **Enterprise integrations**: Jira, Confluence, Slack, GitHub, GitLab
- **Three-tier governance**: Tier 1 (auto) / Tier 2 (peer review) / Tier 3 (compliance)
- **Five non-bypassable compliance gates** (secret detection, CRITICAL findings, tests, CVEs, GDPR)
- **Intelligence layer**: health engine, difficulty scorer, anti-pattern detector, team profiling
- **Public skills registry**: npm-based `mindforge-skill-*` ecosystem
- **CI/CD integration**: GitHub Actions, GitLab CI, Jenkins adapters
- **@mindforge/sdk**: TypeScript SDK with client, event stream, and command builders
- **Monorepo support**: npm/pnpm/Nx/Turborepo/Lerna workspace detection
- **AI PR Review**: Claude API-powered code review with context loading
- **Self-update mechanism**: version check, changelog diff, scope-preserving apply
- **Version migration engine**: schema migration from v0.1.0 through v1.0.0
- **Plugin system**: extensible via `mindforge-plugin-*` npm namespace
- **Token usage optimiser**: profiling and efficiency strategies
- **50-point production readiness checklist**: fully verified before this release

**20 Architecture Decision Records** documenting every major design choice

- **15 test suites** with 3× consecutive run requirement
- **Complete reference documentation**: commands, security, ADR index, threat model

### Stable interface contract (v1.0.0)

See ADR-020. All 36 commands, HANDOFF.json schema, AUDIT event types,
@mindforge/sdk exports, and plugin.json format are stable in 1.x.x.

### Breaking changes from 0.6.0 (v1.0.0)

- VERIFY_PASS_RATE_WARNING_THRESHOLD in MINDFORGE.md is now 0.0-1.0 (was 0-100)
  Run `/mindforge:migrate` to auto-convert
- AUDIT.jsonl session_id field is now required (auto-backfilled by migration)
- HANDOFF.json plugin_api_version field required for plugin compatibility

### Installation (v1.0.0)

```bash
npx mindforge-cc@latest
# or
npx mindforge-cc@1.0.0 --claude --global
```

---

## [0.6.0] — Day 6 Distribution Platform

### Added (v0.6.0)

- Public skills registry: `npx mindforge-skills install/publish/search` (npm-based)
- Skill validator: 3-level validation schema (schema, content, quality)
- MINDFORGE.md JSON Schema: validation with non-overridable field markers
- MindForge CI mode: GitHub Actions / GitLab CI / Jenkins integration
- GitHub Actions workflow: health, security, quality, AI review jobs
- AI PR Review Engine: Claude API-powered code review with context loading
- Monorepo/workspace support: npm/pnpm/Nx/Turborepo/Lerna detection
- Cross-package planner: topological execution order for monorepo phases
- @mindforge/sdk: TypeScript SDK with client, event stream, and command builders
- SSE event stream: real-time progress events via Server-Sent Events
- /mindforge:init-org — organisation-wide MindForge setup command
- /mindforge:install-skill — install skill from public/private registry
- /mindforge:publish-skill — publish skill to npm registry
- /mindforge:pr-review — AI code review powered by Claude API
- /mindforge:workspace — monorepo workspace management
- /mindforge:benchmark — skill effectiveness benchmarking
- 3 new ADRs: ADR-015 npm registry, ADR-016 CI timeout, ADR-017 localhost SDK

### Hardened (v0.6.0)

- Registry: TOCTOU-safe temp directory (chmod 700), tarball size verification
- CI: timeout exits with code 0 (soft stop), clear Tier 3 block messages
- SDK: localhost-only SSE binding, Linux inotify fallback
- AI review: robust daily limit (parse error tolerant), file-based diff truncation
- Monorepo: affected package detection uses manifest paths (not depth assumption)

---

## [0.5.0] — Day 5 Intelligence Layer

### Added (v0.5.0)

- framework health engine with 7-category diagnostics and safe auto-repair guidance
- smart context compaction with Level 1/2/3 protocols and structured handoff extraction
- phase difficulty scorer with weighted composite and task-granularity feedback
- anti-pattern detection engine with false-positive controls for C01/B03/D01
- skill gap analyzer for pre-planning capability coverage checks
- team profile system and per-developer profile templates
- metrics schema and quality tracker (`session`, `phase`, `skill usage`, `compaction quality`)
- project constitution file: `MINDFORGE.md`
- setup wizard modules: environment detection, idempotent config generation, interactive flow
- 4 new commands: `/mindforge:health`, `/mindforge:retrospective`,
  `/mindforge:profile-team`, `/mindforge:metrics`
- 3 ADRs: ADR-012, ADR-013, ADR-014
- new Day 5 test suites: `tests/intelligence.test.js`, `tests/metrics.test.js`

### Changed (v0.5.0)

- CLAUDE runtime contract now includes Day 5 intelligence behavior and
  non-overridable MINDFORGE enforcement
- package entrypoint now points to setup wizard

### Fixed (v0.5.0)

- AUDIT corruption handling now quarantines invalid lines instead of deleting entries
- wizard reliability improvements: stdin TTY fallback, end-of-flow credential guidance,
  and idempotent config replacement behavior

---

## [0.4.0] — Day 4 Enterprise Integrations and Governance

### Added (v0.4.0)

- enterprise integration specs for Jira, Confluence, Slack, GitHub, and GitLab
- integration connection manager with credential hygiene and retry guidance
- governance layer: change classification, approvals, and compliance gates
- multi-developer handoff and session merger protocols
- 6 new commands: `/mindforge:audit`, `/mindforge:milestone`,
  `/mindforge:complete-milestone`, `/mindforge:approve`,
  `/mindforge:sync-jira`, `/mindforge:sync-confluence`
- Day 4 test suites: `tests/integrations.test.js`, `tests/governance.test.js`
- enterprise setup and governance guide docs

### Changed (v0.4.0)

- README and CLAUDE entrypoint updated for enterprise governance workflows
- audit schema expanded for integration and governance events

### Fixed (v0.4.0)

- Jira transition handling now documents dynamic transition lookup instead of
  hardcoded IDs
- governance tiering now covers code-content matches and audit-history escalation

---

## [0.3.0] — Day 3 Skills Platform

### Added (v0.3.0)

- 5 new core skill packs: performance, accessibility, data-privacy,
  incident-response, database-patterns
- Skills distribution engine: registry, loader, versioning, conflict resolver
- 5 new commands: /mindforge:skills, /mindforge:review, /mindforge:security-scan,
  /mindforge:map-codebase, /mindforge:discuss-phase
- Persona customisation override system (project and phase level)
- Skills Manifest (MANIFEST.md) with tier-based registration
- Skills Authoring Guide for creating org and project skills
- Injection guard for Tier 2/3 skill validation

### Changed (v0.3.0)

- execute-phase now uses multi-tier skills loading
- plan-phase now reads CONTEXT.md from discuss-phase if available
- CLAUDE.md updated with skills platform and new command awareness

### Fixed (v0.3.0)

- cursor pagination correctness in database-patterns skill (compound cursor)

---

## [0.2.0] — Day 2 Wave Engine

### Added (v0.2.0)

- Wave-based parallel execution engine
- Dependency parser and wave grouper
- Context injector with minimum-context principle
- Compaction protocol (automated at 70% context)
- AUDIT.jsonl append-only pipeline with full schema
- 4 new commands: /mindforge:next, /mindforge:quick, /mindforge:status, /mindforge:debug

---

## [0.1.0] — Day 1 Foundation

### Added (v0.1.0)

- Core directory scaffold
- CLAUDE.md agent entry point
- 8 agent persona definitions
- 5 initial core skill packs
- 6 slash commands: help, init-project, plan-phase, execute-phase, verify-phase, ship
- npm installer (npx mindforge-cc)
- State management: STATE.md, HANDOFF.json
- Org context templates: ORG.md, CONVENTIONS.md, SECURITY.md, TOOLS.md
persona definitions
- 5 initial core skill packs
- 6 slash commands: help, init-project, plan-phase, execute-phase, verify-phase, ship
- npm installer (npx mindforge-cc)
- State management: STATE.md, HANDOFF.json
- Org context templates: ORG.md, CONVENTIONS.md, SECURITY.md, TOOLS.md
