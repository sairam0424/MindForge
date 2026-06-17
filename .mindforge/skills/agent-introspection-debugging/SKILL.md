---
name: agent-introspection-debugging
version: 1.0.0
min_mindforge_version: 10.0.3
status: stable
triggers: introspect, agent failure, reasoning failure, self-debug, agent stuck, hallucination, context overflow, reasoning trace, agent error, token waste, spinning
---

# Skill — Agent Introspection Debugging

## When this skill activates
When an agent is stuck, producing incorrect outputs, hallucinating, wasting
tokens on repeated failed attempts, or when reasoning quality has degraded.

## Mandatory actions when this skill is active

### The 4-Phase Self-Debug Protocol

**Phase 1 — Failure Capture**
Document exactly what went wrong:
- What was the agent trying to accomplish?
- What did it actually produce?
- What was the expected outcome?
- What context was available at the time?
- How many tokens/iterations were spent before failure was detected?

**Phase 2 — Diagnosis**
Identify WHY the reasoning failed:

| Failure Mode | Symptoms | Root Cause |
|-------------|----------|-----------|
| Context overflow | Repeating earlier mistakes, forgetting constraints | Context window exceeded, compaction lost key info |
| Hallucination | Confident claims about non-existent code/APIs | Insufficient grounding, no verification step |
| Loop spinning | Same action repeated 3+ times without progress | No exit condition, stuck-detection not triggered |
| Scope creep | Task expanding beyond original spec | Missing constraints, no scope boundary check |
| Stale context | Acting on outdated information | Context not refreshed, old file contents cached |
| Wrong persona | Security review giving UX advice | Persona mismatch, wrong skill loaded |

**Phase 3 — Contained Recovery**
Fix the problem WITHOUT expanding the blast radius:
1. Identify the MINIMUM change needed to recover
2. Do NOT restart from scratch unless absolutely necessary
3. Do NOT make speculative changes beyond the fix
4. Verify the recovery actually works (don't assume)
5. If recovery fails after 2 attempts: ESCALATE (do not keep trying)

**Phase 4 — Introspection Report**
Write structured output to `.planning/INTROSPECTION-[timestamp].md`:
```markdown
# Introspection Report
Date: [timestamp]
Session: [session-id]
Failure type: [from diagnosis table]

## What Happened
[1-2 sentences describing the failure]

## Root Cause
[Why this happened — be specific]

## Recovery Action
[What was done to fix it]

## Prevention
[What should change to prevent recurrence]
- [ ] Instinct to capture? [yes/no — if yes, create via learn-instinct]
- [ ] Skill gap? [yes/no — if yes, what skill is missing]
- [ ] Config change needed? [yes/no — what setting]
```

### Introspection Triggers
Automatically invoke this skill when:
- Stuck-detector fires (3 iterations, no progress)
- Token usage exceeds 3x estimate for a task
- Same error appears 2+ times in consecutive attempts
- User says "stop", "that's wrong", "you're stuck", "try again differently"

### During introspection
- PAUSE all other work — introspection is the priority
- Read recent AUDIT entries for context on what was attempted
- Check SHARED_TASK_NOTES.md for cross-iteration patterns
- Never blame external factors without evidence (check your own reasoning first)

### After introspection
- Log introspection event in AUDIT
- Consider whether this warrants a new instinct (via continuous-learning)
- Resume work only after recovery is verified
- If pattern repeats: escalate to user, do not keep self-debugging
