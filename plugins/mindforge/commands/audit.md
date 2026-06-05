---
description: "Query .planning/AUDIT.jsonl by phase, event, date, severity, integration, or"
---

Query `.planning/AUDIT.jsonl` by phase, event, date, severity, integration, or
 agent. Usage: `/mindforge:audit [filters]`

## Supported options
- `--phase N`
- `--event NAME`
- `--agent NAME`
- `--severity LEVEL`
- `--date YYYY-MM-DD`
- `--summary`
- `--verify`
- `--export PATH`

## Summary mode
Summarise counts by event, severity, integration, and phase.
Entries with `"phase": null` are reported as `project-level`, not dropped.

## Verify mode
Validate JSONL shape and chronological ordering.
Timestamp comparison may use string comparison because ISO-8601 UTC timestamps
 with a `Z` suffix sort lexicographically.

## Archive rotation
If the active audit log exceeds 10,000 lines, rotate it into
 `.planning/audit-archive/` before continuing heavy writes. Rotation must never
 delete history; it archives then resets the active file.

## Export safety
Validate export paths stay inside the project directory. If a path traversal or
 unsafe destination is requested, export into `.planning/` instead.
