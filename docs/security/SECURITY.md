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

- **Asymmetric Signing**: All high-tier (T1-T3) agent actions are cryptographically signed using Ed25519.
- **Sovereign Reason Enclaves (SRE)**: Tier 3 principal agents execute reasoning in isolated TEE-simulated enclaves, ensuring that high-value architectural decisions and sensitive IP never leak to the persistent log.
- **Trace Sanitization**: In-enclave sanitization automatically redacts credentials and PII from reasoning traces before they reach the local filesystem.
- **Multi-Cloud Resilience**: The **Cloud Broker** provides automated failover and hedging across Vertex AI, Bedrock, and Azure to mitigate provider-side denial-of-service or outages.
- **Audit Non-Repudiation**: The `AUDIT.jsonl` log is finalized with **Merkle-root integrity manifests** to prevent tampering.
- **See also:** [ZTAI Overview](file:///Users/sairamugge/Desktop/MindForge/docs/security/ZTAI-OVERVIEW.md)

## Known security model limitations

See `docs/security/threat-model.md` for the full threat model.

Key acknowledged limitations:
1. Plugin permission model is advisory (not OS-enforced) — see TA7 in threat model.
2. The SSE event stream is localhost-only but any local process can connect — see TA6.
3. Cryptographic identity is local-first; remote anchor validation is a planned v4.5 feature.
4. Agent instruction injection via SKILL.md requires review beyond pattern matching — see TA1.

*Note: The previous limitation on approver identity (TA5) has been mitigated by the ZTAI DID-based signing model in v4.2.*

These are known trade-offs, not bugs. They are documented in ADR-020.
