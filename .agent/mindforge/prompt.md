---
description: "Design and optimize AI prompts with caching strategy. Usage: /mindforge:prompt [task-description] [--style system|few-shot|cot] [--cache]"
---

<objective>
Design and optimize AI prompts with appropriate structure, caching strategy, and iteration based on edge-case testing — producing production-grade prompts that maximize model performance.
</objective>

<execution_context>
@.mindforge/skills/prompt-engineering/SKILL.md
</execution_context>

<context>
Arguments: $ARGUMENTS (task description, optional --style system|few-shot|cot, optional --cache flag)
Knowledge: Current system prompts, model capabilities, prompt caching mechanics, few-shot example libraries.
</context>

<process>
1. **Analyze task**: Understand the task requirements:
   - What is the desired output format and quality bar?
   - What model will execute this prompt? (capabilities, context window)
   - What failure modes are likely? (hallucination, refusal, drift)
   - What constraints exist? (token budget, latency, cost)
   - Is this a one-shot task or a recurring pattern?

2. **Select prompt style**: Based on --style flag or task analysis:
   - `system`: Structured system prompt with role, constraints, and output format
   - `few-shot`: System prompt + curated examples demonstrating desired behavior
   - `cot`: Chain-of-thought with explicit reasoning steps before answer
   - Hybrid: Combine styles when task complexity demands it
   - Document rationale for style selection

3. **Design system prompt structure**: Build the prompt skeleton:
   - Identity/role definition (who the model is)
   - Task description (what to do)
   - Constraints and guardrails (what NOT to do)
   - Output format specification (exact structure expected)
   - Edge-case handling instructions (when ambiguous, do X)
   - Prioritization rules (if conflicts, prefer Y over Z)

4. **Add few-shot examples if needed**: When --style includes few-shot:
   - Select 3-5 diverse examples covering the input distribution
   - Include at least one edge case example
   - Include at least one "refusal" example (when to say no)
   - Order examples from simple to complex
   - Ensure examples are representative, not cherry-picked

5. **Implement caching strategy**: When --cache flag is set:
   - Place static content first (system prompt, examples, reference docs)
   - Mark cache breakpoint after static prefix
   - Keep dynamic content (user input, session context) after breakpoint
   - Estimate cache hit rate based on usage pattern
   - Calculate cost savings (cached tokens at 90% discount)
   - Ensure static prefix exceeds minimum cacheable length (1024 tokens)

6. **Test with edge cases**: Validate the prompt against:
   - Adversarial inputs (prompt injection attempts)
   - Ambiguous inputs (multiple valid interpretations)
   - Empty/minimal inputs (graceful handling)
   - Maximum-length inputs (truncation behavior)
   - Out-of-domain inputs (appropriate refusal)
   - Multi-language inputs if applicable

7. **Iterate on failures**: For each failure mode discovered:
   - Identify root cause (missing constraint, ambiguous instruction, weak example)
   - Add targeted fix (new constraint, clarified instruction, better example)
   - Re-test to confirm fix without regression
   - Document the failure and fix for future reference
   - Version the prompt iteration (v1, v2, v3...)

8. **Output final prompt**: Deliver the production prompt:
   - Complete prompt text with clear section markers
   - Token count breakdown (system, examples, dynamic budget)
   - Caching configuration if applicable
   - Known limitations and edge cases
   - Recommended model and temperature settings
   - Eval criteria for ongoing quality monitoring
</process>
