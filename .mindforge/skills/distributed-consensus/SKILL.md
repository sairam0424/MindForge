---
name: distributed-consensus
version: 1.0.0
min_mindforge_version: 10.1.1
status: stable
triggers: distributed consensus, raft algorithm, paxos, leader election, split-brain prevention, quorum read, quorum write, consensus protocol, distributed lock, linearizability, strong consistency, consensus group
---

# Skill — Distributed Consensus

## When this skill activates
Any task involving strong consistency requirements in distributed systems,
leader election, distributed locks, quorum-based reads/writes,
or preventing split-brain scenarios in clustered systems.

## Mandatory actions when this skill is active

### Before writing any code
1. Confirm consensus is actually needed (not everything requires strong consistency).
2. Identify what data requires linearizability vs what can be eventually consistent.
3. Choose existing implementation (etcd, ZooKeeper, Consul) — never build your own.
4. Size the cluster (odd numbers only: 3 for most, 5 for critical).

### During implementation
- Use established consensus systems (etcd/ZooKeeper/Consul) — do NOT implement Raft/Paxos yourself.
- Implement fencing tokens for all distributed locks.
- Handle network partitions explicitly (what happens when consensus is lost?).
- Set appropriate timeouts for leader election (not too short = flapping, not too long = unavailability).
- Use consensus ONLY for metadata/coordination — never for high-throughput data plane.

### After implementation
- Test split-brain scenarios (network partition between nodes).
- Verify leader election completes within acceptable time.
- Confirm fencing tokens prevent stale operations.
- Load test to ensure consensus doesn't become a bottleneck.
- Monitor cluster health (leader stability, replication lag).

## Raft Consensus (Most Common)

### How It Works
1. **Leader Election**: Nodes start as followers. If no heartbeat from leader within timeout, a follower becomes a candidate and requests votes.
2. **Log Replication**: Leader receives writes, appends to log, replicates to followers.
3. **Commitment**: Entry is committed when majority (quorum) acknowledges.
4. **Safety**: Only one leader per term. Committed entries are never lost.

### Key Properties
- Strong leader (all writes go through leader).
- Leader elected by majority vote.
- Log entries committed when replicated to majority.
- Cluster tolerates (N-1)/2 failures (3 nodes tolerates 1, 5 tolerates 2).

## Quorum Mathematics

### Formulas
```
N = total nodes
W = write quorum (nodes that must acknowledge a write)
R = read quorum (nodes that must respond to a read)

Strong consistency: R + W > N
Write availability: W ≤ N (can tolerate N-W failures for writes)
Read availability: R ≤ N (can tolerate N-R failures for reads)
```

### Common Configurations
| N | W | R | Consistency | Write Tolerance | Read Tolerance |
|---|---|---|-------------|-----------------|----------------|
| 3 | 2 | 2 | Strong | 1 failure | 1 failure |
| 5 | 3 | 3 | Strong | 2 failures | 2 failures |
| 5 | 3 | 1 | Eventual reads | 2 failures | 4 failures |

## Split-Brain Prevention

### The Problem
Network partition can create two groups, each believing it's the leader.

### Solutions
1. **Majority quorum**: Only the partition with majority can elect a leader.
2. **Fencing tokens**: Monotonically increasing token with every lock acquisition. Storage rejects operations with stale tokens.
3. **Epoch numbers**: Leader increments epoch on election. Older epochs are rejected.
4. **External witness**: Third-party arbiter breaks ties (but introduces dependency).

### Fencing Token Pattern
```
Client A acquires lock → token=42
Client A pauses (GC, network)
Client B acquires lock → token=43
Client A resumes, sends write with token=42
Storage rejects: 42 < 43 (stale token)
```

## When to Use Consensus

### Good Use Cases
- Leader election for worker coordination.
- Distributed configuration management.
- Service discovery and membership.
- Distributed locks (with fencing tokens).
- Metadata storage (small, infrequently written).

### Anti-Patterns (DON'T use consensus for)
- High-throughput data writes (consensus = bottleneck at ~10K writes/sec).
- Large data storage (consensus stores small metadata, not big data).
- Read-heavy workloads (use eventual consistency + caching instead).
- Every database write (use consensus for critical metadata only).

## Practical Systems

### etcd
- Raft-based, Kubernetes uses it for cluster state.
- Key-value store with watch capabilities.
- Best for: service discovery, config, leader election.

### ZooKeeper
- ZAB protocol (similar to Raft).
- Hierarchical namespace with ephemeral nodes.
- Best for: distributed locks, barriers, leader election.

### Consul
- Raft-based, service mesh integration.
- Service discovery + health checking + KV store.
- Best for: service mesh, multi-datacenter coordination.

## Failure Scenarios to Test

1. **Leader crash**: New leader elected within timeout. No committed data lost.
2. **Network partition (minority isolated)**: Majority continues. Minority becomes read-only or unavailable.
3. **Network partition (even split)**: Neither side has majority → cluster unavailable until partition heals.
4. **Slow node**: Doesn't affect consensus (majority can proceed without it).
5. **Clock skew**: Raft uses logical clocks — physical clock skew shouldn't matter.
6. **Disk full on leader**: Leader steps down, new election.

## Self-check
- [ ] Consensus is genuinely needed (not over-engineering eventual consistency).
- [ ] Using established system (etcd/ZooKeeper/Consul) — not custom implementation.
- [ ] Cluster size is odd (3 or 5).
- [ ] Fencing tokens implemented for distributed locks.
- [ ] Network partition behavior tested and documented.
- [ ] Consensus used only for coordination/metadata (not data plane).
- [ ] Leader election timeout tuned (not too short, not too long).
- [ ] Monitoring: leader stability, replication lag, cluster health.
