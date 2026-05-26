---
name: api-gateway-patterns
version: 1.0.0
min_mindforge_version: 0.1.0
status: stable
compose: api-design
triggers: api gateway, rate limiting design, request routing, auth offloading, response transformation, backend for frontend, gateway circuit breaker, request aggregation, api composition, gateway caching, gateway throttling, gateway authentication
---

# Skill — API Gateway Patterns

## When this skill activates
Any task involving API gateway configuration, rate limiting design, request
routing, authentication offloading, BFF patterns, or gateway-level caching.

## Mandatory actions when this skill is active

### Before writing any code
1. Identify which cross-cutting concerns belong at the gateway vs service level.
2. Define rate limiting strategy (algorithm, limits, granularity).
3. Determine if BFF pattern is needed (multiple client types).

### During implementation
- Keep gateway logic stateless (no session state in gateway).
- Implement circuit breakers per downstream service.
- Add request correlation IDs at the gateway for distributed tracing.

### After implementation
- Load test rate limiting configuration.
- Verify circuit breaker thresholds with failure injection.
- Document gateway routing rules in ARCHITECTURE.md.

## Rate Limiting Algorithms

### Token Bucket
- Bucket holds N tokens, refills at constant rate.
- Each request consumes one token.
- Allows bursts up to bucket capacity.
- Best for: APIs that need burst tolerance.

### Sliding Window
- Count requests in rolling time window.
- Smoother than fixed window (no boundary burst issue).
- Best for: strict per-second/minute rate enforcement.

### Fixed Window
- Count requests per calendar interval (e.g., per minute).
- Simple to implement, but allows 2x burst at window boundary.
- Best for: simple use cases where boundary bursts are acceptable.

### Rate Limit Granularity
- **Per-user**: fairest, prevents one user from affecting others.
- **Per-IP**: catches unauthenticated abuse, but shared IPs cause issues.
- **Per-endpoint**: different limits for reads vs writes.
- **Per-plan**: higher limits for premium tier customers.

### Response Headers
```
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 847
X-RateLimit-Reset: 1623456789
Retry-After: 30
```

## Authentication Offloading

### Pattern
1. Client sends request with auth token to gateway.
2. Gateway validates JWT signature and expiration.
3. Gateway extracts claims (user_id, roles, permissions).
4. Gateway passes claims as trusted headers to downstream services.
5. Downstream services trust headers (internal network only).

### Benefits
- Auth logic in one place, not duplicated across services.
- Downstream services are simpler (no JWT library needed).
- Token refresh/rotation handled centrally.

### Security Considerations
- Strip incoming trust headers from external requests (prevent spoofing).
- Internal services MUST reject requests without gateway headers.
- Gateway must validate token on every request (no caching of auth decisions).

## Backend for Frontend (BFF)

### Pattern
- One gateway per client type: web, mobile, third-party.
- Each BFF tailored to client needs (field selection, aggregation).
- Mobile BFF: fewer fields, compressed responses, batch endpoints.
- Web BFF: full responses, pagination, real-time subscriptions.
- Third-party BFF: stable API, versioned, rate-limited.

### When to Use BFF
- Different clients need different data shapes.
- Mobile clients need response optimization (bandwidth).
- Third-party API needs different auth and rate limiting.

## Request Aggregation

### Pattern
- Client sends one request to gateway.
- Gateway fans out to multiple backend services.
- Gateway combines responses into single response.
- Returns aggregated result to client.

### Best Practices
- Set timeout per downstream call (don't wait forever).
- Return partial results if some backends fail (degrade gracefully).
- Cache individual backend responses independently.
- Use async/parallel calls to backends (not sequential).

## Circuit Breaking (Per-Route)

### States
- **Closed**: requests flow normally, failures counted.
- **Open**: requests immediately fail (503), no backend calls.
- **Half-Open**: allow one probe request to test recovery.

### Configuration Per Downstream
```yaml
payment-service:
  failure_threshold: 5       # failures before opening
  timeout: 10s               # time in open state before half-open
  success_threshold: 3       # successes in half-open to close

inventory-service:
  failure_threshold: 10
  timeout: 30s
  success_threshold: 5
```

### Fallback Strategies
- Return cached response (stale but functional).
- Return default/empty response with degraded flag.
- Route to alternative backend (failover service).

## Gateway Caching

### What to Cache
- GET responses with stable data (product catalog, configuration).
- Use ETag/Last-Modified for conditional requests.
- Cache per-user or per-role (never cache authenticated data globally).

### What NOT to Cache
- POST/PUT/DELETE responses.
- Responses with `Cache-Control: no-store`.
- Responses containing PII without per-user isolation.

### Cache Invalidation at Gateway
- TTL-based (simple, eventual consistency).
- Purge API (explicit invalidation from backend on mutation).
- Surrogate keys (tag responses, purge by tag).

## Response Transformation

### Appropriate at Gateway
- Field filtering (client requests specific fields).
- Pagination wrapping (add metadata to list responses).
- Format conversion (JSON to XML for legacy clients).
- Header manipulation (add CORS, security headers).

### NOT Appropriate at Gateway
- Business logic transformation.
- Data enrichment from other services.
- Complex aggregation with business rules.

## Self-check before task completion

Before marking a task done when this skill was active:

- [ ] Did I read the full SKILL.md before starting? (Not just the triggers)
- [ ] Is gateway logic stateless?
- [ ] Are rate limits per-user (not just per-IP)?
- [ ] Are circuit breakers configured per downstream service?
- [ ] Is auth offloading stripping external trust headers?
- [ ] Is business logic kept out of the gateway?
- [ ] Are request correlation IDs generated at the gateway?
