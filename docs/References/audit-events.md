# MindForge Audit Events — Reference (v1.0.0)

## Overview
`AUDIT.jsonl` is the append-only record of MindForge operations.
Each line is a JSON object with a required `event` type and a `session_id`.

## Location
`.planning/AUDIT.jsonl`

## Required fields (all events)
- `id` (UUID v4)
- `timestamp` (ISO-8601)
- `event` (string)
- `agent` (string)
- `phase` (number or null)
- `session_id` (string)

## Common event types
### `project_initialised`
Fields: `project_name`, `tech_stack`, `compliance`

### `phase_planned`
Fields: `plan_count`, `wave_count`, `research_conducted`

### `phase_execution_started`
Fields: `plan_count`, `wave_count`, `dependency_graph_path`

### `phase_execution_completed`
Fields: `tasks_completed`, `tasks_failed`, `verify_status`, `verification_path`

### `task_started`
Fields: `plan`, `task_name`

### `task_completed`
Fields: `plan`, `commit_sha`, `verify_result`

### `security_scan_completed`
Fields: `critical`, `high`, `medium`, `low`, `findings_path`

### `gate_result`
Fields: `gate`, `status`, `detail`

### `plugin_installed`
Fields: `plugin_name`, `version`, `permissions`

### `plugin_uninstalled`
Fields: `plugin_name`

## Rotation
Rotate when file exceeds 10,000 lines. Archive into `.planning/audit-archive/`.

## Schema source
See `.mindforge/audit/AUDIT-SCHEMA.md` for full examples and field definitions.
