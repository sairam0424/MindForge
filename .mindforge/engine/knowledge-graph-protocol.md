# MindForge Engine — Knowledge Graph Protocol (RAG 2.0)

## Purpose

Govern the Local-First Knowledge Graph's integrity, security, and performance.
This protocol defines the rules for graph operations, auto-shadowing, and
life-cycle management of nodes and edges.

## Graph Integrity Rules

### Node Rules

- Every node MUST have a valid `id`, `type`, `topic`, and `content`.
- Deprecated nodes are excluded from all queries and traversals.
- Orphan nodes (no edges) are flagged in `graphStats()` but NOT auto-pruned.
- Orphan pruning only runs on `/mindforge:complete-milestone`.

### Edge Rules

- Every edge MUST have a valid `sourceId`, `targetId`, and `type`.
- Self-referencing edges (sourceId === targetId) are rejected.
- Duplicate edges (same source, target, type) are prevented at creation time.
- All edge records include a SHA-256 integrity checksum.
- Edge writes are append-only — never mutate-in-place.

### Cycle Prevention

- `CAUSED_BY` and `SUPERSEDES` edges form DAGs (Directed Acyclic Graphs).
- Cycle detection runs via DFS before any `CAUSED_BY` or `SUPERSEDES` edge creation.
- If a cycle is detected: the edge creation is rejected and logged.
- `RELATED_TO` and `INFORMS` edges are allowed to be cyclical (they are undirected semantics).

## Edge Type Semantics

| Type | Direction | Meaning | Auto-Created |
|:---|:---|:---|:---|
| `RELATED_TO` | Bidirectional | Semantic similarity ≥ 0.65 | Yes |
| `CAUSED_BY` | Source → Target | Bug pattern caused by root cause | Yes (capture) |
| `SUPERSEDES` | New → Old | New decision replaces old decision | Manual only |
| `DEPENDS_ON` | Dependent → Dependency | Pattern requires another pattern | Manual only |
| `INFORMS` | Decision → Knowledge | Decision informed by domain knowledge | Yes (capture) |
| `CONTRADICTS` | Bidirectional | Conflicting knowledge entries | Manual only |

## Auto-Shadow Protocol

### Trigger Conditions

Auto-Shadow MUST be invoked:

1. Before every subagent spawn (via context-injector)
2. At session boot (via session-memory-loader, after hot context load)
3. On explicit `/mindforge:remember --shadow` calls

### Budget Constraints

- Maximum shadow section size: **2KB** (~8000 characters)
- Maximum shadow items: **5 entries**
- Minimum combined score: **0.35** (below this, entry is excluded)
- Entries already in Hot/Warm context are excluded (no duplication)

### Security Guards

Auto-Shadow MUST NEVER include:

- Entries containing passwords, API keys, or credentials
- Entries matching patterns: `/[a-z0-9]{32,}/`, `/-----BEGIN/`, `/sk_[a-z]+_/`
- Entries with `type: 'secret'` or tags including `secret` or `credential`
- Deprecated entries

### Contradiction Handling

- If two shadow items have a `CONTRADICTS` edge between them:
  - Both items are included but flagged with ⚠️ prefix
  - The higher-confidence entry is displayed first
  - The agent is instructed: "These entries may conflict — verify with user"

## Edge Weight Lifecycle

### Reinforcement

- Traversal: +0.1 weight (capped at 2.0)
- Each reinforcement updates `last_traversed` and increments `traversal_count`
- When a node is reinforced (knowledge-store), its top 3 edges are also reinforced

### Decay

- Edges not traversed in 30 days lose 10% weight per decay cycle
- Edges that decay to weight ≤ 0.1 are automatically deprecated
- Decay runs on `/mindforge:complete-milestone` or explicit `/mindforge:remember --gc`

### Pruning

- Deprecated edges are retained in the JSONL for audit trail
- Graph compaction (removing deprecated entries from the file) runs only on explicit request
- Orphan nodes are reported but never auto-deleted

## Embedding Cache

- Cache path: `.mindforge/memory/embeddings.json`
- Cache is rebuilt when knowledge-base.jsonl changes (detected by entry count mismatch)
- Cache format includes `schema_version` for forward compatibility
- Corrupted cache is silently rebuilt — never crash on cache errors

## Performance Guarantees

| Operation | Target | Measured at |
|:---|:---|:---|
| Full embedding rebuild | < 200ms | 1K entries |
| Single cosine similarity | < 1ms | Any |
| Auto-edge inference | < 100ms | 1K entries |
| Graph traversal (2-hop) | < 50ms | 500 edges |
| Auto-shadow generation | < 500ms | 1K entries + 500 edges |

## AUDIT Integration

All graph operations emit AUDIT entries:

```json
{
  "event": "knowledge_graph_operation",
  "operation": "add_edge | deprecate_edge | auto_shadow | decay | cycle_detected",
  "details": { ... },
  "timestamp": "<ISO-8601>"
}
```
