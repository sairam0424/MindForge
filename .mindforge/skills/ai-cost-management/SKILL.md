---
name: ai-cost-management
version: 1.0.0
min_mindforge_version: 10.5.0
status: stable
triggers: AI cost management, token budget optimization, model cost selection, LLM response caching, batch inference processing, AI infrastructure cost, token usage monitoring, cost-aware model routing, inference cost reduction, GPU utilization optimization, AI spend tracking, cost per query optimization
compose:
  - llm-cost-optimization
---

# AI Cost Management & Optimization

## When this skill activates

This skill activates when optimizing AI inference costs, implementing token budgeting, designing cost-aware model routing, or tracking AI spending at scale. It applies to production AI systems where compute costs are significant (>$10K/month) and must be controlled without degrading user experience.

## Mandatory actions when this skill is active

### Before writing any code

1. **Establish cost baseline** — Measure current costs per dimension: cost per request, cost per user, cost per model, cost per task type. Identify cost drivers: which models, which tasks, which users consume the most budget. Focus optimization efforts on the top 20% of cost drivers (Pareto principle).
2. **Set cost budgets and alerts** — Define acceptable cost thresholds per day, per week, per month. Set up alerts when spending exceeds thresholds (50%, 80%, 100%). Alerts prevent runaway costs from unexpected usage spikes or inefficient code.
3. **Design cost attribution model** — Assign costs to cost centers: per-team, per-product, per-customer tier (free vs. paid). Enables chargeback (internal teams pay for their usage) and informs product decisions (should free tier have lower model quality to reduce costs?).
4. **Identify optimization opportunities** — Rank opportunities by potential savings: caching (30-70% reduction for repetitive queries), model downgrade (10-50% reduction with minimal quality loss), batching (20-40% reduction via throughput optimization), prompt compression (10-30% reduction by reducing tokens).

### During implementation

- **Implement aggressive response caching** — Cache LLM responses keyed by prompt hash + model + hyperparameters. Cache hit rate >50% is achievable for many use cases. Use Redis or Memcached for low-latency lookups (<1ms). Set TTL based on content freshness requirements (hours for news, days for documentation, indefinite for static content).
- **Design cost-aware routing** — Route requests to the cheapest model that meets quality requirements. Example: simple classification → Haiku ($0.25/MTok), complex reasoning → Opus ($15/MTok). Measure quality degradation when downgrading models. If accuracy drop is <2%, downgrade is safe.
- **Compress prompts aggressively** — Remove filler words, use abbreviations, compress whitespace. Test that compressed prompts produce equivalent outputs. Measure compression ratio (original tokens / compressed tokens). Target: 20-50% compression with <1% quality loss.
- **Batch inference for throughput** — Group requests into batches (10-100 per batch) to maximize GPU utilization. Batching increases throughput (requests/second) and reduces cost per request (amortize fixed overhead). Trade-off: higher latency (wait for batch to fill) for lower cost.
- **Implement prompt caching (for supported models)** — Use prompt caching for repeated prompt prefixes (system message, context). Claude and GPT-4 support prompt caching. Reduces cost by 90% for cached tokens. Ensure prompts are structured with stable prefixes and variable suffixes.
- **Track token usage per request** — Log input tokens, output tokens, and total cost per request. Aggregate by model, task type, user, and time. Identify outliers: queries with unusually high token counts (may indicate inefficient prompts or bugs). Set up monitoring dashboards.

### After implementation

- **Measure cache hit rate** — Track % of requests served from cache. Target: >50% hit rate for production systems with repetitive queries. If lower, analyze cache misses: are prompts subtly different (normalize prompts), is TTL too short (increase TTL), or is traffic too diverse (caching won't help)?
- **Validate quality after cost optimization** — Compare model accuracy, user satisfaction, or business metrics before and after optimization. Acceptable thresholds: <2% accuracy drop, <5% user satisfaction drop. If degradation is higher, roll back optimizations.
- **Benchmark cost reduction** — Measure cost per request after optimizations vs. baseline. Target: 30-50% cost reduction from caching + routing + compression. Document savings in $/month and ROI (developer time spent vs. cost saved).
- **Monitor for cost anomalies** — Set up alerts for sudden cost spikes (>2x daily average) or unusual patterns (single user consuming 10x typical usage). Anomalies indicate bugs (infinite loops, retry storms) or abuse (attackers exploiting free tier).

## Self-check before task completion

- [ ] Cost baseline is measured per request, user, model, and task type
- [ ] Cost budgets are set with alerts at 50%, 80%, 100% thresholds
- [ ] Cost attribution model assigns costs to teams, products, or customer tiers
- [ ] Optimization opportunities are ranked by potential savings and effort
- [ ] Response caching is implemented with cache hit rate tracked (target >50%)
- [ ] Cost-aware routing selects cheapest model that meets quality requirements
- [ ] Prompt compression achieves 20-50% token reduction with <1% quality loss
- [ ] Batch inference is implemented for throughput optimization (10-100 requests per batch)
- [ ] Prompt caching (if supported) reduces cost by 90% for repeated prompt prefixes
- [ ] Token usage is logged per request and aggregated by model, task, user, time
- [ ] Cache hit rate is validated at >50% for production systems with repetitive queries
- [ ] Model quality is validated post-optimization (<2% accuracy drop, <5% satisfaction drop)
- [ ] Cost reduction is benchmarked (target 30-50% reduction from baseline)
- [ ] Cost anomaly alerts are configured for spikes (>2x daily average) and abuse patterns
