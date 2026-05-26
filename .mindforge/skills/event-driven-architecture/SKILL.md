---
name: event-driven-architecture
version: 1.0.0
min_mindforge_version: 0.1.0
status: stable
triggers: event driven architecture, event bus, pub sub pattern, event schema design, ordering guarantee, exactly once delivery, dead letter topic, event sourcing integration, event catalog, event versioning strategy, event replay strategy, event consumer group
---

# Skill — Event-Driven Architecture

## When this skill activates
Any task involving event bus design, pub/sub patterns, message ordering,
delivery guarantees, dead letter handling, or event schema evolution.

## Mandatory actions when this skill is active

### Before writing any code
1. Classify event types (domain, integration, or command events).
2. Define delivery guarantees required for each event stream.
3. Design the event schema with forward/backward compatibility in mind.

### During implementation
- Make all consumers idempotent (safe to process same event multiple times).
- Implement dead letter topic handling with alerting.
- Use partition keys to maintain ordering where required.

### After implementation
- Register events in the event catalog with schema and owner.
- Add consumer lag monitoring.
- Document retry and failure handling in ARCHITECTURE.md.

## Event Types

### Domain Events
- Facts about what happened in a bounded context.
- Named in past tense: `OrderPlaced`, `PaymentProcessed`, `UserRegistered`.
- Owned by the producing domain — consumers must adapt.
- Immutable once published.

### Integration Events
- Cross-boundary communication between services.
- May be transformed from domain events (different schema, less detail).
- Published on shared event bus (Kafka, SNS, EventBridge).

### Command Events
- Request for action (not a fact).
- Named as imperative: `ProcessPayment`, `SendNotification`.
- Exactly one consumer expected to handle.
- Requires acknowledgment/response.

## Delivery Guarantees

### At-Most-Once
- Fire and forget. No retries.
- Use for: metrics, analytics, non-critical notifications.
- Risk: message loss on failure.

### At-Least-Once (Recommended Default)
- Retry until acknowledged.
- Consumers MUST be idempotent.
- Use for: most business events.
- Risk: duplicate processing (mitigated by idempotency).

### Exactly-Once (Expensive)
- Requires transactional outbox + deduplication.
- Use for: financial transactions, inventory changes.
- Implementation: idempotency key + processed event log.

## Ordering Guarantees

### Per-Partition Ordering
- Events with the same partition key are ordered.
- Partition key = entity ID (e.g., order_id, user_id).
- Different entities may be processed out of order (acceptable).

### Global Ordering
- Extremely expensive — single partition = no parallelism.
- Almost never needed — design around per-entity ordering instead.

### Kafka Partition Key Design
```
topic: order-events
partition_key: order_id
result: all events for order-123 arrive in sequence
```

## Schema Evolution

### Compatibility Modes (Avro/Protobuf)
- **Backward compatible**: new schema can read old data (add optional fields).
- **Forward compatible**: old schema can read new data (ignore unknown fields).
- **Full compatible**: both directions (safest, most restrictive).

### Rules for Safe Evolution
- Adding optional fields: always safe.
- Removing fields: only if no consumers depend on them.
- Renaming fields: treat as remove + add (breaking).
- Changing field types: always breaking.

### Schema Registry
- Central registry of all event schemas with version history.
- Validates compatibility before allowing schema updates.
- Consumers reference schema by ID (embedded in message header).

## Consumer Groups

### Competing Consumers (Scaling Pattern)
- Multiple instances in same group share the load.
- Each message processed by exactly one instance.
- Use for: order processing, notification sending.
- Scale by adding more consumers (up to partition count).

### Broadcasting (Fan-Out Pattern)
- Each consumer group gets every message.
- Use for: audit logging, cache invalidation, analytics.
- Different groups process independently at their own pace.

## Dead Letter Topics (DLT)

### Flow
```
message → consumer → FAIL → retry (3x with backoff) → FAIL → DLT → alert
```

### Requirements
- Every consumer MUST have a DLT configured.
- DLT messages retain full context (original message + error + attempt count).
- Alert on first DLT message (don't silently accumulate).
- Manual resolution workflow: inspect → fix → replay or discard.

### Retry Strategy
- Attempt 1: immediate.
- Attempt 2: 1 second delay.
- Attempt 3: 10 second delay.
- After 3 failures: route to DLT.

## Event Catalog

Every event in the system must be registered:

| Field | Description |
|-------|-------------|
| Event name | `OrderPlaced` |
| Schema version | `v3` |
| Owner (team) | Order Service team |
| Producers | order-service |
| Consumers | notification-svc, analytics-svc, fulfillment-svc |
| Partition key | order_id |
| Delivery guarantee | at-least-once |
| Retention | 7 days |

## Self-check before task completion

Before marking a task done when this skill was active:

- [ ] Did I read the full SKILL.md before starting? (Not just the triggers)
- [ ] Are all consumers idempotent?
- [ ] Is ordering guaranteed per entity via partition keys?
- [ ] Is dead letter topic configured with alerting?
- [ ] Are event schemas registered in the catalog?
- [ ] Is schema evolution backward-compatible?
- [ ] Are consumer groups configured correctly (competing vs broadcasting)?
