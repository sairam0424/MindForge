# MindForge v5 Architecture: The Enterprise Beast

MindForge v5.1.0 is built on a distributed "Agentic OS" architecture. This major version introduces distributed intelligence and absolute governance via a zero-trust policy-as-code layer.

## 1. Core Architectural Pillars (v5.1.0)

### Pillar I: Federated Intelligence Mesh (FIM)

The FIM transitions MindForge from local knowledge silos to a shared organizational intelligence mesh.

- **Distributed Sync (LWW)**: Cross-node synchronization using Last-Write-Wins (LWW) conflict resolution with cryptographic versioning.
- **Delta Pull Protocol**: Intelligent synchronization that only retrieves new insights since the last successful sync, minimizing bandwidth and latency.
- **Enterprise Resilience & Governance (v5.1.0)**: A high-availability central hub for sharing high-confidence agentic findings across the entire enterprise.
- **ZTAI-Signed Provenance**: Every piece of knowledge in the mesh is cryptographically tied to the DID of the agent that generated it.

### Pillar II: Agentic Policy Orchestrator (APO) — CADIA Engine (v6.0.0 Alpha)

# MindForge Governance Guide (v6.0.0)
MindForge v6.0.0 introduces **Context-Aware Dynamic Impact Analysis (CADIA)**, a non-bypassable, architectural governance layer that evaluates every autonomous wave against organizational security and risk policies.

- **Policy-as-Code (PaC)**: Security rules are defined in declarative JSON schemas, enabling version-controlled governance.
- **Dynamic Blast Radius Analysis**: Calculates real-time architectural risk based on file influence, session entropy (multi-file modification speed), and goal alignment.
- **Session Entropy Guardrails**: Risk increases logarithmically as an agent touches more files, preventing "Rogue Wave" mass corruption.
- **ZTAI-Trust Weighting**: Senior agents (Tier 3) gain "Architectural Credit," while Tier 1-2 agents are kept under strict risk caps.
- **Reasoning Proof Bypass**: Tier 3 agents can override high-risk blocks by providing a cryptographically signed "Reasoning Proof."
- **Enterprise Audit Log**: All evaluations are logged to `.planning/RISK-AUDIT.jsonl` for compliance reporting.

### Pillar III: Predictive Agentic Reliability (PAR) (v5.5.0)

The PAR layer addresses reasoning decay and execution drifting in long-running autonomous sessions by monitoring the "logic-space" of the agent.

- **Reasoning Entropy Scoring (RES)**: The `NexusTracer` calculates a semantic similarity score (Jaccard-based) for every reasoning step. A high score indicates thought stagnation or circular logic.
- **Proactive Loop Detection**: If more than 3 consecutive thoughts fall below the entropy threshold, a `STAGNATION_DETECTED` event is triggered.
- **Steering Vector Injection**: Upon loop detection, `TemporalHindsight` generates a "Steering Vector" — a high-priority system instruction that forces the agent to pivot its logic or escalate to a human.
- **Context Density Refactorer**: Proactive context summarization and handoff when reasoning-to-action density falls below 30%.

### Pillar IV: Supply Chain Trust (ZTS) (v5.6.0)

The ZTS layer ensures the absolute integrity of the agentic supply chain, cryptographically locking every skill and model in the reasoning path.

- **Binary Runtime Attestation**: The `SkillValidator` performs Just-In-Time (JIT) attestation. Every `SKILL.md` is hashed and verified against signed signatures before being loaded into the agent's context.
- **ZTAI-Locked Registry**: Skills are signed using Tier 3 Decentralized Identifiers (DIDs) via HSM-simulated Secure Enclaves. Unauthorized skill modifications result in immediate execution blocking.
- **7-Dimension Certification (7D)**: Weighted scoring system (Schema, Triggers, Security, Clarity, etc.) for skill validation.
- **Agentic SBOM**: Automated `MANIFEST.sbom.json` generation tracking every model and skill signature in the reasoning chain.

---

### Pillar V: Multi-Cloud Arbitrage & Hedging (v5.7.0)

The Multi-Cloud layer ensures absolute availability and intelligence-first routing by dynamically mapping task taxonomies to the most performant providers.

- **Task-to-Model Affinity Matrices**: Persistent tracking of success probability per model and task type (refactor, test, audit, etc.) in `performance-stats.json`.
- **Intelligence-First Routing**: The `CloudBroker` weights routing scoring by success probability (50%), cost (30%), and latency (20%), ensuring the most capable model is selected for the specific task taxonomy.
- **Automated Feedback Integration**: `WaveFeedbackLoop` automatically records task outcomes back into the performance repository, enabling the system to learn from cross-cloud execution history.
- **Provider Fallback Protocol**: Automated "Hedging" that migrates agent context to a secondary cloud provider if 5xx errors or high latencies are detected.

### Pillar VI: Sovereign Reason Enclaves (SRE) (v5.8.0)

SRE provides a "Confidential Computing" environment for the agent's internal thought process, protected by cryptographic Zero-Knowledge (ZK) audit trails.

