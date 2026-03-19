---
name: database-patterns
version: 1.0.0
min_mindforge_version: 0.3.0
status: stable
triggers: database, DB, SQL, query, migration, schema, index, indexing, N+1,
          transaction, ACID, foreign key, join, aggregate, pagination, cursor,
          connection pool, ORM, Prisma, SQLAlchemy, Drizzle, Sequelize,
          PostgreSQL, MySQL, SQLite, MongoDB, Redis, Elasticsearch
---

# Skill — Database Patterns

## When this skill activates
Any task involving database schema design, query writing, migrations, or
ORM configuration.

## Mandatory actions when this skill is active

### Schema design standards

**Naming conventions (PostgreSQL default):**
```sql
-- Tables: snake_case, plural
CREATE TABLE user_profiles (...);
CREATE TABLE order_items (...);

-- Columns: snake_case
user_id, created_at, updated_at, deleted_at

-- Primary keys: always id (UUID preferred over auto-increment)
id UUID PRIMARY KEY DEFAULT gen_random_uuid()

-- Foreign keys: {referenced_table_singular}_id
user_id UUID REFERENCES users(id) ON DELETE CASCADE
order_id UUID REFERENCES orders(id) ON DELETE SET NULL

-- Indexes: idx_{table}_{column(s)}
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_orders_user_id_created_at ON orders(user_id, created_at DESC);
```

**Standard columns every table should have:**
```sql
id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
-- For soft delete (preferred over hard delete):
deleted_at  TIMESTAMPTZ  -- NULL = active, timestamp = deleted
```

**UUID strategy:**
- Prefer UUIDv7 or ULID for time-ordered inserts (better index locality)
- Use random UUIDv4 for high-entropy IDs when ordering is not important
- Document the choice in ARCHITECTURE.md and keep it consistent across tables

**Soft delete implementation:**
Use soft delete (setting `deleted_at`) instead of hard delete for:
- User records (GDPR right to erasure exception: anonymise, don't delete)
- Financial records (audit requirements)
- Any record that might be referenced by other records

For hard delete: cascade must be configured. Document the cascade in ARCHITECTURE.md.

### Query standards

**N+1 query detection and prevention:**
```typescript
// ❌ N+1 pattern: 1 query for users + N queries for their orders
const users = await db.users.findMany()
for (const user of users) {
  user.orders = await db.orders.findMany({ where: { userId: user.id } })
}

// ✅ Single query with JOIN or include
const users = await db.users.findMany({
  include: { orders: true }  // Prisma generates a single JOIN query
})

// ✅ Or batch load with WHERE IN
const userIds = users.map(u => u.id)
const orders = await db.orders.findMany({ where: { userId: { in: userIds } } })
const ordersByUser = groupBy(orders, 'userId')
```

**Framework-agnostic SQL example (N+1):**
```sql
-- ❌ N+1 pattern (application loops)
-- SELECT * FROM users LIMIT 50;
-- then for each user:
-- SELECT * FROM orders WHERE user_id = ?;

-- ✅ Single query with JOIN
SELECT u.*, o.*
FROM users u
LEFT JOIN orders o ON o.user_id = u.id
WHERE u.id IN (:user_ids);
```

**Pagination patterns:**
```typescript
// ❌ OFFSET pagination (slow on large datasets — scans all previous rows)
SELECT * FROM posts ORDER BY created_at DESC LIMIT 20 OFFSET 10000;

// ✅ Compound cursor — handles duplicate timestamps correctly
// Application layer: encode (created_at, id) as the cursor
SELECT * FROM posts
WHERE (created_at, id) < (:cursor_time::timestamptz, :cursor_id::uuid)
ORDER BY created_at DESC, id DESC
LIMIT 20;

// Cursor encoding (application layer):
// encode: btoa(JSON.stringify({ t: row.created_at, id: row.id }))
// decode: JSON.parse(atob(cursor))
// Return:
{
  "data": [...],
  "nextCursor": "[base64 of {t, id} pair]",
  "hasMore": true
}
```

### Why compound cursors matter
Single-field cursors (created_at only) produce incorrect pagination when
multiple records share the same timestamp — common in batch imports and
high-write systems. Always use at least (timestamp, id) as a compound cursor.

For simple cases where records are created sequentially and timestamps are
guaranteed unique (e.g., a single-writer queue): a single-field cursor is acceptable.
Document this assumption in the code.

**Transaction usage:**
```typescript
// Use transactions whenever multiple writes must succeed or fail together
await db.$transaction(async (tx) => {
  const order = await tx.orders.create({ data: orderData })
  await tx.orderItems.createMany({ data: items.map(i => ({...i, orderId: order.id})) })
  await tx.inventory.updateMany({ /* deduct stock */ })
  // All three succeed or all three roll back
})
```
For financial operations or ledger updates, use `SERIALIZABLE` isolation or
explicit row-level locks to prevent lost updates and double-spend conditions.

### Index strategy

**Always index:**
- All foreign key columns (ORM does not always do this automatically)
- Columns used in WHERE clauses on large tables
- Columns used in ORDER BY on large tables
- Columns used in JOIN conditions

**Composite indexes:**
- Order columns from most selective (highest cardinality) to least
- A composite index on (a, b) is used for queries filtering on a alone,
  or on both a and b. Not for b alone.
- Example: index on (user_id, created_at DESC) for "get user's recent items"

**Never index:**
- Boolean columns on large tables (index selectivity too low to help)
- Columns that change very frequently (index maintenance overhead)
- Tables with fewer than 10,000 rows (full scan is faster)

### Migration standards

```bash
# Every schema change must have a migration file
# Naming: [timestamp]_[descriptive-name].sql or per ORM convention

# Migration must be:
# 1. Idempotent: safe to run multiple times
# 2. Reversible: has both UP and DOWN migration
# 3. Non-blocking: avoid full table locks in production migrations

# Non-blocking pattern for adding a column (PostgreSQL):
# Step 1: Add column with default as NULL (instant)
ALTER TABLE users ADD COLUMN phone_verified BOOLEAN;

# Step 2: Backfill in batches (separate deployment)
UPDATE users SET phone_verified = false
WHERE id IN (SELECT id FROM users WHERE phone_verified IS NULL LIMIT 1000);

# Step 3: Add NOT NULL constraint + default (after backfill completes)
ALTER TABLE users ALTER COLUMN phone_verified SET NOT NULL;
ALTER TABLE users ALTER COLUMN phone_verified SET DEFAULT false;
```

## Query performance checklist
Before committing any query-writing task:
- [ ] Ran EXPLAIN ANALYZE on all non-trivial queries
- [ ] All WHERE/JOIN/ORDER BY columns have indexes
- [ ] No N+1 queries in list-fetching code
- [ ] Large queries paginated (cursor-based for > 1K rows)
- [ ] Transactions used for multi-write operations
- [ ] Connection pooling configured (not creating connections per request)
