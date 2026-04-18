# MindForge Governance Guide (v8.2.0)

Autonomous Site Reliability & Self-Healing Governance

## 1. Goal

MindForge v8.2.0 introduces the **Autonomous SRE Layer**, enabling the framework to transition from a proactive coding assistant to a self-healing production reliability engine. This release hardens the governance framework to handle autonomous production remediation with deterministic safety, adversarial auditing, and SLI-based verification.

## 2. Post-Quantum Agentic Security (Pillar XI)

MindForge implements Pillar XI to harden the identity layer against future quantum computing threats.

### A. Lattice-Based Cryptography
- **Signature Algorithm**: Dilithium-5 (Lattice-based).
- **Key Exchange**: Kyber-1024 (Lattice-based).
- **Hardening**: Every Tier 4 agent action is signed with quantum-safe primitives, ensuring non-repudiation in the post-quantum era.

### B. ZK-Proof Compliance Bypasses
For high-leverage architectural changes, Tier 3+ agents can generate a **Zero-Knowledge Proof** (simulated SNARK) to verify policy adherence without exposing confidential reasoning logic.

## 3. Proactive Semantic Homing (Pillar XII)

Pillar XII transitions the autonomous swarm from reactive wave-processing to proactive, self-healing "Homing" behavior.

### A. Intent Harvesting
Agents in an idle state proactively scan the **Federated Intelligence Mesh (FIM)** for unassigned tasks, claiming them based on **Skill-Affinity** scores to eliminate idle latency.

### B. Mesh Self-Healing
When an agent experiences critical logic drift (>80), peer agents in the mesh proactively "home in" on the node to provide collaborative reasoning and recovery vectors.

## 4. Agentic Policy Orchestrator (APO) — CADIA Engine

The APO is a decentralized governance engine that intercepts every autonomous intent before it is executed.

### A. Intent Interception
Before the `AutoRunner` begins a new execution wave, it extracts the acting agent's **Intent**:
- **DID**: The unique identity of the agent.
- **Action**: The operation being attempted (e.g., `WRITE`, `DELETE`, `EXECUTE`, `REMEDIATE`).
- **Resource**: The target of the action (e.g., specific directories, files, or API endpoints).
- **Tier**: The ZTAI Trust Tier assigned to the agent.
- **SessionId**: The unique identifier for the current autonomous session.
- **Reasoning Proof**: (Tier 3 Only) A justification for high-risk architectural actions.

### B. Policy Evaluation (v8.2.0)
The upgraded `PolicyEngine` evaluates the intent using the CADIA scoring model:
1.  **Blast Radius Calculation**: The `ImpactAnalyzer` computes a risk score (0-100) based on architectural influence, session history, and goal alignment.
2.  **Tier-Based Enforcement**: 
    - **Score > 25 (LOW)**: Permitted for Tier 1+.
    - **Score > 50 (MEDIUM)**: Permitted for Tier 2+.
    - **Score > 80 (CRITICAL)**: **Denied** (Default) for Tier 0-2.
    - **Tier 3 Bypass**: Senior agents can override a CRITICAL score if a valid `reasoning_proof` is provided.

## 5. CADIA: Dynamic Impact Analysis Logic

The **ImpactAnalyzer** calculates a precision-weighted score using the follow heuristics:

### A. Architectural Influence Engine (x2.5)
High-influence files (Core, Governance, Models, and Project State) increase the blast radius score significantly.
- **Paths**: `bin/governance/*`, `bin/engine/*`, `package.json`, `.planning/*`.

### B. Sensitive Namespace Protection (x4.0)
Strict multipliers for mission-critical directories:
- **Namespaces**: `.mindforge/`, `bin/`, `config/`, `.agent/`, `bin/sre/`.

### C. Session Entropy Tracker (+15 per file)
To prevent "Rogue Wave" mass-corruption, the risk score increases for every file touched in a single session after the 5th modification.
- **Penalty**: `(session_count - 5) * 15`.

### D. Goal-to-Path Alignment (+40 penalty)
The system cross-references targets against the **Current Phase** in `.planning/STATE.md`.
- **Anomalous Behavior**: If an agent tasked with "Fixing UI" attempts to modify `bin/models/cloud-broker.js`, a large penalty is applied.

### E. ZTAI-Trust Scaling (Risk Buffers)
Trust Tiers (0-3) provide a risk "overhead" buffer:
- **Tier 1**: -10 points.
- **Tier 2**: -20 points.
- **Tier 3**: -30 points (Sovereign Trust).

## 6. Trust Tier Architecture (ZTAI Hardened)

V8.2.0 maps ZTAI Trust Tiers to explicit project roles through the `RBACManager`.

| Tier | Role | Scope | Hardening |
| :--- | :--- | :--- | :--- |
| **0** | Informational | Research/Query only. | Read-only. No CADIA bypass. |
| **1** | Implementation| Standard feature dev. | Write to `/src`, `/tests`. Session limit: 5 files. |
| **2** | Specialized | Security/Ops Specialist. | Access to `/security`, `/infra`. Higher risk cap (60). |
| **3** | Principal | Lead Architect / CEO / SRE Auditor. | **Full CADIA Bypass** (with Reasoning Proof). |

## 7. Autonomous SRE Sovereignty (v8.2.0)

Specialized governance for self-healing remediation waves.

### A. The Opus-4.5 Hardening Rule
Every SRE Remediation Verdict MUST be signed by a Tier 3 Auditor bound to the **Claude 4.5 Opus** model. This prevents "Intelligence Decay" in high-stakes production hotfixes.

### B. Shadow-State Verification
No remediation can be applied to the master environment until it has achieved **100% SLI Verification** in the `ShadowMirror` (Level 1 or Level 2) isolation layer.

## 8. Operational Blast Radius & Self-Healing Guardrails

- **Incident Lock**: When an SRE incident is active, all non-essential Tier 1 implementation work is automatically throttled or paused to reduce system entropy.
- **Circuit Breakers**: If an autonomous remediation fails to improve SLIs in the Shadow Mirror after 3 attempts, the system generates an `EMERGENCY_ESCALATION` audit signal and freezes all SRE activities for that namespace.
- **Entropy Gating**: The CADIA engine applies a **x5.0 multiplier** to any file modifications within `bin/sre/` itself to prevent the self-healing system from being tampered with by non-SRE agents.

## 9. Enterprise Audit & Compliance (RISK-AUDIT)

Every governance evaluation is persistently recorded in `.planning/RISK-AUDIT.jsonl`. This log provides a high-fidelity trail for enterprise compliance:
- **requestId**: Unique ID for every evaluation.
- **impactScore**: The final CADIA risk score (0-100).
- **verdict**: PERMIT or DENY.
- **reason**: Detailed explanation for the decision (e.g., "Violation: Max Impact Exceeded").

## 10. Enterprise Policies

MindForge v8.2.0 ships with default policies including:
- **`gate_tier_3_engine`**: Blocks all modifications to `bin/autonomous/` unless signed by a Tier 3 DID.
- **`protect_sre_namespace`**: Limits access to `/bin/sre` to the `sre-auditor` and `sre-engineer` roles.
- **`enforce_blast_radius` (v8.2.0)**: Dynamic policy that enforces a strict 65-point cap for non-Sovereign agents.
- **`require_sli_verification`**: Prevents the release of `REMEDIATION_WAVES` unless the `SLIVerifier` returns a `CONFIRMED_PASS` status.

---

*Status: V8.2.0 Autonomous SRE Governance Implemented & Verified (2026-04-18)*

