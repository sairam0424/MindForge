---
name: idempotency-patterns
version: 1.0.0
min_mindforge_version: 10.0.9
status: stable
triggers: idempotency pattern, idempotency key, exactly once semantic, deduplication strategy, replay safety, idempotent consumer, idempotent api, request deduplication, operation retry safety, duplicate detection, idempotent write, at-most-once processing
---

# Skill — Idempotency Patterns

## When this skill activates
Any task involving idempotent API design, idempotency keys, exactly-once semantics,
deduplication, replay safety, or retry-safe operations.

## Mandatory actions when this skill is active

### Before writing any code
1. Identify which operations MUST be idempotent (any retryable operation).
2. Determine key strategy (client-generated UUID in header).
3. Choose storage backend (Redis for short-lived, DB for permanent records).

### During implementation
- Accept keys via `Idempotency-Key` header on all POST endpoints.
- Store complete response with the key (status + body, not just success flag).
- Set appropriate TTL on idempotency records.
- Handle concurrent duplicates (lock or 409 Conflict).

### After implementation
- Test concurrent duplicate requests (race condition safety).
- Verify partial failures are NOT cached (only complete operations).
- Document which endpoints are idempotent and key requirements.

## Core Flow

```
1. Receive request with Idempotency-Key
2. Key exists in store? → YES: return cached response. NO: continue.
3. Lock key (prevent concurrent processing of same key)
4. Execute operation
5. Store: key → {status_code, body, created_at}
6. Release lock, return response
```

## Idempotency Key Design
- Client-generated UUID v4 or ULID. Same key = same intended operation.
- Scope per-endpoint AND per-user: `idempotency:{user}:{endpoint}:{key}`.
- Max length: 255 chars. Stable across retries of same business action.

## Storage Options

- **Redis**: fast, TTL built-in, atomic via Lua. Use for API requests (24h TTL).
- **Database**: durable, queryable. Use for financial/audit operations. Needs cleanup job.

## Database Patterns

- **INSERT ON CONFLICT DO NOTHING**: safe insert, check RETURNING for duplicate.
- **Conditional UPDATE**: `WHERE version = $expected` — 0 rows = stale (reject).
- **Transactional Outbox**: atomically persist state + event, poll and publish.

## Consumer Idempotency
- Dedup table: `processed_events(event_id PK, processed_at)`.
- Flow: check if processed → BEGIN → process → INSERT dedup → COMMIT → ACK.
- TTL: retain dedup records for broker retention + buffer (e.g., 14 days).

## API Design

- **GET/PUT/DELETE**: naturally idempotent (safe to retry without keys).
- **POST/PATCH**: require explicit `Idempotency-Key` header.
- Response headers: `Idempotent-Replayed: true` for cached responses.

## Error Handling
- 4xx client errors: cache (client should not retry same bad input).
- 5xx server errors: do NOT cache (may succeed on retry).
- Partial completion: do NOT cache (delete record, retry from scratch).

## Self-check before task completion

- [ ] Are idempotency keys accepted on all non-idempotent endpoints?
- [ ] Is the complete response cached (status + body)?
- [ ] Are concurrent duplicates handled safely (lock or 409)?
- [ ] Is TTL set appropriately on idempotency records?
- [ ] Are server errors excluded from caching?
- [ ] Are DB writes using conflict-safe patterns?
- [ ] Are message consumers deduplicating by event ID?
