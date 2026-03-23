---
name: mindforge:remember
description: Manage long-term memory and knowledge graph entries
argument-hint: [--add "content"] [--search "query"] [--promote "id"]
allowed-tools:
  - view_file
  - write_to_file
  - run_command
---

<objective>
Provide a manual interface for steering the agent's long-term memory, allowing users to add specific project knowledge, search the existing graph, and promote local learnings to global availability.
</objective>

<execution_context>
.claude/commands/mindforge/remember.md
</execution_context>

<context>
Storage: MindForge Knowledge Graph.
Visibility: Project-local vs. Global memory.
</context>

<process>
1. **Add**: Capture one-off decisions or constraints manually into the memory store.
2. **Search**: Query the knowledge base across sessions to retrieve previously captured patterns.
3. **Promote**: Elevate a specific project-level finding to "Global" status for use in future repositories.
4. **Analyze**: Provide stats on memory usage and activation frequency.
</process>
