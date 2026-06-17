---
name: pagination-patterns
version: 1.0.0
min_mindforge_version: 0.3.0
status: stable
triggers: pagination pattern, cursor pagination, offset pagination, keyset pagination, total count strategy, infinite scroll, deep pagination, page token, relay connection, pagination performance, next page token, pagination API design
compose: api-design
---

# Skill — Pagination Patterns

## When this skill activates
Any task involving list endpoint pagination, cursor vs offset strategies, infinite
scroll implementation, total count optimization, or pagination API design.

## Mandatory actions when this skill is active

### Before implementing pagination
1. Determine the access pattern (jump to page N vs sequential browsing).
2. Assess data volume and write frequency (affects consistency).
3. Choose the strategy based on trade-offs, not convention.

### Offset pagination

**Implementation:**
```sql
SELECT * FROM orders
WHERE tenant_id = 'abc'
ORDER BY created_at DESC
LIMIT 20 OFFSET 40;  -- page 3
```

**API design:**
```json
GET /orders?page=3&per_page=20

{
  "data": [...],
  "meta": {
    "page": 3,
    "per_page": 20,
    "total": 1542,
    "total_pages": 78
  }
}
```

**Pros:**
- Simple to implement and understand.
- Allows jumping to any page directly.
- Total count and page numbers are intuitive for users.

**Cons:**
- Performance degrades on deep pages (OFFSET 10000 still scans 10000 rows).
- Inconsistent during writes (rows shift between pages as new data is inserted).
- Total count is expensive on large tables (separate COUNT query).

**Best for:** admin panels, back-office UIs, small datasets (< 100K rows).

### Cursor/Keyset pagination

**Implementation:**
```sql
-- First page
SELECT * FROM orders
WHERE tenant_id = 'abc'
ORDER BY created_at DESC, id DESC
LIMIT 20;

-- Next page (cursor = last seen created_at + id)
SELECT * FROM orders
WHERE tenant_id = 'abc'
  AND (created_at, id) < ('2025-01-15T10:00:00Z', 'order-xyz')
ORDER BY created_at DESC, id DESC
LIMIT 20;
```

**API design:**
```json
GET /orders?limit=20&after=eyJjcmVhdGVkX2F0IjoiMjAyNS0wMS0xNVQxMDowMDowMFoiLCJpZCI6Im9yZGVyLXh5eiJ9

{
  "data": [...],
  "meta": {
    "has_next": true,
    "next_cursor": "eyJjcmVhdGVkX...",
    "has_previous": true,
    "previous_cursor": "eyJjcmVhdGVk..."
  }
}
```

**Pros:**
- Constant performance regardless of depth (no OFFSET scan).
- Consistent results during writes (no row shifting).
- Works well at any scale.

**Cons:**
- Cannot jump to arbitrary page N.
- Cursor is opaque — clients cannot construct cursors manually.
- Requires a unique, sequential ordering key (composite if not unique).

**Best for:** feeds, timelines, infinite scroll, large datasets, real-time data.

### Cursor encoding

**Rules:**
- Cursor is opaque to the client (base64-encode the actual values).
- Include all ORDER BY columns in the cursor (for deterministic positioning).
- Add a tiebreaker (id) when the sort column is not unique.
- Validate cursors server-side (prevent injection via crafted cursors).

**Example encoding:**
```javascript
// Encode
const cursor = Buffer.from(JSON.stringify({
  created_at: lastItem.createdAt,
  id: lastItem.id
})).toString('base64url');

// Decode
const { created_at, id } = JSON.parse(Buffer.from(cursor, 'base64url').toString());
```

### Relay Connection specification

```graphql
type OrderConnection {
  edges: [OrderEdge!]!
  pageInfo: PageInfo!
  totalCount: Int  # nullable — expensive to compute
}

type OrderEdge {
  node: Order!
  cursor: String!
}

type PageInfo {
  hasNextPage: Boolean!
  hasPreviousPage: Boolean!
  startCursor: String
  endCursor: String
}
```

**Usage:**
- `first: 20, after: "cursor"` — forward pagination.
- `last: 20, before: "cursor"` — backward pagination.
- Standardized across the entire GraphQL schema.

### Total count strategies

**Problem:** `SELECT COUNT(*) FROM large_table` is slow (full table scan in PostgreSQL).

**Solutions:**

| Strategy | Accuracy | Performance | Use case |
|----------|----------|-------------|----------|
| Exact count (separate query) | 100% | Slow (large tables) | Admin UIs, small datasets |
| Estimated count (`pg_stat_user_tables.reltuples`) | ~95% | Instant | "About X results" display |
| Count with cap (`COUNT(*) ... LIMIT 1001`) | Exact up to cap | Fast | "1000+ results" |
| Cached count (materialized/Redis) | Stale by TTL | Instant | Dashboards, frequently queried |
| No count (cursor only) | N/A | N/A | Infinite scroll, feeds |

**Recommendation:** Make totalCount optional in the API. Let clients request it only when needed.

### Infinite scroll implementation

**Frontend pattern:**
```javascript
function useInfiniteList(fetchPage) {
  const [pages, setPages] = useState([]);
  const [cursor, setCursor] = useState(null);
  const [hasMore, setHasMore] = useState(true);
  const [isLoading, setIsLoading] = useState(false);

  const loadMore = async () => {
    if (isLoading || !hasMore) return;
    setIsLoading(true);
    const result = await fetchPage(cursor);
    setPages(prev => [...prev, result.data]);
    setCursor(result.nextCursor);
    setHasMore(result.hasNext);
    setIsLoading(false);
  };

  // Trigger loadMore on scroll near bottom
  // Virtualize rendered list for performance
}
```

**Rules:**
- Use cursor-based pagination (offset causes duplicates on insert).
- Prefetch next page when user is near the bottom (IntersectionObserver).
- Virtualize the rendered list (react-window, tanstack-virtual) for DOM performance.
- Show loading skeleton, not spinner, for smoother experience.
- Handle "back to top" — maintain scroll position on return navigation.

### Deep pagination protection

- For offset: cap maximum page (e.g., max 500 pages) and show "refine your search."
- For cursor: no cap needed (performance is constant).
- Rate-limit rapid sequential page requests (scraping protection).
- Log deep pagination usage — it often indicates a missing search/filter feature.

### API design best practices

**REST:**
- Use Link headers for next/prev URLs (HATEOAS).
- Include pagination metadata in response body.
- Consistent parameter names across all endpoints.
- Document maximum page size (prevent `per_page=999999`).

**GraphQL:**
- Use Connection spec (edges + pageInfo) universally.
- Make totalCount nullable (computed only when requested).
- Support both first/after and last/before.

**General:**
- Default page size: 20-50 (not too small, not too large).
- Maximum page size: 100 (enforce server-side).
- Sort order must be deterministic (include tiebreaker column).
- Return empty array (not null) when no results.

## Self-check before task completion
- [ ] Did I follow the mandatory actions for this skill?
- [ ] Did I apply the patterns appropriate to the context?
- [ ] Did I verify the implementation meets the criteria above?
- [ ] Did I document decisions and trade-offs made?
