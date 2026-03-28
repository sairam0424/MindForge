# MindForge v5 Architecture: The Enterprise Beast

MindForge v5.0.0 is the definitive enterprise-grade evolution of the agentic framework. This major version introduces distributed intelligence and absolute governance via a zero-trust policy-as-code layer.

## Core Pillars (v5.0.0)

### Pillar I: Federated Intelligence Mesh (FIM)
The FIM transitions MindForge from local knowledge silos to a shared organizational intelligence mesh.

- **Distributed Sync (LWW)**: Cross-node synchronization using Last-Write-Wins (LWW) conflict resolution with cryptographic versioning.
- **Delta Pull Protocol**: Intelligent synchronization that only retrieves new insights since the last successful sync, minimizing bandwidth and latency.
- **Enterprise Intelligence Service (EIS)**: A high-availability central hub for sharing high-confidence agentic findings across the entire enterprise.
- **ZTAI-Signed Provenance**: Every piece of knowledge in the mesh is cryptographically tied to the DID of the agent that generated it.

### Pillar II: Agentic Policy Orchestrator (APO)
The APO provides a non-bypassable governance layer that evaluates every autonomous wave against organizational security policies.

- **Policy-as-Code (PaC)**: Security rules are defined in declarative JSON/YAML schemas, enabling version-controlled governance.
- **Real-Time Intent Interception**: The `AutoRunner` intercepts swarm intents (Action, Resource, DID, Tier) before execution.
- **Dynamic RBAC Mapping**: Automatically assigns project roles based on an agent's **Zero-Trust Agentic Identity (ZTAI)** trust tier.
- **Fail-Safe Governance**: "Default Deny" posture for sensitive operations (API key access, infra modification, etc.).

---

## Technical Components

### 🧠 Intelligence Mesh
| Component | Path | Description |
| :--- | :--- | :--- |
| **EIS Client** | `bin/memory/eis-client.js` | Hardened, ZTAI-signed mesh communicator. |
| **Fed-Sync** | `bin/memory/federated-sync.js` | Core delta-sync and conflict resolution logic. |
| **Graph Bridge** | `bin/memory/knowledge-graph.js` | Unified traversal for local and remote nodes. |

### 🛡️ Governance Engine
| Component | Path | Description |
| :--- | :--- | :--- |
| **Policy Engine**| `bin/governance/policy-engine.js` | Intent-based RBAC/ABAC evaluator. |
| **RBAC Manager** | `bin/governance/rbac-manager.js` | Tier-to-role binding and DID mapping. |
| **Interceptor** | `bin/autonomous/auto-runner.js` | Wave-level pre-flight policy gate. |

---

## Identity & Trust (ZTAI Interlocks)

MindForge v5 utilizes **Zero-Trust Agentic Identity (ZTAI)** as the root-of-trust for all enterprise operations.

1.  **Identity Verification**: Agents prove their identity using Ed25519 signatures.
2.  **Tier Escalation**: Tier 0-1 agents are limited to analytical tasks. Tier 2 agents gain implementation roles. Tier 3 agents (signed by HSM-secured identities) can approve architectural shifts.
3.  **Policy Binding**: Policies specifically reference `trust_tier` requirements for sensitive namespaces.

---

*For implementation details, refer to the [Governance Guide](../governance-guide.md) and [Intelligence Mesh Docs](../INTELLIGENCE-MESH.md).*
