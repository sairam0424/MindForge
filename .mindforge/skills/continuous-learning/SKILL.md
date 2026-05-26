---
name: continuous-learning
version: 1.0.0
min_mindforge_version: 10.0.3
status: stable
triggers: instinct, learned behavior, pattern detection, evolve, auto-learn, skill promotion, confidence, observation, habit, adaptation
---

# Skill — Continuous Learning

## When this skill activates
When discussing learned behaviors, instinct management, pattern capture,
or skill evolution. Also activates during session-end reviews where patterns
may be captured.

## Mandatory actions when this skill is active

### Understanding the Instinct System
MindForge automatically observes sessions and captures behavioral patterns as
"instincts" — lightweight learned behaviors that may evolve into full skills.

**Instinct lifecycle:**
```
Observation -> Instinct (confidence: 0.5)
                  | applied successfully
              Confidence grows (0.5 -> 0.6 -> 0.7 -> ...)
                  | confidence >= 0.85 AND applied 5+ times
              Promotion candidate
                  | user approves
              Full SKILL.md created and registered
```

### Auto-Capture (Always Active)
The instinct engine runs in auto-capture mode, watching for:

1. **User corrections** -> instinct created at confidence 0.6
   - "No, always use X instead of Y" -> captures the preference
2. **Repeated patterns (3+)** -> instinct created at confidence 0.4
   - Same action pattern 3 times in a session -> probably intentional
3. **Successful outcomes** -> instinct created at confidence 0.5
   - Non-obvious action followed by verification pass -> worth remembering

### Managing Instincts

**View active instincts:**
- Check `.mindforge/engine/instincts/instinct-store.jsonl`
- Use `/mindforge:status` which includes instinct summary

**Manually capture:**
- Use `/mindforge:learn-instinct "observation" --behavior "what to do"`
- Manual instincts start at confidence 0.7 (user-stated = higher trust)

**Promote to skills:**
- Use `/mindforge:evolve-skills` to review mature instincts
- Candidates: confidence >= 0.85 AND times_applied >= 5
- Promotion creates a full SKILL.md and registers in MANIFEST.md

**Deprecate/Prune:**
- Instincts below 0.2 confidence after 10+ applications are auto-pruned
- Instincts inactive for 30 days are auto-pruned
- User can manually deprecate any instinct

### During any task (passive observation)
- Note patterns that repeat across tasks
- When user corrects behavior: acknowledge and create instinct
- At session end: report any new instincts captured
- Never let instinct count exceed 100 per project (prune lowest confidence)

### After session
Report instinct activity:
```
Instincts this session:
  [NEW] "Pattern observed" (confidence: 0.5)
  [REINFORCED] "Existing pattern" (0.6 -> 0.7)
  [READY] "Mature pattern" -- eligible for promotion
  
Active: 47/100 | Promotion candidates: 3
```

## Self-check before task completion
- [ ] Did I report any new instincts captured this session?
- [ ] Did I verify instinct count remains under 100 for this project?
- [ ] Did I check for promotion candidates meeting the threshold?
- [ ] Did I confirm captured instincts are project-scoped (not leaking to other projects)?
