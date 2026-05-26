---
description: Design secrets rotation strategy with zero-downtime. Usage - /mindforge:secrets [--store vault|aws-sm|gcp-sm] [--schedule 90d] [--ephemeral]
---

<objective>
Design a secrets management and rotation strategy that achieves zero-downtime
credential rotation, minimizes blast radius of compromise, and provides
auditable access trails. Covers automated rotation, dual-key periods, and
emergency procedures.
</objective>

<execution_context>
@.mindforge/skills/secrets-rotation/SKILL.md
</execution_context>

<context>
$ARGUMENTS
</context>

<process>
1. Inventory all secrets across the system: database credentials, API keys, TLS certificates, encryption keys, OAuth client secrets, webhook signing keys. Classify each by type and rotation complexity.
2. Classify secrets by sensitivity tier: Tier 1 (critical — DB root, encryption master key, 30-day rotation), Tier 2 (standard — API keys, service accounts, 90-day rotation), Tier 3 (low — webhook secrets, 180-day rotation).
3. Design rotation schedule based on --schedule flag and tier classification. Stagger rotations to avoid cascading changes. Account for certificate lead time (renew 30 days before expiry).
4. Implement dual-key period for zero-downtime rotation: new key is created and distributed, both old and new keys are valid simultaneously (overlap window), old key is revoked only after all consumers confirm new key works.
5. Configure automated rotation using the secret store's native rotation (AWS SM Lambda rotator, Vault dynamic secrets, GCP SM rotation schedules). For stores without native rotation, implement a rotation controller service.
6. Verify zero-downtime during rotation: test that services accept both old and new credentials during overlap, test that services recover gracefully when old credential is revoked, run rotation in staging before production.
7. Set up alerting for rotation failures: rotation lambda errors, secrets approaching expiry without rotation, services still using old credentials after overlap window, and unauthorized access attempts.
8. Document emergency rotation procedure: steps to immediately rotate a compromised secret, blast radius assessment checklist, communication template, and post-incident review process.
9. If --ephemeral flag is set, design short-lived credentials: Vault dynamic secrets (TTL 1h), AWS STS assume-role (session tokens), or service mesh mTLS with short-lived certs (24h). Eliminates rotation entirely.
10. Log secrets invocation in AUDIT with: store, schedule, secret count inventoried, ephemeral mode, rotation automation coverage percentage.
</process>
