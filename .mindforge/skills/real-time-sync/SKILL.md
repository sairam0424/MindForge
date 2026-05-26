---
name: real-time-sync
version: 1.0.0
min_mindforge_version: 10.0.9
status: stable
triggers: real-time sync, conflict resolution, CRDT, operational transform, offline first, sync protocol, optimistic replication, last write wins, conflict merge strategy, eventual sync, sync engine, collaborative editing
---

# Skill — Real-Time Sync

## When this skill activates
Any task involving real-time synchronization, conflict resolution, CRDTs,
operational transforms, offline-first architecture, or collaborative editing.

## Mandatory actions when this skill is active

### Before writing any code
1. Classify data types to determine the conflict resolution strategy.
2. Define the consistency model (strong, eventual, causal).
3. Identify offline requirements and maximum acceptable sync lag.

### During implementation
- Implement conflict detection at field level, not document level.
- Use vector clocks or hybrid logical clocks for causal ordering.
- Design the sync engine as a separate layer from business logic.
- Handle network partitions gracefully (queue changes, reconcile on reconnect).

### After implementation
- Test with simulated partitions and concurrent edits.
- Verify convergence (all clients reach same state eventually).
- Document conflict resolution strategy per data type.

## Conflict Resolution Strategies

| Strategy | Pro | Con | Use For |
|----------|-----|-----|---------|
| LWW (Last Write Wins) | Simple, no user action | Silent data loss | Preferences, status fields |
| CRDTs | Auto-merge, no conflicts | Limited types, storage overhead | Counters, sets, registers |
| OT (Operational Transform) | Precise intent preservation | Complex, needs server | Real-time text editing |

## CRDT Catalog

- **G-Counter**: grow-only. Each node keeps own count, total = sum. Use for page views.
- **PN-Counter**: two G-Counters (increment/decrement). Use for inventory, votes.
- **LWW-Register**: single value + timestamp, latest wins. Use for simple fields.
- **OR-Set**: add/remove with unique tags, add-wins bias. Use for carts, tag lists.

## Offline-First Architecture

```
[Local DB] <-> [Sync Engine] <-> [Remote Server]
```

- All writes go to local DB first (instant UX, zero latency).
- Sync engine runs in background, uploads pending changes.
- On reconnect: pull remote → detect conflicts → resolve → merge.
- Unresolvable conflicts surface to user (never silently drop).

## Sync Protocols

- **Push-Based**: server pushes via WebSocket/SSE. Lowest latency, needs persistent connection.
- **Pull-Based**: client polls with cursor. Simple, works everywhere, higher latency.
- **Hybrid** (recommended): push notification "changes exist" → client fetches via HTTP.

## Optimistic Replication
- Apply locally immediately, replicate async.
- On conflict: reconcile via chosen strategy (LWW, CRDT, manual).
- Rollback if server rejects (revert local, show error to user).

## Vector Clocks
- Each node maintains a vector of logical timestamps (one per node).
- Determines causality: happened-before, concurrent, or identical.
- Concurrent events require conflict resolution; causal events merge cleanly.

## Self-check before task completion

- [ ] Is conflict resolution appropriate for each data type?
- [ ] Does the system handle network partitions without data loss?
- [ ] Do all clients converge to the same state eventually?
- [ ] Is offline support implemented with local-first writes?
- [ ] Are concurrent edits tested with realistic scenarios?
- [ ] Is the sync protocol resilient to disconnection/reconnection?
- [ ] Are unresolvable conflicts surfaced to the user?
