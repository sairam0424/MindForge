# Cost Tracking — Token Ledger Specification

## Purpose
Append-only ledger recording all token usage for analytics, budgeting, and optimization.

## Storage

- Location: `.mindforge/metrics/token-usage.jsonl` (canonical shape: `bin/models/usage-record.js`)
- Format: JSON Lines (one entry per model interaction)
- Rotation: Archive entries older than 30 days to `.mindforge/metrics/archive/`
- Retention: Archives kept for 90 days, then deleted

## Entry Format

Each line in the ledger is a complete JSON object. The authoritative shape is
`bin/models/usage-record.js`; this is what `bin/models/cost-tracker.js`
actually appends today (all five providers in `bin/models/*-provider.js` emit it):

```json
{
  "model": "claude-sonnet-4-6",
  "input_tokens": 12500,
  "output_tokens": 3200,
  "cache_read_input_tokens": 8000,
  "cache_creation_input_tokens": 0,
  "cost_usd": 0.085,
  "task_name": "Plan 3-04",
  "session_id": "session-abc123",
  "phase": 3,
  "date": "2026-05-25",
  "timestamp": "2026-05-25T10:30:00.000Z"
}
```

`cost_usd` is the ONLY cost field. `total_cost_usd` belongs to cross-review
reports (`bin/review/cross-review-engine.js`) and must never appear here.

Not yet emitted (aspirational — do not read these): `id`, `task_id`, `tier`,
`routing_reason`, `budget_remaining`, `task_type`, `files_touched`,
`skills_loaded`, `outcome`.

## Reporting Queries

The `/mindforge:cost-report` command reads this ledger to produce:

### By Model
```
Model           | Calls | Tokens    | Cost    | % of Total
----------------|-------|-----------|---------|----------
claude-sonnet   | 45    | 580,000   | $4.50   | 62%
claude-opus     | 8     | 210,000   | $8.25   | 28%
claude-haiku    | 120   | 350,000   | $0.75   | 10%
```

### By Task Type
```
Type            | Avg Cost | Avg Tokens | Count
----------------|----------|------------|------
implementation  | $0.42    | 18,500     | 23
code-review     | $0.15    | 8,200      | 15
debugging       | $0.85    | 32,000     | 8
```

### Efficiency Metrics
- Cache hit rate: % of input tokens served from cache
- Routing accuracy: % of tasks where tier matched actual complexity
- Over-spend rate: % of tasks that exceeded their estimated budget

## Integration

- Written to by `bin/models/cost-tracker.js` `record()` after every model interaction (called from `bin/models/model-client.js:77`)
- Read by `/mindforge:cost-report` command
- Summarized weekly into `.mindforge/metrics/weekly-cost-summary.json`
- Referenced by AgRevOps dashboard for ROI tracking
