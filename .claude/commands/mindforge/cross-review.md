---
name: mindforge:cross-review
description: Get code reviewed by multiple AI models simultaneously for consensus validation
argument-hint: [--phase N] [--models list] [--focus area]
allowed-tools:
  - run_command
  - view_file
  - write_to_file
---

<objective>
Increase review confidence by aggregating findings from multiple diverse AI models, identifying consensus issues and providing a multi-perspective quality assessment.
</objective>

<execution_context>
.claude/commands/mindforge/cross-review.md
</execution_context>

<context>
Models: Claude (Primary/Architectural), GPT-4o (Adversarial/Security).
Focus: Specific area like "security", "performance", or "consistency".
Pre-check: Models must be available via existing API integrations.
</context>

<process>
1. **Round 1 (Primary)**: Execute architectural review using the primary model.
2. **Round 2 (Adversarial)**: Execute security-focused review using the secondary model.
3. **Synthesis**: Compare findings from both rounds. Identify consensus "high confidence" issues.
4. **Final Verdict**: Issue a gating verdict that must be resolved for `/mindforge:ship`.
5. **Log**: Record the multi-model review results in the audit trail.
</process>
