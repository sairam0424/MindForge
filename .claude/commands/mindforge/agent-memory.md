---
description: "Design agent memory architecture across time scales. Usage: /mindforge:agent-memory [agent] [--layers 4] [--retrieval semantic|key|hybrid]"
---

<objective>
Design a multi-layered agent memory architecture that operates across different time scales, balancing recall accuracy with storage efficiency through consolidation, decay, and retrieval optimization strategies.
</objective>

<execution_context>
@.mindforge/skills/agent-memory-design/SKILL.md
</execution_context>

<context>
Arguments: $ARGUMENTS (agent name or system, optional --layers count, optional --retrieval strategy)
Knowledge: Agent's task domain, interaction patterns, storage constraints, latency requirements.
</context>

<process>
1. **Classify Information By Time-Scale**: Categorize all information the agent handles into layers: working memory (current turn, seconds), short-term (current session, minutes-hours), medium-term (recent sessions, days-weeks), long-term (permanent knowledge, months-years).
2. **Design Storage Per Layer**: Working memory = in-context window. Short-term = structured scratchpad (JSON/key-value). Medium-term = vector store with temporal weighting. Long-term = knowledge graph + compressed summaries. Choose storage technology for each.
3. **Implement Retrieval Strategy Per Layer**: Working memory = direct access. Short-term = key-based lookup. Medium-term = semantic search with recency boost. Long-term = hybrid (semantic + keyword + graph traversal). Define retrieval latency budgets per layer.
4. **Add Consolidation Process**: At session end, extract key learnings from short-term memory, index them with semantic embeddings, link to existing knowledge graph nodes, and promote to medium-term. Weekly: consolidate medium-term patterns into long-term compressed representations.
5. **Configure Decay Mechanism**: Unreinforced memories fade over time. Implement decay function: access count increases retention, time since last access decreases it. Set thresholds: below threshold = archive (not delete). Reinforced memories (accessed 3+ times) get permanence boost.
6. **Set Memory Budget Per Layer**: Define token/storage budgets: working memory = context window limit minus system prompt. Short-term = 10K tokens max. Medium-term = 100K entries. Long-term = unlimited but retrieval-limited. Implement eviction when budget exceeded.
7. **Test Recall Accuracy**: Design evaluation suite: inject known facts, query after N turns/sessions, measure recall@k. Target: working memory 100%, short-term 95%, medium-term 80%, long-term 70%. Identify failure modes.
8. **Monitor Retrieval Relevance**: Track retrieval quality metrics: precision@5, user corrections (retrieved wrong context), latency percentiles. Set up alerting for degradation. A/B test retrieval strategy changes.
</process>
