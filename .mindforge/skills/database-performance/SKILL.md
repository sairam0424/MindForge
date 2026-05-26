---
name: database-performance
version: 1.0.0
min_mindforge_version: 0.3.0
status: stable
triggers: database performance, query plan analysis, EXPLAIN ANALYZE, index selection, partition pruning, materialized view, query optimization, slow query, index strategy, table scan elimination, join optimization, query profiling
compose: database-patterns
---

# Skill — Database Performance

## When this skill activates
Any task involving slow queries, query optimization, index strategy, EXPLAIN plan
analysis, partitioning, materialized views, or database profiling.

## Mandatory actions when this skill is active

### Before optimizing
1. Get the current query execution plan (EXPLAIN ANALYZE, not just EXPLAIN).
2. Identify the actual bottleneck (do not guess).
3. Measure baseline performance (p50, p95, p99 latency).
4. Understand the data distribution (cardinality, skew).

### Reading EXPLAIN ANALYZE output

**Key things to look for:**

| Signal | Meaning | Action |
|--------|---------|--------|
| Seq Scan on large table | Full table scan, no index used | Add appropriate index |
| Nested Loop with high rows | O(n*m) join strategy | Consider Hash Join, add index on join column |
| Actual rows >> Estimated rows | Stale statistics | Run ANALYZE on the table |
| Sort with external merge | Not enough work_mem | Increase work_mem or add index for ORDER BY |
| Filter removing most rows | Index not selective enough | Add more specific index or partial index |

**Node types (best to worst for large tables):**
1. Index Only Scan — best (reads from index, no table access).
2. Index Scan — good (uses index, fetches rows from table).
3. Bitmap Index Scan — okay (for medium selectivity).
4. Seq Scan — bad on large tables (reads every row).

### Index strategy

**B-tree (default, most common):**
- Equality: `WHERE status = 'active'`
- Range: `WHERE created_at > '2025-01-01'`
- Prefix matching: `WHERE name LIKE 'foo%'`
- Sorting: `ORDER BY created_at DESC`
- Composite: `(tenant_id, created_at)` — order matters, left-to-right.

**GIN (Generalized Inverted Index):**
- JSONB containment: `WHERE data @> '{"key": "value"}'`
- Array contains: `WHERE tags @> ARRAY['tag1']`
- Full-text search: `WHERE to_tsvector(body) @@ to_tsquery('search')`

**Partial index (conditional):**
- Index only rows that match a condition.
- `CREATE INDEX idx_active_orders ON orders(created_at) WHERE status = 'active'`
- Smaller, faster, less write overhead.

**Expression index:**
- Index a computed value.
- `CREATE INDEX idx_lower_email ON users(LOWER(email))`
- Query must use the same expression to hit the index.

### Common query anti-patterns

**Functions on indexed columns:**
```sql
-- BAD: index on created_at is useless
WHERE EXTRACT(YEAR FROM created_at) = 2025

-- GOOD: rewrite as range
WHERE created_at >= '2025-01-01' AND created_at < '2026-01-01'
```

**OR conditions preventing index use:**
```sql
-- BAD: may cause Seq Scan
WHERE status = 'active' OR status = 'pending'

-- GOOD: use IN
WHERE status IN ('active', 'pending')
```

**SELECT * when you need few columns:**
```sql
-- BAD: fetches all columns, prevents index-only scan
SELECT * FROM orders WHERE tenant_id = 'abc'

-- GOOD: select only needed columns
SELECT id, status, total FROM orders WHERE tenant_id = 'abc'
```

**Missing LIMIT on unbounded queries:**
```sql
-- BAD: may return millions of rows
SELECT * FROM events WHERE type = 'click'

-- GOOD: always paginate
SELECT * FROM events WHERE type = 'click' ORDER BY id LIMIT 50
```

### Materialized views

**When to use:**
- Expensive aggregations needed frequently (dashboards, reports).
- Data changes infrequently relative to read frequency.
- Acceptable staleness (refresh interval is tolerable).

**Implementation:**
```sql
CREATE MATERIALIZED VIEW monthly_revenue AS
SELECT tenant_id, date_trunc('month', created_at) AS month, SUM(amount) AS total
FROM orders
WHERE status = 'completed'
GROUP BY tenant_id, month;

-- Refresh on schedule
REFRESH MATERIALIZED VIEW CONCURRENTLY monthly_revenue;
```

**Rules:**
- Always use CONCURRENTLY (does not lock reads during refresh).
- Add a unique index for CONCURRENTLY to work.
- Monitor refresh duration — alert if it exceeds threshold.
- Consider triggers for real-time materialized views (small tables only).

### Partitioning

**Range partitioning (time-series data):**
```sql
CREATE TABLE events (
  id BIGINT, tenant_id UUID, created_at TIMESTAMPTZ, data JSONB
) PARTITION BY RANGE (created_at);

CREATE TABLE events_2025_01 PARTITION OF events
  FOR VALUES FROM ('2025-01-01') TO ('2025-02-01');
```

**Benefits:**
- Partition pruning: queries on created_at only scan relevant partitions.
- Easy data lifecycle: DROP old partitions instead of DELETE (instant, no vacuum).
- Parallel scan across partitions.

**Hash partitioning (even distribution):**
- For tables with no natural range key.
- Distributes rows evenly across N partitions.
- Good for very large tables that need parallel access.

**Rules:**
- Partition key must be in every query's WHERE clause for pruning.
- Too many partitions (>1000) can slow planning.
- Automate partition creation (don't rely on manual monthly creation).

### Join optimization

- Ensure join columns have indexes on both sides.
- Small table JOIN large table: ensure small table is the "driving" table.
- Consider denormalization if a join is on the critical path and never changes.
- Use CTEs carefully — in PostgreSQL < 12, CTEs are optimization fences.

### Monitoring

- Enable `pg_stat_statements` for query-level statistics.
- Alert on queries exceeding p95 threshold.
- Track index usage: `pg_stat_user_indexes` — unused indexes waste write performance.
- Regular VACUUM and ANALYZE (autovacuum tuning for high-write tables).

## Self-check before task completion
- [ ] Did I follow the mandatory actions for this skill?
- [ ] Did I apply the patterns appropriate to the context?
- [ ] Did I verify the implementation meets the criteria above?
- [ ] Did I document decisions and trade-offs made?
