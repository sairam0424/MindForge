---
name: "mindforge:llm-route"
description: "Design LLM orchestration and routing. Usage: /mindforge:llm-route [system] [--strategy cascade|parallel|router] [--budget tokens]"
argument-hint: "[system] [--strategy cascade|parallel|router] [--budget tokens]"
allowed-tools:
  - list_dir
  - view_file
---

<objective>
Design intelligent LLM orchestration systems that route requests across multiple models based on complexity, cost, and latency requirements. This command creates routing strategies (cascade, parallel, learned routing), fallback mechanisms, and optimization patterns that balance quality, speed, and cost across heterogeneous LLM deployments.
</objective>

<execution_context>
@.mindforge/skills/llm-orchestration/SKILL.md
</execution_context>

<context>
Skills Directory: `.mindforge/skills/llm-orchestration/`
State: Analyzes request patterns, model capabilities, cost constraints, and quality thresholds to design routing logic, caching strategies, and orchestration workflows that optimize for throughput and accuracy.
</context>

<process>
1. **Request Classification**: Design intent classification to route queries by type (factual lookup, creative generation, reasoning), implement complexity scoring using heuristics or learned classifiers, and create routing decision trees based on input characteristics.

2. **Cascade Routing Strategy**: Implement cheapest-first cascade (Haiku → Sonnet → Opus) with confidence thresholding, design validation checks to determine if escalation is needed, and specify retry logic with context preservation across models.

3. **Parallel Routing with Fusion**: Design parallel execution across multiple models for critical queries, implement response fusion strategies (voting, averaging, judge model selection), and optimize for latency with timeout and early-exit conditions.

4. **Learned Routing Models**: Train routing classifiers on historical query/outcome data, implement feature extraction (query length, domain, user tier), and design online learning loops to adapt routing decisions based on performance feedback.

5. **Caching and Deduplication**: Implement semantic caching with embedding similarity thresholds, design cache invalidation strategies for dynamic content, and create prompt canonicalization to maximize cache hit rates.

6. **Cost and Performance Optimization**: Track cost per query across models with token usage accounting, implement budget constraints and throttling per user/tenant, and design cost-aware routing that prioritizes cheaper models when quality thresholds permit.

7. **Fallback and Resilience**: Design graceful degradation when primary models are unavailable, implement retry logic with exponential backoff across providers, and create circuit breakers to isolate failing models without impacting overall system availability.
</process>
