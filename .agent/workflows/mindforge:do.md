---
description: Smart natural language dispatcher to route intent to the right MindForge command
---
<objective>
Provide a high-level, natural language interface for users to interact with MindForge without needing to remember specific command names. Routes user intent to the most appropriate internal command.
</objective>

<execution_context>
.claude/commands/mindforge/do.md
</execution_context>

<context>
Arguments: $ARGUMENTS (The user's intent in plain English)
Knowledge: Must be aware of all available `.claude/commands/mindforge/*.md` definitions.
</context>

<process>
1. **Analyze input**: Parse the user's natural language request.
2. **Match command**: Compare the intent against the descriptions and objectives of all known MindForge commands.
3. **Execute match**:
    - If a clear match is found, immediately pivot to that command's logic.
    - If multiple matches are possible, ask the user for clarification.
    - If no match is found, suggest the most relevant command or offer `/mindforge:help`.
4. **Learn (Optional)**: If the user confirms a routing was correct, record the mapping for future intent resolution.
</process>
