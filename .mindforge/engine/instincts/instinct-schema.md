# Instinct Engine — Schema Definition

## Purpose
Defines the data schema for learned behavioral instincts. Instincts are lightweight
patterns observed during sessions that may evolve into full skills over time.

## Instinct Entry Schema

Each instinct is a single JSON line in `instinct-store.jsonl`:

```json
{
  "id": "inst-[uuid]",
  "created_at": "2026-05-25T10:30:00Z",
  "updated_at": "2026-05-25T14:20:00Z",
  "observation": "When writing database queries, the team always adds an index comment explaining the chosen index strategy",
  "behavior": "After writing any new database query, add a brief inline comment explaining which index will serve this query and why",
  "confidence": 0.72,
  "times_applied": 8,
  "times_succeeded": 6,
  "times_failed": 2,
  "project": "mindforge",
  "tags": ["database", "documentation", "patterns"],
  "status": "active",
  "promoted_to_skill": null,
  "last_applied_at": "2026-05-25T14:20:00Z",
  "source_sessions": ["session-abc123", "session-def456"]
}
```

## Field Definitions

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| id | string | yes | Unique identifier, prefixed with `inst-` |
| created_at | ISO-8601 | yes | When the instinct was first observed |
| updated_at | ISO-8601 | yes | Last modification timestamp |
| observation | string | yes | What pattern was observed (the trigger condition) |
| behavior | string | yes | What the agent should do when this pattern is detected |
| confidence | float | yes | 0.0-1.0, computed from success/failure ratio + application count |
| times_applied | int | yes | Total times this instinct was applied |
| times_succeeded | int | yes | Times application led to positive outcome |
| times_failed | int | yes | Times application led to negative outcome or correction |
| project | string | yes | Project scope (instincts never leak between projects) |
| tags | string[] | yes | Classification tags for retrieval |
| status | enum | yes | One of: active, promoted, deprecated, pruned |
| promoted_to_skill | string|null | yes | Skill name if promoted, null otherwise |
| last_applied_at | ISO-8601 | yes | When instinct was last used |
| source_sessions | string[] | yes | Session IDs where this instinct was observed/reinforced |

## Confidence Scoring

```
confidence = (times_succeeded / times_applied) * weight_factor

where weight_factor = min(1.0, times_applied / 10)
```

- New instincts start at 0.5 confidence (neutral)
- Each success: recalculate with updated counts
- Each failure: recalculate with updated counts
- Weight factor prevents high confidence from single observations
- Minimum 5 applications before promotion is considered

## Status Transitions

```
[new observation] → active (confidence: 0.5)
                       ↓
            confidence >= 0.85 AND times_applied >= 5
                       ↓
                   promoted → creates SKILL.md
                       
active → deprecated (manual user action)
active → pruned (confidence < 0.2 after 10+ applications OR 30 days inactive)
```
