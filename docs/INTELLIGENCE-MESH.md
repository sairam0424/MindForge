# MindForge Global Intelligence Mesh (Memory)
v4.2.5 — Cross-Repository Knowledge Sharing

## 1. Overview
The **Global Intelligence Mesh** elevates MindForge from a repository-local assistant to an organization-wide intelligence asset. It enables multiple projects to share architectural insights, past failure patterns ("Ghost Patterns"), and success-verified designs without manual intervention.

## 2. Architecture
The mesh consists of two primary components residing in `.mindforge/memory/engine/`:

### A. The Semantic Hub (`semantic-hub.js`)
- **Role:** Synchronizes local project memory with a global, repository-agnostic store located at `~/.mindforge/memory/global`.
- **Deduplication:** Uses cryptographic ID-based matching to ensure only unique observations are moved to the global hub.
- **Privacy:** Sync is opt-in for sensitive data, but architectural patterns and "failure context" are pushed by default to prevent organizational redundancy.

### B. Ghost Pattern Detector (`ghost-pattern-detector.js`)
- **Role:** A proactive risk mitigation engine that scans incoming proposals against known "Ghost Patterns" (past failures from other projects).
- **Triggers:** Automatically invoked during the `plan` phase of any mission-critical task (Tier 2-3).
- **Risk Levels:**
    - **CRITICAL:** High similarity with a past p0 security failure or environment leak.
    - **HIGH:** Similarity with a performance regression or architectural anti-pattern.

## 3. Workflow Hook
1. **Capture:** When a task results in a significant learning, `mf-memory` flags it as a `decision` or `pattern`.
2. **Push:** The `SemanticHub` periodically syncs these to the global store.
3. **Pull/Scan:** When starting a new project or task, the `GhostPatternDetector` queries the global hub to check if the proposed approach has "ghosts" (failed elsewhere).

## 4. Usage in Enterprise
- **Zero-Redundancy Research:** If one team spends 10k tokens researching a specific library integration, the resulting "Knowledge Item" is immediately available to every other project in the mesh.
- **Organization-Wide Self-Healing:** Security fixes in one repo become proactive warnings in all others.

---
*Status: Foundation Implemented & Verified (v4.2.5)*
