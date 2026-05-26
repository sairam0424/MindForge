---
name: secrets-rotation
version: 1.0.0
min_mindforge_version: 0.1.0
status: stable
compose: security-review
triggers: secrets rotation, automated rotation, zero downtime rollover, vault pattern, ephemeral credentials, lease management, key rotation, credential lifecycle, rotation schedule, secret versioning, rotation verification, dual key period
---

# Skill — Secrets Rotation

## When this skill activates
Any task involving secrets rotation implementation, credential lifecycle
management, zero-downtime key rollover, or Vault/secrets manager configuration.

## Mandatory actions when this skill is active

### Before writing any code
1. Inventory all secrets that need rotation (API keys, DB creds, tokens).
2. Define the rotation schedule based on secret sensitivity.
3. Design the dual-key period for zero-downtime rollover.

### During implementation
- Implement dual-key period (new key active, old key valid during grace period).
- Ensure applications read "current" version pointer, not hardcoded versions.
- Add rotation verification (test new cred works, verify old cred rejected after grace).

### After implementation
- Set up automated rotation on schedule.
- Add alerts for rotation failures.
- Document rotation procedures in ARCHITECTURE.md (for manual emergency rotation).

## Dual-Key Period (Zero-Downtime Rollover)

### Pattern
```
Time 0:    key_v1 = active, key_v2 = not yet created
Time 1:    key_v2 = created, key_v1 = still active (grace period starts)
Time 2:    key_v2 = active (apps switch), key_v1 = still valid (grace)
Time 3:    key_v1 = revoked (grace period ends)
```

### Why Dual-Key
- Applications may cache the old key.
- Distributed systems need time to propagate the new key.
- Rolling deployments mean some instances have new key, some have old.
- Grace period ensures no request fails during transition.

### Grace Period Duration
| Secret Type | Grace Period | Rationale |
|------------|-------------|-----------|
| API keys (external) | 24 hours | Client applications need time to update |
| Database credentials | 1 hour | Internal, fast propagation |
| JWT signing keys | 2x token lifetime | Existing tokens must remain valid |
| TLS certificates | 24 hours | DNS/CDN propagation time |

## Automated Rotation

### HashiCorp Vault Dynamic Secrets
- Vault generates credentials on demand.
- Credentials have TTL (lease), auto-expire.
- No manual rotation needed — secrets are ephemeral.
- Revocation: revoke lease, credential immediately invalid.

### AWS Secrets Manager Rotation
- Lambda function triggered on rotation schedule.
- Creates new credential, tests it, updates "current" pointer.
- Previous version remains valid during staging period.
- Automatic rollback if new credential fails validation.

### Custom Rotation Script Pattern
```
1. Generate new credential
2. Store as "pending" version
3. Test "pending" credential works (connect, query, etc.)
4. Promote "pending" to "current"
5. Demote old "current" to "previous" (grace period)
6. After grace period: delete "previous"
7. Alert on any failure at any step
```

## Zero-Downtime Application Pattern

### Application Reads "Current" Pointer
```
Application → Secrets Manager → "current" version → actual credential
```

- Application never stores credential — fetches on each use (with cache TTL).
- On rotation: "current" pointer updated atomically.
- Application's next fetch gets new credential automatically.
- Cache TTL should be shorter than grace period.

### Connection Pool Refresh
- After rotation: drain old connections, create new with new credential.
- Graceful: new connections use new cred, old connections finish naturally.
- Timeout: force-close old connections after grace period.

## Ephemeral Credentials

### Concept
- Short-lived credentials that auto-expire (minutes to hours).
- No rotation needed — credential dies before it could be compromised.
- Vault dynamic secrets, AWS STS temporary credentials, K8s service account tokens.

### When to Use Ephemeral
- Service-to-service communication.
- CI/CD pipeline credentials.
- Developer access to production systems.
- Any scenario where rotation overhead is high.

### When NOT to Use Ephemeral
- External integrations that can't handle credential refresh.
- Embedded devices with limited connectivity.
- Systems where credential fetch latency is unacceptable.

## Rotation Schedule

| Secret Type | Rotation Frequency | Rationale |
|------------|-------------------|-----------|
| Database passwords | 90 days | Balance security vs operational risk |
| API keys (internal) | 30 days | Higher rotation, lower blast radius |
| API keys (external) | 90-180 days | Coordination with partners needed |
| JWT signing keys | 90 days | Must outlive longest token lifetime |
| TLS certificates | 60 days (Let's Encrypt auto) | Short-lived, automated |
| Encryption keys | 365 days | Key material rarely exposed |
| Compromised secrets | IMMEDIATELY | Zero tolerance for known compromise |

## Rotation Verification

### Post-Rotation Checks
1. **New credential works**: attempt connection/API call with new credential.
2. **Old credential rejected** (after grace): verify old credential fails.
3. **Application health**: check error rates didn't spike during rotation.
4. **Audit log**: verify rotation event logged with timestamp and actor.

### Failure Handling
- If new credential fails validation: abort, keep old credential, alert.
- If application errors spike after rotation: rollback (reactivate old credential).
- Never delete old credential until verified that new credential works everywhere.

## Secret Versioning

### Version Metadata
```json
{
  "secret_id": "db-prod-password",
  "version": 7,
  "created_at": "2024-01-15T10:30:00Z",
  "expires_at": "2024-04-15T10:30:00Z",
  "status": "current",
  "rotated_by": "automated-rotation-lambda",
  "previous_version": 6
}
```

### Version States
- **pending**: newly created, being validated.
- **current**: active version, used by applications.
- **previous**: grace period, still valid but deprecated.
- **revoked**: expired/rotated out, no longer valid.

## Self-check before task completion

Before marking a task done when this skill was active:

- [ ] Did I read the full SKILL.md before starting? (Not just the triggers)
- [ ] Is dual-key period implemented (no downtime during rotation)?
- [ ] Does the application read "current" pointer (not hardcoded version)?
- [ ] Is rotation verification implemented (new works, old eventually rejected)?
- [ ] Is automated rotation on schedule (not manual)?
- [ ] Are alerts configured for rotation failures?
- [ ] Is emergency manual rotation procedure documented?
