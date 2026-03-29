# MindForge Governance Guide (v6.1.0-alpha)
V6.1.0 Sovereign Intelligence: Self-Healing & Self-Optimizing

## 1. Goal
MindForge v6.1.0 introduces **Sovereign Intelligence**, extending the CADIA risk engine with real-time financial arbitrage (ARH) and reasoning-loop remediation (NDR). This ensures that while agents are autonomous, they are also economically efficient and logically consistent.

## 2. ROI Arbitrage Policy (Pillar IX)
The Autonomous Resource Harvesting engine enforces financial governance by dynamically steering agentic waves based on **Min-Intelligence-Requirement (MIR)**.

### A. Routing Tiers
- **Low MIR**: Trivial file edits or documentation updates are routed to local or lower-cost models.
- **High MIR**: Architectural decision-making or complex logic debugging is routed to premium tiers (e.g., Gemini 1.5 Pro).

### B. Arbitrage Verification
Every wave's `roi_arbitrage_event` is cross-referenced against the current **Token Budget** in `package.json`. If savings fall below the 10% target, the system flags a "Sub-Optimal Routing" alert in the metrics.

## 3. Reasoning Integrity & Neural Drift (Pillar X)
To prevent logic hallucinations and semantic decay, MindForge enforces strict **Reasoning Entropy Scores (RES)**.

### A. Drift Detection Heuristics
- **Similarity Threshold**: If cumulative reasoning nodes show >85% semantic similarity, a "Loop Warning" is issued.
- **Pattern Repetition**: Excessive punctuation or token repetition triggers an immediate `drift_remediation_event`.

### B. Remediation Escalation
1. **Level 1 (Injection)**: Inject a "Golden Trace" (hindsight steering vector) to nudge reasoning back to mission-alignment.
2. **Level 2 (Restart)**: Wipe the current reasoning span and re-trigger intent decomposition.
3. **Level 3 (Halt)**: Escalate to Human-in-the-Loop (HITL) if drift persists across 3 consecutive waves.

## 4. Agentic Policy Orchestrator (APO) — CADIA Engine
The APO is a decentralized governance engine that intercepts every autonomous intent before it is executed.

### A. Intent Interception
Before the `AutoRunner` begins a new execution wave, it extracts the acting agent's **Intent**:
- **DID**: The unique identity of the agent.
- **Action**: The operation being attempted (e.g., `WRITE`, `DELETE`, `EXECUTE`).
- **Resource**: The target of the action (e.g., specific directories, files, or API endpoints).
- **Tier**: The ZTAI Trust Tier assigned to the agent.
- **SessionId**: The unique identifier for the current autonomous session.
- **Reasoning Proof**: (Tier 3 Only) A justification for high-risk architectural actions.

### B. Policy Evaluation (v6.0.0)
The upgraded `PolicyEngine` evaluates the intent using the CADIA scoring model:
1.  **Blast Radius Calculation**: The `ImpactAnalyzer` computes a risk score (0-100) based on architectural influence, session history, and goal alignment.
2.  **Tier-Based Enforcement**: 
    - **Score > 25 (LOW)**: Permitted for Tier 1+.
    - **Score > 50 (MEDIUM)**: Permitted for Tier 2+.
    - **Score > 80 (CRITICAL)**: **Denied** (Default) for Tier 0-2.
    - **Tier 3 Bypass**: Senior agents can override a CRITICAL score if a valid `reasoning_proof` is provided.

## 3. CADIA: Dynamic Impact Analysis Logic
The **ImpactAnalyzer** calculates a precision-weighted score using the follow heuristics:

### A. Architectural Influence Engine (x2.5)
High-influence files (Core, Governance, Models, and Project State) increase the blast radius score significantly.
- **Paths**: `bin/governance/*`, `bin/engine/*`, `package.json`, `.planning/*`.

### B. Sensitive Namespace Protection (x4.0)
Strict multipliers for mission-critical directories:
- **Namespaces**: `.mindforge/`, `bin/`, `config/`, `.agent/`.

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

## 4. Trust Tier Architecture (ZTAI Hardened)
V6.0.0 maps ZTAI Trust Tiers to explicit project roles through the `RBACManager`.

| Tier | Role | Scope | Hardening |
| :--- | :--- | :--- | :--- |
| **0** | Informational | Research/Query only. | Read-only. No CADIA bypass. |
| **1** | Implementation| Standard feature dev. | Write to `/src`, `/tests`. Session limit: 5 files. |
| **2** | Specialized | Security/Ops Specialist. | Access to `/security`, `/infra`. Higher risk cap (60). |
| **3** | Principal | Lead Architect / CEO. | **Full CADIA Bypass** (with Reasoning Proof). |

## 5. Enterprise Audit & Compliance (RISK-AUDIT)
Every governance evaluation is persistently recorded in `.planning/RISK-AUDIT.jsonl`. This log provides a high-fidelity trail for enterprise compliance:
- **requestId**: Unique ID for every evaluation.
- **impactScore**: The final CADIA risk score (0-100).
- **verdict**: PERMIT or DENY.
- **reason**: Detailed explanation for the decision (e.g., "Violation: Max Impact Exceeded").

## 6. Enterprise Policies
MindForge v6.0.0 ships with default policies including:
- **`gate_tier_3_engine`**: Blocks all modifications to `bin/autonomous/` unless signed by a Tier 3 DID.
- **`protect_security_namespace`**: Limits access to `/security` and `/governance` to Tier 2+ specialists.
- **`enforce_blast_radius` (v6.0.0)**: Dynamic policy that enforces a strict 60-point cap for non-Sovereign agents.
- **`require_skill_attestation`**: Forces all skills to have valid ZTAI-signatures before loading.

---
*Status: V6.0.0 CADIA (Context-Aware Dynamic Impact Analysis) Implemented & Verified (2026-03-29)*

