# MindForge Governance Guide (v4.2.5)

## Goal
Explain how change classification, approvals, compliance gates, and trust-based identity enforcement work in the MindForge ecosystem.

## Trust Tier Architecture (ZTAI)
MindForge enforces a 4-tier trust model to govern agentic actions and code modifications.

| Tier | Name | Role | Verification Requirement |
| :--- | :--- | :--- | :--- |
| **0** | Informational | Research/Query agents. | No signing required. |
| **1** | Verified | Standard implementation agents. | DID-signed audit entries. |
| **2** | Specialized | Security, UI, and Data specialists. | Multi-agent peer review + DID signing. |
| **3** | Principal | Architects and Core Engine agents. | **Secure Enclave (HSM) Signing** + Principal Approval. |

## Governance Flow
1. **Classify**: Automated classification of intent before planning.
2. **Tier Mapping**: Assigning a Trust Tier based on persona and scope.
3. **Cryptographic Signing**:
    - T1/T2: Standard Ed25519 signing via ZTAIManager.
    - T3: Hardware-enclave (simulated) signing for critical engine/security paths.
4. **Compliance Gates**: Enforce non-bypassable gates (Secrets, SQLi, PII) before release.
5. **Non-Repudiation**: Finalize audit blocks with Merkle-root manifests for integrity verification.

## Key Guarantees
- **Identity Integrity**: Agents cannot spoof identities; every block in `AUDIT.jsonl` is cryptographically tied to a DID.
- **Ghost Pattern Mitigation**: Planning is gated by the Global Intelligence Mesh to prevent repeating organizational anti-patterns.
- **Emergency Override**: Requires explicit `--emergency` flag and authorized DID signing.

## Team Operation
- **Handoff Continuity**: Multi-developer sessions coordinate via `HANDOFF.json`.
- **Global Mesh Sync**: Project memory is automatically bubbled up to the organizational `~/.mindforge` store for cross-repo awareness.
