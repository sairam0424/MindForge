# MindForge Governance Guide (v5.1.0)
Absolute Control through Policy-as-Code (PaC)

## 1. Goal
MindForge v5.1.0 introduces a non-bypassable, intent-level governance layer. This guide explains how **Agentic Policy Orchestration (APO)** and **Zero-Trust Agentic Identity (ZTAI)** work together to secure the enterprise development lifecycle, now hardened by the **Neural Protocol Mesh**.

## 2. Agentic Policy Orchestrator (APO)
The APO is a decentralized governance engine that intercepts every autonomous intent before it is executed.

### A. Intent Interception
Before the `AutoRunner` begins a new execution wave, it extracts the acting agent's **Intent**:
- **DID**: The unique identity of the agent.
- **Action**: The operation being attempted (e.g., `process_phase_wave`, `modify_security_config`).
- **Resource**: The target of the action (e.g., specific directories, files, or API endpoints).
- **Tier**: The ZTAI Trust Tier assigned to the agent.

### B. Policy Evaluation
The `PolicyEngine` evaluates this intent against organizational **Policy-as-Code (PaC)** definitions (typically stored in `bin/governance/policies/`).
- **Permit**: The action is allowed and execution proceeds.
- **Deny**: The action is blocked, and the violation is logged to `AUDIT.jsonl`.
- **Blast Radius Denial (v5.3.0)**: Action is blocked if the `Impact Score` exceeds the policy `max_impact` threshold.
- **Escalate**: The action requires a higher-tier DID signature or explicit HITL (Human-in-the-Loop) approval.

## 3. Trust Tier Architecture (ZTAI Hardened)
V5.1.0 automatically maps ZTAI Trust Tiers to explicit project roles through the `RBACManager`.

| Tier | Role | Scope | Hardening |
| :--- | :--- | :--- | :--- |
| **0** | Informational | Research/Query only. | Read-only access to non-sensitive docs. |
| **1** | Implementation| Standard feature dev. | Write access to `/src`, `/tests`, `/bin/memory`. |
| **2** | Specialized | Security/DevOps Specialist. | Access to `/security`, `/infra`, and `/bin/governance`. |
| **3** | Principal | Lead Architect / Core Engine. | **HSM-Enclave Signing Required** for all engine modifications. |

## 4. Protocol Mesh Governance (v5.1.0 Enhancement)
The **Beast Addition** integrates protocol-level governance into the APO engine.
- **Protocol Enforceability**: Every protocol activation (e.g., `/mindforge:tdd`) is logged as a governance event.
- **Mesh Integrity**: The **Parallel Mesh** synchronizes governance state across multiple agents, preventing "split-brain" policy execution.
- **Skill Compliance**: New skills created via `/mindforge:skill-creation` are automatically audited for APO compatibility.

## 5. Governance Workflow (V5.1.0)
1. **ZTAI Handshake**: Agent proves identity using Ed25519 signatures.
2. **Intent Pulse**: Agentic intent is broadcast to the policy interceptor.
3. **APO Evaluation**: Policy engine checks the intent against PaC rules.
4. **Role binding**: `RBACManager` grants or revokes permissions based on the active trust tier.
5. **Verified Wave**: Execution proceeds only if all policy gates are clear.

## 6. Enterprise Policies
MindForge v5.1.0 ships with default policies including:
- **`gate_tier_3_engine`**: Blocks all modifications to `bin/autonomous/` unless signed by a Tier 3 DID.
- **`protect_security_namespace`**: Limits access to `/security` and `/governance` to Tier 2+ specialists.
- **`mesh_integrity_lock`**: Ensures only high-confidence agents can push to the **Federated Intelligence Mesh**.
- **`enforce_blast_radius` (v5.3.0)**: Dynamic policy that limits `DELETE` impact to <30 for Tier 1 agents.

## 7. Dynamic Blast Radius (v5.3.0)
The **ImpactAnalyzer** calculates a score (0-100) for every intent:
- **Action Type**: `DELETE` (10), `WRITE` (5), `READ` (1).
- **Sensitivity**: 4x multiplier for `.mindforge/`, `bin/`, and `config/` namespaces.
- **Fail-Safe**: Defaults to Score 100 (CRITICAL) if analysis fails.

---
*Status: V5.3.0 Dynamic Blast Radius Implemented & Verified (2026-03-28)*
