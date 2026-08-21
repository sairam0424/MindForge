# MindForge — Security Policy

## Supported versions

| Version | Security support |
|---|---|
| 5.x.x | ✅ Active — patches released for all severity levels |
| 4.x.x | ⚠️  Limited — critical fixes only |
| < 4.0.0 | ❌ No support |

## Reporting a vulnerability

**Email:** security@mindforge.dev

**Required information:**
- Description of the vulnerability
- Steps to reproduce
- Potential impact assessment
- Your name / handle (for acknowledgement, if desired)

**Response timeline:**
- Acknowledgement: within 24 hours
- Initial assessment: within 7 days
- Fix released: within 30 days for HIGH/CRITICAL, 90 days for MEDIUM/LOW
- Coordinated disclosure: 90 days from initial report

**We commit to:**
- Not taking legal action against good-faith security researchers
- Crediting researchers in the security advisory (with their permission)
- Maintaining confidentiality until a fix is released

## ZTAI & Enclave Security (v5.0.0)

MindForge v5.0.0 enforces **Zero-Trust Agentic Identity (ZTAI)** and **Sovereign Reason Enclaves (SRE)** for all sensitive operations. 

- **Asymmetric Signing** — DESIGNED, NOT ACTIVE. `bin/governance/ztai-manager.js:34,74` really does
  call `crypto.generateKeyPair('ed25519')`, so the capability is implemented. But nothing signs an
  audit entry: measured on a live 3116-entry `.planning/AUDIT.jsonl`, **0 entries carry a
  `signature` or `did` field**, and the entry schema is exactly
  `event, target_id, description, agent, id, timestamp, previous_hash, _hash`. `ENABLE_ZTAI` has
  **no readers anywhere in `bin/`**. Do not rely on agent actions being signed or non-repudiable.
- **Sovereign Reason Enclaves (SRE)**: Tier 3 principal agents execute reasoning in isolated TEE-simulated enclaves, ensuring that high-value architectural decisions and sensitive IP never leak to the persistent log.
- **Trace Sanitization**: In-enclave sanitization automatically redacts credentials and PII from reasoning traces before they reach the local filesystem.
- **Multi-Cloud Resilience**: The **Cloud Broker** provides automated failover and hedging across Vertex AI, Bedrock, and Azure to mitigate provider-side denial-of-service or outages.
- **Audit Non-Repudiation** — DESIGNED, NOT ACTIVE, and the name is wrong twice over. The finalizer
  `bin/governance/ztai-archiver.js` exists but has **no caller outside tests**, and
  `.planning/audit-archive/` contains only `.gitkeep` — nothing has ever been archived. Its field
  is also misnamed: `ztai-archiver.js:57` sets `merkleRoot: cumulativeHash`, which is a LINEAR
  chain hash, not a Merkle root — there is no hash tree and no inclusion proof. What IS real is
  the hash chain below; see the guarantees and the one documented gap there.
- **See also:** [ZTAI Overview](./ZTAI-OVERVIEW.md) — read its status banner first; most of it is design, not shipped behaviour.

## Known security model limitations

See `docs/security/threat-model.md` for the full threat model.

Key acknowledged limitations:
1. Plugin permission model is advisory (not OS-enforced) — see TA7 in threat model.
2. The SSE event stream is localhost-only but any local process can connect — see TA6.
3. Cryptographic identity is local-first; remote anchor validation is a planned v4.5 feature.
4. Agent instruction injection via SKILL.md requires review beyond pattern matching — see TA1.

*Note: The previous limitation on approver identity (TA5) has been mitigated by the ZTAI DID-based signing model in v4.2.*

These are known trade-offs, not bugs. They are documented in ADR-020.
