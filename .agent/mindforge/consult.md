---
description: Get a multi-LLM second opinion from external models (Claude, Gemini, GPT-4o). Usage - /mindforge:consult [question] [--models gemini,gpt-4o,claude] [--sanitize strict]
---

<objective>
Send a sanitized prompt to external AI models for a second opinion. Synthesize
responses to identify consensus, divergence, and novel insights.
</objective>

<execution_context>
@.mindforge/skills/multi-llm-consult/SKILL.md
@.mindforge/engine/cost-tracking/router.md
</execution_context>

<context>
$ARGUMENTS
</context>

<process>
1. Parse the question from arguments. Extract --models flag (default: all configured).
2. **Sanitize the prompt:**
   - Remove file paths → replace with generic descriptions
   - Remove internal names → abstract the pattern
   - Remove secrets, credentials, PII → NEVER send externally
   - Keep the abstract question and public references
3. **Estimate cost** — check token-ledger for budget remaining. Warn if tight.
4. **Dispatch** — Send sanitized prompt to each selected model (parallel if possible).
5. **Collect responses** — Handle timeouts (30s), errors (log and skip), unavailability.
6. **Synthesize:**
   - Identify agreement (2+ models recommend same approach)
   - Identify divergence (models disagree — flag for user)
   - Identify novel insights (unique points from one model)
7. **Present results** with clear attribution (which model said what).
8. Log consultation in token-ledger.jsonl (model, tokens, cost per call).
9. Report total cost of this consultation.
10. Remind: "External opinions are advisory — user sovereignty applies."
</process>
