---
description: "Design message queue topology and broker selection. Usage - /mindforge:queue [domain] [--broker kafka|rabbitmq|sqs] [--pattern fanout|topic|p2p]"
---

<objective>
Design a message queue topology that selects the right broker for the workload,
configures routing patterns for decoupled communication, implements dead-letter
handling for poison messages, and provides observability into queue depth,
consumer throughput, and delivery guarantees.
</objective>

<execution_context>
@.mindforge/skills/queue-design/SKILL.md
</execution_context>

<context>
$ARGUMENTS
</context>

<process>
1. Identify messaging needs by analyzing the domain: message volume (msgs/sec), payload size, ordering requirements, delivery guarantee (at-most-once, at-least-once, exactly-once), and retention period. Classify as command (point-to-point) or event (broadcast).
2. Select broker based on --broker flag or requirements: Kafka for high-throughput ordered event streams with replay, RabbitMQ for complex routing with flexible patterns and low-latency RPC, SQS for serverless with minimal ops overhead. Document selection rationale.
3. Design topic/queue topology based on --pattern: fanout (all consumers receive all messages), topic (content-based routing with wildcards), point-to-point (single consumer per message). Map domain events to topics/exchanges with clear naming conventions.
4. Configure consumers: competing consumers for horizontal scaling (consumer groups), broadcast consumers for event notification, and exclusive consumers for ordered processing. Set prefetch count and acknowledgment mode.
5. Set TTL and dead-letter queue (DLQ) policies: define message expiration per queue, max delivery attempts before DLQ routing, DLQ retention period, and DLQ monitoring with alerting on depth > 0. Implement DLQ replay tooling.
6. Plan partition strategy (Kafka) or queue sharding (RabbitMQ): partition by entity key for ordering, configure replication factor for durability, set min-ISR for write safety. For SQS, configure visibility timeout and batch size.
7. Configure monitoring and alerting: track queue depth, consumer lag, publish/consume rates, unacknowledged messages, and DLQ depth. Set alerts on queue depth exceeding 10x normal and consumer lag exceeding processing SLA.
8. Document message schemas: define payload contracts (JSON Schema or Avro), versioning strategy (envelope with schema_version field), backward/forward compatibility rules, and schema registry integration.
9. Design retry and error handling: exponential backoff with jitter for transient failures, circuit breaker for downstream unavailability, poison message detection (fail count > threshold), and manual intervention workflow for unprocessable messages.
10. Log queue design decision in AUDIT with: domain, broker, pattern, throughput target, delivery guarantee, DLQ policy, and partition count.
</process>
