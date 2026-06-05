---
description: "Design GraphQL schema and resolver architecture. Usage - /mindforge:graphql [domain] [--style code-first|schema-first] [--federation]"
---

<objective>
Design a GraphQL schema and resolver architecture that models the domain
accurately, prevents N+1 queries via DataLoader, implements cursor-based
pagination for all lists, and provides production-ready configuration with
persisted queries, depth limiting, and cost analysis.
</objective>

<execution_context>
@.mindforge/skills/graphql-patterns/SKILL.md
</execution_context>

<context>
$ARGUMENTS
</context>

<process>
1. Identify domain entities and their relationships: map core types (User, Order, Product), their fields, and connections between them (User has many Orders, Order has many LineItems). Determine which relationships are required vs optional, and identify aggregate roots.
2. Design the type schema based on --style flag: code-first (TypeGraphQL/Nexus — types generated from code, better for rapid iteration) or schema-first (SDL files — explicit contract, better for API-first design). Follow naming conventions: PascalCase for types, camelCase for fields.
3. Implement connections for all list fields using cursor-based pagination: define Connection/Edge/PageInfo types per Relay spec, use opaque cursors (base64-encoded id or timestamp), support first/after and last/before arguments, and include totalCount as optional expensive field.
4. Add DataLoader for ALL nested resolvers to prevent N+1 queries: create one DataLoader per entity type per request (request-scoped), batch all IDs collected in a single event loop tick, implement caching within request lifecycle, and verify with query logging that batch queries fire.
5. Design mutations with input types and meaningful returns: use Input suffix for mutation arguments (CreateUserInput), return the modified entity (not just ID), include userErrors field for domain validation errors (separate from GraphQL errors), and make mutations as specific as possible (updateUserEmail vs generic updateUser).
6. Configure subscriptions if real-time is needed: use WebSocket transport (graphql-ws protocol), implement subscription resolvers with pub/sub backend (Redis), filter events per subscriber (only receive own tenant's events), and handle connection lifecycle (keepalive, reconnection).
7. Set up persisted queries for production: extract all queries at build time into a query map (hash -> query text), reject arbitrary queries in production (allowlist mode), reduce bandwidth (client sends hash instead of full query), and prevent malicious query injection.
8. Implement security and performance guards: query depth limiting (max 7 levels), query cost analysis (assign cost to each field/connection), rate limiting per operation complexity, disable introspection in production, and field-level authorization directives.
9. Configure federation if --federation flag set: identify subgraph boundaries (one per domain team), define entity types with @key directives, implement reference resolvers for cross-subgraph lookups, and configure the gateway (Apollo Router or similar).
10. Log GraphQL design in AUDIT with: domain entities, schema style, pagination approach, DataLoader coverage, subscription needs, persisted query strategy, and federation topology.
</process>
