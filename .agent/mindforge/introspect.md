---
description: Debug agent behavior or failures using 4-phase self-diagnosis. Usage - /mindforge:introspect [--last-failure] [--session] [--stuck]
---

<objective>
When the agent is stuck, producing incorrect outputs, or wasting tokens,
run structured self-diagnosis to identify and recover from the failure.
</objective>

<execution_context>
@.mindforge/skills/agent-introspection-debugging/SKILL.md
@.mindforge/engine/autonomous/stuck-detector.md
</execution_context>

<context>
$ARGUMENTS
</context>

<process>
1. Parse flags: --last-failure (analyze most recent failure), --session (review current session), --stuck (analyze stuck signals).
2. **Phase 1 — Failure Capture:**
   - If --last-failure: read recent AUDIT entries for the failed task
   - If --session: scan current session for quality degradation signals
   - If --stuck: read stuck-detector.md signals and iteration count
   - Document: what was attempted, what happened, what was expected
3. **Phase 2 — Diagnosis:**
   - Match symptoms to failure mode table:
     - Context overflow? (repeating mistakes, forgetting constraints)
     - Hallucination? (confident claims about non-existent things)
     - Loop spinning? (same action 3+ times without progress)
     - Scope creep? (task expanding beyond spec)
     - Stale context? (acting on outdated info)
   - Identify the root cause (not just symptoms)
4. **Phase 3 — Contained Recovery:**
   - Identify MINIMUM change needed to recover
   - Do NOT restart from scratch unless necessary
   - Do NOT make speculative changes
   - Attempt recovery (max 2 attempts)
   - If recovery fails: escalate to user
5. **Phase 4 — Introspection Report:**
   - Write to `.planning/INTROSPECTION-[timestamp].md`
   - Include: failure type, root cause, recovery action, prevention recommendation
   - Consider: should this become an instinct? (via learn-instinct)
6. Log introspection event in AUDIT.
7. If recovery succeeded: resume work. If not: present report and await user direction.
</process>
