---
name: performance
version: 1.0.0
min_mindforge_version: 0.3.0
status: stable
triggers: performance, latency, throughput, cache, caching, slow, optimise, optimize,
          bottleneck, profil, load time, bundle size, memory, CPU, N+1, query time,
          response time, timeout, rate limit, debounce, throttle, memoize, lazy load,
          code split, tree shake, LCP, CLS, FID, INP, Core Web Vitals, lighthouse
---

# Skill — Performance Engineering

## When this skill activates
Any task involving response time, resource usage, bundle size, database query
performance, or user-perceived load time metrics.

## Mandatory actions when this skill is active

### Before writing any code
1. Identify what is being measured. Never optimise without a baseline.
2. Read the relevant metric from REQUIREMENTS.md (NFRs):
   - API response time target (e.g., p95 < 200ms)
   - Page load time target (e.g., LCP < 2.5s)
   - Bundle size budget (e.g., < 200KB gzipped initial JS)
3. If no NFR is defined: ask the user to define one before optimising.
   "Optimisation without a target is premature optimisation."

### Backend performance standards

**Database queries:**
- Every query must use indexes for its WHERE, JOIN, and ORDER BY columns
- Detect N+1 queries: if fetching a list then querying per item, use JOIN or batch fetch
- Pagination: always paginate list endpoints (default page size: 20, max: 100)
- Avoid `SELECT *` — select only the columns needed
- Use `EXPLAIN ANALYZE` (PostgreSQL) or `EXPLAIN` (MySQL) to verify query plans
- Cache repeated identical queries: Redis with appropriate TTL

**API response time:**
- Default targets (override with NFRs): p50 < 100ms, p95 < 500ms, p99 < 2000ms for most endpoints
- Slow endpoints (> 500ms): must be async (return immediately, use webhooks or polling)
- Database connection pooling: always use a connection pool (never open/close per request)
- Pool sizing: start with `min=2`, `max=CPU * 2 + 2` per instance, then tune to DB limits and workload
- Serverless: prefer a DB proxy (PgBouncer, RDS Proxy) or driver-level pooling that supports bursty concurrency
- Avoid synchronous I/O in request handlers
- Cache hot DB reads at the query or service layer when data is read-heavy and tolerant of staleness

**Caching strategy:**
Defaults below — tune per data freshness requirements and invalidate on writes.
| Data type | Recommended cache | TTL |
|---|---|---|
| User session data | Redis | 24 hours |
| Computed aggregates | Redis | 1–5 minutes |
| Static reference data | Redis | 1 hour |
| User-specific data | Redis with user key | 15 minutes |
| API responses | HTTP Cache-Control | depends on freshness needs |

### Frontend performance standards

**Bundle size budgets:**
| Asset | Budget (gzipped) |
|---|---|
| Initial JavaScript | < 200KB |
| Initial CSS | < 50KB |
| Per-route chunk | < 100KB |
| Images (hero) | < 200KB WebP |
| Fonts | < 50KB per weight |

**Core Web Vitals targets (Google's thresholds):**
| Metric | Good | Needs improvement | Poor |
|---|---|---|---|
| LCP (Largest Contentful Paint) | < 2.5s | 2.5–4s | > 4s |
| INP (Interaction to Next Paint) | < 200ms | 200–500ms | > 500ms |
| CLS (Cumulative Layout Shift) | < 0.1 | 0.1–0.25 | > 0.25 |

**Implementation patterns:**
- Route-based code splitting: every route is its own chunk
- Lazy load non-critical components: `React.lazy()` + `Suspense`
- Image optimisation: use `next/image` or equivalent. Always specify `width`/`height`.
- Font loading: `font-display: swap`. Preload critical fonts.
- Avoid layout thrashing: batch DOM reads before DOM writes
- Debounce user input handlers (search: 300ms, resize: 100ms)
- Memoize expensive computations: `useMemo` / `useCallback` where measured

**SSR/SSG guidance:**
- Prefer SSG for marketing and content pages with low data volatility
- Prefer SSR for personalized data, but watch TTFB and cache at the edge where possible
- For hybrid apps, stream server components or HTML where supported to reduce TTFB and improve LCP

### Performance measurement commands

```bash
# Backend: measure API response time
curl -w "@curl-format.txt" -o /dev/null -s https://api.example.com/endpoint

# Frontend: Lighthouse CI
npx lighthouse https://example.com --output json --output-path ./lighthouse.json

# Bundle analysis
npx bundle-analyzer stats.json

# Node.js profiling
node --prof app.js
node --prof-process isolate-*.log > profile.txt

# Database: explain query
EXPLAIN ANALYZE SELECT * FROM users WHERE email = 'test@example.com';
```

## Performance review checklist
Before marking any task done that involves a query or endpoint:
- [ ] Query uses appropriate indexes (verified with EXPLAIN)
- [ ] No N+1 queries in list endpoints
- [ ] Response time verified locally (curl with timing)
- [ ] No `SELECT *` in production queries
- [ ] Caching applied where data is read-heavy and tolerance allows staleness

## Output
Write performance notes to SUMMARY.md:
- Baseline metric (before)
- Achieved metric (after)
- What optimisation was applied
- Whether the NFR target was met ✅ or still needs work ⚠️
