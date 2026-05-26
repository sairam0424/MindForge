---
name: rate-limiting-design
version: 1.0.0
min_mindforge_version: 10.0.9
status: stable
triggers: rate limiting design, token bucket algorithm, leaky bucket, sliding window counter, distributed rate limit, per-tenant quota, rate limit header, throttling strategy, quota management, burst allowance, rate limit bypass, adaptive rate limit
compose: api-gateway-patterns
---

# Skill — Rate Limiting Design

## When this skill activates
Any task involving rate limiting, algorithm selection, distributed rate limits,
per-tenant quotas, throttling, burst allowance, or adaptive limiting.

## Mandatory actions when this skill is active

### Before writing any code
1. Define limits per endpoint based on expected usage and resource cost.
2. Choose algorithm for traffic pattern (bursty vs smooth).
3. Determine scope (per-user, per-API-key, per-IP, per-tenant).

### During implementation
- Return standard rate limit headers on every response.
- Implement distributed limiting if multi-instance (Redis + Lua).
- Configure per-plan tier limits (free/pro/enterprise).
- Add bypass for internal services and health checks.

### After implementation
- Test under burst and sustained high load.
- Verify distributed consistency (same user, different instances).
- Document limits in API docs with examples.

## Algorithm Selection

| Algorithm | Behavior | Best For |
|-----------|----------|----------|
| Token Bucket | Allows bursts up to bucket size, smooth sustained rate | Most APIs (general purpose) |
| Leaky Bucket | Perfectly smooth output, no bursts | Outgoing rate limiting, pipelines |
| Sliding Window | Accurate counting, no boundary spikes | Precise per-minute/hour limits |
| Fixed Window | Simple INCR+EXPIRE, boundary spike risk | Simple cases, acceptable edge spikes |

## Distributed Implementation (Redis Lua)
- Atomic token bucket via Lua script (read + compute + write in one round-trip).
- Key format: `{user:123}:ratelimit` (hash tags for Redis Cluster slot).
- Fail-open if Redis unreachable (prefer availability) or fail-closed (prefer safety).

## Per-Tenant Quotas

```
Plan        Req/min   Req/day     Burst
Free        60        10,000      10
Pro         600       100,000     100
Enterprise  6,000     1,000,000   1,000
```

- Store plan in cache. Key includes tenant: `ratelimit:{tenant}:{endpoint}`.
- Separate limits per endpoint if resource cost varies.

## Response Headers

```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 73
X-RateLimit-Reset: 1704067260   (Unix timestamp)
```

429 response must include: `Retry-After` header, error message, and remaining=0.

## Adaptive Rate Limiting
- Normal (<60% load): relax limits 1.2x. High (80-90%): tighten to 0.5x.
- Emergency (>90%): tighten to 0.2x. Gradual steps over 30-60s (avoid thundering herd).
- Always return `Retry-After` so clients back off gracefully.

## Bypass Rules
- Exempt: health checks, internal mTLS calls, admin endpoints, webhook receivers.
- Bypass requires authentication. Log bypassed requests for audit.
- Decision happens BEFORE rate limit check (zero overhead path).

## Scope

- **Per-User**: by user ID or API key. Most common for SaaS.
- **Per-IP**: for unauthenticated (login, public). Risk: shared NAT IPs.
- **Per-Endpoint**: expensive ops (search, export) get lower limits.

## Self-check before task completion

- [ ] Is the algorithm appropriate for the traffic pattern?
- [ ] Are rate limit headers returned on every response?
- [ ] Is the implementation distributed-safe (no race conditions)?
- [ ] Are per-tenant quotas configured with tier differentiation?
- [ ] Is 429 response informative (Retry-After, error details)?
- [ ] Are bypass rules defined for health checks and internal services?
- [ ] Is adaptive limiting considered for overload protection?
