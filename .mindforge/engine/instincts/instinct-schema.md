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
  "project_id": "a1b2c3d4e5f6",
  "tags": ["database", "documentation", "patterns"],
  "status": "active",
  "promoted_to_skill": null,
  "last_applied_at": "2026-05-25T14:20:00Z",
  "source": "auto-capture"
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
| project | string | yes | Human-readable project name (or `global`) |
| project_id | string | yes | Stable 12-char git-remote hash; the read-time scope key (instincts never leak between projects). `global` outside a git repo |
| tags | string[] | yes | Classification tags for retrieval |
| status | enum | yes | One of: active, promoted, deprecated, pruned |
| promoted_to_skill | string\|null | yes | Skill name if promoted, null otherwise |
| last_applied_at | ISO-8601\|null | yes | When instinct was last used (null until first applied) |
| source | string | yes | Origin: `auto-capture` (PostToolUse hook), `manual` (/mindforge:learn-instinct), `imported`, or `observer` |

## Confidence Scoring

```
confidence = (times_succeeded / times_applied) * weight_factor

where weight_factor = min(1.0, times_applied / 10)
```

Starting confidence depends on `source` (a new instinct has `times_applied: 0`,
so the ratio formula does not yet apply — it seeds an initial value):
- `auto-capture` (PostToolUse hook): **0.3** — low trust, inferred from a single success
- `manual` (/mindforge:learn-instinct): **0.7** — user-stated, higher trust
- `imported` / `observer`: as stamped by the importer/observer (default 0.3)
- 0.5 is the neutral midpoint the ratio formula trends toward once applications accrue

Then, once `times_applied > 0`:
- Each success/failure recalculates `confidence` with updated counts
- Weight factor prevents high confidence from single observations
- Minimum 5 applications before promotion is considered

## Status Transitions

```
[auto-capture] → active (confidence: 0.3)   [manual] → active (0.7)
                       ↓
            confidence >= 0.85 AND times_applied >= 5
                       ↓
                   promoted → creates SKILL.md
                       
active → deprecated (manual user action)
active → pruned (confidence < 0.2 after 10+ applications OR 30 days inactive)
```
