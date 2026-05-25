---
name: microservices-patterns
version: 1.0.0
min_mindforge_version: 10.0.6
status: stable
triggers: microservice, service boundary, bounded context, api contract, saga pattern, event-driven architecture, bulkhead, service mesh, service discovery, distributed system, inter-service communication, service decomposition
---

# Skill — Microservices Patterns

## When this skill activates
Any task involving microservice architecture, service decomposition, inter-service
communication, distributed system design, or API contract definition between services.

## Mandatory actions when this skill is active

### Before

1. **Identify bounded contexts** — Map business capabilities to service boundaries using DDD. Each service owns one bounded context, one database, one deployment unit.
2. **Define communication style** — Synchronous (REST/gRPC) for queries, asynchronous (events) for cross-domain state changes. Default to async.
3. **Assess data ownership** — Each service owns its data exclusively. No shared databases. Cross-service access via APIs or event propagation.

### During

#### Service boundary design (DDD)
```
Decomposition heuristics:
  - Single Responsibility: one reason to change per service
  - Team Ownership: one team owns one service (Conway's Law)
  - Data Cohesion: entities that change together stay together
  - Independent Deployability: releasing one never requires releasing another
```

#### API contracts
- Version all APIs (URL path or header-based)
- REST (OpenAPI 3.1) for external/public APIs
- gRPC (protobuf) for high-throughput internal calls
- Consumer-driven contract testing (Pact) between services
- Breaking changes require new major version + deprecation period

#### Saga orchestration
```
Choreography (2-3 services, simple flows):
  Service A -> emits Event -> Service B reacts -> emits Event -> Service C reacts
  Each service owns its compensating action

Orchestration (4+ services, complex flows):
  SagaCoordinator defines steps + compensations:
    Step 1: InventoryService.reserve() | compensate: release()
    Step 2: PaymentService.charge()    | compensate: refund()
    Step 3: OrderService.confirm()     | compensate: cancel()
```

#### Resilience patterns
```
Bulkhead: separate thread/connection pools per dependency
Circuit Breaker: Closed -> Open (5 failures/10s) -> Half-Open (probe after 30s)
Retry: exponential backoff + jitter, max 3 attempts, idempotent ops only
Timeout: every sync call has an explicit deadline (never infinite)
```

#### Service mesh and discovery
- Kubernetes: use native Services (DNS-based, server-side discovery)
- Non-K8s: Consul or Eureka with client-side load balancing
- Service mesh (Istio/Linkerd) for: mTLS, traffic shaping, observability, retries
- Health checks: active (ping /health every 5s, 3 failures = remove from pool)

### After

1. **Validate data ownership** — No service reads another service's database directly.
2. **Verify fault tolerance** — Every sync call has timeout, retry policy, and circuit breaker.
3. **Check observability** — Distributed tracing (OpenTelemetry), structured logs with correlation IDs, health endpoints.
4. **Contract tests pass** — Consumer-driven contract tests verify API compatibility.

## Self-check before task completion
- [ ] Each service owns exactly one bounded context and one database
- [ ] API contracts versioned and published (OpenAPI or protobuf)
- [ ] Saga compensation defined for every step that can fail
- [ ] Bulkhead isolation prevents cascading failures
- [ ] Circuit breakers on all synchronous inter-service calls
- [ ] Distributed tracing propagates correlation IDs across boundaries
- [ ] No shared databases between services
- [ ] Service discovery mechanism documented and tested
