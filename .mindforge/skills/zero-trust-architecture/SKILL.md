---
name: zero-trust-architecture
version: 1.0.0
min_mindforge_version: 10.1.1
status: stable
triggers: zero trust architecture, never trust always verify, micro-segmentation, identity-aware proxy, continuous verification, zero trust network, BeyondCorp, least privilege access, device posture, zero trust identity, mTLS everywhere, zero trust perimeter
compose: auth-patterns
---

# Skill — Zero Trust Architecture

## When this skill activates
Any task involving network security architecture where traditional perimeter-based
security is being replaced or augmented by identity-centric, continuous verification
models. Includes mTLS implementation, micro-segmentation, identity-aware proxies,
and BeyondCorp-style access patterns.

## Mandatory actions when this skill is active

### Before writing any code
1. Inventory all communication flows (service-to-service, user-to-service, external).
2. Define identity model (who/what can talk to whom under what conditions).
3. Map trust boundaries — there are no trusted zones, only verified identities.
4. Determine device posture requirements for user-facing access.

### During implementation
- Authenticate every request regardless of network origin.
- Implement mTLS for all service-to-service communication.
- Apply least privilege — grant minimum permissions needed, no more.
- Never trust network location as a security signal.
- Pass identity claims downstream (not just "authenticated: yes").
- Re-verify identity on privilege escalation or sensitive operations.
- Log all access decisions for audit.

### After implementation
- Verify default-deny is enforced (no open paths by accident).
- Test that compromising one service doesn't grant lateral movement.
- Confirm certificate rotation works automatically.
- Validate device posture checks block non-compliant devices.
- Audit that all flows are identity-verified.

## Core Principles

### The Three Pillars
1. **Never trust, always verify** — Every request is treated as if from an open network.
2. **Least privilege access** — Grant minimum permissions, scope tightly, time-bound when possible.
3. **Assume breach** — Design as if attackers are already inside. Limit blast radius.

### Trust Signals (Combined, Not Individual)
- Identity (who is this? verified cryptographically).
- Device (is this device healthy? patched? managed?).
- Context (where, when, what resource, what action?).
- Risk score (is this behavior anomalous?).

## Identity-Aware Proxy

### Pattern
```
User → Identity-Aware Proxy → Authenticate → Check Policy → Backend Service
                                    ↓
                            [Identity Provider]
                            [Policy Engine]
                            [Device Trust Store]
```

### Implementation
- Proxy sits at the edge (or service mesh ingress).
- Authenticates user via OIDC/SAML.
- Checks policy engine for authorization.
- Injects verified identity headers to backend.
- Backend trusts proxy-injected headers (not user-supplied).

### Tools
- Google IAP, Cloudflare Access, Ory Oathkeeper, Pomerium.

## Mutual TLS (mTLS)

### Why
- Encrypts traffic between services (confidentiality).
- Cryptographically verifies both client and server identity (authentication).
- Prevents unauthorized services from communicating.

### Implementation
- Use service mesh (Istio, Linkerd) for automatic mTLS.
- Rotate certificates automatically (short-lived: 24h recommended).
- Use SPIFFE/SPIRE for workload identity.
- Never disable mTLS verification in production.

### Certificate Management
- Auto-issue via cert-manager or service mesh CA.
- Short-lived certificates (hours, not years).
- Automated rotation with zero downtime.
- Certificate revocation for compromised services.

## Micro-Segmentation

### Approach
1. Start with default-deny between all services.
2. Declare allowed communication flows explicitly.
3. Enforce at network layer (NetworkPolicy) AND application layer (authz).
4. Segment by sensitivity level (PII services isolated from general services).

### Example Policy
```yaml
# Only payment-service can talk to payment-db
source: payment-service
destination: payment-db
port: 5432
action: ALLOW

# Everything else to payment-db
source: *
destination: payment-db
action: DENY
```

## Device Posture

### Checks Before Granting Access
- OS version current (within N patches).
- Disk encryption enabled.
- Firewall active.
- No known malware detected.
- MDM-managed (for corporate devices).
- Screen lock enabled.

### Degraded Access
- Non-compliant device → read-only access or blocked entirely.
- Unknown device → step-up authentication required.
- Jailbroken/rooted → zero access to sensitive resources.

## Continuous Verification

### Re-verify When
- Session exceeds time threshold (e.g., every 1 hour).
- User requests privilege escalation.
- Anomalous behavior detected (impossible travel, unusual time).
- Accessing higher-sensitivity resource than current level.
- Device posture changes mid-session.

### Risk-Based Response
- Low risk → continue session.
- Medium risk → step-up auth (MFA prompt).
- High risk → terminate session, require full re-authentication.

## BeyondCorp Model

### Key Differences from VPN
| Traditional VPN | BeyondCorp (Zero Trust) |
|----------------|------------------------|
| VPN = trusted zone | No trusted zone exists |
| Once in, full access | Every request verified |
| Network location = trust | Identity + device + context = trust |
| Perimeter defense | Defense in depth everywhere |
| Hard outside, soft inside | Uniformly hardened |

## Self-check
- [ ] All service-to-service communication uses mTLS.
- [ ] Default-deny network policy in place.
- [ ] Identity verified on every request (not just at edge).
- [ ] Least privilege enforced (no over-permissioned service accounts).
- [ ] Device posture checked for user access.
- [ ] Continuous verification triggers defined.
- [ ] Certificate rotation is automatic and tested.
- [ ] Lateral movement prevented (compromise one service != access to others).
- [ ] All access decisions logged for audit.
