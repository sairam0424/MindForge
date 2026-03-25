---
description: Measure skill effectiveness over time.
---

# MindForge — Benchmark Command
# Usage: /mindforge:benchmark [--skill skill-name] [--compare skill-a skill-b]

Measure skill effectiveness over time.

## Single skill benchmark
For a named skill, analyse AUDIT.jsonl and skill-usage.jsonl:
- How many times was the skill loaded this month?
- What is the verify pass rate for tasks where this skill was loaded?
- Are there anti-patterns less common after this skill is loaded?
- What is the average session quality score when this skill is active?

Report:
```
Skill Benchmark: security-review v1.0.0
────────────────────────────────────────
Usage (last 30 days): 47 task loads
Trigger distribution: text match 68%, file-path 22%, file-name 10%
Verify pass rate:     91% (vs. 84% baseline without this skill)
Security findings:    8 HIGH caught (0 CRITICAL missed in tasks using this skill)
Session quality lift: +6.2 points average when loaded

Assessment: HIGH VALUE — clear quality improvement signal
```

## Skill comparison
Compare two skills head-to-head:
- Load frequency
- Verify pass rate improvement
- Anti-pattern detection rate
- Context budget cost (token estimate)

Helps decide: should you keep both skills, or deprecate the lower-performer?
