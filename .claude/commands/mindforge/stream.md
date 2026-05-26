---
description: Design streaming/real-time architecture. Usage - /mindforge:stream [service] [--transport sse|websocket|grpc-stream] [--partition-by key]
---

<objective>
Design a streaming and real-time data architecture that selects the optimal
transport protocol, implements partitioning for horizontal scale, handles
backpressure gracefully, and provides end-to-end observability from producer
to consumer with bounded latency guarantees.
</objective>

<execution_context>
@.mindforge/skills/streaming-architecture/SKILL.md
</execution_context>

<context>
$ARGUMENTS
</context>

<process>
1. Identify real-time requirements by analyzing the domain: event throughput (msgs/sec), latency SLA (p99), ordering guarantees (total vs partition-level), and durability needs (at-least-once vs exactly-once). Classify as hot-path (sub-100ms) or warm-path (sub-1s).
2. Choose transport based on --transport flag or requirements: SSE for server-push unidirectional fan-out (notifications, feeds), WebSocket for bidirectional low-latency (chat, collaboration), gRPC streaming for inter-service high-throughput (telemetry, replication). Document trade-offs for the chosen protocol.
3. Design partitioning strategy based on --partition-by: select partition key that distributes load evenly while preserving ordering within a logical group (e.g., user_id, tenant_id, region). Calculate partition count from target throughput / per-partition capacity.
4. Handle backpressure at every layer: implement producer-side rate limiting (token bucket), consumer-side flow control (credit-based or pull-based), and buffer overflow policies (drop-oldest, block, or spill-to-disk). Set high-water marks for each buffer.
5. Configure windowing for stream processing: tumbling windows for aggregation, sliding windows for moving averages, session windows for user activity. Define window size, allowed lateness, and watermark strategy.
6. Implement exactly-once semantics where required: idempotent producers, transactional consumers with offset commits, and deduplication at the sink. Document the consistency boundary.
7. Design consumer group topology: competing consumers for load distribution, broadcast for fan-out, and consumer lag monitoring with auto-scaling triggers. Set max poll interval and session timeout.
8. Monitor consumer lag, throughput, error rate, and end-to-end latency per partition. Set alerts on lag exceeding 2x window size or throughput dropping below 80% of baseline.
9. Plan for failure modes: broker failure (replica failover), consumer crash (rebalance), network partition (split-brain prevention), and schema evolution (backward-compatible changes with schema registry).
10. Log streaming architecture decision in AUDIT with: service, transport, partition strategy, throughput target, latency SLA, and backpressure policy.
</process>
