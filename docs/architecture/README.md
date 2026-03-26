# MindForge Architecture Overview

MindForge v2.1.1 is built on a unified "Agentic OS" architecture, designed to provide a consistent execution environment across all major AI IDEs and CLI tools.

---

## 1. Core Architectural Pillars

The framework is organized into four logical pillars that map directly to the development lifecycle:

1. **PLAN**: Multi-agent task decomposition using the `PLANNER_MODEL`. Resulting in atomic `.planning/` artifacts.
2. **EXECUTE**: Parallel, wave-based implementation using the `EXECUTOR_MODEL`.
3. **VERIFY**: Multi-stage validation (Automated Tests + UAT + Integrity Checks) using the `VERIFIER_MODEL`.
4. **SHIP**: Release orchestration, PR generation, and audit finalization.

---

## 2. Directory Hierarchy

MindForge uses a "Tiered Configuration" model allowing for global, organizational, and project-specific rules.

| Directory | Scope | Purpose |
| :--- | :--- | :--- |
| `.mindforge/` | System/Global | Core personas, core skills, and engine protocols. |
| `.mindforge/org/` | Organizational | Shared company standards and private skill registries. |
| `.agent/` | Project/Local | Project-specific configuration, hooks, and local skill overrides. |
| `.planning/` | Session/State | Ephemeral state, task blocks, and session handoffs. |

---

## 3. The Unified Registry (`file-manifest.json`)

The `file-manifest.json` file in `.agent/` is the single source of truth for the framework's file system mapping. It allows MindForge to resolve command paths, skills, and templates regardless of whether it's running in Claude Code, Antigravity, or Cursor.

---

## 4. Runtime Execution Flow

1.  **Context Loading**: Load `MINDFORGE.md` and `file-manifest.json` to configure the environment.
2.  **Skill Discovery**: Match task intent against the 3-tier skill registry (Core → Org → Project).
3.  **Persona Spawning**: Instantiate the required persona from the 32-persona ecosystem.
4.  **Action Loop**: Execute the 4-pillar workflow, persisting state to `.planning/STATE.md` at every step.
5.  **Audit Persistence**: All non-trivial actions are appended to the encrypted `.planning/AUDIT.jsonl`.

---

## 5. Stability & Extension

MindForge provides stable interfaces for extension:

- **Skills**: Domain expertise via `SKILL.md`.
- **Workflows**: Sequence automation via `WORKFLOW.md`.
- **Hooks**: Lifecycle interception via `.agent/hooks/`.
- **SDK**: Programmatic access via `@mindforge/sdk`.

See [ADR-041](../adr/ADR-041-runtime-interfaces.md) for the stabilization contract.

---

## 6. Semantic Memory Tiering (V3)

MindForge v2.4.0 introduces **Semantic Context Sharding**, a Tri-Tier memory architecture that optimizes context window usage for long-running engineering sessions.

| Tier | Storage | Purpose | Retrieval |
| :--- | :--- | :--- | :--- |
| **HOT** | `HANDOFF.json` | Immediate task state and core ADRs (SRD > 0.8). | Loaded every session. |
| **WARM** | `.planning/memories/` | Phase-specific shards and active project context (SRD 0.5-0.8). | Proactive retrieval via keyword matching. |
| **COLD** | `.mindforge/memory/` | Historical logs and legacy architectural decisions (SRD < 0.5). | On-demand search via `/mindforge:remember`. |

### SRD Scoring Engine

Semantic Relevance Density (SRD) is calculated using a weighted formula:
`SRD = (Decisiveness * 0.6) + (Frequency * 0.1) + (Impact * 0.3)`

### Integrity & Hardening

All shards are hardened with **SHA-256 Checksums** and **Semantic Tags** to prevent state drift and enable O(1) keyword-based context injection.

---

## 7. Stability & Extension
