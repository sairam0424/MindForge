---
description: "Design rate limiting strategy with per-tenant quotas. Usage - /mindforge:rate-limit [api] [--algorithm token-bucket|sliding-window] [--per-tenant]"
---

<objective>
Design a rate limiting strategy that protects the API from abuse, implements
fair per-tenant quotas across pricing tiers, uses distributed counters for
horizontal scaling, and provides clear feedback to clients via standard
rate limit headers with burst allowance for legitimate traffic spikes.
</objective>

<execution_context>
@.mindforge/skills/rate-limiting-design/SKILL.md
</execution_context>

<context>
$ARGUMENTS
</context>

<process>
1. Choose algorithm based on --algorithm flag: token bucket (allows bursts up to bucket size, refills at steady rate — best for APIs with bursty traffic), sliding window log (precise per-window counting — best for strict compliance), or sliding window counter (approximation with lower memory — best for high-volume APIs). Document trade-offs.
2. Define limits per pricing tier: free tier (100 req/min, 1000 req/day), pro tier (1000 req/min, 50000 req/day), enterprise tier (10000 req/min, unlimited daily with fair-use policy). Set per-endpoint overrides for expensive operations (e.g., search: 10 req/min free).
3. Implement distributed counter using Redis: MULTI/EXEC for atomic increment + TTL, use sorted sets for sliding window, or Lua scripts for token bucket. Ensure counter survives Redis restart (persistence) and handle Redis unavailability (fail-open with local fallback).
4. Configure standard rate limit headers on every response: X-RateLimit-Limit (max requests), X-RateLimit-Remaining (requests left), X-RateLimit-Reset (UTC epoch when window resets), and Retry-After (seconds to wait on 429). Return 429 Too Many Requests with JSON error body.
5. Handle burst allowance: configure token bucket capacity at 2x the per-second rate (e.g., 100 req/min = 1.67/sec steady, allow burst of 3/sec). Document burst behavior in API docs so clients can optimize request timing.
6. Set up bypass for internal services: whitelist internal service accounts by API key prefix, implement separate limits for service-to-service calls (10x user limits), and add request header (X-Internal-Service) for observability without bypassing auth.
7. Add adaptive rate limiting for incidents: automatically reduce limits by 50% when error rate exceeds 5% or latency exceeds 2x baseline. Implement gradual restoration over 5 minutes after recovery. Log all adaptive changes.
8. Monitor and alert on quota exhaustion: track 429 response rate per tenant, alert when any tenant consistently hits limits (potential abuse or under-provisioned tier), dashboard showing top consumers, and weekly report of tenants approaching upgrade thresholds.
9. Design rate limit key composition: combine tenant_id + endpoint + time_window for per-tenant per-endpoint limiting. Support IP-based limiting for unauthenticated endpoints and geographic limiting for compliance (e.g., different limits per region).
10. Log rate limiting design in AUDIT with: API, algorithm, tier definitions, burst policy, bypass rules, adaptive thresholds, and monitoring configuration.
</process>
