# MindForge V3 Core Architecture: Reactive Autonomous Intelligence

## Overview
MindForge V3 represents a fundamental shift from a "disciplined workflow engine" to a **Reactive Autonomous Intelligence**. This document defines the four core systems that enable sub-second architectural reasoning and zero-waste context management.

---

## 1. Tri-Tier Memory (Semantic Sharding)
Instead of linear compaction, V3 manages context via **Semantic Relevance Density (SRD)**.

- **Hot (Execution Log)**: Non-compressed RAM buffer for the current task sequence.
- **Warm (Decision Mesh)**: Context-aware shards retrieved via vector matching (Local SSD).
- **Cold (Architectural Core)**: Permanent project history and ADRs (Vector DB).

**Mechanism**: When a task is initiated, the `ContextInjector` pulls "ghost patterns" from Warm/Cold tiers into the Hot buffer based on semantic overlap.

---

## 2. Adversarial Decision Synthesis (ADS)
Architectural drift is prevented through a three-model adversarial loop.

| Role | Strategy | Objective |
| :--- | :--- | :--- |
| **Blue Team** | Optimal/Performant | Propose the most robust solution. |
| **Red Team** | Minimal/Maintainable | Challenge complexity and bloat. |
| **Synthesizer** | Balanced/Grounded | Score the debate against `SOUL.md` and merge. |

**Output**: A `DECISION_SCORE` is assigned to every major change, ensuring zero logic-drift over long sessions.

---

## 3. RAG 2.0 (Automatic Semantic Shadowing)
Knowledge capture is now a background process.

- **Auto-Shadowing**: Every `implicit_knowledge` item captured during compaction is automatically indexed by the local embedding engine.
- **Reasoning Graph**: Interconnected nodes linking Decisions, Failures, and Skills are visible in the Dashboard for real-time observability.

---

## 4. Temporal Vision (Observability & Hindsight)
Full state-fidelity across the execution wave.

- **Temporal Hub**: Synchronous snapshots of the entire `.planning/` state on every state-changing event.
- **Hindsight Injection**: Enables precise rollback to any coordinate ($T_{coord}$) to inject corrections and re-generate the downstream dependency wave.
- **Temporal API**: RESTful interface for the Dashboard's Temporal Slider.

---

## V3 Governance Rules
1. **Zero Watermark**: All documentation and code must be strictly MindForge-branded.
2. **Context-First**: Execution cannot start without a `Semantic Shard` match.
3. **Draft-Adversarial**: No code enters production without an ADS review.
