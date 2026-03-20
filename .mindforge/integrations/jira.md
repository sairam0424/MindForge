# MindForge — Jira Integration

## Purpose
Synchronise MindForge planning state into Jira for organisational visibility
 while keeping MindForge as the source of truth for technical execution.

## Mapping model

| MindForge artifact/event | Jira representation |
|---|---|
| Phase N | Epic |
| `PLAN-N-M.md` | Story |
| `task_started` | Story transition to In Progress |
| `task_completed` | Story transition to Done |
| `task_failed` | Story comment + blocked transition when available |
| `security_finding` HIGH/CRITICAL | Bug with security labels |
| Phase verified | Epic transitioned to Ready for Review |
| UAT signed off | Epic transitioned to Done |

Jira-to-MindForge state ingestion is out of scope for Day 4. MindForge is the
 source of truth; Jira reflects it.

## API and authentication
Use Jira REST API v3. Read credentials through `connection-manager.md`.
Do not log tokens, auth headers, or raw credential-bearing commands.

## Epic creation
Create one Epic per phase. Verify the Epic Name field ID in your Jira instance
 with `GET /rest/api/3/field` and locate `Epic Name`; do not assume
 `customfield_10014` is universal.

## Story creation
Project type matters:

- Team-managed / next-gen projects: link with `parent.key`
- Company-managed / classic projects: use the Epic-link custom field discovered
  from `GET /rest/api/3/field`

## Dynamic transition ID lookup
Never hardcode transition IDs. Before transitioning an issue, fetch available
 transitions from `GET /rest/api/3/issue/{issueKey}/transitions` and match by
 transition name.

MindForge event to transition-name mapping:

| Event | Preferred Jira transition name | Notes |
|---|---|---|
| `task_started` | `In Progress` | common default |
| `task_completed` | `Done` | sometimes `Resolve Issue` or `Close Issue` |
| `task_failed` | `On Hold` | fallback to `Blocked` if present |
| `UAT_signed_off` | `Done` | used for epics |

If the transition name is unavailable:
1. Log a `sync_warning` AUDIT entry
2. Skip the transition
3. Never fail the source task because Jira workflow names differ

Cache resolved transition IDs in `.planning/jira-sync.json` by project key.
Refresh the cache if a transition returns 400.

## Security bug creation
When a `security_finding` has `HIGH` or `CRITICAL` severity, create a Bug with
 the OWASP category, file, line, and remediation summary.

## Conflict handling
Preserve manual Jira edits. Sync may add comments, labels, or new issues, but
 it must not destructively overwrite manual Jira changes.

## Rate limiting and backoff
Maintain at least 200 ms between normal calls. For batches larger than 10
 tickets, start exponential backoff at 500 ms. On 429, respect `Retry-After`
 and retry once; on a second 429, stop and log the failure.

## Sync state file
Track mappings in `.planning/jira-sync.json`:

```json
{
  "schema_version": "1.0.0",
  "last_sync": "ISO-8601",
  "project_key": "ENG",
  "phase_mappings": {
    "1": {
      "epic_key": "ENG-42",
      "story_keys": { "01": "ENG-43" }
    }
  },
  "transition_cache": {
    "ENG": {
      "in_progress_id": "21",
      "done_id": "31",
      "blocked_id": "41",
      "cached_at": "ISO-8601"
    }
  },
  "_warning": "Do not store credentials in this file."
}
```

`jira-sync.json` contains project metadata, not credentials, but it may expose
 internal project structure. Consider gitignoring it in public/open-source
 distributions.
