# MindForge Governance Guide (v5.10.0)
Absolute Control through Policy-as-Code (PaC)

## 1. Goal
MindForge v5.6.0 introduces a non-bypassable, intent-level governance layer. This guide explains how **Agentic Policy Orchestration (APO)**, **Zero-Trust Agentic Identity (ZTAI)**, and the **Sentinel Execution Center** work together to secure the enterprise development lifecycle.

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
- **Attestation Blocking (v5.6.0)**: Executing a skill without a valid HSM-signed signature is blocked.

## 3. Trust Tier Architecture (ZTAI Hardened)
V5.1.0 automatically maps ZTAI Trust Tiers to explicit project roles through the `RBACManager`.

| Tier | Role | Scope | Hardening |
| :--- | :--- | :--- | :--- |
| **0** | Informational | Research/Query only. | Read-only access to non-sensitive docs. |
| **1** | Implementation| Standard feature dev. | Write access to `/src`, `/tests`, `/bin/memory`. |
| **2** | Specialized | Security/DevOps Specialist. | Access to `/security`, `/infra`, and `/bin/governance`. |
| **3** | Principal | Lead Architect / Core Engine. | **HSM-Enclave Signing Required** for all engine modifications. |

### A. Zero-Trust Skill Protocol (v5.6.0)
The Sentinel layer enforces binary runtime attestation for all skills.
- **ZTAI Signing**: Developers must use `mindforge-cc sign <skill>` to cryptographically lock a skill. This computes a SHA-256 hash and signs it with a Tier 3 DID.
- **JIT Verification**: Every `SKILL.md` is verified upon loading. If the hash does not match the signature registry, the `AutoRunner` blocks the skill.
- **Enterprise Mode**: Strict enforcement requires 100% attestation for all library skills.

### B. Reasoning Entropy Guardrails (v5.5.0)
The framework proactively monitors the "reasoning space" of the agent to prevent token-burn and logical drifting.
- **RES Scoring**: `NexusTracer` evaluates reasoning steps for semantic redundancy.
- **Stagnation Recovery**: When entropy falls below the safety threshold, the system interrupts the wave and injects a **Steering Vector** to force a logical pivot.

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
- **`require_skill_attestation` (v5.6.0)**: Forces all skills to have valid ZTAI-signatures before loading.
- **`monitor_reasoning_entropy` (v5.5.0)**: Automated loop detection and steering for long-running autonomous waves.

## 7. Dynamic Blast Radius (v5.3.0)
The **ImpactAnalyzer** calculates a score (0-100) for every intent:
- **Action Type**: `DELETE` (10), `WRITE` (5), `READ` (1).
- **Sensitivity**: 4x multiplier for `.mindforge/`, `bin/`, and `config/` namespaces.
- **Fail-Safe**: Defaults to Score 100 (CRITICAL) if analysis fails.

## 8. Agentic Financial Governance & AgRevOps (v5.10)

MindForge v5.10.0 introduces the first economic accountability layer for autonomous agents, ensuring that "autonomy" is balanced with "financial integrity."

### A. Security Health Score (SHS)
The `DebtMonitor` computes a dynamic **Security Health Score (0-100)** for every active session:
- **Base Score**: 100.
- **Deductions**:
    - **Policy Bypass**: -10 per instance (audit logs).
    - **Critical Finding**: -20 per instance (`security-scan`).
    - **Tier Escalation Failure**: -15.
- **Recovery**: Score recovers over time as remediation tasks (refactors/fixes) are verified via the `verify` loop.

### B. Governance Debt
Any deviation from organizational policy is recorded as "Governance Debt." High debt levels (>30) trigger:
1.  **Confidence Penalty**: Automatically reduces agent trust-tiers for sensitive operations.
2.  **Mandatory DHH**: Forces a **Dynamic Human Handover** before any further Tier 2+ actions can be executed.
3.  **Audit Flagging**: Marks all subsequent `AUDIT.jsonl` entries with a high-debt warning for external auditors.

### C. Agentic ROI
The `ROIEngine` translates autonomous precision into business value:
- **Value Mapping**: $100 per verified developer-hour saved (logic density mapping).
- **Net ROI**: (Total Value Saved) - (Provider Token Costs + Maintenance Toil).
- **Real-time Visibility**: Exposed via the Dashboard's **RevOps Hub**.

---
*Status: V5.10.0 Nexus Steering & AgRevOps Implemented & Verified (2026-03-29)*
