---
name: cqrs-event-sourcing
version: 1.0.0
min_mindforge_version: 10.0.6
status: stable
triggers: cqrs, event sourcing, command query separation, event store, projection, eventual consistency, event replay, aggregate root, domain event, event versioning, read model, write model
---

# Skill — CQRS & Event Sourcing

## When this skill activates
Any task involving command/query responsibility segregation, event sourcing, event store
design, projection building, or systems requiring full audit trails and temporal queries.

## Mandatory actions when this skill is active

### Before

1. **Validate the need** — Confirm at least one: full audit trail required, temporal queries needed, complex domain with many read views, or high read/write asymmetry.
2. **Identify aggregates** — Define aggregate roots as consistency boundaries. Each aggregate emits domain events and enforces invariants.
3. **Map read vs write models** — Document which queries need optimized read models separate from the event stream.

### During

#### Command side (write model)
- Commands are imperative ("PlaceOrder", "CancelShipment")
- Command handler validates invariants then emits domain events
- State is NEVER set directly — it is derived by applying events
- Aggregate enforces business rules before accepting the command

#### Event store design
```sql
CREATE TABLE events (
  event_id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  aggregate_id    UUID NOT NULL,
  aggregate_type  VARCHAR(100) NOT NULL,
  event_type      VARCHAR(100) NOT NULL,
  event_version   INTEGER NOT NULL,
  sequence_number BIGINT NOT NULL,
  payload         JSONB NOT NULL,
  metadata        JSONB NOT NULL,  -- correlation_id, causation_id, actor
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (aggregate_id, sequence_number)
);
```
- Events are immutable — never update or delete
- Optimistic concurrency via expected sequence number on write
- Event names are past tense: `OrderPlaced`, `PaymentCharged`
- Store both payload and metadata (correlation ID, causation ID, actor)

#### Projections (read models)
- Each projection materializes a read-optimized view from the event stream
- Projections are independently rebuildable (replay from event 0)
- Use checkpointing: store last processed event position
- Different projections can use different databases (SQL, Elasticsearch, Redis)
- Mark as "rebuilding" during replay to avoid serving stale data

#### Eventual consistency patterns
- Causal consistency: return event sequence number from command, poll until projection catches up
- Read-your-writes: optimistically update client state after command succeeds
- Subscription-based: clients subscribe to projection update notifications

#### Snapshot strategy
- Avoid replaying entire history for long-lived aggregates
- Load latest snapshot + events after snapshot sequence number
- Snapshot frequency: every 50-100 events per aggregate
- Snapshots are optimization only — system must work without them

#### Event versioning and upcasting
- Never modify existing event schemas in-place
- Add optional fields (backward-compatible) or create new event type
- Upcasters transform old events to current schema during replay
- Store schema version with every event for routing to correct upcaster

#### Idempotent handlers
- Every projection/handler must be safe to process the same event twice
- Deduplicate by event_id before processing
- Record checkpoint after successful processing

### After

1. **Verify event completeness** — Every state change captured as a domain event. No silent mutations.
2. **Test replay** — Rebuild one projection from scratch; confirm data integrity.
3. **Validate idempotency** — Process same event twice, confirm no side effects.
4. **Check consistency boundaries** — Each aggregate enforces invariants independently.

## Self-check before task completion
- [ ] All state changes expressed as immutable domain events
- [ ] Event store uses optimistic concurrency (sequence number)
- [ ] Projections independently rebuildable from event stream
- [ ] Event handlers are idempotent (safe to replay)
- [ ] Snapshot strategy defined for long-lived aggregates
- [ ] Event versioning/upcasting handles schema evolution
- [ ] Eventual consistency communicated to client layer
- [ ] Correlation and causation IDs propagated through event chain
