---
name: caching-strategies
version: 1.0.0
min_mindforge_version: 0.1.0
status: stable
compose: performance
triggers: caching strategy, cache aside, write through cache, write behind cache, cache invalidation pattern, TTL design, cache warming, cache stampede, cache eviction, distributed cache pattern, cache coherence, cache layer design
---

# Skill — Caching Strategies

## When this skill activates
Any task involving cache layer design, cache invalidation, stampede prevention,
TTL configuration, or distributed caching patterns.

## Mandatory actions when this skill is active

### Before writing any code
1. Identify the data access pattern (read-heavy, write-heavy, mixed).
2. Select the appropriate caching pattern for the use case.
3. Define the invalidation strategy before implementing the cache.

### During implementation
- Implement stampede prevention for all high-traffic cache keys.
- Set TTLs appropriate to data volatility.
- Add cache hit/miss metrics instrumentation.

### After implementation
- Verify cache hit rate meets target (>90% for hot paths).
- Document the caching layer in ARCHITECTURE.md.
- Add monitoring alerts for cache exhaustion and low hit rates.

## Caching Patterns

### Cache-Aside (Lazy Loading)
- Application manages the cache explicitly.
- Read: check cache → miss → read DB → populate cache → return.
- Write: update DB → invalidate cache (not update).
- Best for: read-heavy workloads with tolerance for occasional stale data.
- Risk: thundering herd on cold start or mass invalidation.

### Write-Through
- Application writes to cache and DB synchronously.
- Every write updates both cache and store atomically.
- Read: always from cache (guaranteed fresh).
- Best for: data that is read immediately after write.
- Trade-off: higher write latency, but reads are always consistent.

### Write-Behind (Write-Back)
- Application writes to cache; cache asynchronously flushes to DB.
- Dramatically reduces write latency.
- Best for: high write throughput where eventual consistency is acceptable.
- Risk: data loss if cache node crashes before flush.

## Invalidation Strategies

### Event-Based Invalidation
- Publish cache invalidation events on data mutation.
- Consumers invalidate specific keys on receipt.
- Most precise — invalidates only what changed.

### TTL-Based Expiration
- Set time-to-live on every cache entry.
- Safety net, not a primary strategy.
- Short TTL for volatile data (30s-5m), long TTL for static data (1h-24h).

### Version-Based Invalidation
- Include version number in cache key.
- Increment version on data change — old key naturally expires.
- Good for configuration and template caching.

## Stampede Prevention

### Lock/Mutex Pattern
- First request acquires lock, fetches from DB, populates cache.
- Subsequent requests wait on lock, then read from cache.
- Prevents N simultaneous DB queries for same key.

### Stale-While-Revalidate
- Serve stale cached data immediately.
- Trigger background refresh asynchronously.
- User gets fast response; cache refreshes in background.

### Pre-Computation
- Refresh cache entries before they expire.
- Background job renews popular keys proactively.
- Eliminates cold-cache scenarios entirely.

## TTL Design Guidelines

| Data Type | Recommended TTL | Rationale |
|-----------|----------------|-----------|
| User session | 15-30 minutes | Security balance |
| Product catalog | 1-4 hours | Changes infrequently |
| Static assets | 24h-7 days | Immutable after deploy |
| Real-time prices | 5-30 seconds | High volatility |
| Configuration | 5-15 minutes | Moderate change rate |

## Cache Warming

- Pre-populate cache on deployment with known hot data.
- Run warming job during maintenance windows.
- Prioritize by access frequency (top 20% of keys = 80% of traffic).
- Warm incrementally to avoid overwhelming the data store.

## Cache Layers (Multi-Tier)

### L1: In-Process Cache
- Fastest (nanoseconds), limited by application memory.
- Use for: config, feature flags, frequently accessed reference data.
- Examples: Caffeine (Java), node-cache (Node.js), lru-cache.

### L2: Distributed Cache
- Shared across instances, millisecond latency.
- Use for: session data, computed results, API responses.
- Examples: Redis, Memcached, Hazelcast.

### L3: CDN Cache
- Edge-cached, global distribution.
- Use for: static assets, public API responses, media.
- Examples: CloudFront, Cloudflare, Fastly.

## Self-check before task completion

Before marking a task done when this skill was active:

- [ ] Did I read the full SKILL.md before starting? (Not just the triggers)
- [ ] Did I define an invalidation strategy for every cached entity?
- [ ] Did I implement stampede prevention for high-traffic keys?
- [ ] Did I set appropriate TTLs with documented rationale?
- [ ] Did I add cache hit/miss metrics?
- [ ] Did I document the caching layer in ARCHITECTURE.md?
