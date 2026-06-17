---
name: audit-logging
version: 1.0.0
min_mindforge_version: 0.3.0
status: stable
triggers: audit logging, immutable audit trail, audit event, who what when why, retention policy, compliance logging, tamper detection, audit query, audit archival, audit schema, change tracking, audit correlation
---

# Skill — Audit Logging

## When this skill activates
Any task involving audit trails, compliance logging, change tracking, tamper detection,
event recording for accountability, or data retention policies.

## Mandatory actions when this skill is active

### Before implementing audit logging
1. Identify what events must be audited (regulatory + business requirements).
2. Define the retention policy (how long, where stored, who can access).
3. Design the event schema before writing any code.

### Event schema (the 5 Ws)

Every audit event MUST capture:

| Field | Description | Example |
|-------|-------------|---------|
| **who** | user_id, IP address, session_id, service account | `{ userId: "u-123", ip: "10.0.1.5", sessionId: "sess-abc" }` |
| **what** | action performed, resource affected, changes made | `{ action: "update", resource: "user/u-456", changes: { email: { from: "old@x.com", to: "new@x.com" } } }` |
| **when** | UTC timestamp, monotonic sequence number | `{ timestamp: "2025-01-15T10:30:00Z", sequence: 1042 }` |
| **why** | correlation_id, request_id, triggering event | `{ correlationId: "req-789", trigger: "user_request" }` |
| **outcome** | success or failure, error details if failed | `{ status: "success" }` or `{ status: "failure", error: "permission_denied" }` |

### Immutability guarantees

**Append-only storage:**
- Audit table has NO UPDATE or DELETE permissions for application roles.
- Use a dedicated audit service account with INSERT-only grants.
- Application database user must not have ALTER TABLE on audit tables.

**Hash chain for tamper detection:**
```
event.hash = SHA-256(event.data + previous_event.hash)
```
- Each event references the hash of the previous event.
- Broken chain = tampering detected.
- Verify chain integrity on scheduled basis (daily audit job).

**Alternative: immutable storage backends:**
- AWS QLDB (purpose-built immutable ledger).
- Object storage with Object Lock (S3 with WORM).
- Append-only Kafka topic with compaction disabled.

### Retention policy

| Tier | Duration | Storage | Access |
|------|----------|---------|--------|
| Hot | 90 days | Primary database (indexed) | Real-time query |
| Warm | 1 year | Object storage (Parquet/JSON) | Query via data warehouse |
| Cold | 7+ years | Compressed archive (Glacier/equivalent) | Manual retrieval |

**Rules:**
- Define retention per event type (auth events may need longer than UI events).
- Automate tier transitions (cron job moves hot → warm → cold).
- Deletion must be cryptographic (delete encryption key, not data) for compliance.
- Document retention policy in compliance documentation.

### What to audit (mandatory events)

**Authentication:**
- Login success and failure (with failure reason).
- Logout.
- Password change / reset.
- MFA enrollment / removal.
- Session creation and termination.

**Authorization:**
- Permission grants and revocations.
- Role assignments and removals.
- Access denied events.

**Data mutations:**
- Create, update, delete of business entities.
- Bulk operations (with count and scope).
- Data exports and downloads.

**Admin actions:**
- Configuration changes.
- User account management (create, disable, delete).
- System setting modifications.

**Failed access attempts:**
- Rate limit violations.
- Invalid token usage.
- Attempts to access other tenants' data.

### Querying audit logs

**Required indexes:**
- `user_id` — "show me everything user X did."
- `resource_id` — "show me everything that happened to resource Y."
- `timestamp` — "show me events in time range."
- `action` — "show me all delete events."
- `correlation_id` — "show me the full request chain."

**Search capabilities:**
- Full-text search on action descriptions.
- Filter by outcome (success/failure).
- Aggregate by user, resource, or time window.

### Implementation patterns

**Middleware/interceptor approach:**
```
Request → [Auth] → [Audit: log attempt] → Handler → [Audit: log outcome] → Response
```

**Event-driven approach:**
- Domain events trigger audit entries asynchronously.
- Decouples audit from business logic.
- Risk: event loss if queue fails (use durable queue with DLQ).

**Database trigger approach:**
- PostgreSQL triggers capture all changes automatically.
- No application code needed — cannot be bypassed.
- Downside: less context (no user_id unless set in session).

### Anti-patterns

- Logging sensitive data in audit trail (passwords, full credit card numbers).
- Audit log in same table/database as business data (lifecycle coupling).
- Synchronous audit blocking the business transaction.
- No alerting on audit failures (silent data loss).
- Audit logs accessible to the application for modification.

## Self-check before task completion
- [ ] Did I follow the mandatory actions for this skill?
- [ ] Did I apply the patterns appropriate to the context?
- [ ] Did I verify the implementation meets the criteria above?
- [ ] Did I document decisions and trade-offs made?
