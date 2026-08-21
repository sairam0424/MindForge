# Zero-Trust Agentic Identity (ZTAI) Overview

> **STATUS: DESIGN DOCUMENT — NOT SHIPPED BEHAVIOUR.**
>
> Everything below describes an intended architecture. Measured against a live install:
>
> | Claim in this document | Reality |
> |---|---|
> | every agent action is cryptographically signed | **0 of 3116** audit entries carry a `signature` or `did` field |
> | per-persona Ed25519 keypairs at spawn | `ztai-manager.js` can generate them; nothing calls it in a normal run |
> | `.mindforge/identity` vault | not created by any install |
> | every 50 entries triggers a Merkle-root | not a Merkle root — a linear cumulative fold — and nothing triggers it: `.planning/audit-archive/` contains only `.gitkeep`, the archiver has no caller outside tests |
> | Merkle-root chain | `ztai-archiver.js:57` sets `merkleRoot: cumulativeHash` — a linear chain hash, not a hash tree |
>
> `ENABLE_ZTAI` has no readers in `bin/`. What IS real and independently verifiable is the SHA-256
> hash chain in `.planning/AUDIT.jsonl` — see `SECURITY.md` for its actual guarantees and its one
> documented gap. Treat this file as a roadmap, and `bin/` plus `tests/` as ground truth.

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

- **Cumulative Chain Root**: Every 50 audit entries would trigger a cumulative SHA-256 chain hash over the block. It is a linear fold, not a Merkle tree — no hash tree, no inclusion proof — though `ztai-archiver.js:57` still names the field `merkleRoot`.
- **Manifest Finalization**: The cumulative root of all audit entries is signed by the **Principal Agent (T3)**.
- **Tamper Detection**: Inside a block a manifest covers, `verifyIntegrity()` fails closed. Mutating or reordering an entry changes the recomputed root (`ztai-archiver.js:156`), and adding, deleting, or truncating *into* the block trips the `entryCount` check (`ztai-archiver.js:148`) — measured: dropping 3 of 10 covered entries throws `block entry count mismatch`. What it does **not** cover is anything outside the block: the manifest selects entries by the `[blockStart, blockEnd]` timestamp window (`ztai-archiver.js:141`), so entries appended after the last finalized `blockEnd` are never selected, and truncating that uncovered tail is invisible — measured: dropping all 4 uncovered entries still returns valid. This is a **separate mechanism** from the `previous_hash` back-link chain in `.planning/AUDIT.jsonl`; the archiver contains zero references to `previous_hash`. `bin/verify-audit.js` has its own, different tail-truncation gap, for the unrelated reason that any prefix of a back-linked chain is itself a valid chain. Nothing raises an alert for either today — the archiver has no caller outside tests.

## 4. Key Provider Abstraction
The `ZTAIManager` uses a pluggable `KeyProvider` architecture:
- `FileSystemProvider`: Standard key storage for T1/T2 agents.
- `SecureEnclaveProvider`: Simulates hardware-backed signing for T3 agents.
- `KMSProvider` (Future): Integration with AWS/GCP/Azure Key Management Services.

## 5. Governance Integration
ZTAI identities are verified during the `/mindforge:verify-phase` and `/mindforge:ship` processes. High-tier changes will be BLOCKED if the cryptographic signatures are missing or invalid.
