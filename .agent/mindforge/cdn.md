---
name: mindforge:cdn
description: "Optimize CDN caching and invalidation strategy. Usage: /mindforge:cdn [service] [--target-hit-ratio 95%] [--multi-cdn] [--shield]"
argument-hint: "[service] [--target-hit-ratio 95%] [--multi-cdn] [--shield]"
allowed-tools:
  - list_dir
  - view_file
---

<objective>
Optimize CDN caching strategy to maximize hit ratios, minimize origin load, and implement efficient invalidation patterns that maintain content freshness without sacrificing performance.
</objective>

<execution_context>
@.mindforge/skills/cdn-optimization/SKILL.md
</execution_context>

<context>
Skills Directory: `.mindforge/skills/cdn-optimization/`
State: Audits current cache performance and designs optimized caching hierarchy with intelligent invalidation.
</context>

<process>
1. **Audit Current Cache Performance**: Analyze existing CDN metrics — hit ratio, miss ratio, bandwidth savings, origin offload percentage, and per-path cache effectiveness. Identify the top cache-miss contributors.
2. **Design Cache Key Strategy**: Optimize cache key composition to avoid over-keying (too many unique keys from unnecessary query params or headers) while maintaining correctness for content variants (language, device, auth state).
3. **Configure Cache Hierarchy**: Design the multi-tier cache topology — edge PoP → regional shield → origin. Determine which content tiers benefit from shield protection to reduce origin requests from geographically distributed edges.
4. **Implement Purge Strategy**: Design tag-based (surrogate key) invalidation as the primary purge mechanism. Define purge propagation time targets and fallback to URL-pattern purge for emergency invalidation.
5. **Enable Stale-While-Revalidate**: Configure SWR directives to serve stale content while fetching fresh versions in the background. Set appropriate stale-if-error windows for origin failure resilience.
6. **Configure Origin Shielding**: Set up a shield layer that consolidates cache fills from multiple edge locations into a single origin request. Reduces origin load during cache warming and traffic spikes.
7. **Set Up Hit Ratio Monitoring**: Implement real-time dashboards tracking cache hit ratio by path pattern, content type, and geographic region. Define alerting thresholds for hit ratio degradation.
8. **Optimize Per-Path Caching Rules**: Create differentiated TTL and caching policies per URL pattern — static assets (long TTL, immutable), API responses (short TTL, vary headers), HTML pages (medium TTL, SWR). Document each rule.
9. **Plan Multi-CDN Strategy**: If using multiple CDN providers, design DNS-based traffic splitting, failover logic, and consistent cache key normalization across providers.
10. **Load Test Cache Behavior**: Simulate traffic patterns including cache stampede scenarios, purge storms, and geographic shifts to validate the caching architecture performs under stress.
</process>
