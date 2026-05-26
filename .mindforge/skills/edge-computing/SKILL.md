---
name: edge-computing
version: 1.0.0
min_mindforge_version: 10.1.1
status: stable
triggers: edge computing, edge function, CDN compute, edge worker, latency optimization, data locality, edge caching, cloudflare workers, deno deploy, edge runtime, compute at edge, edge-first architecture
---

# Skill — Edge Computing

## When this skill activates
Any task involving moving computation closer to users at the network edge,
designing edge functions, optimizing latency through geographic distribution,
or evaluating edge vs origin placement decisions.

## Mandatory actions when this skill is active

### Before writing any code
1. Identify latency-sensitive paths that benefit from edge execution.
2. Decide edge vs origin for each operation using the decision matrix:
   - Latency-sensitive reads → edge
   - Data-heavy computation → origin
   - Personalization with small state → edge
   - Writes requiring strong consistency → origin
3. Document runtime constraints (time limits, memory, bundle size).

### During implementation
- Keep edge function bundles small (<1MB) to minimize cold starts.
- Avoid heavy imports — each dependency adds cold start latency.
- Use stale-while-revalidate for cache coordination.
- Handle edge-to-origin fallback gracefully.
- Never rely on persistent connections at edge (stateless by design).
- Implement proper cache-control headers at every layer.

### After implementation
- Measure actual latency improvement from edge deployment.
- Verify data locality compliance (GDPR region constraints).
- Test cold start performance under real traffic patterns.
- Monitor edge function error rates per region.

## Edge vs Origin Decision Framework

| Signal | Edge | Origin |
|--------|------|--------|
| Latency-critical (<50ms target) | Yes | No |
| Heavy computation (>50ms CPU) | No | Yes |
| Personalization (small state) | Yes | No |
| Database writes | No | Yes |
| Static asset serving | Yes | No |
| Auth token validation | Yes | No |
| Complex business logic | No | Yes |

## Platform Patterns

### Cloudflare Workers
- V8 isolate model (no container cold start).
- KV for eventual-consistent edge state.
- Durable Objects for strong consistency at edge.
- R2 for edge-local object storage.

### Vercel Edge Functions
- Runs on Cloudflare infrastructure.
- Streaming responses supported.
- Middleware pattern for auth/redirects.

### Deno Deploy
- Global V8 isolates with zero cold start.
- Built-in KV for edge state.
- Native Web APIs (fetch, streams, crypto).

## Caching Strategy at Edge
- `Cache-Control: public, max-age=60, stale-while-revalidate=300` for dynamic content.
- `Cache-Control: public, max-age=31536000, immutable` for hashed static assets.
- Purge on deploy for cache invalidation.
- Use cache tags for granular invalidation.

## Limitations to Always Consider
- Time limits (typically 30s-50ms CPU time depending on platform).
- Memory limits (128MB typical).
- No persistent connections (WebSocket requires special handling).
- Bundle size constraints (1-10MB depending on platform).
- Limited Node.js API compatibility at edge.
- Eventual consistency for distributed edge state.

## Self-check
- [ ] Edge vs origin decision documented for each function.
- [ ] Cold start measured and acceptable (<50ms target).
- [ ] Bundle size within platform limits.
- [ ] Fallback to origin implemented for edge failures.
- [ ] Data locality compliant with regulatory requirements.
- [ ] Cache headers set correctly at every layer.
