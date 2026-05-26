# MindForge Intelligence — Phase Difficulty Scorer

## Purpose
Score phase complexity before planning so decomposition and verification rigor
match risk.

## Dimensions
- Technical complexity (35%)
- Risk level (30%)
- Ambiguity (20%)
- Dependencies (15%)

Composite:
`(Technical*0.35) + (Risk*0.30) + (Ambiguity*0.20) + (Dependencies*0.15)`

## Signal detection
### Technical complexity context handling
Keyword matching must include local context windows.

- `migration` near `database` or `schema` => technical `4`
- `migration` near `code` or `framework` => technical `3`

### Risk amplifiers
Add +1 for each relevant amplifier (cap 5):
- missing test baseline in touched area
- external integration without sandbox
- shared module blast radius (`>3` consumers)
- unclear rollback path
- prior related incidents

For prior incidents, inspect `AUDIT.jsonl`:
- `task_failed` events with file-path overlap with expected touched files
- `security_finding` events in overlapping domains (auth/payments/database)

## Score bands
- `1.0-2.0` Easy => `2-3` tasks
- `2.1-3.0` Moderate => `4-6` tasks
- `3.1-4.0` Challenging => `6-10` tasks
- `4.1-5.0` Hard => `10-15` tasks

If composite `> 4.5`: recommend split into `Phase N-A` (lowest-risk)
and `Phase N-B` (highest-risk), and offer:
`/mindforge:discuss-phase [N] --split`

## Feedback loop: score -> granularity
The planner must read `DIFFICULTY-SCORE-[N].md` before creating plans.

| Composite | Granularity instruction |
|---|---|
| 1.0-2.0 | 1 task = complete feature component |
| 2.1-3.0 | 1 task = significant module/function |
| 3.1-4.0 | 1 task = specific function/endpoint |
| 4.1-5.0 | 1 task = narrow change in 3-4 files max |

This creates explicit feedback: difficulty -> decomposition -> execution quality.
