# AGENTS_LEARNING.md — MindForge Intelligence Evolution

This document captures the cumulative technical intelligence of AI agents operating within the MindForge ecosystem. It serves as a persistent memory layer to ensure agents evolve by learning from historical mistakes, maintaining high-fidelity engineering discipline, and adhering to sovereign architectural standards.

---

## Context
**Project Name:** MindForge (Sovereign Agentic Intelligence)
**Project Type:** Distributed Agentic Infrastructure & Federated Intelligence
**Tech Stack:** Node.js (ESM), Ed25519 (ZTAI), Multi-Cloud (Vertex/Bedrock/Azure), ZK-Proofs (SRE), Semantic Sharding, ART (Agentic Reasoning Tracing).
**System Scope:** Sovereign decentralized agent orchestration with zero-trust governance, high-fidelity audit trails, and ROI-driven autonomous execution waves.

---

## 1. Mistakes Observed
| Mistake | Description | Example | Impact |
| :--- | :--- | :--- | :--- |
| **Context Shard Overload** | Loading excessive project code into the "Hot" context without semantic pruning, exceeding token limits or causing "lost-in-the-middle" reasoning. | Sending 80+ files to the LLM instead of using `ContextDensityRefactorer` for sharding. | High |
| **ZTAI Signature Bypass** | Attempting Tier 3 SRE actions without verifying the mandatory DID Ed25519 signature header. | `bin/engine/sre-manager.js` execution failing because the agent omitted the identity token. | Critical |
| **Branding Regression** | Re-introducing legacy "Beast Mode" terminology into documented "Enterprise-Grade" systems. | Using "Beast" in `CHANGELOG.md` for a v6.0.0-alpha entry. | Medium |
| **NexusTracer Sync Lag** | Calling `NexusTracer.log()` without `await`, causing race conditions in the `AUDIT.jsonl` chronological order. | Logs showing action result before the reasoning step due to unhandled promises. | High |
| **Implicit Path Assumptions** | Assuming a flat directory structure for enterprise monorepos instead of resolving via `MANIFEST.sbom.json`. | Hardcoding `docs/` path instead of checking the `registry/` mapping. | Low |

---

## 2. Root Cause Analysis
- **Legacy Naming Bias**: The transition from experimental prototyping ("Beast") to production-grade ("Enterprise") left fragmented regex captures in documentation.
- **Sync Protocol Evolution**: The `NexusTracer` was initially synchronous; the v5.9.0 "Production-Grade" pass converted it to async, but agents often default to legacy synchronous patterns.
- **Context Management Gaps**: Agents frequently overestimate the model's ability to maintain high-fidelity reasoning across 50k+ tokens of raw file history without summarization.
- **Missing Middleware Enforcement**: Security gates (ZTAI) were originally advisory rather than non-bypassable architectural blocks.

---

## 3. Mitigation & Fix Strategy
- **Branding Control**: Externalize all branding strings to `bin/core/constants.js` to ensure single-source-of-truth.
- **Async Enforcement**: Implement an ESLint rule or runtime check in `NexusTracer` that throws an error if called outside an `async` context.
- **JIT Context Sharding**: Before every major "Wave," agents must run the `ContextDensityRefactorer` to prune the "Hot" shard to <20% of the total token window.
- **ZTAI Compliance Gate**: The `WaveExecutor` now requires a valid DID response from the `ZTAIManager` before unlocking the `write_file` tool for sensitive namespaces.

---

## 4. Best Practices (Must Follow)
- **ART Protocol (Agentic Reasoning Tracing)**: Every tool invocation MUST be preceded by a reasoning log entry in the `NexusTracer`. "Act only after thinking is traced."
- **Merkle-linked Auditing**: Ensure every `AUDIT.jsonl` entry contains the `prevHash` to maintain the integrity of the reason-chain.
- **Sovereign Handoffs**: When pausing a session, always update `STATE.md` and generate a `HANDOFF.json` containing the current "Nexus State Bundle."
- **Multi-Cloud Hedging**: If a primary provider (e.g. Vertex) experiences >3s P99 latency, immediately hedge the task to a secondary provider via the `CloudBroker`.
- **Zero-Trust Implementation**: Treat every file modification as a potential architectural regression until validated by the `CADIA` blast-radius analyzer.

