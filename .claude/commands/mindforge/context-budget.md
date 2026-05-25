---
description: "Analyze and optimize context window allocation. Usage: /mindforge:context-budget [--analyze] [--optimize] [--max-tokens N]"
---

<objective>
Analyze and optimize context window allocation to maximize signal density, ensuring the most relevant information occupies the available token budget while pruning low-value content.
</objective>

<execution_context>
@.mindforge/skills/context-engineering/SKILL.md
</execution_context>

<context>
Arguments: $ARGUMENTS (optional --analyze for audit, --optimize for active pruning, --max-tokens N for budget cap)
Knowledge: Current context items, token costs, relevance scoring, compaction strategies.
</context>

<process>
1. **Inventory current context items**: Catalog everything in the active context:
   - System prompts and instructions (CLAUDE.md, rules, project docs)
   - Conversation history (messages, tool calls, results)
   - Injected files and code snippets
   - Skill definitions and execution contexts
   - State files (HANDOFF.json, auto-state.json)
   - Measure token count per item using tiktoken estimation

2. **Measure token costs per item**: For each context item:
   - Calculate raw token count
   - Assess information density (unique facts per 100 tokens)
   - Score temporal relevance (how recently referenced)
   - Score task relevance (direct bearing on current objective)
   - Identify redundancy (same info stated multiple ways)
   - Flag stale items (conversation turns > 10 back with no references)

3. **Prioritize by relevance**: Apply the priority matrix:
   - P0 (Critical): Active task instructions, current file contents, error messages
   - P1 (High): Architecture context, type definitions, test fixtures
   - P2 (Medium): Historical decisions, related file contents, examples
   - P3 (Low): General documentation, old conversation turns, verbose outputs
   - Score each item 0-10 on task alignment

4. **Apply budget allocation (60/20/10/10)**: Distribute max-tokens:
   - 60% — Active working context (current files, task, instructions)
   - 20% — Supporting context (types, tests, architecture docs)
   - 10% — History and decisions (conversation, rationale)
   - 10% — Buffer for tool results and new information
   - Adjust ratios based on task type (debugging needs more history)

5. **Identify compaction candidates**: Find items that can be compressed:
   - Long tool outputs that can be summarized (test results → pass/fail counts)
   - Verbose file contents where only specific functions matter
   - Repeated context that can be deduplicated
   - Conversation segments that can be summarized into key decisions
   - Large code blocks where only the interface/signature matters

6. **Prune low-value items**: Remove or compress based on scoring:
   - Drop items scoring < 3 on task relevance
   - Summarize items scoring 3-5 into single-line references
   - Compact items scoring 5-7 to essential excerpts
   - Keep items scoring 7+ in full
   - Document what was pruned for recovery if needed

7. **Verify essentials retained**: Post-optimization validation:
   - Confirm all P0 items are present in full
   - Verify no broken references (file mentioned but content pruned)
   - Check that task can still be completed with remaining context
   - Ensure error context is preserved for debugging tasks
   - Calculate final utilization percentage and headroom
   - Output budget report with before/after comparison
</process>
