---
name: mindforge:edge
description: "Design edge computing architecture. Usage: /mindforge:edge [service] [--runtime workers|vercel|deno] [--regions global|specific]"
argument-hint: "[service] [--runtime workers|vercel|deno] [--regions global|specific]"
allowed-tools:
  - list_dir
  - view_file
---

<objective>
Design a latency-optimized edge computing architecture that moves computation closer to users while maintaining data consistency and graceful fallback to origin servers.
</objective>

<execution_context>
@.mindforge/skills/edge-computing/SKILL.md
</execution_context>

<context>
Skills Directory: `.mindforge/skills/edge-computing/`
State: Evaluates service endpoints for edge eligibility and designs distributed execution topology.
</context>

<process>
1. **Identify Latency-Sensitive Endpoints**: Audit all API routes and static assets to determine which endpoints benefit most from edge deployment (sub-50ms response budget, high geographic distribution of users).
2. **Evaluate Edge Eligibility**: For each candidate endpoint, verify statelessness, deterministic output, and sub-50ms compute budget. Flag endpoints requiring write-through or session state as ineligible without adaptation.
3. **Select Edge Runtime**: Based on requirements (cold start tolerance, language support, execution limits), choose between Cloudflare Workers, Vercel Edge Functions, or Deno Deploy. Document tradeoffs.
4. **Design Data Locality Strategy**: Implement read-nearest pattern with write-to-origin routing. Map data access patterns to determine which reads can be served from edge replicas vs. which require origin round-trips.
5. **Configure Caching Layer**: Design stale-while-revalidate caching with appropriate TTLs per endpoint. Define cache key composition to avoid over-keying while maintaining correctness.
6. **Handle Edge Limitations**: Address runtime constraints (CPU time limits, memory caps, no filesystem access). Design workarounds for long-running computations via streaming or chunked responses.
7. **Plan Origin Fallback**: Implement circuit breaker pattern for edge-to-origin failover. Define health check probes and automatic traffic shifting when edge nodes degrade.
8. **Monitor Edge vs. Origin Latency**: Set up comparative latency monitoring (p50, p95, p99) between edge and origin responses. Define alerting thresholds for when edge advantage drops below acceptable margin.
9. **Document Regional Configuration**: Produce a region map specifying which edge locations are active, any geo-restrictions, and data residency compliance constraints.
10. **Validate with Load Profile**: Simulate expected traffic patterns against the edge topology to verify cache hit ratios and confirm latency budgets are met under load.
</process>
