---
description: Design event-driven message flow with ordering and delivery guarantees. Usage - /mindforge:events [domain] [--broker kafka|rabbitmq|sqs] [--guarantee at-least-once]
---

<objective>
Design an event-driven architecture with explicit ordering guarantees, delivery
semantics, and failure handling. Covers event schema design, partitioning
strategy, consumer idempotency, and dead letter handling.
</objective>

<execution_context>
@.mindforge/skills/event-driven-architecture/SKILL.md
</execution_context>

<context>
$ARGUMENTS
</context>

<process>
1. Identify domain events by analyzing state transitions and side effects. Name events in past tense (OrderPlaced, PaymentProcessed). Map event flows between bounded contexts.
2. Design event schemas using Avro or Protobuf with a schema registry. Include metadata envelope (event_id, timestamp, correlation_id, causation_id, schema_version). Plan for schema evolution (backward/forward compatibility).
3. Configure partitioning strategy using entity ID as partition key to guarantee ordering within an entity (e.g., all events for order-123 go to same partition). Calculate partition count based on throughput needs.
4. Set delivery guarantees based on --guarantee flag: at-least-once (default, requires idempotent consumers), at-most-once (fire-and-forget, acceptable loss), or exactly-once (transactional outbox + idempotent consumer).
5. Implement idempotent consumers using deduplication strategies: idempotency key table (event_id + consumer_id), natural idempotency (SET operations), or conditional writes (optimistic locking with version).
6. Configure dead letter topics/queues for messages that fail after max retries. Set up alerting on DLQ depth, implement DLQ replay tooling, and define manual review workflow for poison messages.
7. Build an event catalog documenting every event type: schema, producer, consumers, SLA (max processing latency), retention period, and example payloads. Keep catalog as code alongside schemas.
8. Set up monitoring: consumer lag (how far behind real-time), processing latency (event age at consumption), error rate per consumer group, and partition skew detection.
9. Design the transactional outbox pattern for reliable event publishing: write event to outbox table in same transaction as state change, poll/CDC outbox to broker, mark as published.
10. Log events invocation in AUDIT with: domain, broker, guarantee level, event count, partition strategy.
</process>
