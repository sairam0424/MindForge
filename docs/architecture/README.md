# MindForge Architecture Overview

MindForge v6.0.0 is built on a distributed "Agentic OS" architecture, designed for enterprise-scale intelligence sharing and absolute governance.

---

## 1. Core Architectural Pillars (v6.0.0)

The framework is focused on eight major pillars, with V6 introducing the **Neural Blast Radius Optimizer (CADIA)**:

1. **Federated Intelligence Mesh (FIM)**: Distributed knowledge sharing with delta-sync and cryptographic provenance. [V5-ENTERPRISE.md](./V5-ENTERPRISE.md)
2. **CADIA Engine (v6.0.0 Alpha)**: Neural Blast Radius Optimizer that calculates real-time architectural risk based on influence, entropy, and alignment.
3. **Predictive Agentic Reliability (PAR)**: Self-healing reasoning loops and context refactoring. [PAR-ZTS-SURVEY.md](./PAR-ZTS-SURVEY.md)
4. **Supply Chain Trust (ZTS)**: Agentic SBOM and 7-dimension skill certification. [PAR-ZTS-SURVEY.md](./PAR-ZTS-SURVEY.md)
5. **Zero-Trust Agentic Identity (ZTAI)**: DID-based cryptographic signing for all agentic actions and tiered trust enforcement.
6. **Adversarial Decision Synthesis (ADS)**: 3-model synthesis loop ensuring architectural integrity.
7. **Semantic Context Sharding**: Tri-tier memory (Hot/Warm/Cold) for high-fidelity context management.
8. **Autonomous Execution Engine**: Self-healing wave execution with stuck-detection and repair hierarchies.

---

## 2. Directory Hierarchy

MindForge uses a "Tiered Configuration" model allowing for global, organizational, and project-specific rules.

| Directory | Scope | Purpose |
| :--- | :--- | :--- |
| **EIS / Mesh** | `bin/memory` | Core FIM implementation (eis-client, federated-sync). |
| **Governance** | `bin/governance` | Core APO implementation (policy-engine, rbac-manager). |
| `.mindforge/` | System/Global | Core personas, core skills, and engine protocols. |
| `.agent/` | Project/Local | Project-specific configuration, hooks, and local skill overrides. |
| `.planning/` | Session/State | Ephemeral state, task blocks, and session handoffs. |

---

## 3. The Unified Registry (`file-manifest.json`)

The `file-manifest.json` file in `.agent/` is the single source of truth for the framework's file system mapping. It allows MindForge to resolve command paths, skills, and templates regardless of whether it's running in Claude Code, Antigravity, or Cursor.

---

## 4. Runtime Execution Flow (V5 Hardened)

1.  **Context Loading**: Load `MINDFORGE.md` and `file-manifest.json`.
2.  **Identity Verification**: Resolve the agent's ZTAI identity and trust tier.
3.  **Policy Interception**: The `APO` evaluates the task intent. If not **PERMIT**, the session is halted.
4.  **Skill Discovery**: Match task intent against the 3-tier skill registry.
5.  **Execution Wave**: Parallel task execution with continuous FIM synchronization.
6.  **Audit Pulse**: All actions are cryptographically signed and appended to `.planning/AUDIT.jsonl`.

---

## 5. Decision Records & Stability

MindForge provides stable interfaces for extension while documenting every major design shift via ADRs.

- **ADR Index**: See [decision-records-index.md](./decision-records-index.md).
- **V3 Core**: See [V3-CORE.md](./V3-CORE.md).
- **V4 Mesh**: See [V4-SWARM-MESH.md](./V4-SWARM-MESH.md).
- **V5 Enterprise**: See [V5-ENTERPRISE.md](./V5-ENTERPRISE.md).

---

## 6. Semantic Memory Tiering (V3/V4)

| Tier | Storage | Purpose | Retrieval |
| :--- | :--- | :--- | :--- |
| **HOT** | `HANDOFF.json` | Immediate task state and core ADRs (SRD > 0.8). | Loaded every session. |
| **WARM** | `.planning/memories/` | Phase-specific shards and active project context (SRD 0.5-0.8). | Proactive retrieval. |
| **COLD** | `.mindforge/memory` | Global knowledge base and historical logs (SRD < 0.5). | Federated search (FIM). |

---

## 7. Adversarial Decision Synthesis (ADS)

MindForge v3.0.0 introduces **Adversarial Decision Synthesis (ADS)**, a 3-model synthesis loop that ensures every architectural decision is battle-tested using the **SOUL.md** scoring algorithm.

---
