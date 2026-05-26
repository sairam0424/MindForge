# MindForge — Slack Integration

## Purpose
Send operational notifications for phase completion, blockers, security events,
 milestone completion, and approvals.

## Supported notifications

| Event | Behaviour |
|---|---|
| phase complete | Send summary notification |
| security finding HIGH/CRITICAL | Send urgent alert and optional mention |
| approval needed | Post request summary with approval file reference |
| blocker added | Post concise blocker notice |
| milestone complete | Post release summary |

## Message safety
Sanitise all dynamic values inserted into JSON payloads. Escape double quotes,
 backslashes, and newlines before building Block Kit payloads. Never use
 `curl -v` with Slack tokens.

## Thread management
Store thread references in `.planning/slack-threads.json`:

```json
{
  "schema_version": "1.0.0",
  "channel_id": "C01234ABCDE",
  "threads": {
    "phase-1": "1710931200.123456"
  },
  "_warning": "Do not store tokens in this file."
}
```

If Slack rejects an existing `thread_ts`, clear that entry and create a new
 thread instead of retrying the invalid timestamp.

## Undelivered critical alerts
If Slack is unconfigured or the channel is invalid during a CRITICAL security
 event, write the alert into `.planning/STATE.md` under `Undelivered alerts`.
