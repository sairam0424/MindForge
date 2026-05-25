# Instinct Engine — Promotion Protocol

## Purpose
Defines the rules and process for promoting mature instincts into full MindForge skills.

## Promotion Criteria

An instinct is eligible for promotion when ALL of these are true:
1. `confidence >= 0.85`
2. `times_applied >= 5`
3. `times_succeeded >= 4` (at least 80% success rate with minimum volume)
4. `status == "active"` (not already promoted or deprecated)
5. No existing skill covers the same behavior (checked against MANIFEST.md triggers)

## Promotion Process

### Step 1 — Candidate Identification
Run by `/mindforge:evolve-skills` command:
1. Scan `instinct-store.jsonl` for entries meeting all 5 criteria
2. Rank candidates by confidence * times_applied (impact score)
3. Present top candidates to user for approval

### Step 2 — Skill Draft Generation
For each approved candidate:
1. Generate a SKILL.md using this template:

```yaml
---
name: [derived-from-instinct-tags]
version: 1.0.0
min_mindforge_version: 10.0.3
status: stable
triggers: [derived-from-instinct-observation-keywords]
origin: instinct-promotion
origin_instinct_id: [inst-uuid]
---

# Skill — [Title derived from behavior]

## When this skill activates
[Derived from instinct observation field]

## Mandatory actions when this skill is active

### During implementation
[Derived from instinct behavior field, expanded into actionable steps]

### After implementation
Verify the behavior was applied correctly.
```

### Step 3 — Registration
1. Place generated SKILL.md in `.mindforge/skills/[name]/SKILL.md`
2. Add entry to MANIFEST.md under appropriate tier (default: Project tier)
3. Mark instinct as `promoted` with `promoted_to_skill: "[skill-name]"`

### Step 4 — Feedback Loop
After promotion:
- Continue tracking the instinct's success/failure THROUGH the skill
- If the skill is later found unhelpful: revert to instinct, mark status as deprecated
- This prevents premature promotion from creating persistent bad skills

## Pruning Protocol

Instincts are pruned (removed) when:
- `confidence < 0.2` AND `times_applied >= 10` (repeatedly failed)
- OR `last_applied_at` is more than 30 days ago (stale)
- OR user explicitly deprecates via command

Pruned instincts are moved to `.mindforge/engine/instincts/archive/` (not deleted) for audit purposes.

## Metrics

Track promotion health:
- Promotion rate: instincts promoted / instincts created (target: 10-20%)
- Reversion rate: promoted skills reverted / total promotions (target: < 5%)
- Active instinct count trend (should not monotonically increase)
