---
description: Synchronise MindForge phase and plan metadata to Jira. Usage:
---

Synchronise MindForge phase and plan metadata to Jira. Usage:
`/mindforge:sync-jira [--phase N] [--plan M]`

## Behaviour
- verify Jira availability through `connection-manager.md`
- create or update Epic and Story mappings in `.planning/jira-sync.json`
- use dynamic transition lookup, never hardcoded IDs
- preserve manual Jira edits
- log all actions to AUDIT

Integration failures are non-fatal and should be written to `STATE.md` for
 manual retry.