- **ZK-Proof Compliance Certificates**: Simulated zero-knowledge proofs (signed by System DID) generated for every confidential reasoning session in `SREManager`.
- **Privacy-Preserving Auditing**: `NexusTracer` replaces raw, sensitive thought traces in `AUDIT.jsonl` with verifiable cryptographic certificates, protecting proprietary reasoning logic.
- **Non-Custodial Verification**: New `verifyZKProof` utility allows auditors to cryptographically verify that an agent followed policy within the enclave without ever seeing the raw thoughts.
- **Thought-Chain Sanitization**: Automated redaction of sensitive patterns (keys, credentials, PII) from reasoning traces before persistent certificate generation.

### Pillar VII: Interactive Temporal Steering (NEXUS)

NEXUS transforms the `NexusTracer` from a passive observer into an active temporal control plane, enabling sub-second state reconstruction and hindsight injection.

- **Temporal History Slider**: Real-time navigation through the agent's reasoning-space, allowing for high-fidelity state inspection at any point in the execution wave.
- **Hindsight Injection Protocol**: Allows for the injection of "Steering Vectors" into past reasoning nodes to re-orient the agent's logic without a full session restart.
- **Rollback-to-State**: Automated state reconstruction that resets the environment and `.planning/` directory to match a specific `auditId` signature.
- **Dynamic Handover (DHH)**: Integrated confidence-based human escalation when reasoning entropy remains high after steering.

### Pillar VIII: Agentic Revenue Operations (AgRevOps)

AgRevOps treats agentic compute as a first-class financial and governance asset, providing real-time ROI and accountability.

- **ROI Logic Engine**: Maps complex task completions (refactor, test, audit) to developer-hour savings ($100/hr) vs. provider token costs.
- **Velocity Forecaster**: Predictive analytics that calculate milestone completion ETAs based on historical task-weight throughput and system latency.
- **Governance Debt Monitoring**: Tracks policy bypasses and high-risk security findings to compute a "Security Health Score" (SHS), ensuring framework liability remains within enterprise bounds.

---

## Technical Components

### 🧠 Intelligence Mesh

| Component | Path | Description |
| :--- | :--- | :--- |
| **EIS Client** | `bin/memory/eis-client.js` | Hardened, ZTAI-signed mesh communicator. |
| **Fed-Sync** | `bin/memory/federated-sync.js` | Core delta-sync and conflict resolution logic. |
| **Graph Bridge** | `bin/memory/knowledge-graph.js` | Unified traversal for local and remote nodes. |

### 🛡️ Governance & Cloud Arbitrage

| Component | Path | Description |
| :--- | :--- | :--- |
| **Policy Engine** | `bin/governance/policy-engine.js` | Intent-based RBAC/ABAC evaluator. |
| **RBAC Manager** | `bin/governance/rbac-manager.js` | Tier-to-role binding and DID mapping. |
| **Cloud Broker** | `bin/models/cloud-broker.js` | Multi-cloud routing and arbitrage engine. |
| **Fallback Protocol** | `bin/models/model-broker.js` | Provider hedging and context migration logic. |

### ⚡ Reliability & Trust (PAR/ZTS/SRE/DHH)

| Component | Path | Description |
| :--- | :--- | :--- |
| **Stuck Monitor** | `bin/engine/nexus-tracer.js` | Integrated RES loop detection and entropy scoring. |
| **Recovery Agent** | `bin/engine/temporal-hindsight.js` | Generates steering vectors for proactive recovery. |
| **Skill Validator** | `bin/skill-validator.js` | JIT Binary Runtime Attestation and 7D scoring. |
| **SRE Manager** | `bin/engine/sre-manager.js` | Trusted execution enclave management. |
| **ROI Engine** | `bin/revops/roi-engine.js` | Financial value synthesis and cost/benefit mapping. |
| **Velocity Forecaster** | `bin/revops/velocity-forecaster.js` | Predictive milestone ETA and throughput analytics. |
| **Debt Monitor** | `bin/revops/debt-monitor.js` | Security Health Score (SHS) and governance debt tracking. |
| **Handover Manager** | `bin/engine/handover-manager.js` | Nexus bundle creation and steering logic. |
| **SBOM Tracer** | `bin/engine/nexus-tracer.js` | SRE-aware audit logging and manifest generation. |

---

## ZTAI & Enclave Security (v5.1.0)

MindForge v5.1.0 enforces **Zero-Trust Agentic Identity (ZTAI)** as the root-of-trust for all enterprise operations.

1.  **Identity Verification**: Agents prove their identity using Ed25519 signatures.
2.  **Tier Escalation**: Tier 0-1 agents are limited to analytical tasks. Tier 2 agents gain implementation roles. Tier 3 agents (signed by HSM-secured identities) execute in **Sovereign Reason Enclaves**.
3.  **Policy Binding**: Policies specifically reference `trust_tier` requirements for sensitive namespaces.
4.  **Handover Thresholds**: Lower trust tiers trigger human-agent handover (DHH) earlier than senior T3 agents.

---

*For implementation details, refer to the [PAR & ZTS Survey](./PAR-ZTS-SURVEY.md) and [Governance Guide](../governance-guide.md).*
