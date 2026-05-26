---
description: "Architect large-scale distributed systems with capacity planning. Usage: /mindforge:system-design [system] [--qps N] [--latency Nms]"
---

<objective>
Design a scalable distributed system from requirements through capacity planning, selecting appropriate patterns, designing for failure, and documenting trade-offs with concrete numbers.
</objective>

<execution_context>
@.mindforge/skills/system-design/SKILL.md
</execution_context>

<context>
Arguments: $ARGUMENTS (system name or description, optional --qps and --latency constraints)
Knowledge: Current ARCHITECTURE.md, infrastructure topology, known bottlenecks.
</context>

<process>
1. **Quantify requirements**: Establish concrete numbers for the system:
   - QPS (queries per second) — read vs write ratio
   - Latency targets (p50, p95, p99)
   - Storage requirements (current + 3-year growth projection)
   - Bandwidth (ingress/egress)
   - Availability target (99.9%, 99.99%, etc.) and implied error budget

2. **Back-of-envelope calculations**: Compute:
   - Daily/monthly active users to QPS conversion
   - Storage per entity * entity count * retention period
   - Network bandwidth = QPS * avg payload size
   - Cache hit ratio needed to meet latency targets
   - Replication factor impact on storage and write amplification

3. **Identify bottlenecks**: Given the numbers, identify where the system will break first:
   - Database write throughput limits
   - Network bandwidth saturation points
   - Memory constraints for caching layers
   - CPU-bound computation hotspots
   - Connection pool exhaustion thresholds

4. **Select architectural patterns**: Choose patterns that address identified bottlenecks:
   - Caching strategy (write-through, write-behind, cache-aside)
   - Sharding strategy (hash-based, range-based, geographic)
   - Replication topology (leader-follower, multi-leader, leaderless)
   - Message queue placement (decouple writes, absorb spikes)
   - CDN and edge caching for read-heavy paths

5. **Design for failure**: For each component, define:
   - Failure mode (crash, slow, corrupt, partition)
   - Detection mechanism (health checks, heartbeats, anomaly detection)
   - Recovery strategy (failover, retry, degrade gracefully)
   - Blast radius containment (bulkheads, cell-based architecture)
   - Data durability guarantees during failure

6. **Capacity plan**: Produce a concrete resource estimate:
   - Compute: instance type * count per tier
   - Storage: disk type * size * IOPS requirement
   - Network: load balancer capacity, cross-AZ traffic cost
   - Cache: memory per node * node count * eviction headroom
   - Scale triggers: auto-scaling thresholds with cooldown periods

7. **Define data flow**: Draw the request lifecycle:
   - Client → CDN/Edge → Load Balancer → Application tier → Cache → Database
   - Async paths: Application → Queue → Worker → Database/External
   - Mark latency budget allocation at each hop

8. **Document trade-offs**: For every major decision, state:
   - What was chosen and why
   - What was rejected and why
   - Under what conditions the decision should be revisited
   - CAP theorem positioning (CP vs AP per subsystem)

9. **Observability design**: Define monitoring for the system:
   - Golden signals per service (latency, traffic, errors, saturation)
   - Distributed tracing span architecture
   - Alerting thresholds tied to SLO error budget burn rate
   - Dashboard layout (overview → drill-down hierarchy)

10. **Output system design document**: Produce a structured design doc:
    - Requirements summary with numbers
    - High-level architecture diagram (ASCII or description)
    - Component breakdown with responsibilities
    - Data model and storage design
    - API design (external and internal)
    - Capacity estimates table
    - Trade-off decision log
    - Open questions and risks
</process>
