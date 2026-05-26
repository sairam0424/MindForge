---
name: context-engineering
version: 1.0.0
min_mindforge_version: 10.0.7
status: stable
triggers: context engineering, context window management, context token budget, context priority ordering, compaction strategy, context freshness, context allocation, what to include in context, context optimization strategy, retrieval augmentation design, context pruning, context budget allocation
---

# Context Engineering

## When this skill activates

This skill activates when designing what information to feed into an LLM context window, how to prioritize it, and how to manage context across long-running sessions or multi-turn conversations. It applies to system prompt design, RAG pipeline tuning, agent memory management, and any scenario where token budget allocation determines output quality.

## Mandatory actions when this skill is active

### Before

1. **Measure the budget** — Determine the total context window size for the target model. Subtract the expected output length. The remainder is your input budget.
2. **Identify the task** — Classify the task type (code generation, analysis, Q&A, creative). Different tasks require different context compositions.
3. **Inventory available context** — List all potential context sources: files, conversation history, retrieved documents, instructions, examples, metadata.
4. **Assess current context health** — If modifying an existing system, measure current context utilization. Identify waste (irrelevant content consuming tokens).

### During

#### What to Include vs Exclude

**Include (high signal):**
- Task-relevant source code (the files being modified or referenced)
- Explicit constraints and requirements
- Relevant examples demonstrating desired behavior
- Error messages and stack traces when debugging
- Schema definitions and type signatures
- User preferences and project conventions

**Exclude (low signal, high cost):**
- Irrelevant conversation history from earlier turns
- Verbose log output (summarize instead)
- Unrelated files that happen to be nearby
- Redundant information already stated elsewhere
- Boilerplate code that follows obvious patterns
- Full file contents when only a function is relevant

#### Priority Ordering (Attention Distribution)

- **Position 1 (highest attention): Instructions and constraints** — System prompts, role definitions, mandatory rules. Models attend most strongly to the beginning and end of context.
- **Position 2: Task-specific content** — The code, document, or data being directly worked on.
- **Position 3: Examples and references** — Few-shot examples, related patterns, documentation excerpts.
- **Position 4: Background context** — Project structure, historical decisions, tangential information.
- **Recency bias** — Models attend more to recent content. Place the most critical dynamic content last (just before the query).
- **Primacy effect** — System instructions at the very start receive elevated attention. Never bury critical rules in the middle.

#### Token Budget Allocation Framework

| Category | Allocation | Purpose |
|----------|-----------|---------|
| Task-relevant content | 60% | Code, data, documents being worked on |
| Constraints and instructions | 20% | Rules, format requirements, boundaries |
| Examples | 10% | Few-shot demonstrations, reference patterns |
| Meta and buffer | 10% | Conversation scaffolding, safety margin |

- **Adapt per task** — Code generation: increase task-relevant to 70%, reduce examples to 5%. Creative tasks: increase examples to 20%.
- **Never fill 100%** — Leave 10-15% buffer for the model's response and unexpected context needs.
- **Track token counts** — Use tokenizer libraries (tiktoken, Anthropic tokenizer) to measure precisely. Estimates drift.

#### Compaction Strategy

- **Summarize old context** — Replace verbose conversation history with structured summaries. Keep decisions and outcomes; discard deliberation.
- **Keep recent verbatim** — The last 2-3 turns should remain uncompacted. Recent context drives current behavior.
- **Progressive summarization** — As context ages: verbatim (0-2 turns) → detailed summary (3-10 turns) → bullet points (10+ turns) → drop entirely.
- **Checkpoint key decisions** — Extract and preserve: architectural decisions, user preferences, constraints discovered mid-conversation. These never compact.
- **Lossy is acceptable** — Perfect recall is not the goal. Relevant recall is. Aggressively prune low-value history.

#### Context Freshness

- **Re-read files before acting** — Never rely on file content from earlier in the conversation if the file may have changed. Always re-read.
- **Invalidate on mutation** — After any write operation, treat previously-read versions of affected files as stale.
- **Timestamp awareness** — When including retrieved documents, note their freshness. Flag content older than the relevance threshold.
- **Session drift** — Long sessions accumulate stale assumptions. Periodically re-ground by re-reading source-of-truth files.

#### RAG Integration (Retrieval Augmented Generation)

- **Chunk size** — 500-1000 tokens per chunk for code; 200-500 for prose. Smaller chunks = more precise retrieval but less surrounding context.
- **Retrieve selectively** — Max 3-5 chunks (3-5K tokens total). More retrieved content dilutes attention on each piece.
- **Relevance threshold** — Set a similarity score cutoff. Irrelevant retrieved content is worse than no retrieval.
- **Cite sources** — Always attribute retrieved content to its source. This helps the model (and user) assess reliability.
- **Hybrid search** — Combine semantic (embedding) search with keyword (BM25) search. Neither alone is sufficient.
- **Re-ranking** — Apply a cross-encoder re-ranker after initial retrieval to improve precision before injection.

#### Context Pruning Techniques

- **Sliding window** — Drop oldest turns when approaching limits. Simple but lossy.
- **Relevance scoring** — Score each context block against the current query. Drop lowest-scoring blocks first.
- **Deduplication** — Detect and merge repeated information. Common in multi-turn conversations.
- **Structural pruning** — Remove comments, whitespace, and formatting from code context. Preserve semantics, reduce tokens.
- **Selective inclusion** — For large files, include only the relevant functions/classes, not the entire file.

### After

1. **Measure utilization** — Calculate what percentage of context was actually relevant to the output. Target >70% relevance.
2. **Evaluate output quality** — Compare outputs with full context vs pruned context. If quality is maintained, the pruning strategy is sound.
3. **Document the strategy** — Record the context composition pattern for this use case so it can be replicated and improved.
4. **Monitor drift** — Track context composition over time. If quality degrades, context may have drifted from optimal allocation.

## Self-check before task completion

- [ ] Token budget is explicitly allocated across categories
- [ ] Instructions and constraints occupy the highest-attention positions (start and end)
- [ ] No irrelevant content consuming tokens (verbose logs, unrelated files, redundant info)
- [ ] Compaction strategy handles long conversations without losing key decisions
- [ ] File content is fresh (re-read if potentially stale)
- [ ] RAG retrieval is limited to 3-5 relevant chunks with similarity threshold
- [ ] At least 10% token buffer remains for response generation
- [ ] Context composition is documented and reproducible
