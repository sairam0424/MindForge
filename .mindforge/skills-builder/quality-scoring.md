# MindForge v2 — Skill Quality Scoring

## Purpose
Every SKILL.md gets a quality score from 0-100 before registration.
This score determines: whether it can be registered (≥ 60), whether it can
be published to the community marketplace (≥ 80), and how prominently it
is featured in search results.

## Scoring dimensions (total: 100 points)

### Dimension 1: Trigger Coverage (30 points)
Measures: How many unique, specific trigger keywords the skill has.
- 25-30 triggers: 30 points (full score)
- 20-24 triggers: 24 points
- 15-19 triggers: 18 points
- 10-14 triggers: 12 points
- 5-9 triggers: 6 points
- < 5 triggers: 0 points

Penalty: -2 points per generic trigger (words like "database", "api", "model"
that would fire for almost any project). Triggers must be technology-specific.

### Dimension 2: Mandatory Actions Completeness (25 points)
Measures: Whether the skill has complete, actionable mandatory actions.
Check for these mandatory sections:
- [ ] At least 5 concrete "always do X" rules (5 pts)
- [ ] At least 3 concrete "never do Y" rules (5 pts)
- [ ] Security consideration section (5 pts)
- [ ] Performance consideration section (5 pts)
- [ ] Error handling guidance (5 pts)

### Dimension 3: Code Examples (20 points)
Measures: Quality and completeness of code examples.
- 5+ complete, working code examples: 20 points
- 3-4 examples: 14 points
- 1-2 examples: 7 points
- No examples: 0 points

Bonus: +2 points if examples show both correct pattern AND anti-pattern side-by-side.

### Dimension 4: Self-Check Checklist (15 points)
Measures: Does the skill include a checklist an agent can use to verify its work?
- 10+ checklist items: 15 points
- 7-9 items: 10 points
- 4-6 items: 7 points
- 1-3 items: 3 points
- No checklist: 0 points

### Dimension 5: Injection Safety (10 points)
Measures: Does the skill pass all injection guard checks?
- No injection patterns detected: 10 points (full score)
- Any injection pattern detected: 0 points (FAIL — skill cannot be registered)

Injection patterns checked (same 8 as in skill-loader.md):
IGNORE ALL PREVIOUS INSTRUCTIONS, DISREGARD YOUR INSTRUCTIONS, etc.

### Dimension 6: No Placeholders (10 points)
Measures: Absence of placeholder/template text that was never filled in.
- Zero placeholders: 10 points
- 1-2 placeholders: 5 points
- 3+ placeholders: 0 points

Placeholder patterns:
`[your description here]`, `TODO`, `FIXME`, `<description>`, `...fill in...`

### Dimension 7: Version History (10 points)
Measures: Whether the skill has a changelog / version history.
- Has ## Version History section with at least v1.0.0 entry: 10 points
- Has frontmatter version but no history section: 5 points
- No version information: 0 points

Bonus: +2 points if skill has been updated more than once (shows maintenance).

## Quality thresholds

| Score | Status | Allowed actions |
|---|---|---|
| 90-100 | Excellent | Register, publish, featured in marketplace |
| 80-89 | Good | Register, eligible to publish |
| 70-79 | Acceptable | Register, not eligible for marketplace |
| 60-69 | Minimum | Register with warning |
| < 60 | Insufficient | Cannot register — must improve first |

## `session_quality_lift` metric
After a skill has been used in ≥ 5 sessions, compute:
```
lift = avg(session_quality_score when skill active)
     - avg(session_quality_score when skill not active)
```
This is the most honest signal of skill value. A skill with quality_score=94
but session_quality_lift=-2 is a misleading skill (it sounds good but hurts results).

## Scoring output format
```json
{
  "skill_name": "prisma-schema",
  "version": "1.0.0",
  "quality_score": 84,
  "threshold_status": "good",
  "can_register": true,
  "can_publish": true,
  "score_breakdown": {
    "trigger_coverage": 27,
    "mandatory_actions": 22,
    "code_examples": 17,
    "self_check": 12,
    "injection_safe": 10,
    "no_placeholders": 9,
    "version_history": 8
  },
  "penalties_applied": [
    { "dimension": "trigger_coverage", "reason": "1 generic trigger 'database'", "penalty": -2 }
  ],
  "improvement_suggestions": [
    "Add 3 more trigger keywords to reach 25+ (currently 22)",
    "Add performance considerations section (currently missing)",
    "Add 3 more checklist items to reach 10+ (currently 7)"
  ]
}
```
