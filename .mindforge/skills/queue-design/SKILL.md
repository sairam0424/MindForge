---
name: queue-design
version: 1.0.0
min_mindforge_version: 10.0.9
status: stable
triggers: queue design, message broker selection, kafka vs rabbitmq, queue topology, consumer pattern, message TTL, priority queue, dead letter queue design, queue partitioning, message ordering queue, queue scaling, broker architecture
compose: event-driven-architecture
---

# Skill — Queue Design

## When this skill activates
Any task involving message broker selection, queue topology, consumer patterns,
TTL policies, priority queues, dead letter queues, or partition strategies.

## Mandatory actions when this skill is active

### Before writing any code
1. Identify throughput requirements (messages/sec peak and sustained).
2. Determine ordering and delivery guarantee requirements.
3. Select broker based on the decision matrix.

### During implementation
- Configure DLQ for every consumer with retry limits.
- Set TTL on messages to prevent unbounded queue growth.
- Implement consumer health checks and graceful shutdown.
- Use partition keys for ordering-sensitive flows.

### After implementation
- Set up queue depth monitoring with alerting thresholds.
- Document topology, routing rules, and consumer ownership.
- Verify DLQ workflow (inspect, fix, replay, discard).

## Broker Selection

| Broker | Strength | Ordering | Use For |
|--------|----------|----------|---------|
| Kafka | Extreme throughput, replay, retention | Per-partition | Event sourcing, stream processing, audit logs |
| RabbitMQ | Flexible routing, per-message ack | Per-queue FIFO | Task queues, RPC, complex routing |
| SQS | Zero ops, infinite scale, built-in DLQ | FIFO queues (limited) | Decoupling services, background jobs |

## Queue Topologies

- **Point-to-Point**: one queue, competing consumers. Each message consumed once.
- **Fan-Out**: one message to multiple queues/groups. Use for event broadcasting.
- **Topic-Based**: route by pattern matching. Use for selective subscription.

## Consumer Patterns

- **Competing Consumers**: multiple instances share workload, scale by adding consumers.
- **Exclusive Consumer**: one active at a time, failover pattern for ordered processing.

## TTL and Expiration
- Queue-level TTL: all messages expire after N seconds if unconsumed.
- Per-message TTL: individual expiration. Typical: notifications 5min, business 24h, audit 7d.
- Expired messages route to DLQ or silently drop (configure explicitly).

## Priority Queues
- Limited levels (1-10 max, typically 3: high/normal/low).
- Risk: starvation of low-priority. Mitigate with aging or separate queues.

## Dead Letter Queue Design

```
message → consumer → FAIL → retry (3x exponential) → FAIL → DLQ → alert
```

- Retain original body, headers, error details, retry count.
- Alert on first DLQ arrival. Never auto-replay without root-cause fix.
- Replay tool moves DLQ → original queue in small monitored batches.

## Partition Strategies
- Partition key = entity ID ensures per-entity ordering.
- Start with 2x expected consumer count as partition count.
- Monitor for hot partitions (skewed key distribution).

## Self-check before task completion

- [ ] Is the right broker selected for throughput and routing needs?
- [ ] Are DLQs configured with alerting for every consumer?
- [ ] Is TTL set to prevent unbounded growth?
- [ ] Are ordering guarantees maintained where business logic requires?
- [ ] Is the consumer pattern correct (competing vs exclusive)?
- [ ] Are queue depth and consumer lag monitored?
- [ ] Is the DLQ replay workflow documented?
