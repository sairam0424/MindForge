# MindForge Governance Guide

Earlier versions of this page described "Pillar XI: Post-Quantum Agentic Security," ZK-proof
compliance bypasses, biometric/executive approval, and a list of specific "Enterprise Policies"
(`gate_tier_3_engine`, `protect_sre_namespace`, `enforce_blast_radius`, `require_sli_verification`).
None of the fabricated policy IDs exist in `.mindforge/config.json` or anywhere in
`bin/governance/`, and the post-quantum/ZK/biometric claims are explicitly self-labeled SIMULATED
in the modules that would implement them. This page now describes what's actually there.

## 1. Tiered enforcement

`bin/governance/policy-engine.js` evaluates every governed action against a tier:

| Tier | Role | Enforcement |
|---|---|---|
| 0 — Informational | Research/query only | Read-only |
| 1 — Implementation | Standard feature work | Write access, session-scoped limits |
| 2 — Specialized | Security/ops-adjacent work | Higher-risk-cap access |
| 3 — Principal | Architecturally significant changes | Requires a Tier-3 attestation -- real Ed25519 signing, but the enclave/key storage backing it is in-process simulation, not hardware-isolated (see SECURITY.md's Tier-3 Trust section) -- or an explicit bypass with `reasoning_proof` |

## 2. Blast-radius scoring

`bin/governance/impact-analyzer.js` computes a real 0-100 risk score from factors including:

- **Architectural influence** — high-influence paths (`bin/governance/*`, `bin/engine/*`,
  `package.json`, `.planning/*`) weight the score up.
- **Sensitive-namespace protection** — mission-critical directories (`.mindforge/`, `bin/`,
  `.agent/`, `bin/sre/`) carry a stricter multiplier.
- **Session entropy** — the score rises the more files a single session touches past a threshold,
  to catch mass-corruption patterns.
- **Goal-to-path alignment** — a penalty applies when a task's stated goal doesn't match the files
  it's touching (e.g. a "fix the UI" task editing `bin/models/`).

Scores above a configured critical threshold are denied by default; a Tier-3 identity can bypass
with a cryptographically-verified proof (`quantum-crypto.verifyZKProof` — despite the name, this
checks a real signature, not an actual zero-knowledge proof; see caveat below).

## 3. Audit trail

Every evaluation is recorded to `.planning/RISK-AUDIT.jsonl` (`requestId`, `impactScore`,
`verdict`, `reason`). This sits alongside the canonical `.planning/AUDIT.jsonl` hash chain
(`bin/governance/audit-hash.js`, verifiable via `node bin/verify-audit.js`) — the two are separate
logs for separate purposes and are not both continuously hash-verified by the same tool today.

## 4. What's simulated, not enforced

Be direct about this rather than silent:

- **Post-quantum signing** (`bin/governance/quantum-crypto.js`) is explicitly SIMULATED lattice
  crypto, gated behind an `experimental.pqc_demo` flag that defaults off. It is not a production
  trust boundary.
- **Zero-Trust Agentic Identity Tier-3** hardware attestation is in-process/simulated
  (`SECURITY_TIER_3_SIMULATED` in `bin/governance/ztai-manager.js`) unless you've wired a real
  attestation provider yourself.
- **RBAC** (`bin/governance/rbac-manager.js`) is fully implemented and unit-tested but has zero
  production callers as of this writing — it is not currently enforcing anything at runtime.

If your use case needs any of the above as a hard guarantee, verify it against the current source
before relying on it — this page will be wrong again the moment the code changes, the same way it
was wrong before this pass.
