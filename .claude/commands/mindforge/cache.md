---
description: Design caching strategy with invalidation patterns. Usage - /mindforge:cache [service] [--pattern aside|through|behind] [--layers N]
---

<objective>
Design a multi-layer caching architecture with explicit invalidation strategies
that eliminates cache stampedes, prevents stale data serving, and provides
observable hit rates. Covers L1 (in-process), L2 (shared), and L3 (CDN) layers.
</objective>

<execution_context>
@.mindforge/skills/caching-strategies/SKILL.md
</execution_context>

<context>
$ARGUMENTS
</context>

<process>
1. Identify hot data paths by analyzing access patterns — read-heavy endpoints, expensive computations, frequently-joined data. Quantify read/write ratios for each candidate.
2. Select the caching pattern based on --pattern flag: cache-aside (application manages cache explicitly), read-through/write-through (cache handles persistence transparently), or write-behind (async write batching for high throughput).
3. Design the invalidation strategy: event-driven invalidation (publish on write), TTL-based expiration (with jitter to prevent thundering herd), or version-based (cache key includes data version).
4. Prevent cache stampedes using established patterns: request coalescing (single-flight), probabilistic early expiration (XFetch), or mutex/lock-based recomputation with stale-while-revalidate.
5. Set TTLs appropriate to data freshness requirements: seconds for session data, minutes for API responses, hours for reference data. Add random jitter (10-20%) to all TTLs.
6. Design cache layers based on --layers flag: L1 in-process (Map/LRU, ~1ms, small), L2 shared (Redis/Memcached, ~5ms, medium), L3 CDN (CloudFront/Fastly, ~50ms, large). Define promotion/demotion rules.
7. Implement cache monitoring: track hit rate, miss rate, eviction rate, and latency per cache layer. Set alerts on hit rate dropping below threshold (e.g., 80%).
8. Plan cache warming strategy for cold starts: pre-populate on deploy using background job, implement graceful degradation when cache is cold (slightly slower, never broken).
9. Document cache key naming conventions, serialization format, and max entry sizes. Define cache bypass mechanisms for debugging (e.g., Cache-Control: no-cache header).
10. Log cache invocation in AUDIT with: service, pattern, layers, estimated hit rate improvement, invalidation strategy.
</process>
