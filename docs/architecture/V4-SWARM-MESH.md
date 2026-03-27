# Architecture: V4 Swarm Mesh Paradigm

## 1. Overview

MindForge V4 introduces the **Swarm Mesh**, a decentralized multi-agent orchestration model. Unlike the sequential subagent model of previous versions, the Mesh enables **Dynamic Task-Aware Clusters** that execute in parallel with shared state and unified governance.

---

## 2. Core Components

### I. SwarmController
The central engine logic that handles:
- **Complexity Analysis**: Deciding if a task requires a single agent or a specialist cluster.

- **Cluster Spawning**: Selecting the optimal swarm template based on tech stack and task category.

- **Trust Enforcement**: Validating ZTAI (Zero-Trust Agentic Identity) tiers.

### II. PersonaFactory (Micro-Personas)
Dynamically creates specialized "Micro-Personas" on-the-fly by:
- Patching base personas (e.g., `developer`) with **Context7** library insights.
- Injecting task-specific imperative rules and role specializations.

### III. Mesh Parallelism (WaveExecutor)
The `WaveExecutor` has been refactored to support:
- **Parallel Swarm Spawning**: Multiple specialists (e.g., UI Auditor + Accessibility Specialist) working on the same branch simultaneously.

- **Shared State (`SWARM-STATE.json`)**: Real-time coordination and conflict avoidance between swarm members.

- **Consolidation Protocol**: The Swarm Leader synthesizes all findings into a unified `SWARM-SUMMARY.md`.

---

## 3. Swarm Governance (v4.2)

Every swarm cluster operates under strict enterprise governance rules:

- **Decision Gates**: Use of "Human-in-the-Loop" (HITL) for high-risk Tier 3 actions.

- **Resource Budgets**: FinOps-aware routing to optimal models based on the cluster's defined confidence-to-cost (C2C) ratio.

- **Audit Trails**: Non-repudiable logs signed by each agent's unique Decentralized Identifier (DID).

---

## 4. Swarm Lifecycle

1. **Detection**: `SwarmController` detects target files and estimates task difficulty.
2. **Cluster Assembly**: `PersonaFactory` assembles the micro-persona specialist group.
3. **Execution**: Parallel execution waves with shared JSON state synchronization.
4. **Consolidation**: Leader-led summary and plan update.
5. **Verification**: Adversarial audit by the `mf-reviewer` or assigned swarm auditor.

---

*This document defines the architectural standard for MindForge V4 Swarm Orchestration.*
