# MindForge Integrations — Connection Manager

## Purpose
Centralise credential handling, integration detection, health checks, retry policy,
 and non-fatal failure handling for all external systems. Integrations consume
 connection state from this layer; they do not manage secrets directly.

## Credential storage principles

### Rule 1 — Never store credentials in MindForge files
MindForge configuration files may store base URLs, project IDs, channel IDs,
 reviewer lists, and feature flags. They must never contain API tokens,
 passwords, private keys, cookies, or session secrets.

### Rule 2 — Use environment variables or an external secrets manager
Supported variables:

```bash
# Jira
JIRA_BASE_URL=https://your-org.atlassian.net
JIRA_USER_EMAIL=engineer@your-org.com
JIRA_API_TOKEN=stored-in-environment-only

# Confluence
CONFLUENCE_BASE_URL=https://your-org.atlassian.net/wiki
CONFLUENCE_API_TOKEN=stored-in-environment-only

# Slack
SLACK_BOT_TOKEN=stored-in-environment-only
SLACK_WEBHOOK_URL=stored-in-environment-only
SLACK_CHANNEL_ID=C01234ABCDE

# GitHub / GitLab
GITHUB_TOKEN=stored-in-environment-only
GITLAB_TOKEN=stored-in-environment-only
```

### Rule 3 — Audit only non-sensitive metadata
AUDIT entries may contain integration name, action, status, external IDs,
 attempt counts, and error classes. Never log raw headers, raw response bodies
 containing secrets, or token values.

## Availability detection protocol

1. Check required environment variables exist.
2. Read `.mindforge/org/integrations/INTEGRATIONS-CONFIG.md` for required
   non-sensitive settings.
3. Run one lightweight health check per integration.
4. Return one of these states:

| State | Meaning | Behaviour |
|---|---|---|
| `available` | Credentials present and health check passed | Proceed |
| `unconfigured` | Credentials missing | Skip, log AUDIT |
| `invalid_credentials` | Auth failed with 401/403 | Warn, log AUDIT, stop retries |
| `unreachable` | DNS, timeout, or 5xx | Retry up to policy, then warn |
| `rate_limited` | 429 | Respect `Retry-After`, retry once, then stop |

Missing credentials are usually a graceful skip. Exception: if a CRITICAL
 security finding notification cannot be delivered because Slack is unconfigured,
 write an `Undelivered alerts` section to `.planning/STATE.md` and surface it in
 `/mindforge:status`.

## Credential hygiene in shell operations

### Preventing token exposure in shell history
Avoid inline command substitution with secrets. Prefer a function or a temporary
 client-supported credential source:

```bash
build_auth_header() {
  printf '%s' "${1}:${2}" | base64
}
AUTH_HEADER=$(build_auth_header "${JIRA_USER_EMAIL}" "${JIRA_API_TOKEN}")
```

Unset secrets after the command sequence completes:

```bash
unset JIRA_API_TOKEN
unset GITHUB_TOKEN
unset SLACK_BOT_TOKEN
```

### Debug mode prohibition
Never run credential-bearing commands with shell tracing enabled:

```bash
set +x
# credential operations
```

If debugging is needed elsewhere, disable tracing before any command that
 includes an Authorization header or secret-bearing environment variable.

### curl verbose mode prohibition
Never use `curl -v` or `curl --verbose` with authenticated requests. Capture the
 HTTP status code with `-s -o response.json -w "%{http_code}"` and log only
 sanitised error summaries.

## Health check examples

### Jira
```bash
HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" \
  -H "Authorization: Basic ${AUTH_HEADER}" \
  "${JIRA_BASE_URL}/rest/api/3/myself")
```

### Slack
Use `auth.test`. If the configured `SLACK_CHANNEL_ID` returns `channel_not_found`
 or a 404-equivalent API error, mark the channel configuration invalid and tell
 the user to update `INTEGRATIONS-CONFIG.md`.

### GitHub
Use `GET /user` with the token. A 404 from branch protection lookup later is not
 a connection error; it means no branch protection is configured.

## Credential rotation detection
If a previously available integration now returns 401/403:

1. Write AUDIT entry: `integration_credential_expired`
2. Warn the user to rotate the relevant credential
3. Do not retry with the expired credential

## Integration resilience: shared patterns for all integrations

### Non-fatal integration failures
Integration failures must never fail the underlying source-code task. They are
 non-fatal unless a compliance gate or required approval is blocked.

### Retry policy

| Attempt | Delay |
|---|---|
| 1 | immediate |
| 2 | 5 seconds |
| 3 | 20 seconds |

After the third failure:
1. Log an `integration_action` AUDIT entry with `"status": "failed"` and
   `"attempts": 3`
2. Add an item to `.planning/STATE.md` under `Pending integration actions`
3. Provide the manual retry command, for example `/mindforge:sync-jira --phase 3`

For 429 responses, obey `Retry-After` when present. If a second 429 occurs,
 stop, log it, and do not retry again.

## Integration action logging
Every sync, publish, notify, approval, or PR operation writes an AUDIT entry:

```json
{
  "id": "uuid-v4",
  "timestamp": "ISO-8601",
  "event": "integration_action",
  "integration": "jira|confluence|slack|github|gitlab",
  "action": "create_ticket|publish_page|send_notification|create_pr",
  "status": "success|failed|skipped",
  "detail": "brief description",
  "external_id": "service-specific ID"
}
```
