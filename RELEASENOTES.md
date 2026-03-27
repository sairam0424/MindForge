# MindForge v4.2.5 — Intelligence Mesh & ZTAI Beast Mode

## Top Summary
MindForge v4.2.5 introduces the **Global Intelligence Mesh**, a breakthrough in cross-repository knowledge sharing. This release also implements **ZTAI Beast Mode**, hardens agentic identity with asymmetric cryptographic signing, and introduces simulated Secure Enclaves (HSM) for Tier 3 principal agents.

## Highlights

- **Global Intelligence Mesh**: Synchronizes local project memory with a repository-agnostic organizational store (`~/.mindforge/`).
- **Ghost Pattern Detection**: Proactive risk detection that warns agents when a proposed design matches a past organizational failure.
- **ZTAI Beast Mode**: Every agent action in the mesh is now cryptographically signed using Ed25519 asymmetric keys.
- **Secure Enclave (HSM) Simulation**: Tier 3 agents (Principal/Architect) now use simulated hardware-secured enclaves for signing, ensuring non-repudiation.
- **Audit Integrity Manifests**: Automated generation of Merkle-root based manifests for the `AUDIT.jsonl` log.
- **Tiered Governance**: Full integration of Trust Tiers [0-3] across the 32-persona library.

## Developer Experience

- **New Command Hooks**: Integration of `semantic-hub` and `ztai-archiver` into the core planning and execution loops.
- **Enhanced PERSONAS.md**: Detailed trust-tier mappings for all specialists.
- **Proactive Risk Warnings**: Real-time "Ghost Pattern" matches surfaced during the `/mindforge:plan-phase` process.

## Quality & Stability

- **Verified Identity**: 100% of Tier 3 actions require valid cryptographic signatures.
- **Tamper-Detection**: Audit manifestations allow for historical integrity verification of the entire session.
- **Cross-Repo Intelligence**: Validated knowledge sharing between isolated project workspaces via the Semantic Hub.

## Upgrade Notes

- Projects on v4.1.0 should run `/mindforge:update --apply` to enable the ZTAI and Mesh features.
- Initial global sync will occur automatically upon the first `plan-phase` or `execute-phase`.
- Legacy memory stores will be semantically indexed for the global store during the first sync.

---

# MindForge v4.1.0 — Nexus & High-Fidelity Observability

## Highlights
- **MindForge Nexus**: Agentic Reasoning Tracing (ART) for deep visibility into thought chains.
- **Trace Context Propagation**: OpenTelemetry-compatible tracing across parallel waves and swarm clusters.

---

# MindForge v2.1.1 — Core Migration & Persona Expansion
...
