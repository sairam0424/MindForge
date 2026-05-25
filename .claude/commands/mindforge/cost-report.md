---
description: Token usage analytics, model routing decisions, and cost optimization recommendations. Usage - /mindforge:cost-report [--window 7d] [--by-model] [--by-task] [--phase N]
---

<objective>
Produce a detailed cost and token usage report from the token-ledger, showing
spend by model, by task type, and recommending optimizations.
</objective>

<execution_context>
@.mindforge/engine/cost-tracking/token-ledger.md
@.mindforge/engine/cost-tracking/router.md
@.mindforge/engine/cost-tracking/budget-enforcer.md
</execution_context>

<context>
$ARGUMENTS
</context>

<process>
1. Parse flags: --window (time period, default: current session), --by-model, --by-task, --phase.
2. Read `.mindforge/metrics/token-ledger.jsonl` for the specified window.
3. **Compute totals:**
   - Total tokens (input, output, cached)
   - Total estimated cost (USD)
   - Budget remaining (session, project-weekly)
4. **By-model breakdown** (if --by-model or default):
   - For each model used: calls, tokens, cost, % of total
   - Identify the most expensive model and its usage pattern
5. **By-task breakdown** (if --by-task):
   - For each task type: avg cost, avg tokens, count
   - Identify tasks where cheaper models could have sufficed
6. **Efficiency metrics:**
   - Cache hit rate (cached_input / total_input)
   - Routing accuracy (% of tasks where tier matched actual need)
   - Over-spend rate (tasks exceeding estimate by >2x)
7. **Optimization recommendations:**
   - Tasks using opus that could use sonnet
   - Repeated context that could benefit from caching
   - Tasks that could be batched for efficiency
8. Present report in formatted table.
9. Compare against budget limits from config.json.
10. If approaching warn threshold: alert user with projection.
</process>
