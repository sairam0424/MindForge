# MindForge — Security Policy

## Supported versions

| Version | Security support |
|---|---|
| 1.x.x | ✅ Active — patches released for all severity levels |
| 0.6.x | ⚠️  Limited — critical fixes only, 90 days from v1.0.0 release |
| < 0.6.0 | ❌ No support |

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

## Known security model limitations

See `docs/security/threat-model.md` for the full threat model.

Key acknowledged limitations:
1. Plugin permission model is advisory (not OS-enforced) — see TA7 in threat model
2. The SSE event stream is localhost-only but any local process can connect — see TA6
3. Approver identity uses `git config user.email` which is user-controlled — see TA5
4. Agent instruction injection via SKILL.md requires review beyond pattern matching — see TA1

These are known trade-offs, not bugs. They are documented in ADR-020.
