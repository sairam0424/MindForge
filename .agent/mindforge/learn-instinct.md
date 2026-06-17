---
description: Manually capture a learned behavior as an instinct with initial confidence scoring. Usage - /mindforge:learn-instinct [observation] [--behavior "what to do"] [--confidence 0.7] [--tags tag1,tag2]
---

<objective>
Create a new instinct entry manually, capturing a behavioral pattern the agent
should remember and apply in future sessions.
</objective>

<execution_context>
@.mindforge/engine/instincts/instinct-schema.md
@.mindforge/engine/instincts/capture-engine.md
@.mindforge/skills/continuous-learning/SKILL.md
</execution_context>

<context>
$ARGUMENTS
</context>

<process>
1. Parse arguments:
   - observation: what pattern was observed (required)
   - --behavior: what to do when pattern detected (required)
   - --confidence: initial confidence (default: 0.7 for manual capture)
   - --tags: classification tags (optional, auto-derived if not provided)
2. **Deduplication check:**
   - Read `.mindforge/engine/instincts/instinct-store.jsonl`
   - Compare observation against all active instincts (same project)
   - If >80% word overlap: warn "Similar instinct exists" and show it
   - Ask user: reinforce existing or create new?
3. **Capacity check:**
   - Count active instincts for current project
   - If at 100: identify lowest-confidence instinct for pruning
   - Inform user: "At capacity. Will prune: [lowest instinct] (confidence: X)"
4. **Create instinct entry:**
   ```json
   {
     "id": "inst-[generate-uuid]",
     "created_at": "[current timestamp]",
     "updated_at": "[current timestamp]",
     "observation": "[from args]",
     "behavior": "[from args]",
     "confidence": [from args or 0.7],
     "times_applied": 0,
     "times_succeeded": 0,
     "times_failed": 0,
     "project": "[current project name]",
     "tags": [from args or auto-derived],
     "status": "active",
     "promoted_to_skill": null,
     "last_applied_at": null,
     "source_sessions": ["[current session id]"]
   }
   ```
5. Append entry to `instinct-store.jsonl`.
6. Report: "Instinct captured. Active: [count]/100. Confidence: [X]."
7. Log in AUDIT: instinct_created event.
</process>
