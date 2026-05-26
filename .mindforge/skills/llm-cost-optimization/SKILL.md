---
name: llm-cost-optimization
version: 1.0.0
min_mindforge_version: 0.1.0
status: stable
compose: cost-aware-routing
triggers: llm cost optimization, prompt compression, semantic caching, model cascading, batch api, token estimation, cost per query, model routing optimization, output token reduction, prompt deduplication, cache hit rate, cost monitoring
---

# Skill — LLM Cost Optimization

## When this skill activates
Any task involving LLM API cost reduction, prompt compression, semantic caching,
model cascading/routing, batch API usage, or token budget management.

## Mandatory actions when this skill is active

### Before writing any code
1. Establish baseline costs (cost per query, daily/monthly spend, cost by feature).
2. Identify the biggest cost drivers (which prompts, which models, which features).
3. Set cost reduction targets with quality guardrails.

### During implementation
- Implement semantic caching for repeated/similar queries.
- Use model cascading (start cheap, escalate only when needed).
- Add token estimation before API calls (pre-flight cost check).

### After implementation
- Monitor cost per query, cache hit rate, and cascade escalation rate.
- Set up cost anomaly alerts (spike detection).
- Document cost optimization decisions in ARCHITECTURE.md.

## Prompt Compression

### System Prompt Optimization
- Remove redundant instructions (LLMs don't need repetition like humans).
- Use abbreviations and compact formatting in system prompts.
- Reference items by ID rather than including full content.
- Cache static system prompts (most providers support this).

### Context Window Efficiency
- Include only relevant context (not entire documents).
- Summarize long documents before including in prompt.
- Use structured formats (JSON/YAML) over verbose prose for data.
- Remove examples from system prompt once model demonstrates understanding.

### Token Reduction Techniques
| Technique | Savings | Quality Impact |
|-----------|---------|---------------|
| Remove redundant instructions | 10-30% | None |
| Abbreviate system prompt | 15-25% | Minimal |
| Summarize context | 40-60% | Low-moderate |
| Reference by ID | 50-70% | None (if lookup available) |
| Fewer few-shot examples | 30-50% | Low (if model is capable) |

## Semantic Caching

### Concept
- Hash similar queries → return cached response if semantically equivalent.
- Not exact-match caching — uses embedding similarity.
- Threshold: if query embedding distance < 0.05, serve cached response.

### Implementation
```
1. Embed incoming query
2. Search cache for similar queries (cosine similarity > 0.95)
3. If hit: return cached response (cost = ~$0)
4. If miss: call LLM, store response in cache with query embedding
```

### Cache Invalidation
- TTL-based: expire after N hours (for time-sensitive data).
- Event-based: invalidate when underlying data changes.
- Version-based: invalidate when prompt/model version changes.

### Expected Performance
- Cache hit rate: 20-60% for typical applications.
- Cost reduction: proportional to hit rate.
- Latency improvement: 10-100x faster on cache hits.

## Model Cascading

### Pattern
```
Query → Haiku/Small Model → Quality Check → Pass? → Return
                                                → Fail? → Sonnet/Large Model → Return
```

### Implementation Rules
- Start with cheapest model capable of the task.
- Define quality gate (confidence score, format validation, length check).
- Escalate to more expensive model only when quality gate fails.
- Track escalation rate (target: < 20% of queries escalate).

### Model Tier Pricing (Approximate)
| Tier | Model Examples | Cost (per 1M tokens) | Use For |
|------|---------------|----------------------|---------|
| Cheap | Haiku, GPT-4o-mini | $0.25-1.00 | Simple tasks, classification, extraction |
| Medium | Sonnet, GPT-4o | $3.00-15.00 | Most generation, reasoning |
| Expensive | Opus, o1 | $15.00-75.00 | Complex reasoning, critical decisions |

### Routing Heuristics
- Classification/extraction → always use cheap model.
- Code generation → medium model (escalate if syntax errors).
- Complex reasoning → start medium, escalate if confidence low.
- Safety-critical → always use expensive model (no cascading).

## Batch API Usage

### When to Use
- Non-real-time workloads (background processing, ETL, reports).
- Large volume of similar requests.
- Typical discount: 50% cheaper than synchronous API.

### Batch-Eligible Workloads
- Document summarization pipelines.
- Nightly content generation.
- Bulk classification/tagging.
- Training data generation.
- Automated evaluations.

### Implementation
- Queue requests during the day.
- Submit batch job during off-peak (overnight).
- Process results next morning.
- Set up retry for failed items in batch.

## Token Estimation

### Pre-Flight Cost Check
```python
estimated_tokens = count_tokens(system_prompt + context + query)
estimated_cost = estimated_tokens * price_per_token
if estimated_cost > budget_threshold:
    compress_context()  # or reject query
```

### Token Counting
- Use tiktoken (OpenAI) or provider-specific tokenizer.
- Count BEFORE sending to API (not after).
- Include expected output tokens in estimate.
- Set max_tokens to limit output cost.

### Budget Controls
- Per-query budget: reject or compress if estimated cost too high.
- Per-user budget: track cumulative cost, throttle when approaching limit.
- Per-feature budget: allocate cost budgets to product features.

## Output Token Reduction

### Techniques
- Set `max_tokens` to reasonable limit for the task.
- Instruct model to be concise: "Answer in 2-3 sentences."
- Use structured output (JSON) to prevent verbose prose.
- Ask for key information only, not explanations (when appropriate).

### Output Cost Impact
| Approach | Typical Output Reduction | Quality Impact |
|----------|------------------------|---------------|
| max_tokens cap | Varies | May truncate if too aggressive |
| Conciseness instruction | 30-50% | Usually none for factual tasks |
| JSON/structured output | 40-60% | None (often improves) |
| Enumerate, don't explain | 50-70% | Low for extraction tasks |

## Cost Monitoring

### Key Metrics
| Metric | Alert Threshold | Description |
|--------|----------------|-------------|
| Daily cost | > 2x rolling average | Anomaly detection |
| Cost per query | > budget ceiling | Individual query cost |
| Cache hit rate | < 30% (if caching enabled) | Cache effectiveness |
| Escalation rate | > 30% | Cascade efficiency |
| Token waste ratio | > 20% unused max_tokens | Over-allocated budgets |

### Dashboard Requirements
- Cost breakdown by: feature, model, endpoint, user tier.
- Trend lines: daily, weekly, monthly.
- Forecast: projected monthly cost at current rate.
- Anomaly alerts: immediate notification on cost spikes.

### Optimization Feedback Loop
```
Monitor costs → Identify top cost drivers → Apply optimization →
Measure improvement → Adjust thresholds → Repeat monthly
```

## Self-check before task completion

Before marking a task done when this skill was active:

- [ ] Did I read the full SKILL.md before starting? (Not just the triggers)
- [ ] Is semantic caching implemented for repeated queries?
- [ ] Is model cascading configured (cheap first, escalate on failure)?
- [ ] Are token budgets estimated before API calls?
- [ ] Is cost monitoring in place with anomaly alerts?
- [ ] Are batch APIs used for non-real-time workloads?
- [ ] Is prompt compression applied to system prompts?
