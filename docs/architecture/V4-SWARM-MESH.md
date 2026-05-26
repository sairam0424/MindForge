# Architecture: V4 Swarm Mesh Paradigm

## 1. Overview

MindForge V4 introduces the **Swarm Mesh**, a decentralized multi-agent orchestration model. Unlike the sequential subagent model of previous versions, the Mesh enables **Dynamic Task-Aware Clusters** that execute in parallel with shared state and unified governance.

---

## 2. Core Components

### I. SwarmController
The central engine logic that handles:
- **Complexity Analysis**: Deciding if a task requires a single agent or a specialist cluster.

- **Cluster Spawning**: Selecting the optimal swarm template based on tech stack and task category.

- **Identity Governance**: Validating **ZTAI (Zero-Trust Agentic Identity)** trust tiers and verifying cryptographic signatures for specialized results.

### II. PersonaFactory (Micro-Personas)
Dynamically creates specialized "Micro-Personas" on-the-fly by:
- Patching base personas (e.g., `developer`) with **Context7** library insights.
- Injecting task-specific imperative rules and role specializations.

### III. Mesh Parallelism (WaveExecutor)
The `WaveExecutor` has been refactored to support:
- **Parallel Swarm Spawning**: Multiple specialists (e.g., UI Auditor + Accessibility Specialist) working on the same branch simultaneously.

- **Shared State (`SWARM-STATE.json`)**: Real-time coordination and conflict avoidance between swarm members.

- **Consolidation Protocol**: The Swarm Leader synthesizes all findings into a unified `SWARM-SUMMARY.md`.

### IV. MindForge Nexus: ART (Agentic Reasoning Tracing)
The definitive observability layer for the mesh:
- **Reasoning Spans**: Hierarchical tracking of every "thought" and decision point.
- **Trace Propagation**: Context-aware trace IDs that link waves, tasks, and clusters.
- **Audit Integration**: Direct link to `.planning/AUDIT.jsonl` via `trace_id` and `span_id`.

### V. Global Intelligence Mesh (The Hub)
The foundation for cross-repository organizational memory:
- **Semantic Hub**: Syncs local knowledge pieces with the global organizational store (`~/.mindforge/`).
- **Ghost Pattern Detection**: Proactive risk matching that prevents repeating known organizational failures at the planning stage.
- **Repository Graph**: Every repo in the mesh contributes to a shared understanding of architectural success and failure.

### VI. Autonomous FinOps Hub (Economics)
MindForge integrates an **Autonomous FinOps Hub** that treats compute as a first-class resource. The `ModelBroker` utilizes a **Confidence-to-Cost (C2C)** engine to dynamically route tasks based on complexity and trust tier, ensuring maximum ROI without compromising safety.

### VII. Proactive Equilibrium (Reliability)
The system achieves **Proactive Equilibrium** through a `WaveFeedbackLoop`. If execution divergence exceeds 20%, the system triggers **Temporal Hindsight**—an automated RCA process that rewrites the phase plan to stay within project guardrails.

---

## 3. Swarm Governance (v4.2)

Every swarm cluster operates under strict enterprise governance rules:

- **Decision Gates**: Use of "Human-in-the-Loop" (HITL) for high-risk Tier 3 actions.

- **Resource Budgets**: FinOps-aware routing to optimal models based on the cluster's defined confidence-to-cost (C2C) ratio.

- **Audit Trails**: Non-repudiable logs signed by each agent's unique **Decentralized Identifier (DID)**.

- **Identity Hardening (Enterprise Mode)**: High-tier agents (T3) use asymmetric keys anchored in a simulated **Secure Enclave (HSM)**.
- **Integrity Proofs**: All audit blocks are finalized with **Merkle-root payloads** signed by the archiver to prevent tampering.

---

## 4. Swarm Lifecycle

1. **Detection**: `SwarmController` detects target files and estimates task difficulty.
2. **Cluster Assembly**: `PersonaFactory` assembles the micro-persona specialist group.
3. **Execution**: Parallel execution waves with shared JSON state synchronization.
4. **Consolidation**: Leader-led summary and plan update.
5. **Verification**: Adversarial audit by the `mf-reviewer` or assigned swarm auditor.

---

*This document defines the architectural standard for MindForge V4 Swarm Orchestration.*
