---
description: Design idempotency patterns for a service or API. Usage - /mindforge:idempotent [endpoint] [--key-strategy client|server] [--store redis|db]
---

<objective>
Design idempotency patterns that ensure repeated requests produce the same
result without side effects, selecting the appropriate key strategy and storage
backend, handling concurrent duplicate submissions safely, and providing
clear retry semantics to API consumers.
</objective>

<execution_context>
@.mindforge/skills/idempotency-patterns/SKILL.md
</execution_context>

<context>
$ARGUMENTS
</context>

<process>
1. Identify non-idempotent operations in the service: POST endpoints that create resources, payment processing, email/notification sending, external API calls with side effects, and state machine transitions. Classify by impact of duplicate execution (financial, data integrity, user experience).
2. Choose key strategy based on --key-strategy flag: client-generated UUID (client sends Idempotency-Key header, best for payment APIs), or server-derived key (hash of request body + user + endpoint, best for implicit deduplication). Document key format and uniqueness guarantees.
3. Select storage backend based on --store flag: Redis for ephemeral keys with auto-expiration (ideal for APIs with short retry windows), database for permanent records (required for financial operations with audit trail). Consider hybrid: Redis for fast lookup + DB for permanent record.
4. Implement the check-execute-store pattern: (1) receive request with idempotency key, (2) check if key exists in store, (3) if exists return stored response, (4) if not acquire lock, (5) execute operation, (6) store response with key, (7) release lock, (8) return response.
5. Set TTL for idempotency keys based on retry window: 24 hours for payment APIs, 1 hour for general mutations, 5 minutes for high-volume low-risk operations. Document TTL in API documentation so clients know the safe retry window.
6. Handle concurrent requests with the same key: implement distributed locking (Redis SETNX or database advisory lock), return 409 Conflict if lock is held, or implement optimistic locking with compare-and-swap. Ensure lock has a timeout to prevent deadlocks.
7. Design response storage: store full HTTP response (status code, headers, body) for exact replay, include metadata (created_at, expires_at, request_hash), and handle response size limits (compress if > 1MB, reject if > 10MB).
8. Test with duplicate submissions: verify same response returned for duplicate key, verify no duplicate side effects (double charge, double email), verify concurrent duplicates resolve safely, and verify expired keys allow re-execution.
9. Document retry safety in API contract: specify which endpoints are idempotent, required headers (Idempotency-Key format), safe retry window (TTL), and error responses for key conflicts (409) and expired keys (410 Gone).
10. Log idempotency design in AUDIT with: endpoint, key strategy, storage backend, TTL, concurrent handling approach, and retry semantics.
</process>
