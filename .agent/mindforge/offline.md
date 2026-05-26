---
name: mindforge:offline
description: "Design offline-first data architecture. Usage: /mindforge:offline [feature] [--sync crdt|ot|custom] [--conflict lww|merge|manual]"
argument-hint: "[feature] [--sync crdt|ot|custom] [--conflict lww|merge|manual]"
allowed-tools:
  - list_dir
  - view_file
---

<objective>
Design offline-first architectures with local-first data storage, optimistic UI updates, sync conflict resolution, and graceful degradation during network outages.
</objective>

<execution_context>
@.mindforge/skills/offline-first-design/SKILL.md
</execution_context>

<context>
Skills Directory: `.mindforge/skills/offline-first-design/`
State: Designs local database schema, sync protocols (CRDT/OT), conflict resolution strategies, and queue management for offline operations.
</context>

<process>
1. **Local Storage**: SQLite (structured relational data). IndexedDB (web, large datasets). Realm (mobile, reactive queries). WatermelonDB (React Native, observable). Choose based on platform and query patterns.

2. **Sync Strategy**: CRDT (Conflict-free Replicated Data Types) → automatic merge, no conflicts, eventual consistency (Yjs, Automerge). OT (Operational Transformation) → transforms operations, preserves intent (Google Docs style). Custom → simpler logic but requires explicit conflict handling.

3. **Conflict Resolution**: Last-Write-Wins → simple, risk of data loss, acceptable for low-conflict scenarios. Field-level merge → granular, preserves more data, requires schema design. Manual resolution → show UI for user decision, use for critical data. Version vectors track causality.

4. **Optimistic UI**: Apply changes immediately to local state. Show pending indicator. Queue sync operation. Rollback on server rejection. Show conflicts in UI. Maintain operation log for debugging.

5. **Queue Management**: Persist operations to disk (survive app restart). Retry with exponential backoff. Handle partial failures (some operations succeed, others fail). Order dependencies (create before update). Prune completed operations.

6. **Data Pruning**: Archive old data (>90 days inactive). Delete ephemeral data (cached images). Compress large payloads. Implement storage quotas. Monitor disk usage. User-triggered full sync to recover space.

7. **Testing**: Simulate offline mode. Test conflict scenarios (concurrent edits). Verify data integrity post-sync. Test with poor network (slow 3G). Load test sync with large datasets. Monitor sync latency and queue depth.
</process>
