---
name: system-design
version: 1.0.0
min_mindforge_version: 10.0.6
status: stable
triggers: system design, load balancer, sharding strategy, replication, CAP theorem, horizontal scaling, vertical scaling, message queue, distributed cache, high availability, fault tolerance, capacity planning
---

# Skill — System Design

## When this skill activates
Any task involving large-scale system architecture, capacity planning, scaling strategy,
distributed infrastructure, or high-availability design.

## Mandatory actions when this skill is active

### Before

1. **Quantify requirements** — Peak QPS, latency SLA (p50/p95/p99), data volume, read/write ratio, availability target.
2. **Identify constraints** — Budget, team size, existing stack, compliance, geographic needs.
3. **Establish scope** — Distinguish MVP from full-scale target. Design for target, implement in phases.

### During

#### Capacity planning math (always do first)
```
DAU * actions_per_user / 86400 = avg QPS
avg QPS * peak_multiplier (3x) = peak QPS
records_per_day * bytes_per_record = daily storage growth
annual_storage * hot_data_fraction = cache cluster sizing
```
Document all calculations in the design document.

#### Load balancing
- L4 (TCP): high-throughput, gRPC, WebSocket — NLB, HAProxy TCP mode
- L7 (HTTP): path routing, header inspection, A/B — ALB, Nginx, Envoy
- Algorithms: Round Robin, Least Connections, Consistent Hashing (sticky without state)
- Health checks: active (ping /health 5s interval, 3 fails = remove)

#### Sharding strategies
```
Hash-based: shard_id = hash(key) % N — even distribution, resharding needs consistent hashing
Range-based: key ranges per shard — good for range queries, risk of hot spots
Geographic: shard by region — data locality + compliance, cross-region queries expensive
```
Partition key must: exist in every query, distribute evenly, align with access patterns.

#### Replication
- Leader-Follower: one leader writes, N followers read. 10ms-1s lag. Most common.
- Multi-Leader: multi-region writes, conflict resolution (LWW or app-level merge).
- Quorum: W+R>N for strong consistency. Tunable read/write tradeoff.

#### CAP theorem
- Partitions WILL happen — choose CP or AP per subsystem
- CP (refuse stale reads): financial transactions, inventory, leader election
- AP (serve during partition): shopping carts, feeds, analytics, DNS
- PACELC: if no partition, choose Latency vs Consistency (most systems: PA/EL)

#### Caching layers
```
L1 (in-process): 100MB-1GB, TTL 30s-5min, local HashMap/node-cache
L2 (distributed): 10GB-1TB, TTL 5min-1hr, Redis Cluster/Memcached
L3 (CDN/edge): unlimited, TTL 1hr-1day, CloudFront/Cloudflare
```
Invalidation: TTL expiry | write-through | pub/sub invalidation events.

#### Message queues
- Kafka: high-throughput, ordered per partition, replay-capable
- SQS: serverless, simple, built-in DLQ
- RabbitMQ: flexible routing, priority queues
- Use when: decoupling, spike buffering, guaranteed delivery, fan-out

### After

1. **Validate with numbers** — Confirm design handles peak QPS with 2-3x headroom.
2. **No SPOF** — Every component has a failover path in the critical path.
3. **Document tradeoffs** — State what was sacrificed and why it is acceptable.
4. **Define SLOs** — Latency p99, error rate, availability with alerting thresholds.

## Self-check before task completion
- [ ] Requirements quantified (QPS, latency, storage, availability)
- [ ] Capacity math documented with back-of-envelope calculations
- [ ] No single points of failure in the critical path
- [ ] Sharding strategy defined with partition key rationale
- [ ] Caching layers specified with invalidation strategy
- [ ] CAP tradeoff explicitly stated and justified
- [ ] Message queues used for async and spike buffering
- [ ] SLOs defined with alerting thresholds
