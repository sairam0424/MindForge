# Instinct Engine — Auto-Capture Protocol

## Purpose
Defines how the instinct engine observes sessions and automatically creates
instinct entries. This runs in AUTO-CAPTURE mode (always observing).

## Observation Triggers

The capture engine watches for these signals during every session:

### 1. User Corrections
When the user corrects agent behavior ("no, don't do that", "always do X instead"):
- Extract the correction as a behavior rule
- Create instinct with initial confidence 0.6 (user-stated is higher than observed)

### 2. Repeated Patterns (3+ occurrences)
When the agent performs the same action pattern 3+ times in a session:
- Extract the pattern as a potential instinct
- Create with initial confidence 0.4 (observed but not confirmed)

### 3. Successful Outcomes After Specific Actions
When a verify/test pass follows a specific non-obvious action:
- Extract the action-outcome pair
- Create with initial confidence 0.5

### 4. Manual Capture
When user invokes `/mindforge:learn-instinct`:
- User provides observation + behavior directly
- Create with user-specified confidence (default 0.7)

## Deduplication

Before creating a new instinct:
1. Compare `observation` field against all active instincts (same project)
2. Similarity threshold: >80% word overlap → treat as duplicate
3. If duplicate found: increment `times_applied` on existing instinct instead
4. If near-duplicate (60-80% overlap): create new but link via tags

## Auto-Capture Rate Limits

To prevent noise:
- Maximum 5 new instincts per session
- Maximum 100 active instincts per project
- If at 100: prune lowest-confidence instinct before adding new one
- Never auto-capture from autonomous mode sessions (too noisy)

## Session-End Summary

At the end of each session where instincts were captured:
```
📝 Instincts captured this session:
  - [NEW] "observation text" (confidence: 0.5)
  - [REINFORCED] "existing instinct" (confidence: 0.5 → 0.6)
  
Active instincts: 47/100 | Ready for promotion: 3
```

## Integration Points

- Hooks into existing memory capture at `.mindforge/memory/engine/capture-protocol.md`
- Instinct observations flow through the same memory pipeline
- Instincts are SEPARATE from memories (memories are facts, instincts are behaviors)
- Both share the project-scoping mechanism