---

## 5. Anti-Patterns (Must Avoid)
- **Shadow Execution**: Running local shell commands or file edits without registering the intent in the `.planning/` directory.
- **Tool Flooding**: Requesting 10+ tool parallel calls in one turn. This increases state branch complexity and makes rollback difficult.
- **Manual ROI Estimation**: Guessing token costs. Always use `bin/revops/roi-engine.js` for precise financial attribution.
- **Context Flooding**: Piping raw, uncompressed logs into the reasoning window. Use **Semantic Compaction** to extract insights first.

---

## 6. Architectural Patterns to Follow
- **Federated Intelligence Mesh (FIM)**: Knowledge is decentralized. Always sync with the organizational mesh via `federated-sync.js` before starting a new milestone.
- **CADIA (Context-Aware Dynamic Impact Analysis)**: Follow the PaC (Policy-as-Code) rule set for every write action to prevent silent breaking changes.
- **Sovereign Reason Enclaves (SRE)**: Sensitive reasoning (security audits, key management) MUST occur in isolated SRE sessions with ZK-proof certificates.
- **Temporal Hindsight**: Use `temporal-hindsight.js` to perform "Reasoning Corrections" on past nodes if the current wave path is diverging from the goal.

---

## 7. Failure Scenarios (Failure-First Thinking)
- **Scenario: Model Hallucination in Planning**. If the generated `task.md` refers to non-existent files:
  - **System Behavior**: `CADIA` detects a "Ghost Path" access attempt.
  - **Agent Response**: Halt execution, run `gsd-map-codebase`, and re-generate the plan with verified paths.
- **Scenario: Mesh Outage mid-Sync**. If `Fed-Sync` fails due to network instability:
  - **System Behavior**: Circuit breaker in `eis-client.js` trips.
  - **Agent Response**: Pivot to "Local-First" mode, cache all findings in a local shard, and flag for deferred sync once connectivity is restored.
- **Scenario: ZTAI Identity Compromise**. If a signed action fails validation:
  - **System Behavior**: `policy-engine.js` triggers a `SUSPICIOUS_IDENTITY` lockdown.
  - **Agent Response**: Immediate escalation to Human-in-the-Loop (DHH) with a full Nexus State dump for audit.

---

## 8. Continuous Learning Rules
- **Post-Wave Retrospectives**: After every milestone completion, agents must run `/mindforge:retrospective` and append new findings to this document.
- **Log Scavenging**: Periodically analyze the `AUDIT.jsonl` for patterns of "Reasoning Decay" (loops, stagnation) and document the mitigation.
- **Dynamic Updates**: If a new "Enterprise" standard is adopted (e.g., a change in DID format), this document MUST be the first file updated.

---

## Evolution Log

### [Learning Entry - 2026-03-29T20:50:00Z]

**Context:**
Transitioning the entire MindForge framework from legacy "Beast Mode" branding to professional "Enterprise-Grade" and "Production-Grade" standards.

**Mistake:**
Initial branding pass relied on shallow search-and-replace which missed "Beast" instances in hidden engine directories (`.mindforge/engine/`) and architectural proposals. Also, renaming test files (`ztai-beast.test.js`) without immediate deletion of the legacy file led to redundant test artifacts.

**Root Cause:**
"Branding Entropy" — legacy terminology was used not just as text, but as internal logic identifiers (DIDs) and file naming conventions. Rapid prototyping favored "Beast" as a catch-all term, making it difficult to decouple professional branding from core logic later.

**Fix:**
Executed a recursive, case-insensitive global grep across all directories (including hidden ones). Systematically renamed files and updated internal DID constants (e.g., `0xbeast` -> `0xenterprise`). Performed a dedicated pass to expand the Command Reference to ensure the new "Enterprise" tone was reflected in utility docs.

**Prevention Rule:**
All marketing and branding terms MUST be abstracted into a central `bin/core/constants.js` or `package.json` metadata. Never use branding terms as internal cryptographic seeds or unique identifiers in source code.

**Category:**
- Bug Fix / Architecture

---
**Document Status:** Certified (v1.0.1)
**Root Identity:** `did:mindforge:enclave:0xenterprise`
**Last Verified:** 2026-03-29
