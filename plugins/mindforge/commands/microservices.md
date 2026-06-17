---
description: "Design microservice boundaries, API contracts, and communication patterns. Usage: /mindforge:microservices [component] [--style event-driven|request-reply]"
---

<objective>
Decompose a system into well-bounded microservices with clearly defined API contracts, communication patterns, and saga orchestration. Ensures no circular dependencies and validates domain alignment.
</objective>

<execution_context>
@.mindforge/skills/microservices-patterns/SKILL.md
</execution_context>

<context>
Arguments: $ARGUMENTS (target component or domain area, optional --style flag)
Knowledge: Domain model from ARCHITECTURE.md, bounded contexts, existing service inventory.
</context>

<process>
1. **Identify domain boundaries**: Analyze the target component against the domain model. Map nouns to aggregates, verbs to commands/events. List candidate service boundaries.

2. **Define bounded contexts**: For each candidate service, define its bounded context — what data it owns, what language it uses, what invariants it enforces. Write context map showing relationships (Shared Kernel, Customer-Supplier, Conformist, ACL).

3. **Design API contracts**: For each service boundary, define the public API contract:
   - REST endpoints (OpenAPI 3.1 schema) or gRPC proto definitions
   - Request/response types with validation rules (Zod schemas)
   - Versioning strategy (URL path vs header)
   - Error contract (RFC 7807 Problem Details)

4. **Choose communication style**: Based on `--style` flag or inferred from requirements:
   - `event-driven`: Define event schemas, topic naming, ordering guarantees, idempotency keys
   - `request-reply`: Define sync call chains, circuit breaker placement, timeout budgets
   - Hybrid: identify which interactions need sync vs async

5. **Document saga flows**: For operations spanning multiple services, design compensation-based sagas:
   - Sequence diagram for happy path
   - Compensation steps for each failure point
   - Saga orchestrator vs choreography decision with rationale

6. **Define data ownership**: Each service owns its data store. Document:
   - Which entities belong to which service
   - How cross-service queries are resolved (API composition, CQRS read models, event sourcing)
   - Data consistency model (eventual vs strong, per boundary)

7. **Validate no circular dependencies**: Build a directed dependency graph of all services. Run topological sort — if it fails, circular dependency exists. Propose resolution (extract shared service, merge services, or introduce event-based decoupling).

8. **Design resilience patterns**: For each inter-service call:
   - Circuit breaker configuration (thresholds, half-open behavior)
   - Retry policy (exponential backoff, max attempts, jitter)
   - Bulkhead isolation (thread pool or semaphore)
   - Timeout budget allocation across the call chain

9. **Output service catalog**: Write a structured service catalog document containing:
   - Service name, owner, bounded context
   - Public API summary
   - Dependencies (upstream/downstream)
   - Communication style per dependency
   - Data store type and ownership

10. **Verify alignment**: Cross-reference the decomposition against:
    - Team structure (Conway's Law alignment)
    - Deployment independence (can each service deploy without coordinating?)
    - Failure isolation (does one service failure cascade?)
    Report any violations with recommended fixes.
</process>
