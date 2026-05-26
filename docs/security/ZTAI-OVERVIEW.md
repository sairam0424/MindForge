# Zero-Trust Agentic Identity (ZTAI) Overview

MindForge v4.2 introduces **ZTAI Enterprise Mode**, an enterprise-grade identity layer that ensures every agent action is cryptographically signed and non-repudiable.

## 1. Asymmetric Identity Model
Every MindForge persona in the 32+ agent library is assigned a unique asymmetric key pair (Ed25519) upon project initialization or agent spawning.

- **Private Key**: Stored securely in the local `.mindforge/identity` vault (never exposed).
- **Public Key / DID**: Represented as a **Decentralized Identifier (DID)** in the format `did:mf:<key-fingerprint>`.

## 2. Trust Tiers & Signing Requirements
MindForge enforces tiered signing based on the risk level of the persona's actions.

| Tier | Persona Examples | Signing Tech | Integrity Proof |
| :--- | :--- | :--- | :--- |
| **T0** | `mf-researcher`, `mf-query` | None | Audit log entry only. |
| **T1** | `mf-executor`, `mf-coder` | Ed25519 (Software) | Signed JSON payload. |
| **T2** | `security-auditor`, `ui-specialist` | Ed25519 (Software) | Signed Block + Peer Review. |
| **T3** | `mf-planner`, `system-architect` | **Secure Enclave (HSM)** | Enclave-attested signature. |

*Note: T3 agents utilize a simulated hardware-secured enclave (HSM) to ensure principal-level accountability.*

## 3. Non-Repudiable Audit Manifests
The `ZTAIArchiver` generates high-fidelity integrity proofs for the session history.

- **Merkle-Root Chain**: Every 50 audit entries trigger the generation of a Merkle-root.
- **Manifest Finalization**: The cumulative root of all audit entries is signed by the **Principal Agent (T3)**.
- **Tamper Detection**: Any modification to the `AUDIT.jsonl` file will invalidate the Merkle-proof, triggering an immediate security alert.

## 4. Key Provider Abstraction
The `ZTAIManager` uses a pluggable `KeyProvider` architecture:
- `FileSystemProvider`: Standard key storage for T1/T2 agents.
- `SecureEnclaveProvider`: Simulates hardware-backed signing for T3 agents.
- `KMSProvider` (Future): Integration with AWS/GCP/Azure Key Management Services.

## 5. Governance Integration
ZTAI identities are verified during the `/mindforge:verify-phase` and `/mindforge:ship` processes. High-tier changes will be BLOCKED if the cryptographic signatures are missing or invalid.
