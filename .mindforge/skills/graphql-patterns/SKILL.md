---
name: graphql-patterns
version: 1.0.0
min_mindforge_version: 0.3.0
status: stable
triggers: graphql pattern, schema design graphql, resolver architecture, N+1 dataloader, graphql subscription, graphql federation, persisted query, graphql pagination, graphql error handling, schema stitching, graphql caching, type-safe graphql
---

# Skill — GraphQL Patterns

## When this skill activates
Any task involving GraphQL schema design, resolver implementation, DataLoader usage,
subscriptions, federation, or GraphQL performance optimization.

## Mandatory actions when this skill is active

### Before designing a GraphQL API
1. Identify the domain entities and their relationships.
2. Consider consumer needs (what data do clients actually fetch together?).
3. Plan the pagination strategy for all list fields.

### Schema design principles

**Entity types:**
```graphql
type User {
  id: ID!
  email: String!
  name: String!
  createdAt: DateTime!
  orders(first: Int, after: String): OrderConnection!
}
```

**Input types for mutations:**
```graphql
input CreateUserInput {
  email: String!
  name: String!
  password: String!
}

type CreateUserPayload {
  user: User
  errors: [ValidationError!]!
}
```

**Enum for fixed sets:**
```graphql
enum OrderStatus {
  PENDING
  PROCESSING
  SHIPPED
  DELIVERED
  CANCELLED
}
```

**Rules:**
- Never expose database columns directly (abstract the data model).
- Use non-nullable (!) for fields that always have a value.
- Mutations return the modified entity (not just success/failure).
- Input types are separate from output types (different validation needs).
- Use Connections (not arrays) for all list fields.

### N+1 problem and DataLoader

**The problem:**
```
Query: { users { orders { items } } }
1 query for users
N queries for orders (one per user)
N*M queries for items (one per order)
```

**The solution — DataLoader:**
```javascript
const orderLoader = new DataLoader(async (userIds) => {
  // ONE query for ALL user IDs
  const orders = await db.orders.findMany({ where: { userId: { in: userIds } } });
  // Map results back to the correct user
  return userIds.map(id => orders.filter(o => o.userId === id));
});

// In resolver
resolve(user) {
  return orderLoader.load(user.id);
}
```

**Rules:**
- Use DataLoader for ALL nested resolvers that fetch from a data source.
- Create a new DataLoader instance per request (request-scoped caching).
- Batch window is one tick of the event loop.
- DataLoader handles both batching AND per-request caching.

### Pagination (Relay Connection spec)

```graphql
type OrderConnection {
  edges: [OrderEdge!]!
  pageInfo: PageInfo!
  totalCount: Int
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

**Implementation:**
- Cursor = opaque base64-encoded value (e.g., `base64(id:123)`).
- Forward pagination: `first` + `after` (cursor).
- Backward pagination: `last` + `before` (cursor).
- totalCount is optional (expensive on large tables — make nullable).

### Subscriptions

**Transport:** WebSocket (graphql-ws protocol).

**Design rules:**
- Filter server-side, not client-side (don't push all events to all clients).
- Rate-limit expensive subscriptions (e.g., max 1 update per second).
- Include subscription-specific authentication (WebSocket auth on connection_init).
- Handle reconnection gracefully (client should re-subscribe on disconnect).

**Example:**
```graphql
type Subscription {
  orderStatusChanged(orderId: ID!): Order!
  newMessage(channelId: ID!): Message!
}
```

**Backend:**
- Use pub/sub (Redis, Kafka) for horizontal scaling.
- Single server: in-memory EventEmitter is fine for development.
- Production: external pub/sub so any server instance can publish.

### Federation (microservices)

**Split schema by domain team:**
```graphql
# Users service
type User @key(fields: "id") {
  id: ID!
  email: String!
  name: String!
}

# Orders service (extends User from users service)
extend type User @key(fields: "id") {
  id: ID! @external
  orders: [Order!]!
}
```

**Rules:**
- Each service owns its types and resolvers.
- `@key` directive defines how entities are referenced across services.
- Gateway (Apollo Router, Cosmo) composes the supergraph.
- Services must resolve `__resolveReference` for federated entities.
- Schema changes require composition check in CI (schema registry).

### Persisted queries

**How it works:**
- Build time: extract all queries from client code, hash each one.
- Client sends hash (not full query text) in production.
- Server looks up query by hash from allowlist.

**Benefits:**
- Smaller request payloads (hash vs full query text).
- Prevents arbitrary queries (only allowlisted hashes accepted).
- CDN caching possible (GET requests with query hash as key).

**Implementation:**
- Use `graphql-codegen` or `relay-compiler` to extract and hash.
- Reject unknown hashes in production (security hardening).
- Allow full queries in development for iteration speed.

### Error handling

```graphql
type Mutation {
  createOrder(input: CreateOrderInput!): CreateOrderPayload!
}

type CreateOrderPayload {
  order: Order
  errors: [UserError!]!
}

type UserError {
  field: [String!]
  message: String!
  code: ErrorCode!
}
```

**Rules:**
- Use payload types with `errors` field for expected user errors (validation, business logic).
- Use GraphQL errors (top-level `errors` array) only for unexpected failures.
- Never expose internal error details (stack traces, SQL errors) to clients.
- Include error codes (enum) for programmatic client handling.

### Caching

**HTTP caching (persisted queries via GET):**
- Cache-Control headers on responses.
- CDN caching for public, non-personalized queries.

**Normalized client cache (Apollo Client, urql):**
- Entities cached by `__typename + id`.
- Mutations automatically update cache when returning modified entities.
- Use `cache.evict()` for deletions.

**Server-side (DataLoader per-request + Redis):**
- DataLoader: automatic per-request deduplication.
- Redis: cross-request caching for expensive computations.
- Set appropriate TTL based on data freshness requirements.

### Type safety (end-to-end)

- Generate TypeScript types from schema: `graphql-codegen`.
- Generate typed hooks for client queries: `@graphql-codegen/typescript-react-apollo`.
- Schema-first development: change schema → regenerate types → compiler catches mismatches.
- CI check: generated types must be up to date (no uncommitted codegen changes).

## Self-check before task completion
- [ ] Did I follow the mandatory actions for this skill?
- [ ] Did I apply the patterns appropriate to the context?
- [ ] Did I verify the implementation meets the criteria above?
- [ ] Did I document decisions and trade-offs made?
