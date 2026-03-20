# MindForge — Day 4 Implementation Prompt
# Branch: `feat/mindforge-enterprise-integrations`
# Prerequisite: `feat/mindforge-skills-platform` merged to `main`

---

## BRANCH SETUP (run before anything else)

```bash
git checkout main
git pull origin main
git checkout -b feat/mindforge-enterprise-integrations
```

Verify all prior days are present and passing:

```bash
ls .mindforge/engine/skills/loader.md         # Day 3 skills engine
ls .mindforge/skills/performance/SKILL.md     # Day 3 skill packs
ls .claude/commands/mindforge/review.md       # Day 3 commands
cat package.json | grep '"version"'           # Must be "0.3.0"
node tests/install.test.js && \
node tests/wave-engine.test.js && \
node tests/audit.test.js && \
node tests/compaction.test.js && \
node tests/skills-platform.test.js
# All 5 suites must pass before Day 4 begins
```

---

## DAY 4 SCOPE

Day 4 builds the **Enterprise Integration & Governance Layer** — the components
that transform MindForge from a personal productivity tool into a system that
entire engineering organisations can adopt, govern, and audit.

| Component | Description |
|---|---|
| Jira Integration | Bidirectional sync: phases ↔ epics, tasks ↔ tickets, status propagation |
| Confluence Integration | Publish ARCHITECTURE.md, ADRs, phase docs to team wiki |
| Slack Integration | Notifications: phase completion, security findings, approvals, blockers |
| GitHub/GitLab Enhanced Ship | PR templates, reviewer assignment, branch protection checks |
| Multi-Developer HANDOFF | Per-developer session files, team state merging, conflict resolution |
| Governance Layer | Three-tier approval workflows, compliance gates, change classification |
| AUDIT.jsonl Archiving | Rotate after 10,000 lines, archive to `.planning/audit-archive/` |
| `/mindforge:audit` command | Query audit log: filter by phase, event, date, agent, severity |
| `/mindforge:milestone` command | Group phases into milestones, track milestone health |
| `/mindforge:complete-milestone` | Archive milestone, create release tag, generate milestone report |
| `/mindforge:approve` command | Human approval workflow for Tier 2 and Tier 3 changes |
| Day 4 test suite | `tests/integrations.test.js`, `tests/governance.test.js` |

**Do not** implement on Day 4:
- GUI dashboard or web interface (Day 5+)
- Multi-repo / monorepo support (Day 5+)
- AI-generated PR reviews (Day 5+)
- SSO / SAML authentication for integrations (Day 5+)

---

## TASK 1 — Scaffold Day 4 directory additions

```bash
# Enterprise integrations engine
mkdir -p .mindforge/integrations
touch .mindforge/integrations/jira.md
touch .mindforge/integrations/confluence.md
touch .mindforge/integrations/slack.md
touch .mindforge/integrations/github.md
touch .mindforge/integrations/gitlab.md
touch .mindforge/integrations/connection-manager.md

# Governance engine
mkdir -p .mindforge/governance
touch .mindforge/governance/approval-workflow.md
touch .mindforge/governance/change-classifier.md
touch .mindforge/governance/compliance-gates.md
touch .mindforge/governance/GOVERNANCE-CONFIG.md

# Multi-developer session management
mkdir -p .mindforge/team
touch .mindforge/team/multi-handoff.md
touch .mindforge/team/session-merger.md

# Audit archiving
mkdir -p .planning/audit-archive

# New commands
touch .claude/commands/mindforge/audit.md
touch .claude/commands/mindforge/milestone.md
touch .claude/commands/mindforge/complete-milestone.md
touch .claude/commands/mindforge/approve.md
touch .claude/commands/mindforge/sync-jira.md
touch .claude/commands/mindforge/sync-confluence.md

# Mirror to Antigravity
for cmd in audit milestone complete-milestone approve sync-jira sync-confluence; do
  cp .claude/commands/mindforge/${cmd}.md .agent/mindforge/${cmd}.md
done

# Integration config templates
mkdir -p .mindforge/org/integrations
touch .mindforge/org/integrations/INTEGRATIONS-CONFIG.md

# Tests
touch tests/integrations.test.js
touch tests/governance.test.js

# Docs
touch docs/enterprise-setup.md
touch docs/governance-guide.md
```

**Commit:**
```bash
git add .
git commit -m "chore(day4): scaffold Day 4 enterprise integrations directory structure"
```

---

## TASK 2 — Write the Integration Connection Manager

The connection manager is the security-first layer that handles all credentials,
connection validation, and integration availability detection.

### `.mindforge/integrations/connection-manager.md`

```markdown
# MindForge Integrations — Connection Manager

## Purpose
Centralise all integration credential management, availability detection,
and connection health checking. No integration should ever handle credentials
directly — all credential access goes through the connection manager.

## Credential storage principles

### Rule 1 — Never store credentials in MindForge files
Integration credentials MUST be stored in environment variables or a secrets
manager. MindForge configuration files store only: service URLs, workspace
identifiers, and non-sensitive configuration. Never API tokens or passwords.

### Rule 2 — Environment variable naming convention
```bash
# Jira
JIRA_BASE_URL=https://your-org.atlassian.net
JIRA_USER_EMAIL=engineer@your-org.com
JIRA_API_TOKEN=<from environment — never in config files>

# Confluence
CONFLUENCE_BASE_URL=https://your-org.atlassian.net/wiki
CONFLUENCE_SPACE_KEY=ENG
CONFLUENCE_API_TOKEN=<from environment>

# Slack
SLACK_BOT_TOKEN=<from environment — xoxb-...>
SLACK_WEBHOOK_URL=<from environment — optional, for simple notifications>
SLACK_CHANNEL_ID=<channel ID, not name — safe to store in config>

# GitHub
GITHUB_TOKEN=<from environment — ghp_...>
GITHUB_REPO=owner/repository-name
GITHUB_DEFAULT_REVIEWERS=user1,user2

# GitLab
GITLAB_TOKEN=<from environment>
GITLAB_PROJECT_ID=<numeric — safe to store in config>
GITLAB_DEFAULT_REVIEWERS=user1,user2
```

### Rule 3 — Config file stores non-sensitive values only
`.mindforge/org/integrations/INTEGRATIONS-CONFIG.md` stores:
- Service base URLs (not credentials)
- Workspace and project identifiers
- Channel IDs (not tokens)
- Behaviour configuration (what to sync, notification preferences)

## Connection availability detection

Before any integration action, verify the integration is available:

### Detection protocol
```bash
# Step 1: Check environment variable exists
# (do not check the value — just existence)
if [ -z "${JIRA_API_TOKEN}" ]; then
  echo "JIRA_API_TOKEN not set. Skipping Jira integration."
  exit 0  # Graceful skip — not an error
fi

# Step 2: Verify config has required non-sensitive values
# Read INTEGRATIONS-CONFIG.md and verify JIRA_BASE_URL is set

# Step 3: Health check — single lightweight API call
curl -s -o /dev/null -w "%{http_code}" \
  -H "Authorization: Basic $(echo -n "${JIRA_USER_EMAIL}:${JIRA_API_TOKEN}" | base64)" \
  "${JIRA_BASE_URL}/rest/api/3/myself"
# Expected: 200
# If 401: credentials invalid
# If 404: wrong base URL
# If connection refused: Jira unreachable
```

### Availability states
| State | Meaning | MindForge behaviour |
|---|---|---|
| `available` | Credentials present, health check passed | Proceed with integration |
| `unconfigured` | No credentials set | Skip integration silently, log to AUDIT |
| `invalid_credentials` | Credentials present but 401 response | Warn user, skip integration |
| `unreachable` | Service not responding | Warn user, skip integration |
| `rate_limited` | 429 response | Wait 60 seconds, retry once |

### Credential rotation detection
If a health check returns 401 on a previously-working integration:
1. Log AUDIT entry: `{ "event": "integration_credential_expired", "integration": "jira" }`
2. Alert the user: "Jira credentials appear to have expired. Update JIRA_API_TOKEN
   and run /mindforge:sync-jira to reconnect."
3. Do not retry with expired credentials.

## Integration action logging
Every integration action (sync, publish, notify) must write to AUDIT.jsonl:
```json
{
  "id": "uuid-v4",
  "timestamp": "ISO-8601",
  "event": "integration_action",
  "integration": "jira|confluence|slack|github|gitlab",
  "action": "create_ticket|update_ticket|publish_page|send_notification|create_pr",
  "status": "success|failed|skipped",
  "detail": "brief description",
  "external_id": "ticket ID, page ID, PR number — whatever the external system returned"
}
```

## INTEGRATIONS-CONFIG.md template

`.mindforge/org/integrations/INTEGRATIONS-CONFIG.md`:

```markdown
# MindForge Integrations Configuration
# IMPORTANT: This file must NOT contain API tokens, passwords, or credentials.
# All credentials are stored in environment variables (see connection-manager.md).

## Jira Configuration
JIRA_BASE_URL=https://your-org.atlassian.net
JIRA_PROJECT_KEY=ENG
JIRA_EPIC_LABEL=mindforge-phase
JIRA_STORY_TYPE=Story
JIRA_BUG_TYPE=Bug
JIRA_STORY_POINTS_FIELD=story_points
# Phase-to-epic mapping: MindForge Phase N → Jira Epic
# Populated automatically by /mindforge:sync-jira

## Confluence Configuration
CONFLUENCE_BASE_URL=https://your-org.atlassian.net/wiki
CONFLUENCE_SPACE_KEY=ENG
CONFLUENCE_ARCHITECTURE_PAGE_TITLE=MindForge Architecture
CONFLUENCE_ADR_PARENT_PAGE_TITLE=Architecture Decision Records
CONFLUENCE_PHASE_DOCS_PARENT_PAGE_TITLE=Sprint Documentation
# Auto-update on phase completion: true | false
CONFLUENCE_AUTO_PUBLISH=false

## Slack Configuration
SLACK_CHANNEL_ID=C01234ABCDE
SLACK_NOTIFY_ON=phase_complete,security_finding,approval_needed,blocker
SLACK_MENTION_ON_CRITICAL=@oncall
# Thread replies: group related notifications in a thread
SLACK_USE_THREADS=true

## GitHub Configuration
GITHUB_REPO=your-org/your-repo
GITHUB_DEFAULT_BRANCH=main
GITHUB_REQUIRED_REVIEWERS=2
GITHUB_DEFAULT_REVIEWERS=senior-engineer-1,senior-engineer-2
GITHUB_PR_TEMPLATE_PATH=.github/pull_request_template.md
GITHUB_DRAFT_BY_DEFAULT=false

## GitLab Configuration
# (fill in if using GitLab instead of GitHub)
GITLAB_PROJECT_ID=
GITLAB_DEFAULT_BRANCH=main
GITLAB_DEFAULT_REVIEWERS=

## Notification preferences
NOTIFY_PHASE_COMPLETE=true
NOTIFY_SECURITY_CRITICAL=true
NOTIFY_APPROVAL_NEEDED=true
NOTIFY_MILESTONE_COMPLETE=true
NOTIFY_BLOCKER_ADDED=true
```
```

**Commit:**
```bash
git add .mindforge/integrations/connection-manager.md \
        .mindforge/org/integrations/INTEGRATIONS-CONFIG.md
git commit -m "feat(integrations): implement connection manager with credential safety model"
```

---

## TASK 3 — Write Jira Integration

### `.mindforge/integrations/jira.md`

```markdown
# MindForge — Jira Integration

## Purpose
Bidirectional synchronisation between MindForge project phases/tasks and
Jira epics/stories. MindForge is the source of truth for technical planning.
Jira is the source of truth for business visibility and sprint tracking.

## Integration model

```
MindForge          ←→         Jira
──────────────────────────────────────────
Project            →           Epic (auto-created)
Phase N            →           Epic (one per phase)
PLAN-N-M.md        →           Story (one per plan)
task_completed     →           Story status: Done
task_failed        →           Story status: Blocked + comment
security_finding   →           Bug with SECURITY label
Phase verification →           Epic status: Ready for Review
UAT sign-off       →           Epic status: Done
```

## Jira API version
Use Jira REST API v3 (`/rest/api/3/`). This is the current version.
Never use v2 — it is being deprecated.

## Authentication
All API calls use HTTP Basic Auth with base64-encoded `email:api_token`.
The token is read from `JIRA_API_TOKEN` environment variable.
Never log or display the token value.

## Core operations

### Operation: Create Epic for Phase

```bash
# POST /rest/api/3/issue
# Creates a Jira Epic corresponding to a MindForge phase

REQUEST_BODY=$(cat << 'EOF'
{
  "fields": {
    "project": { "key": "${JIRA_PROJECT_KEY}" },
    "summary": "Phase [N]: [phase description from ROADMAP.md]",
    "description": {
      "type": "doc",
      "version": 1,
      "content": [{
        "type": "paragraph",
        "content": [{
          "type": "text",
          "text": "MindForge Phase [N] — auto-created by MindForge.\nPhase goal: [phase goal]\nPlanning docs: .planning/phases/[N]/"
        }]
      }]
    },
    "issuetype": { "name": "Epic" },
    "labels": ["mindforge-phase", "mindforge-phase-[N]"],
    "customfield_10014": "Phase [N]: [description]"
  }
}
EOF
)

curl -s -X POST \
  -H "Authorization: Basic ${AUTH_HEADER}" \
  -H "Content-Type: application/json" \
  -d "${REQUEST_BODY}" \
  "${JIRA_BASE_URL}/rest/api/3/issue"
```

Store the returned epic key (e.g., `ENG-42`) in STATE.md under "Jira mappings":
```markdown
## Jira mappings
- Phase 1 → ENG-42 (Epic)
- Phase 2 → ENG-58 (Epic)
```

### Operation: Create Story for Plan

```bash
# POST /rest/api/3/issue — create Story linked to Phase Epic

REQUEST_BODY=$(cat << 'EOF'
{
  "fields": {
    "project": { "key": "${JIRA_PROJECT_KEY}" },
    "summary": "[task name from PLAN file <n> field]",
    "description": {
      "type": "doc",
      "version": 1,
      "content": [{
        "type": "paragraph",
        "content": [{ "type": "text", "text": "MindForge PLAN-[N]-[M]\nFiles: [files from plan]\n[action summary]" }]
      }]
    },
    "issuetype": { "name": "Story" },
    "parent": { "key": "${EPIC_KEY}" },
    "labels": ["mindforge-plan-[N]-[M]"],
    "priority": { "name": "Medium" }
  }
}
EOF
)
```

### Operation: Update Story Status

Map MindForge task states to Jira transitions:

| MindForge event | Jira transition | Jira status |
|---|---|---|
| task_started | 11 (Start Progress) | In Progress |
| task_completed | 31 (Done) | Done |
| task_failed | 21 (Block) | Blocked |
| verify_passed | 31 (Done) | Done |

```bash
# POST /rest/api/3/issue/{issueKey}/transitions
curl -s -X POST \
  -H "Authorization: Basic ${AUTH_HEADER}" \
  -H "Content-Type: application/json" \
  -d '{"transition": {"id": "31"}}' \
  "${JIRA_BASE_URL}/rest/api/3/issue/${STORY_KEY}/transitions"
```

### Operation: Create Security Bug

When a `security_finding` AUDIT entry has severity CRITICAL or HIGH:

```bash
REQUEST_BODY=$(cat << 'EOF'
{
  "fields": {
    "project": { "key": "${JIRA_PROJECT_KEY}" },
    "summary": "[SEVERITY] Security: [finding description]",
    "description": { ... owasp category, file, line, remediation ... },
    "issuetype": { "name": "Bug" },
    "labels": ["security", "mindforge-security", "[severity-lowercase]"],
    "priority": { "name": "[Critical|High based on severity]" }
  }
}
EOF
)
```

### Operation: Add comment to Epic/Story

```bash
# POST /rest/api/3/issue/{issueKey}/comment
REQUEST_BODY=$(cat << 'EOF'
{
  "body": {
    "type": "doc",
    "version": 1,
    "content": [{
      "type": "paragraph",
      "content": [{ "type": "text", "text": "[comment text]" }]
    }]
  }
}
EOF
)
```

## Sync state tracking

Maintain a sync state file at `.planning/jira-sync.json`:

```json
{
  "schema_version": "1.0.0",
  "last_sync": "ISO-8601",
  "project_key": "ENG",
  "phase_mappings": {
    "1": { "epic_key": "ENG-42", "story_keys": { "01": "ENG-43", "02": "ENG-44" } },
    "2": { "epic_key": "ENG-58", "story_keys": {} }
  },
  "security_bugs": [
    { "audit_id": "uuid", "issue_key": "ENG-91", "severity": "HIGH" }
  ],
  "_warning": "Do not store credentials in this file."
}
```

## Conflict handling

If a Jira story is manually updated (status changed, comment added) since last sync:
Do NOT overwrite manual Jira changes with MindForge sync.
Only ADD information (new comments, new labels). Never destructively overwrite.
Log: `"sync_conflict_resolved": "manual_jira_changes_preserved"` in AUDIT.

## Rate limiting
Jira Cloud: 10 requests per second per token.
Between API calls: wait 200ms minimum.
On 429 response: wait `Retry-After` header value, then retry once.
```

---

### `.mindforge/integrations/confluence.md`

```markdown
# MindForge — Confluence Integration

## Purpose
Publish MindForge planning artifacts to Confluence so the entire organisation
has visibility into architecture decisions, phase documentation, and ADRs.
MindForge writes; Confluence displays. Team members do not need to run MindForge
to see what was decided and why.

## What gets published
| MindForge artifact | Confluence page | Update frequency |
|---|---|---|
| `.planning/ARCHITECTURE.md` | [Space]/MindForge Architecture | On demand / phase completion |
| `.planning/decisions/ADR-*.md` | [Space]/ADRs/[ADR title] | When ADR is created or status changes |
| `.planning/phases/[N]/VERIFICATION.md` | [Space]/Sprint Docs/Phase [N] Verification | On phase completion |
| `.planning/phases/[N]/UAT.md` | [Space]/Sprint Docs/Phase [N] UAT | On UAT sign-off |
| `CHANGELOG.md` | [Space]/Releases/Changelog | On milestone completion |

## Confluence API
Use Confluence REST API v2 (`/wiki/api/v2/`).
Authentication: same Basic Auth as Jira (Atlassian tokens are unified).

## Markdown to Confluence conversion

Confluence uses its own "storage format" (a dialect of XHTML).
Convert MindForge Markdown files before publishing:

### Conversion rules
```
# Heading → <h1>Heading</h1>
## Heading → <h2>Heading</h2>
**bold** → <strong>bold</strong>
`code` → <code>code</code>
| table | → <table><tbody><tr><td>table</td></tr></tbody></table>
```bash
code block
``` → <ac:structured-macro ac:name="code"><ac:plain-text-body><![CDATA[code block]]></ac:plain-text-body></ac:structured-macro>
```

For complex documents: use the Confluence API's `representation: "wiki"` field
which accepts Confluence Wiki Markup (simpler to generate than storage format):

```
h1. Heading
h2. Heading
*bold*
{{inline code}}
{code:language=bash}
code block
{code}
| Table | Header |
| Cell 1 | Cell 2 |
```

### Core API operations

**Create a new page:**
```bash
curl -s -X POST \
  -H "Authorization: Basic ${AUTH_HEADER}" \
  -H "Content-Type: application/json" \
  -d '{
    "spaceId": "'${CONFLUENCE_SPACE_ID}'",
    "status": "current",
    "title": "[Page title]",
    "parentId": "'${PARENT_PAGE_ID}'",
    "body": {
      "representation": "wiki",
      "value": "[Confluence wiki markup content]"
    }
  }' \
  "${CONFLUENCE_BASE_URL}/wiki/api/v2/pages"
```

**Update an existing page (must include current version number):**
```bash
# Step 1: Get current version
CURRENT_VERSION=$(curl -s \
  -H "Authorization: Basic ${AUTH_HEADER}" \
  "${CONFLUENCE_BASE_URL}/wiki/api/v2/pages/${PAGE_ID}" \
  | python3 -c "import sys,json; print(json.load(sys.stdin)['version']['number'])")

# Step 2: Update with incremented version
curl -s -X PUT \
  -H "Authorization: Basic ${AUTH_HEADER}" \
  -H "Content-Type: application/json" \
  -d '{
    "id": "'${PAGE_ID}'",
    "status": "current",
    "title": "[Page title]",
    "body": { "representation": "wiki", "value": "[content]" },
    "version": { "number": '$(($CURRENT_VERSION + 1))' }
  }' \
  "${CONFLUENCE_BASE_URL}/wiki/api/v2/pages/${PAGE_ID}"
```

## Page ID caching

Store published page IDs in `.planning/confluence-sync.json`:

```json
{
  "schema_version": "1.0.0",
  "last_sync": "ISO-8601",
  "space_id": "~12345678",
  "pages": {
    "architecture": { "page_id": "123456", "last_updated": "ISO-8601", "version": 3 },
    "adr-001": { "page_id": "234567", "last_updated": "ISO-8601", "version": 1 },
    "adr-002": { "page_id": "234568", "last_updated": "ISO-8601", "version": 2 },
    "phase-1-verification": { "page_id": "345678", "last_updated": "ISO-8601", "version": 1 }
  },
  "_warning": "Do not store credentials in this file."
}
```

## Idempotency rule
Publishing is idempotent. Running sync twice produces identical pages.
Detect existing pages via `confluence-sync.json` before creating new ones.
Never create duplicate pages — always update if a page already exists.
```

---

### `.mindforge/integrations/slack.md`

```markdown
# MindForge — Slack Integration

## Purpose
Send structured, actionable notifications to the team's Slack channel
at the right moments: phase completions, security findings, approval requests,
and blockers. Not every event — only events that require human attention.

## Notification philosophy
- **Signal over noise:** only notify when human action is needed or when a
  significant milestone has been reached. Never notify on routine progress.
- **Actionable:** every notification should make the reader's next step obvious.
- **Threadable:** group related notifications in Slack threads to keep the channel clean.

## Events that trigger notifications

| Event | Channel notification | Who is mentioned |
|---|---|---|
| Phase complete | ✅ Yes | Phase owner (from STATE.md) |
| Security CRITICAL finding | ✅ Yes | Security team / `@oncall` |
| Security HIGH finding | ✅ Yes | Tech lead |
| Approval needed (Tier 2/3) | ✅ Yes | Assigned approver |
| Blocker added to STATE.md | ✅ Yes | Phase owner |
| Milestone complete | ✅ Yes | Entire team channel |
| Task completed | ❌ No | — (too noisy) |
| UAT sign-off | ✅ Yes | Stakeholder / PM |
| Build/test failure | ✅ Yes | Phase owner |

## Slack Block Kit message templates

### Phase completion notification

```json
{
  "channel": "${SLACK_CHANNEL_ID}",
  "blocks": [
    {
      "type": "header",
      "text": { "type": "plain_text", "text": "✅ Phase [N] Complete" }
    },
    {
      "type": "section",
      "fields": [
        { "type": "mrkdwn", "text": "*Project:*\n[project name]" },
        { "type": "mrkdwn", "text": "*Phase:*\n[N] — [phase description]" },
        { "type": "mrkdwn", "text": "*Tasks completed:*\n[X] / [X]" },
        { "type": "mrkdwn", "text": "*Requirements met:*\n[X] / [X]" }
      ]
    },
    {
      "type": "section",
      "text": { "type": "mrkdwn", "text": "*Commits:* [X] | *Tests:* All passing ✅" }
    },
    {
      "type": "actions",
      "elements": [
        {
          "type": "button",
          "text": { "type": "plain_text", "text": "View UAT" },
          "url": "[link to UAT.md in repo]"
        },
        {
          "type": "button",
          "text": { "type": "plain_text", "text": "View in Jira" },
          "url": "[Jira epic URL]"
        }
      ]
    }
  ]
}
```

### Security critical finding notification

```json
{
  "channel": "${SLACK_CHANNEL_ID}",
  "blocks": [
    {
      "type": "header",
      "text": { "type": "plain_text", "text": "🔴 Critical Security Finding" }
    },
    {
      "type": "section",
      "text": {
        "type": "mrkdwn",
        "text": "<!channel> A critical security issue was found during Phase [N] execution.\n*Severity:* CRITICAL\n*Category:* [OWASP category]\n*Finding:* [one-line description]\n*File:* `[file:line]`"
      }
    },
    {
      "type": "section",
      "text": {
        "type": "mrkdwn",
        "text": "*Immediate action required:* Run `/mindforge:security-scan` and review findings before any deployment."
      }
    },
    {
      "type": "context",
      "elements": [{ "type": "mrkdwn", "text": "Report: `.planning/phases/[N]/SECURITY-REVIEW-[N].md`" }]
    }
  ]
}
```

### Approval request notification

```json
{
  "channel": "${SLACK_CHANNEL_ID}",
  "blocks": [
    {
      "type": "header",
      "text": { "type": "plain_text", "text": "⏳ Approval Required" }
    },
    {
      "type": "section",
      "fields": [
        { "type": "mrkdwn", "text": "*Type:*\n[Tier 2: Feature / Tier 3: Compliance]" },
        { "type": "mrkdwn", "text": "*Requested by:*\n@[requester]" },
        { "type": "mrkdwn", "text": "*Approver:*\n@[assigned approver]" },
        { "type": "mrkdwn", "text": "*Phase/Plan:*\nPhase [N], Plan [M]" }
      ]
    },
    {
      "type": "section",
      "text": { "type": "mrkdwn", "text": "*Change:* [description]\n*Risk:* [risk assessment]\n*Rollback:* [rollback plan if available]" }
    },
    {
      "type": "actions",
      "elements": [
        {
          "type": "button",
          "style": "primary",
          "text": { "type": "plain_text", "text": "✅ Approve" },
          "value": "approve:[approval-id]"
        },
        {
          "type": "button",
          "style": "danger",
          "text": { "type": "plain_text", "text": "❌ Reject" },
          "value": "reject:[approval-id]"
        },
        {
          "type": "button",
          "text": { "type": "plain_text", "text": "Review changes" },
          "url": "[link to diff or plan]"
        }
      ]
    }
  ]
}
```

## Sending notifications

```bash
curl -s -X POST \
  -H "Authorization: Bearer ${SLACK_BOT_TOKEN}" \
  -H "Content-Type: application/json" \
  -d "${MESSAGE_JSON}" \
  https://slack.com/api/chat.postMessage
```

## Thread management

When `SLACK_USE_THREADS=true`:
1. The first notification for a phase creates a thread (record the `ts` value)
2. All subsequent notifications for the same phase reply to that thread
3. Store thread `ts` values in `.planning/slack-threads.json`:

```json
{
  "schema_version": "1.0.0",
  "threads": {
    "phase-1": "1234567890.123456",
    "phase-2": "1234567891.234567",
    "milestone-v1": "1234567892.345678"
  },
  "_warning": "Do not store credentials in this file."
}
```

## Graceful degradation
If Slack is unconfigured (`SLACK_BOT_TOKEN` not set):
- Skip all notifications silently
- Log to AUDIT: `{ "event": "notification_skipped", "reason": "slack_unconfigured" }`
- Never fail a phase execution because Slack is unavailable
```

**Commit:**
```bash
git add .mindforge/integrations/
git commit -m "feat(integrations): implement Jira, Confluence, Slack integration specs"
```

---

## TASK 4 — Write GitHub/GitLab Enhanced Ship Integration

### `.mindforge/integrations/github.md`

```markdown
# MindForge — GitHub Integration

## Purpose
Enhance the `/mindforge:ship` command with professional, standards-compliant
pull requests: structured templates, automatic reviewer assignment, branch
protection compliance checks, and release tag management.

## GitHub REST API version
Use GitHub REST API v4 (GraphQL) for complex queries, REST v3 for mutations.
Base URL: `https://api.github.com`
Authentication: `Authorization: Bearer ${GITHUB_TOKEN}`

## Enhanced PR creation

### Pre-flight checks before creating a PR

```bash
# 1. Verify branch protection compliance
# Check if the source branch can be merged (no merge conflicts, required checks pass)
curl -s \
  -H "Authorization: Bearer ${GITHUB_TOKEN}" \
  -H "Accept: application/vnd.github.v3+json" \
  "https://api.github.com/repos/${GITHUB_REPO}/branches/${CURRENT_BRANCH}/protection"

# 2. Check if required status checks are passing
curl -s \
  -H "Authorization: Bearer ${GITHUB_TOKEN}" \
  "https://api.github.com/repos/${GITHUB_REPO}/commits/${CURRENT_SHA}/check-runs"
```

### PR creation payload

```bash
PR_BODY=$(cat .github/pull_request_template.md 2>/dev/null || echo "[no template found — using generated body]")

REQUEST_BODY=$(cat << EOF
{
  "title": "[Phase N]: [phase description]",
  "body": "${PR_BODY}",
  "head": "${CURRENT_BRANCH}",
  "base": "${GITHUB_DEFAULT_BRANCH}",
  "draft": ${GITHUB_DRAFT_BY_DEFAULT},
  "maintainer_can_modify": true
}
EOF
)

PR_RESPONSE=$(curl -s -X POST \
  -H "Authorization: Bearer ${GITHUB_TOKEN}" \
  -H "Content-Type: application/json" \
  -d "${REQUEST_BODY}" \
  "https://api.github.com/repos/${GITHUB_REPO}/pulls")

PR_NUMBER=$(echo "${PR_RESPONSE}" | python3 -c "import sys,json; print(json.load(sys.stdin)['number'])")
```

### Auto-assign reviewers

```bash
curl -s -X POST \
  -H "Authorization: Bearer ${GITHUB_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "reviewers": ['$(echo ${GITHUB_DEFAULT_REVIEWERS} | tr ',' '\n' | python3 -c "import sys; print(','.join(['\"'+l.strip()+'\"' for l in sys.stdin]))' ]
  }' \
  "https://api.github.com/repos/${GITHUB_REPO}/pulls/${PR_NUMBER}/requested_reviewers"
```

### Add PR labels

```bash
curl -s -X POST \
  -H "Authorization: Bearer ${GITHUB_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{"labels": ["mindforge", "phase-[N]", "auto-generated"]}' \
  "https://api.github.com/repos/${GITHUB_REPO}/issues/${PR_NUMBER}/labels"
```

### Link Jira tickets in PR body

If Jira integration is active, include ticket references in the PR body:
```
## Related issues
- Phase Epic: [ENG-42](https://your-org.atlassian.net/browse/ENG-42)
- Stories: [ENG-43](…), [ENG-44](…), [ENG-45](…)
```

## PR template

Write `.github/pull_request_template.md` if it doesn't exist:

```markdown
## Summary
<!-- 2-3 sentences: what this PR delivers -->

## MindForge Phase
- **Phase:** [N] — [description]
- **Branch:** [branch name]
- **Milestone:** [milestone name if applicable]

## Changes
<!-- Auto-populated by MindForge from SUMMARY files -->

## Requirements delivered
| ID | Requirement | Verified |
|---|---|---|
| FR-XX | ... | ✅ |

## Testing
- [ ] Unit tests pass (see VERIFICATION.md)
- [ ] Integration tests pass
- [ ] Human UAT completed (see UAT.md)
- [ ] Performance tested (if applicable)
- [ ] Accessibility tested (if applicable)

## Security
- [ ] Security scan completed (see SECURITY-REVIEW-N.md)
- [ ] No hardcoded credentials in diff
- [ ] Dependencies scanned for CVEs
- [ ] No CRITICAL or HIGH security findings

## Documentation
- [ ] CHANGELOG.md updated
- [ ] Architecture doc updated (if applicable)
- [ ] ADRs written for new decisions
- [ ] Confluence pages published (if integration active)

## Reviewer notes
<!-- Anything the reviewer specifically needs to know or check -->
```

## Release tag creation

After a PR is merged:

```bash
# Create annotated release tag
curl -s -X POST \
  -H "Authorization: Bearer ${GITHUB_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "tag": "v'${VERSION}'",
    "message": "Release v'${VERSION}' — Phase [N]: [description]",
    "object": "'${MERGE_COMMIT_SHA}'",
    "type": "commit",
    "tagger": {
      "name": "MindForge",
      "email": "mindforge@your-org.com",
      "date": "'$(date -u +%Y-%m-%dT%H:%M:%SZ)'"
    }
  }' \
  "https://api.github.com/repos/${GITHUB_REPO}/git/tags"
```

## Branch naming convention

MindForge branches follow this convention:
```
feat/mindforge-phase-[N]-[slug]
fix/mindforge-hotfix-[description]
chore/mindforge-maintenance-[description]
```

The branch is created automatically when `/mindforge:execute-phase` starts
(if `git.branching_strategy = "phase"` in config).
```

---

### `.mindforge/integrations/gitlab.md`

```markdown
# MindForge — GitLab Integration

## Purpose
Mirror of the GitHub integration for teams using GitLab.
GitLab MR (Merge Request) workflow equivalent.

## GitLab REST API
Base URL: `https://gitlab.com/api/v4` (or self-hosted equivalent)
Authentication: `Authorization: Bearer ${GITLAB_TOKEN}`
Project: identified by `GITLAB_PROJECT_ID` (numeric)

## Core operations

### Create Merge Request

```bash
curl -s -X POST \
  -H "Authorization: Bearer ${GITLAB_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "source_branch": "'${CURRENT_BRANCH}'",
    "target_branch": "'${GITLAB_DEFAULT_BRANCH}'",
    "title": "[Phase N]: [description]",
    "description": "'${MR_BODY}'",
    "reviewer_ids": [${REVIEWER_IDS}],
    "labels": "mindforge,phase-[N]",
    "remove_source_branch": true,
    "squash": false
  }' \
  "https://gitlab.com/api/v4/projects/${GITLAB_PROJECT_ID}/merge_requests"
```

### Create release tag

```bash
curl -s -X POST \
  -H "Authorization: Bearer ${GITLAB_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "v'${VERSION}'",
    "tag_name": "v'${VERSION}'",
    "ref": "'${DEFAULT_BRANCH}'",
    "description": "'${RELEASE_NOTES}'"
  }' \
  "https://gitlab.com/api/v4/projects/${GITLAB_PROJECT_ID}/releases"
```

## GitLab vs GitHub differences
- GitLab uses "Merge Requests" (MR) not "Pull Requests" (PR)
- GitLab reviewer IDs are numeric — look them up by username before creating MR
- GitLab self-hosted: replace `https://gitlab.com` with your instance URL
- GitLab CI: status checks are "pipelines" — check pipeline status, not check-runs
```

**Commit:**
```bash
git add .mindforge/integrations/github.md .mindforge/integrations/gitlab.md
git commit -m "feat(integrations): implement GitHub and GitLab enhanced ship specs"
```

---

## TASK 5 — Write the Governance Layer

The governance layer is MindForge's enterprise differentiator.
It adds approval workflows, compliance gates, and change classification.

### `.mindforge/governance/change-classifier.md`

```markdown
# MindForge Governance — Change Classifier

## Purpose
Classify every MindForge code change into one of three approval tiers before
execution. The tier determines the approval workflow required.

## Classification tiers

### Tier 1 — Auto-approved (no human approval needed)
Changes that are low-risk, reversible, and covered by automated testing.

**Classification criteria:**
- Bug fixes in non-security-critical paths
- Documentation updates
- Test additions or improvements
- Dependency updates (PATCH versions — no new capabilities)
- Refactoring with no behaviour change (verified by tests)
- Configuration changes to non-sensitive values

**Verification:** Automated quality gates must pass:
- Test suite: all passing
- Linting: zero errors
- Type checking: zero errors
- Security scan: no new findings

**Approval SLA:** None — auto-approved when all gates pass.

---

### Tier 2 — Peer Review Required
Changes that introduce new behaviour, touch dependencies, or affect multiple
subsystems. Requires one senior engineer approval.

**Classification criteria — classify as Tier 2 if ANY of these are true:**
- New feature implementation (any `feat:` commit)
- Dependency additions (not just updates)
- MINOR or MAJOR dependency version updates
- Database schema changes (new tables, new columns, index changes)
- API surface changes (new endpoints, changed request/response schemas)
- Configuration changes to sensitive-but-not-critical values
- Infrastructure changes (Dockerfile, docker-compose, CI/CD pipelines)
- Changes affecting > 10 files or > 300 lines
- New environment variables being added

**Verification:** Tier 1 gates + code review approval from at least one
designated reviewer (`GITHUB_DEFAULT_REVIEWERS` from INTEGRATIONS-CONFIG.md).

**Approval SLA:** Target 24 hours. Escalate if no response after 48 hours.

---

### Tier 3 — Compliance Review Required
High-risk changes with regulatory, security, or financial implications.
Requires designated approver (security officer, compliance officer, or CTO).

**Classification criteria — classify as Tier 3 if ANY of these are true:**
- Authentication or authorisation logic (login, logout, token handling, OAuth)
- Password handling, credential storage, or encryption key management
- Payment processing, financial data access, or billing logic
- Personal data (PII, PHI) access patterns
- Data deletion or anonymisation workflows
- User role and permission models
- Cross-border data transfer configuration
- External security auditor findings being remediated
- Changes to security policies, rate limiting, or CORS configuration

**Verification:** Tier 2 gates + explicit written approval from the designated
compliance approver with a documented risk assessment.

**Approval SLA:** Target 4 hours for P0/P1 related changes. 48 hours standard.

---

## Automatic classification protocol

When the change classifier runs (before any Tier 2/3 commit or PR):

### Step 1 — Read the diff
```bash
git diff HEAD --name-only --diff-filter=ACMR
```

### Step 2 — Apply Tier 3 rules first (highest priority)
Scan diff for Tier 3 patterns. Check:
- File paths containing: `auth/`, `security/`, `payment/`, `billing/`, `privacy/`
- File names: `session.ts`, `login.ts`, `token.ts`, `password.ts`, `credentials.ts`
- Code patterns: `bcrypt`, `argon2`, `jwt.sign`, `jwt.verify`, `stripe.`, `twilio.`
- AUDIT entries: any `security_finding` of CRITICAL or HIGH
If ANY Tier 3 pattern matches: classify as Tier 3. Do not continue to Tier 2 check.

### Step 3 — Apply Tier 2 rules
If not Tier 3, scan for Tier 2 patterns. Check:
- Any `feat:` commit in the diff's commits
- `package.json` changes (dependencies added or changed)
- Database migration files present
- New `.md` files added to `src/api/` or `routes/`
- More than 10 files changed
If ANY Tier 2 pattern matches: classify as Tier 2.

### Step 4 — Default to Tier 1
If neither Tier 3 nor Tier 2 patterns match: Tier 1 auto-approved.

### Step 5 — Write classification to AUDIT
```json
{
  "event": "change_classified",
  "tier": 1,
  "classification_reason": "no Tier 2 or Tier 3 patterns found",
  "files_checked": [N],
  "patterns_matched": []
}
```
```

---

### `.mindforge/governance/approval-workflow.md`

```markdown
# MindForge Governance — Approval Workflow

## Purpose
Define the exact process for requesting, tracking, and recording approvals
for Tier 2 and Tier 3 changes.

## Approval request lifecycle

```
PENDING → APPROVED ✅
       → REJECTED ❌
       → EXPIRED (48 hours with no response) → escalate
```

## Approval request format

Write to `.planning/approvals/APPROVAL-[uuid].json`:

```json
{
  "schema_version": "1.0.0",
  "id": "uuid-v4",
  "tier": 2,
  "status": "pending",
  "requested_at": "ISO-8601",
  "expires_at": "ISO-8601 (+48h for Tier 2, +4h for Tier 3 P0)",
  "requester": "mindforge-orchestrator",
  "approver": "designated-reviewer-from-config",
  "phase": 3,
  "plan": "02",
  "change_description": "Add user role management with admin/editor/viewer roles",
  "change_classification_reason": "New permission model — Tier 3: authorisation logic",
  "files_changed": ["src/auth/roles.ts", "src/middleware/rbac.ts"],
  "risk_assessment": {
    "risk_level": "medium",
    "rollback_plan": "Revert commit sha:abc1234 — no migration rollback needed",
    "blast_radius": "All authenticated users — role check on every request"
  },
  "jira_ticket": "ENG-67",
  "slack_notification_ts": "1234567890.123456",
  "resolution": null,
  "resolved_at": null,
  "resolver_notes": null,
  "_warning": "Do not store credentials in this file."
}
```

## Requesting approval

When the change classifier returns Tier 2 or Tier 3:

### Step 1 — Create approval request file
Generate a UUID. Write the approval request JSON.
Create directory `.planning/approvals/` if it doesn't exist.

### Step 2 — Send Slack notification (if configured)
Use the approval request Slack template from `slack.md`.
Store the Slack message `ts` value in the approval request file.

### Step 3 — Create Jira ticket (if configured, Tier 3 only)
For Tier 3 changes: create a Jira ticket for the approval workflow.
Link it to the phase epic.

### Step 4 — Block execution until resolved
Do not proceed with any more execution until this approval is APPROVED.
Poll for approval status every 5 minutes:
```
Waiting for [Tier 2/3] approval...
  Requested : [timestamp]
  Approver  : [name]
  Expires   : [timestamp]
  Status    : PENDING

Run /mindforge:approve [approval-id] to approve, or check Slack.
```

### Step 5 — On approval
1. Update approval JSON: `"status": "approved"`, `"resolved_at": ISO-8601`
2. Write AUDIT entry: `"event": "change_approved", "tier": 2, "approval_id": "uuid"`
3. Proceed with execution

### Step 6 — On rejection
1. Update approval JSON: `"status": "rejected"`
2. Write AUDIT entry: `"event": "change_rejected", "tier": 2, "approval_id": "uuid"`
3. Report to user: "Change rejected by [approver]. Reason: [notes]"
4. Create a fix task: address the rejection reason and re-request approval

### Step 7 — On expiry
1. Update approval JSON: `"status": "expired"`
2. Write AUDIT entry with `"event": "approval_expired"`
3. Escalate per the INTEGRATIONS-CONFIG.md escalation path
4. Alert user and ask whether to re-request or escalate

## Override mechanism (emergency only)

For P0 incidents requiring immediate deployment:

```
/mindforge:approve [approval-id] --emergency --reason "[justification]"
```

Emergency overrides are:
- Logged with `"emergency_override": true` in AUDIT
- Flagged in the Slack notification channel
- Subject to post-incident review (auto-creates a follow-up task)
- Limited to users in the `EMERGENCY_APPROVERS` config list
Never use emergency overrides for convenience — only for genuine production emergencies.
```

---

### `.mindforge/governance/compliance-gates.md`

```markdown
# MindForge Governance — Compliance Gates

## Purpose
Define hard gates that block phase execution and PR creation when specific
regulatory or security requirements are not met.
These gates cannot be bypassed by approval — they must be resolved.

## Gate definitions

### Gate 1 — No open CRITICAL security findings
**Trigger:** Any `security_finding` with `severity: "CRITICAL"` in the current
phase's SECURITY-REVIEW file where `remediated: false`.

**Block:** Phase execution, PR creation, release tag.
**Resolution:** Fix the finding, re-run `/mindforge:security-scan`, confirm remediated.
**Override:** Not possible — CRITICAL findings must be fixed.

---

### Gate 2 — Test suite passing
**Trigger:** Test suite exit code non-zero.

**Block:** Phase completion, PR creation.
**Resolution:** Fix failing tests.
**Override:** Not possible in standard mode. Emergency only with `--emergency`.

---

### Gate 3 — No secrets in diff
**Trigger:** Secret detection scan finds any credential pattern in staged changes.

**Block:** Commit, PR creation.
**Resolution:** Remove secret from code, rotate the credential immediately.
**Override:** Not possible — a committed secret is a security incident.
**Additional action:** If a secret was already committed, trigger the incident
response protocol: `{ "event": "secret_committed", "severity": "CRITICAL" }`.

---

### Gate 4 — GDPR compliance (when data-privacy skill active)
**Trigger:** New PII field added to schema without a documented retention period.

**Block:** Phase completion.
**Resolution:** Add retention period to ARCHITECTURE.md data model.
**Override:** Requires compliance officer approval (Tier 3).

---

### Gate 5 — Dependency CVE clearance
**Trigger:** `npm audit` or `pip-audit` returns HIGH or CRITICAL CVE.

**Block:** PR creation.
**Resolution:** Update the vulnerable dependency.
**Override:** Requires security officer approval (Tier 3) with documented
temporary mitigation.

---

## Gate execution

Run gates in this order (fail fast):

```
Gate 3 (no secrets)      → fastest, cheapest, most critical
Gate 1 (no CRITICAL sec) → check SECURITY-REVIEW file
Gate 2 (tests passing)   → run test suite
Gate 5 (CVE clearance)   → npm audit
Gate 4 (GDPR)            → only if data-privacy skill was active
```

Write gate results to `.planning/phases/[N]/GATE-RESULTS-[N].md`:

```markdown
# Compliance Gate Results — Phase [N]
**Run at:** [ISO-8601]

| Gate | Status | Detail |
|---|---|---|
| Secret detection | ✅ PASS | 0 patterns found |
| CRITICAL security findings | ✅ PASS | No open CRITICAL findings |
| Test suite | ✅ PASS | 342 tests passing |
| Dependency CVEs | ⚠️  WARN | 1 MODERATE CVE (below blocking threshold) |
| GDPR retention | ✅ PASS | data-privacy skill not active this phase |

**Overall:** ✅ ALL BLOCKING GATES PASSED
```
```

**Commit:**
```bash
git add .mindforge/governance/
git commit -m "feat(governance): implement change classifier, approval workflow, compliance gates"
```

---

## TASK 6 — Write Multi-Developer HANDOFF System

### `.mindforge/team/multi-handoff.md`

```markdown
# MindForge Team — Multi-Developer HANDOFF

## Purpose
Enable multiple developers on the same project to each maintain their own
MindForge session state without overwriting each other's HANDOFF.json.

## Problem with single HANDOFF.json in team environments
If two developers both run MindForge on the same branch:
- Developer A's session writes HANDOFF.json at 2pm
- Developer B's session writes HANDOFF.json at 3pm
- Developer A resumes at 4pm — reads B's state, not their own
- Developer A continues from the wrong position

## Solution: Per-developer HANDOFF files

### File naming convention
Instead of `.planning/HANDOFF.json`:

```
.planning/HANDOFF.json                  ← Shared team state (phase-level)
.planning/handoffs/HANDOFF-[dev-id].json ← Per-developer session state
```

Where `[dev-id]` is derived from:
1. `git config user.email` (primary — unique per developer)
2. `$USER` environment variable (fallback)
3. `[hostname]-[pid]` (last resort)

The dev-id is sanitised to be safe as a filename:
`john@company.com → john-company-com`
`john.smith → john-smith`

### File structure: per-developer HANDOFF

```json
{
  "schema_version": "1.0.0",
  "developer_id": "john-company-com",
  "developer_email": "john@company.com",
  "project": "my-saas-app",
  "phase": 3,
  "plan": "02",
  "plan_step": "Implementing the RBAC middleware — step 3 of 5",
  "last_completed_task": {
    "description": "Created role definition schema",
    "commit_sha": "abc1234",
    "verified": true
  },
  "next_task": "Implement permission check middleware in src/middleware/rbac.ts",
  "in_progress": {
    "file": "src/middleware/rbac.ts",
    "intent": "Add hasPermission(userId, resource, action) function",
    "completed_steps": ["Read existing middleware structure", "Defined Permission type"],
    "remaining_steps": ["Implement hasPermission", "Add tests", "Verify"]
  },
  "blockers": [],
  "decisions_needed": [],
  "context_refs": [
    ".planning/PROJECT.md",
    ".planning/STATE.md",
    ".planning/phases/3/PLAN-3-02.md"
  ],
  "recent_commits": ["abc1234: feat(rbac): add role schema"],
  "recent_files": ["src/auth/roles.ts", "src/middleware/rbac.ts"],
  "agent_notes": "Using casbin library for permission checking per TOOLS.md",
  "_warning": "Never store secrets, tokens, or passwords in this file.",
  "updated_at": "ISO-8601"
}
```

### Shared team HANDOFF.json
The shared `.planning/HANDOFF.json` contains only phase-level state —
not session-level state. Updated by the developer who completes a phase task:

```json
{
  "schema_version": "1.0.0",
  "project": "my-saas-app",
  "phase": 3,
  "plan": null,
  "last_completed_task": {
    "description": "Phase 3 execution started",
    "completed_plans": ["01"],
    "in_progress_plans": ["02", "03"]
  },
  "next_task": "Continue Phase 3 execution — Plans 02 and 03 in progress",
  "blockers": [],
  "decisions_needed": [],
  "context_refs": [
    ".planning/PROJECT.md",
    ".planning/STATE.md",
    ".planning/phases/3/DEPENDENCY-GRAPH-3.md"
  ],
  "active_developers": [
    { "dev_id": "john-company-com", "plan": "02", "last_seen": "ISO-8601" },
    { "dev_id": "jane-company-com", "plan": "03", "last_seen": "ISO-8601" }
  ],
  "_warning": "Never store secrets, tokens, or passwords in this file.",
  "updated_at": "ISO-8601"
}
```

## Session start in team mode

When CLAUDE.md session start protocol runs in team mode:

1. Determine developer ID from `git config user.email`
2. Check for per-developer HANDOFF: `.planning/handoffs/HANDOFF-[dev-id].json`
3. If per-developer HANDOFF exists and is fresh (< 48 hours): load it as primary state
4. Also read shared HANDOFF.json for team context (what others are working on)
5. Present to developer:
   ```
   Your session: Phase 3, Plan 02 (RBAC middleware)
   Team activity:
     - jane-company-com: working on Plan 03 (permission tests)
   
   Continue from your last session? (yes/no)
   ```

## Conflict detection

When two developers might be modifying the same files:

1. On session start: read shared HANDOFF.json `active_developers`
2. Find your assigned plan (or the plan you are about to start)
3. Check other developers' plans for file overlap using the dependency parser
4. If overlap detected:
   ```
   ⚠️ File conflict detected:
   jane-company-com is working on Plan 03 which also modifies:
     - src/middleware/rbac.ts (you are also assigned this file in Plan 02)
   
   Recommended: coordinate with jane before modifying this file.
   Options: 1) Wait for her plan to complete  2) Continue (risk merge conflict)
   ```
```

---

### `.mindforge/team/session-merger.md`

```markdown
# MindForge Team — Session Merger

## Purpose
When multiple developers complete work on the same branch, merge their
session artifacts (SUMMARY files, AUDIT entries, STATE updates) into a
coherent phase record.

## Merge protocol

### When to merge
Run session merge when:
- A developer pushes commits that include work from another developer
- The branch is being prepared for a PR
- `/mindforge:complete-milestone` is run with multiple active developers

### Merge steps

**Step 1 — Collect all per-developer session artifacts**
```bash
ls .planning/handoffs/HANDOFF-*.json
```

**Step 2 — Merge AUDIT entries**
All AUDIT entries from all developers' sessions are already in AUDIT.jsonl
(assuming all developers committed their changes — git history = source of truth).
No merge needed — AUDIT.jsonl is append-only and already contains all entries.

**Step 3 — Merge SUMMARY files**
SUMMARY files are per-plan, per-developer. They should already be in the
`.planning/phases/[N]/` directory from each developer's commits.
Verify all expected SUMMARY files exist.

**Step 4 — Reconcile STATE.md**
The shared STATE.md may have been updated by multiple developers.
Use `git log --oneline .planning/STATE.md` to see the history.
Generate a merged STATE.md that reflects the collective current state:
- Phase status: complete if all plans have SUMMARY files
- Decisions: union of all decisions from all sessions
- Blockers: any unresolved blockers from any session

**Step 5 — Archive per-developer HANDOFFs**
Move per-developer HANDOFF files to `.planning/handoffs/archived/`:
```bash
mv .planning/handoffs/HANDOFF-*.json .planning/handoffs/archived/
```
Leave only the shared HANDOFF.json in `.planning/handoffs/`.
The shared HANDOFF.json is updated to reflect the merged state.
```

**Commit:**
```bash
git add .mindforge/team/
git commit -m "feat(team): implement multi-developer HANDOFF and session merger"
```

---

## TASK 7 — Write AUDIT Archiving System

Add an archiving section to `.mindforge/audit/AUDIT-SCHEMA.md`:

```markdown
## AUDIT.jsonl Archiving

### When to archive
Archive AUDIT.jsonl when line count exceeds 10,000 entries.
Check count: `wc -l .planning/AUDIT.jsonl`

### Archive protocol

```bash
# 1. Determine archive filename (ISO-8601 date range)
FIRST_DATE=$(head -1 .planning/AUDIT.jsonl | python3 -c "import sys,json; print(json.loads(sys.stdin.read())['timestamp'][:10])")
LAST_DATE=$(tail -1 .planning/AUDIT.jsonl | python3 -c "import sys,json; print(json.loads(sys.stdin.read())['timestamp'][:10])")
ARCHIVE_NAME="audit-${FIRST_DATE}-to-${LAST_DATE}.jsonl"

# 2. Copy to archive directory
cp .planning/AUDIT.jsonl ".planning/audit-archive/${ARCHIVE_NAME}"

# 3. Write archive marker as first entry of new AUDIT.jsonl
echo '{"id":"'$(uuidgen)'","timestamp":"'$(date -u +%Y-%m-%dT%H:%M:%SZ)'","event":"audit_archive_created","archive_file":"'${ARCHIVE_NAME}'","entries_archived":'$(wc -l < .planning/AUDIT.jsonl)'}' > .planning/AUDIT.jsonl.new

# 4. Replace AUDIT.jsonl with the new file containing only the archive marker
mv .planning/AUDIT.jsonl.new .planning/AUDIT.jsonl

# 5. Commit the archive
git add .planning/audit-archive/${ARCHIVE_NAME} .planning/AUDIT.jsonl
git commit -m "chore(audit): archive AUDIT.jsonl to ${ARCHIVE_NAME}"
```

### Querying archived entries
To search across current + archived logs:
```bash
# Search all audit logs (current + archives)
cat .planning/AUDIT.jsonl .planning/audit-archive/*.jsonl 2>/dev/null \
  | grep '"event":"security_finding"' \
  | python3 -m json.tool
```

### Archive retention
Archive files are committed to git. They are part of the permanent project record.
Do not delete archive files — they are the audit trail for past work.
For very old projects with many archives: consider moving to a long-term storage
solution and replacing with a summary index file.
```

**Commit:**
```bash
git add .mindforge/audit/AUDIT-SCHEMA.md .planning/audit-archive/
git commit -m "feat(audit): implement AUDIT.jsonl archiving protocol (10K line threshold)"
```

---

## TASK 8 — Write `/mindforge:audit` command

### `.claude/commands/mindforge/audit.md`

```markdown
# MindForge — Audit Command
# Usage: /mindforge:audit [filter] [--phase N] [--event type] [--date YYYY-MM-DD]
#                         [--since YYYY-MM-DD] [--severity S] [--export path]

## Purpose
Query the append-only AUDIT.jsonl log with filters to produce actionable reports
for governance, debugging, and compliance purposes.

## Available filters

| Flag | Description | Example |
|---|---|---|
| `--phase [N]` | Filter by phase number | `--phase 3` |
| `--event [type]` | Filter by event type | `--event security_finding` |
| `--date [YYYY-MM-DD]` | Filter by specific date | `--date 2026-03-20` |
| `--since [YYYY-MM-DD]` | Filter from date onwards | `--since 2026-03-01` |
| `--severity [level]` | Filter security findings by severity | `--severity CRITICAL` |
| `--agent [name]` | Filter by which agent wrote the entry | `--agent mindforge-orchestrator` |
| `--export [path]` | Export filtered results to a file | `--export audit-report.json` |
| `--include-archived` | Also search archived AUDIT files | |
| `--summary` | Show summary statistics instead of entries | |

## Output modes

### Default — formatted table
```
/mindforge:audit --phase 3

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Audit Log — Phase 3 (47 entries)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  2026-03-20 14:32:10  phase_planned          Phase 3: 6 plans, 3 waves
  2026-03-20 14:33:22  task_started           Plan 3-01: User model
  2026-03-20 14:45:18  task_completed  ✅     Plan 3-01 — commit: abc1234
  2026-03-20 14:45:19  task_started           Plan 3-02: Product model
  2026-03-20 14:51:33  security_finding  🔴   HIGH: A07 — weak session config
  2026-03-20 14:52:00  task_completed  ✅     Plan 3-02 — commit: def5678
  2026-03-20 15:12:45  change_classified      Tier 2 (new feature) — peer review
  2026-03-20 15:13:00  change_approved        Approved by: john-company-com
  ...

  Showing 20 of 47 entries. Add --all to show all entries.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### Summary mode (`--summary`)
```
/mindforge:audit --summary

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Audit Summary — [Project Name]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  Total entries       : 342
  Date range          : 2026-03-15 → 2026-03-20
  Phases covered      : 1, 2, 3

  Events by type:
    task_completed      87
    task_started        87
    security_finding    12
    context_compaction   5
    change_approved      8
    change_rejected      1
    quality_gate_failed  3

  Security findings:
    🔴 CRITICAL: 0
    🟠 HIGH:     3  (all remediated)
    🟡 MEDIUM:   7  (4 open, 3 remediated)
    ⚪ LOW:      2

  Approvals:
    Tier 1 (auto):  79 changes
    Tier 2 (peer):   8 approved, 0 rejected
    Tier 3 (comp):   1 approved, 1 rejected
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### Security compliance report (`--event security_finding --export`)
```
/mindforge:audit --event security_finding --export security-compliance-report.md

Generates a formatted Markdown report of all security findings:
- One row per finding with: date, phase, severity, OWASP category, file, remediated status
- Summary table at the top: total by severity, remediation rate
- Suitable for sharing with security auditors or compliance team
```

## Reading from AUDIT.jsonl

```bash
# Count total entries
wc -l .planning/AUDIT.jsonl

# Filter by event type
grep '"event":"security_finding"' .planning/AUDIT.jsonl | python3 -m json.tool

# Filter by date (entries containing today's date)
grep "$(date -u +%Y-%m-%d)" .planning/AUDIT.jsonl

# Count events by type
grep -o '"event":"[^"]*"' .planning/AUDIT.jsonl | sort | uniq -c | sort -rn

# Search including archives
cat .planning/AUDIT.jsonl .planning/audit-archive/*.jsonl 2>/dev/null | grep '"severity":"CRITICAL"'
```

## AUDIT integrity verification

Add `--verify` flag to check AUDIT.jsonl integrity:

```
/mindforge:audit --verify

Verifying AUDIT.jsonl integrity...
  Total entries  : 342
  Valid JSON     : 342 / 342 ✅
  Required fields: 342 / 342 ✅
  Chronological  : ✅ (all timestamps in order)
  No blank lines : ✅
  Archive marker : ✅ (previous archive referenced)

AUDIT.jsonl integrity: VERIFIED ✅
```
```

**Commit:**
```bash
cp .claude/commands/mindforge/audit.md .agent/mindforge/audit.md
git add .claude/commands/mindforge/audit.md .agent/mindforge/audit.md
git commit -m "feat(commands): add /mindforge:audit query and reporting command"
```

---

## TASK 9 — Write `/mindforge:milestone` and `/mindforge:complete-milestone`

### `.claude/commands/mindforge/milestone.md`

```markdown
# MindForge — Milestone Command
# Usage: /mindforge:milestone [create|status|list]

## Milestone concept
A milestone groups multiple phases into a shippable product version.
Milestones map to semantic version releases (v1.0.0, v1.1.0, v2.0.0).

## milestone create

```
/mindforge:milestone create [name]
```

1. Ask:
   - "What is the milestone version? (e.g., v1.0.0)"
   - "What phases does this milestone include? (e.g., 1, 2, 3)"
   - "What is the milestone's definition of done? (what must be true to call this milestone shipped)"
   - "What is the target ship date? (optional)"

2. Write `.planning/milestones/MILESTONE-[name].md`:

```markdown
# Milestone: [name]
**Version:** v[X.Y.Z]
**Phases:** [N, M, ...]
**Target date:** [date or TBD]
**Created:** [ISO-8601]
**Status:** In progress

## Definition of done
[From user input — must be testable]

## Phase completion status
| Phase | Description | Status |
|---|---|---|
| Phase 1 | [description] | ✅ Complete |
| Phase 2 | [description] | 🔄 In progress |
| Phase 3 | [description] | ⏳ Not started |

## Checklist
- [ ] All phases complete and UAT signed off
- [ ] All CRITICAL and HIGH security findings remediated
- [ ] CHANGELOG.md entry written
- [ ] Documentation published to Confluence (if configured)
- [ ] Release notes written
- [ ] All compliance gates passed
```

## milestone status

```
/mindforge:milestone status [name]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Milestone: v1.0.0 — Initial Release
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Status     : In progress
  Target     : 2026-04-01
  Progress   : 2 of 4 phases complete (50%)

  Phase Progress:
  Phase 1  [████████████████████] 100% ✅
  Phase 2  [████████████████████] 100% ✅
  Phase 3  [████████████░░░░░░░░]  60% 🔄
  Phase 4  [░░░░░░░░░░░░░░░░░░░░]   0% ⏳

  Open issues:
  🟠 2 HIGH security findings open (Phase 3)
  🔵 3 requirements not yet tested (Phase 3)

  Milestone gates:
  [ ] All phases complete
  [ ] Zero open CRITICAL/HIGH security findings
  [ ] CHANGELOG.md written
  [ ] Release notes reviewed
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

## milestone list

```
/mindforge:milestone list

  Milestones:
  v1.0.0  Initial Release    In progress  Phase 3/4 in progress
  v0.1.0  Beta Release       Shipped ✅   2026-03-15
```
```

---

### `.claude/commands/mindforge/complete-milestone.md`

```markdown
# MindForge — Complete Milestone Command
# Usage: /mindforge:complete-milestone [milestone-name]

## Purpose
Archive a completed milestone, create a release tag, generate the milestone
report, publish documentation, and prepare for the next milestone.

## Pre-checks (all must pass)

1. Read the milestone file: `.planning/milestones/MILESTONE-[name].md`
2. Verify all phases in the milestone are complete (all SUMMARY files present, UAT signed off)
3. Verify all compliance gates pass (`GATE-RESULTS-[N].md` for each phase)
4. Verify no open CRITICAL or HIGH security findings
5. Verify CHANGELOG.md has an entry for this milestone's version

If any check fails: report which checks failed and what must be done.
Do not proceed until all pass.

## Step 1 — Run final security scan

```bash
/mindforge:security-scan --deep --deps
```

If CRITICAL findings: stop. Must be resolved before milestone completion.

## Step 2 — Generate milestone report

Write `.planning/milestones/MILESTONE-[name]-REPORT.md`:

```markdown
# Milestone Report: [name] — v[X.Y.Z]
**Completed:** [ISO-8601]
**Duration:** [start date] → [end date] ([N] days)

## Delivered
[List all user-facing features from phase descriptions and SUMMARY files]

## Requirements delivered
[Summarise REQUIREMENTS.md v1 items and their verification status]

## Phases completed
| Phase | Description | Tasks | Commits | Duration |
|---|---|---|---|---|
| 1 | [desc] | [N] | [N] | [N] days |
| 2 | [desc] | [N] | [N] | [N] days |

## Quality metrics
- Total tasks: [N]
- Total commits: [N]
- Test coverage: [X]%
- Security findings: [N] total, [N] remediated, 0 open (CRITICAL/HIGH)
- Technical debt added: [items from SUMMARY files marked as tech debt]

## Architecture decisions made
[List all ADRs created in this milestone]

## Known limitations and tech debt
[Any ⚠️ items from VERIFICATION.md or SUMMARY files flagged as future work]

## Release notes
[Human-readable summary of what was built — suitable for a product changelog]
```

## Step 3 — Update CHANGELOG.md

If the CHANGELOG entry is a draft, finalise it:
- Add the exact release date
- Review and clean up the entry
- Ensure it follows Keep a Changelog format

## Step 4 — Publish to Confluence (if configured)

If Confluence integration is active:
- Publish CHANGELOG.md to Confluence
- Publish the milestone report to `[Space]/Releases/[milestone-name]`
- Update the Architecture page if ARCHITECTURE.md was changed this milestone

## Step 5 — Create release tag

```bash
# Tag the HEAD commit with the milestone version
git tag -a "v${VERSION}" \
  -m "Milestone: ${MILESTONE_NAME} — ${DESCRIPTION}

Phases: ${PHASE_LIST}
Released: $(date -u +%Y-%m-%dT%H:%M:%SZ)"

git push origin "v${VERSION}"
```

## Step 6 — Create GitHub/GitLab release (if configured)

If GitHub integration is active:
```bash
curl -s -X POST \
  -H "Authorization: Bearer ${GITHUB_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "tag_name": "v'${VERSION}'",
    "name": "v'${VERSION}' — '${MILESTONE_NAME}'",
    "body": "'${RELEASE_NOTES_ESCAPED}'",
    "draft": false,
    "prerelease": false
  }' \
  "https://api.github.com/repos/${GITHUB_REPO}/releases"
```

## Step 7 — Send Slack milestone notification (if configured)

Use the milestone completion Slack template with:
- Milestone name and version
- Summary of features delivered
- Link to GitHub/GitLab release
- Link to Confluence milestone report (if published)

## Step 8 — Archive milestone and update STATE.md

```bash
# Archive planning artifacts for this milestone
mkdir -p .planning/archive/milestone-[name]
cp -r .planning/phases/ .planning/archive/milestone-[name]/
cp .planning/REQUIREMENTS.md .planning/archive/milestone-[name]/
cp .planning/ARCHITECTURE.md .planning/archive/milestone-[name]/
```

Update STATE.md:
```markdown
## Milestone [name] — v[X.Y.Z] — COMPLETED [date]
All [N] phases shipped. See .planning/milestones/MILESTONE-[name]-REPORT.md

## Current status
Ready for next milestone. Run /mindforge:milestone create [next-version].
```

## Step 9 — Write AUDIT entries

```json
{ "event": "milestone_completed", "milestone": "v1.0.0", "phases_included": [1,2,3,4], "release_tag": "v1.0.0" }
{ "event": "release_tag_created", "tag": "v1.0.0", "commit_sha": "[sha]" }
```

## Step 10 — Report to user

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ Milestone v[X.Y.Z] — [name] — COMPLETE

  Phases shipped   : [N]
  Tasks completed  : [N]
  Release tag      : v[X.Y.Z]
  Confluence       : Published ✅ / Skipped (not configured)
  GitHub Release   : Created ✅ / Skipped (not configured)
  Slack            : Notified ✅ / Skipped (not configured)

  Next milestone: Run /mindforge:milestone create [next-version]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```
```

**Commit:**
```bash
cp .claude/commands/mindforge/milestone.md .agent/mindforge/milestone.md
cp .claude/commands/mindforge/complete-milestone.md .agent/mindforge/complete-milestone.md
git add .claude/commands/mindforge/milestone.md \
        .claude/commands/mindforge/complete-milestone.md \
        .agent/mindforge/milestone.md \
        .agent/mindforge/complete-milestone.md
git commit -m "feat(commands): add /mindforge:milestone and /mindforge:complete-milestone"
```

---

## TASK 10 — Write `/mindforge:approve` command

### `.claude/commands/mindforge/approve.md`

```markdown
# MindForge — Approve Command
# Usage: /mindforge:approve [approval-id] [--reject] [--emergency] [--reason "text"]

## Purpose
Process a pending approval request for a Tier 2 or Tier 3 change.
This command is run by the designated approver, not the agent.

## Listing pending approvals

```
/mindforge:approve

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Pending Approvals
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  [1] ID: abc-123  TIER 2  Phase 3, Plan 02
      Change: Add user RBAC with admin/editor/viewer roles
      Requested: 2026-03-20 14:32 (2 hours ago)
      Expires: 2026-03-22 14:32 (46 hours remaining)
      Risk: Medium — affects all authenticated routes

  [2] ID: def-456  TIER 3  Phase 3, Plan 04
      Change: Implement payment processing via Stripe
      Requested: 2026-03-20 15:00 (1 hour ago)
      Expires: 2026-03-20 19:00 (3 hours remaining) ⚠️ URGENT
      Risk: High — financial data handling, PCI DSS scope

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

## Approving a change

```
/mindforge:approve abc-123 --reason "Reviewed RBAC design. Approved."
```

1. Read `.planning/approvals/APPROVAL-abc-123.json`
2. Verify approval request is still PENDING (not expired, not already resolved)
3. Verify the runner's identity matches the designated approver:
   ```bash
   git config user.email
   # Must match the approver field in the approval request
   ```
4. Update the approval file:
   ```json
   {
     "status": "approved",
     "resolved_at": "ISO-8601",
     "resolver_notes": "Reviewed RBAC design. Approved."
   }
   ```
5. Write AUDIT entry: `"event": "change_approved"`
6. Update Slack thread (if configured): reply to approval request thread with ✅ message
7. Update Jira ticket status (if configured): transition to "Approved"
8. Notify the requesting developer:
   ```
   ✅ Approval abc-123 approved by [approver].
   Execution can now proceed.
   Run /mindforge:execute-phase [N] to continue.
   ```

## Rejecting a change

```
/mindforge:approve abc-123 --reject --reason "RBAC implementation must use existing AuthN library"
```

1. Update approval file: `"status": "rejected"`
2. Write AUDIT entry: `"event": "change_rejected"`
3. Update Slack with ❌ message and reason
4. Notify requester with the rejection reason and guidance on how to revise

## Emergency approval

```
/mindforge:approve def-456 --emergency --reason "P0 production outage — payment processing down"
```

Emergency approvals:
1. Verify emergency approver is authorised (check `EMERGENCY_APPROVERS` in config)
2. Set `"emergency_override": true` in approval file
3. Write AUDIT entry with `"emergency_override": true`
4. Post Slack notification with `@channel` mention flagging the emergency
5. Create a follow-up task: "Post-incident review of emergency approval [id]"
6. Proceed with execution immediately

## Approval expiry handling

At the start of each session, check for expired approvals:

```bash
# Find approvals where expires_at < now and status = pending
for APPROVAL_FILE in .planning/approvals/APPROVAL-*.json; do
  python3 -c "
    import json, datetime, sys
    data = json.load(open('${APPROVAL_FILE}'))
    if data['status'] == 'pending':
      expires = datetime.datetime.fromisoformat(data['expires_at'].replace('Z','+00:00'))
      if expires < datetime.datetime.now(datetime.timezone.utc):
        print('EXPIRED: ' + data['id'])
  "
done
```

For each expired approval:
1. Update status to `expired`
2. Write AUDIT entry: `"event": "approval_expired"`
3. Alert the user and offer to re-request with updated information
```

**Commit:**
```bash
cp .claude/commands/mindforge/approve.md .agent/mindforge/approve.md
git add .claude/commands/mindforge/approve.md .agent/mindforge/approve.md
git commit -m "feat(commands): add /mindforge:approve approval workflow command"
```

---

## TASK 11 — Write `/mindforge:sync-jira` and `/mindforge:sync-confluence`

### `.claude/commands/mindforge/sync-jira.md`

```markdown
# MindForge — Sync Jira Command
# Usage: /mindforge:sync-jira [--phase N] [--dry-run] [--force]

## Purpose
Synchronise MindForge project state with Jira.
Creates/updates epics, stories, and bugs based on current planning artifacts.

## Pre-checks
1. Verify Jira integration is configured: check `JIRA_API_TOKEN` env var exists
2. Run connection health check (per `connection-manager.md`)
3. If `--dry-run`: show what would be created/updated without making changes

## Step 1 — Establish what needs syncing

Read `.planning/jira-sync.json` to determine current sync state.
Compare against current `.planning/` artifacts:

```
For each phase in ROADMAP.md:
  - Does a Jira Epic exist? (check jira-sync.json phase_mappings)
    NO → create Epic
    YES → update Epic status if phase status changed
  
  For each PLAN file in the phase:
    - Does a Jira Story exist? (check jira-sync.json story_keys)
      NO → create Story
      YES → update Story status based on SUMMARY file status

For each entry in AUDIT.jsonl where event = "security_finding":
  - Does a Jira Bug exist? (check jira-sync.json security_bugs)
    NO → create Bug
    YES → update Bug status (add comment if remediated)
```

## Step 2 — Execute sync operations

Use the Jira API operations from `jira.md`.

For each operation:
1. Execute the API call
2. Record the result (Jira key) in `jira-sync.json`
3. Write AUDIT entry for the integration action

## Step 3 — Report sync results

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Jira Sync Complete
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Created:
    3 Epics (Phases 1, 2, 3)    → ENG-42, ENG-58, ENG-71
    12 Stories (all plans)       → ENG-43 through ENG-55
    2 Security Bugs              → ENG-88, ENG-89

  Updated:
    5 Story statuses → Done (completed plans)
    1 Epic status → Done (Phase 1 complete)

  Skipped:
    Phase 4 (not yet planned — no PLAN files)

  Conflicts: 0
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

## --dry-run mode
Show all operations that would be performed without executing them.
Format each as: `[CREATE/UPDATE] [Epic/Story/Bug] "[title]" → [what would happen]`
```

---

### `.claude/commands/mindforge/sync-confluence.md`

```markdown
# MindForge — Sync Confluence Command
# Usage: /mindforge:sync-confluence [--page architecture|adrs|phases|all] [--dry-run]

## Purpose
Publish MindForge planning artifacts to Confluence.

## Pages published

### `--page architecture`
Publish `.planning/ARCHITECTURE.md` to:
`[CONFLUENCE_SPACE_KEY] / Engineering / MindForge Architecture`

Conversion: Markdown → Confluence Wiki Markup
(per conversion rules in `confluence.md`)

### `--page adrs`
Publish each `.planning/decisions/ADR-*.md` to:
`[CONFLUENCE_SPACE_KEY] / Engineering / Architecture Decision Records / [ADR title]`

### `--page phases`
Publish phase documentation for all completed phases:
- VERIFICATION.md → `Sprint Docs / Phase N Verification`
- UAT.md → `Sprint Docs / Phase N UAT`
- WAVE-REPORT.md → `Sprint Docs / Phase N Execution Report`

### `--page all`
Publish all of the above.

## Sync report

```
Confluence Sync Complete
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Created:
    Architecture page (new) → page ID: 123456
    ADR-001 (new) → page ID: 234567
    ADR-002 (new) → page ID: 234568
    Phase 1 Verification (new) → page ID: 345678

  Updated:
    Architecture page (v4 → v5) — 3 sections changed

  Skipped:
    Phase 2 (not yet complete — no VERIFICATION.md)

  Confluence space: ENG
  Base URL: https://your-org.atlassian.net/wiki
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```
```

**Commit:**
```bash
cp .claude/commands/mindforge/sync-jira.md .agent/mindforge/sync-jira.md
cp .claude/commands/mindforge/sync-confluence.md .agent/mindforge/sync-confluence.md
git add .claude/commands/mindforge/sync-jira.md \
        .claude/commands/mindforge/sync-confluence.md \
        .agent/mindforge/sync-jira.md \
        .agent/mindforge/sync-confluence.md
git commit -m "feat(commands): add /mindforge:sync-jira and /mindforge:sync-confluence"
```

---

## TASK 12 — Update CLAUDE.md for Day 4 capabilities

Add to `.claude/CLAUDE.md` (and mirror to `.agent/CLAUDE.md`):

```markdown
---

## GOVERNANCE LAYER (Day 4)

### Change classification is mandatory
Before every phase execution and before every PR creation, run the change
classifier: `.mindforge/governance/change-classifier.md`

Tier 1: auto-proceed after quality gates
Tier 2: require peer review — create approval request, notify via Slack if configured
Tier 3: require compliance review — create approval request, Jira ticket if configured

### Compliance gates block execution
The five compliance gates in `.mindforge/governance/compliance-gates.md`
are non-negotiable. No phase completes with open CRITICAL security findings.
No PR is created with a secret in the diff. No exceptions.

### Approvals are tracked
Approval requests are written to `.planning/approvals/APPROVAL-[uuid].json`.
The AUDIT log records every approval, rejection, and emergency override.
Run `/mindforge:approve` to list pending approvals.

### Integration actions are logged
Every Jira, Confluence, Slack, and GitHub/GitLab action writes an AUDIT entry
with event type `integration_action`. Integration failures are non-fatal —
log the failure and continue. Never fail a phase because an integration is down.

### Multi-developer awareness
In team environments: check `.planning/HANDOFF.json active_developers`
at session start. Detect file conflicts with other active developers before
beginning a plan. Write to per-developer HANDOFF:
`.planning/handoffs/HANDOFF-[dev-id].json`

### AUDIT archiving
If `.planning/AUDIT.jsonl` exceeds 10,000 lines:
Run the archive protocol from `.mindforge/audit/AUDIT-SCHEMA.md` before
writing any new entries.

### New commands available (Day 4)
- `/mindforge:audit` — query audit log with filters
- `/mindforge:milestone` — create and track milestones
- `/mindforge:complete-milestone` — ship a milestone
- `/mindforge:approve` — process approval requests
- `/mindforge:sync-jira` — sync with Jira
- `/mindforge:sync-confluence` — publish to Confluence

---
```

**Commit:**
```bash
git add .claude/CLAUDE.md .agent/CLAUDE.md
git commit -m "feat(core): update CLAUDE.md with Day 4 governance and integrations"
```

---

## TASK 13 — Write Day 4 test suites

### `tests/integrations.test.js`

```javascript
/**
 * MindForge Day 4 — Integrations Tests
 * Run: node tests/integrations.test.js
 */

const fs   = require('fs');
const path = require('path');
const assert = require('assert');

let passed = 0;
let failed = 0;

function test(name, fn) {
  try { fn(); console.log(`  ✅ ${name}`); passed++; }
  catch (err) { console.error(`  ❌ ${name}\n     ${err.message}`); failed++; }
}

// ── Helpers ──────────────────────────────────────────────────────────────────
function readMd(p) { return fs.existsSync(p) ? fs.readFileSync(p, 'utf8') : ''; }

// ── Tests ─────────────────────────────────────────────────────────────────────
console.log('\nMindForge Day 4 — Integration Tests\n');

console.log('Integration engine files:');
const integrationFiles = [
  'connection-manager.md', 'jira.md', 'confluence.md',
  'slack.md', 'github.md', 'gitlab.md'
];
integrationFiles.forEach(f => {
  test(`${f} exists`, () => assert.ok(
    fs.existsSync(`.mindforge/integrations/${f}`), `Missing: .mindforge/integrations/${f}`
  ));
});

test('all integration files have content (> 500 chars)', () => {
  integrationFiles.forEach(f => {
    const content = readMd(`.mindforge/integrations/${f}`);
    assert.ok(content.length > 500, `${f} is too short (${content.length} chars)`);
  });
});

console.log('\nConnection manager:');

test('connection-manager defines all 5 availability states', () => {
  const content = readMd('.mindforge/integrations/connection-manager.md');
  ['available', 'unconfigured', 'invalid_credentials', 'unreachable', 'rate_limited'].forEach(s => {
    assert.ok(content.includes(s), `Missing availability state: ${s}`);
  });
});

test('connection-manager has credential safety rule', () => {
  const content = readMd('.mindforge/integrations/connection-manager.md');
  assert.ok(content.includes('Never store credentials'), 'Missing credential safety rule');
});

test('connection-manager defines integration_action AUDIT schema', () => {
  const content = readMd('.mindforge/integrations/connection-manager.md');
  assert.ok(content.includes('integration_action'), 'Missing integration_action AUDIT event');
});

console.log('\nJira integration:');

test('jira.md uses REST API v3', () => {
  const content = readMd('.mindforge/integrations/jira.md');
  assert.ok(content.includes('/rest/api/3/') || content.includes('api/3'), 'Should use Jira API v3');
});

test('jira.md has jira-sync.json schema', () => {
  const content = readMd('.mindforge/integrations/jira.md');
  assert.ok(content.includes('jira-sync.json'), 'Missing jira-sync.json state file');
  assert.ok(content.includes('phase_mappings'), 'Missing phase_mappings in sync schema');
});

test('jira.md has conflict handling (no destructive overwrite)', () => {
  const content = readMd('.mindforge/integrations/jira.md');
  assert.ok(
    content.includes('manual Jira') || content.includes('manual changes'),
    'Jira spec should handle manual Jira changes without overwriting'
  );
});

console.log('\nSlack integration:');

test('slack.md defines notification triggers', () => {
  const content = readMd('.mindforge/integrations/slack.md');
  ['phase_complete', 'security_finding', 'approval_needed', 'milestone_complete'].forEach(t => {
    assert.ok(content.includes(t), `Missing notification trigger: ${t}`);
  });
});

test('slack.md has graceful degradation', () => {
  const content = readMd('.mindforge/integrations/slack.md');
  assert.ok(
    content.includes('unconfigured') || content.includes('graceful'),
    'Slack should degrade gracefully when not configured'
  );
});

test('slack.md does NOT notify on routine task completions', () => {
  const content = readMd('.mindforge/integrations/slack.md');
  assert.ok(
    content.includes('task_completed') && content.includes('No'),
    'Should explicitly state task_completed does not trigger Slack notification'
  );
});

console.log('\nGitHub integration:');

test('github.md has PR template file path', () => {
  const content = readMd('.mindforge/integrations/github.md');
  assert.ok(content.includes('pull_request_template.md'), 'Should reference PR template');
});

test('github.md has branch protection pre-flight check', () => {
  const content = readMd('.mindforge/integrations/github.md');
  assert.ok(
    content.includes('branch protection') || content.includes('pre-flight'),
    'Should check branch protection before creating PR'
  );
});

console.log('\nIntegrations config:');

test('INTEGRATIONS-CONFIG.md exists', () => {
  assert.ok(fs.existsSync('.mindforge/org/integrations/INTEGRATIONS-CONFIG.md'));
});

test('INTEGRATIONS-CONFIG.md has no credential values', () => {
  const content = readMd('.mindforge/org/integrations/INTEGRATIONS-CONFIG.md');
  // Should not contain actual tokens (only placeholder references)
  const credentialPattern = /=\s*(xox[pb]-[a-zA-Z0-9-]+|ghp_[a-zA-Z0-9]+|glpat-[a-zA-Z0-9]+)/;
  assert.ok(!credentialPattern.test(content), 'Config file should not contain actual API tokens');
});

console.log('\nNew commands (21 total):');

const day4Commands = ['audit','milestone','complete-milestone','approve','sync-jira','sync-confluence'];
const allExpectedCommands = [
  'help','init-project','plan-phase','execute-phase','verify-phase','ship',
  'next','quick','status','debug',
  'skills','review','security-scan','map-codebase','discuss-phase',
  ...day4Commands
];

test(`all ${allExpectedCommands.length} commands in .claude/commands/mindforge/`, () => {
  allExpectedCommands.forEach(cmd => {
    assert.ok(
      fs.existsSync(`.claude/commands/mindforge/${cmd}.md`),
      `Missing: .claude/commands/mindforge/${cmd}.md`
    );
  });
});

test(`all ${allExpectedCommands.length} commands mirrored to .agent/mindforge/`, () => {
  allExpectedCommands.forEach(cmd => {
    assert.ok(
      fs.existsSync(`.agent/mindforge/${cmd}.md`),
      `Missing: .agent/mindforge/${cmd}.md`
    );
  });
});

console.log(`\n${'─'.repeat(50)}`);
console.log(`Results: ${passed} passed, ${failed} failed`);
if (failed > 0) { console.error(`\n❌ ${failed} test(s) failed.\n`); process.exit(1); }
else { console.log(`\n✅ All integration tests passed.\n`); }
```

---

### `tests/governance.test.js`

```javascript
/**
 * MindForge Day 4 — Governance Tests
 * Run: node tests/governance.test.js
 */

const fs   = require('fs');
const path = require('path');
const assert = require('assert');

let passed = 0;
let failed = 0;

function test(name, fn) {
  try { fn(); console.log(`  ✅ ${name}`); passed++; }
  catch (err) { console.error(`  ❌ ${name}\n     ${err.message}`); failed++; }
}

function readMd(p) { return fs.existsSync(p) ? fs.readFileSync(p, 'utf8') : ''; }

// ── Change classifier simulation ──────────────────────────────────────────────
function classifyChange(files, hasNewFeatureCommit = false, dependencyAdded = false) {
  const tier3Paths = ['auth/', 'security/', 'payment/', 'billing/', 'privacy/'];
  const tier3Files = ['session.ts', 'login.ts', 'token.ts', 'password.ts', 'credentials.ts'];
  const tier3Code  = ['bcrypt', 'argon2', 'jwt.sign', 'jwt.verify', 'stripe.'];

  // Tier 3 check
  for (const file of files) {
    if (tier3Paths.some(p => file.includes(p))) return 3;
    if (tier3Files.some(f => file.endsWith(f))) return 3;
  }

  // Tier 2 check
  if (hasNewFeatureCommit) return 2;
  if (dependencyAdded) return 2;
  if (files.length > 10) return 2;

  return 1;
}

// ── Approval schema validator ──────────────────────────────────────────────────
function validateApprovalSchema(obj) {
  const required = [
    'schema_version', 'id', 'tier', 'status', 'requested_at',
    'expires_at', 'requester', 'approver', 'change_description',
    '_warning'
  ];
  const missing = required.filter(f => obj[f] === undefined);
  if (missing.length > 0) throw new Error(`Missing fields: ${missing.join(', ')}`);
  if (!['pending','approved','rejected','expired'].includes(obj.status)) {
    throw new Error(`Invalid status: ${obj.status}`);
  }
  if (![1,2,3].includes(obj.tier)) throw new Error(`Invalid tier: ${obj.tier}`);
}

// ── Tests ─────────────────────────────────────────────────────────────────────
console.log('\nMindForge Day 4 — Governance Tests\n');

console.log('Governance engine files:');
['approval-workflow.md','change-classifier.md','compliance-gates.md','GOVERNANCE-CONFIG.md'].forEach(f => {
  test(`${f} exists`, () => assert.ok(
    fs.existsSync(`.mindforge/governance/${f}`),
    `Missing: .mindforge/governance/${f}`
  ));
});

console.log('\nChange classifier logic:');

test('files in auth/ are classified as Tier 3', () => {
  assert.strictEqual(classifyChange(['src/auth/session.ts']), 3);
});

test('login.ts is classified as Tier 3 regardless of directory', () => {
  assert.strictEqual(classifyChange(['src/features/user/login.ts']), 3);
});

test('payment/ path is classified as Tier 3', () => {
  assert.strictEqual(classifyChange(['src/services/payment/stripe.ts']), 3);
});

test('new feature commit (feat:) is classified as Tier 2', () => {
  assert.strictEqual(classifyChange(['src/api/users.ts'], true), 2);
});

test('dependency addition is classified as Tier 2', () => {
  assert.strictEqual(classifyChange(['src/utils/helper.ts'], false, true), 2);
});

test('more than 10 files changed is classified as Tier 2', () => {
  const manyFiles = Array.from({ length: 11 }, (_, i) => `src/component-${i}.ts`);
  assert.strictEqual(classifyChange(manyFiles), 2);
});

test('documentation changes are classified as Tier 1', () => {
  assert.strictEqual(classifyChange(['docs/README.md', 'CHANGELOG.md']), 1);
});

test('bug fix to non-auth code is Tier 1', () => {
  assert.strictEqual(classifyChange(['src/utils/format-date.ts']), 1);
});

test('Tier 3 takes priority over Tier 2', () => {
  // Even with > 10 files AND a feat commit, auth path = Tier 3
  const files = ['src/auth/login.ts', ...Array.from({ length: 11 }, (_, i) => `src/component-${i}.ts`)];
  assert.strictEqual(classifyChange(files, true), 3);
});

console.log('\nApproval schema validation:');

test('valid Tier 2 approval schema passes validation', () => {
  const approval = {
    schema_version: '1.0.0',
    id: '550e8400-e29b-41d4-a716-446655440000',
    tier: 2,
    status: 'pending',
    requested_at: new Date().toISOString(),
    expires_at: new Date(Date.now() + 48*60*60*1000).toISOString(),
    requester: 'mindforge-orchestrator',
    approver: 'john-company-com',
    change_description: 'Add user RBAC model',
    _warning: 'Never store secrets'
  };
  assert.doesNotThrow(() => validateApprovalSchema(approval));
});

test('approval with invalid status fails validation', () => {
  const approval = {
    schema_version: '1.0.0', id: 'uuid', tier: 2, status: 'waiting',
    requested_at: 'now', expires_at: 'later', requester: 'agent',
    approver: 'person', change_description: 'desc', _warning: 'warn'
  };
  assert.throws(() => validateApprovalSchema(approval), /Invalid status/);
});

test('approval with invalid tier fails validation', () => {
  const approval = {
    schema_version: '1.0.0', id: 'uuid', tier: 4, status: 'pending',
    requested_at: 'now', expires_at: 'later', requester: 'agent',
    approver: 'person', change_description: 'desc', _warning: 'warn'
  };
  assert.throws(() => validateApprovalSchema(approval), /Invalid tier/);
});

console.log('\nCompliance gates:');

test('compliance-gates.md defines all 5 gates', () => {
  const content = readMd('.mindforge/governance/compliance-gates.md');
  ['Gate 1', 'Gate 2', 'Gate 3', 'Gate 4', 'Gate 5'].forEach(g => {
    assert.ok(content.includes(g), `Missing ${g}`);
  });
});

test('Gate 3 (no secrets) cannot be overridden', () => {
  const content = readMd('.mindforge/governance/compliance-gates.md');
  const gate3Section = content.split('Gate 4')[0].split('Gate 3')[1] || '';
  assert.ok(
    gate3Section.includes('Not possible') || gate3Section.includes('not possible'),
    'Gate 3 should explicitly state it cannot be overridden'
  );
});

test('compliance-gates.md defines gate execution order', () => {
  const content = readMd('.mindforge/governance/compliance-gates.md');
  assert.ok(content.includes('Gate execution') || content.includes('execution order'),
    'Should define gate execution order'
  );
});

console.log('\nMulti-developer HANDOFF:');

test('multi-handoff.md defines per-developer file naming', () => {
  const content = readMd('.mindforge/team/multi-handoff.md');
  assert.ok(content.includes('HANDOFF-[dev-id]') || content.includes('dev_id'), 'Should define per-developer HANDOFF naming');
});

test('multi-handoff.md has conflict detection', () => {
  const content = readMd('.mindforge/team/multi-handoff.md');
  assert.ok(content.includes('conflict') || content.includes('overlap'), 'Should have file conflict detection');
});

test('handoffs directory exists', () => {
  // Directory may not exist until first team use — check it gets created
  const dirOrPlaceholder =
    fs.existsSync('.planning/handoffs') ||
    readMd('.mindforge/team/multi-handoff.md').includes('handoffs/');
  assert.ok(dirOrPlaceholder, 'Handoffs directory or reference should exist');
});

console.log('\nMilestone system:');

test('milestones directory or reference exists', () => {
  const milestoneCmd = readMd('.claude/commands/mindforge/milestone.md');
  assert.ok(milestoneCmd.includes('milestones/') || milestoneCmd.includes('.planning/milestones'),
    'Milestone command should reference milestones directory'
  );
});

test('complete-milestone runs final security scan', () => {
  const content = readMd('.claude/commands/mindforge/complete-milestone.md');
  assert.ok(content.includes('security-scan') || content.includes('security scan'),
    'complete-milestone should run a final security scan'
  );
});

test('complete-milestone creates a release tag', () => {
  const content = readMd('.claude/commands/mindforge/complete-milestone.md');
  assert.ok(content.includes('git tag') || content.includes('release tag'),
    'complete-milestone should create a release tag'
  );
});

console.log(`\n${'─'.repeat(50)}`);
console.log(`Results: ${passed} passed, ${failed} failed`);
if (failed > 0) { console.error(`\n❌ ${failed} test(s) failed.\n`); process.exit(1); }
else { console.log(`\n✅ All governance tests passed.\n`); }
```

**Commit:**
```bash
git add tests/integrations.test.js tests/governance.test.js
git commit -m "test(day4): add integration and governance test suites"
```

---

## TASK 14 — Run full test battery and verify Day 4

```bash
node tests/install.test.js         && echo "✅ install"
node tests/wave-engine.test.js     && echo "✅ wave-engine"
node tests/audit.test.js           && echo "✅ audit"
node tests/compaction.test.js      && echo "✅ compaction"
node tests/skills-platform.test.js && echo "✅ skills-platform"
node tests/integrations.test.js    && echo "✅ integrations"
node tests/governance.test.js      && echo "✅ governance"
```

**Final Day 4 commit:**
```bash
git add .
git commit -m "feat(day4): complete Day 4 enterprise integrations and governance layer"
git push origin feat/mindforge-enterprise-integrations
```

---

## DAY 4 VERIFY — complete before pushing

```bash
# 1. All 6 integration files exist
ls .mindforge/integrations/ | wc -l                  # Expected: 6

# 2. All 4 governance files exist
ls .mindforge/governance/ | wc -l                    # Expected: 4

# 3. All 21 commands in both runtimes
ls .claude/commands/mindforge/ | wc -l               # Expected: 21
ls .agent/mindforge/ | wc -l                         # Expected: 21
diff <(ls .claude/commands/mindforge/ | sort) <(ls .agent/mindforge/ | sort)
# Expected: no output

# 4. All 7 test suites pass
node tests/install.test.js && node tests/wave-engine.test.js && \
node tests/audit.test.js && node tests/compaction.test.js && \
node tests/skills-platform.test.js && node tests/integrations.test.js && \
node tests/governance.test.js

# 5. No credentials in any config file
grep -rE "xox[pb]-[a-zA-Z0-9-]+|ghp_[a-zA-Z0-9]+|glpat-" \
  --include="*.md" --include="*.json" \
  --exclude-dir=node_modules --exclude-dir=.git . 2>/dev/null
# Expected: no output

# 6. ADRs — 8+ total
ls .planning/decisions/*.md | wc -l                  # Expected: >= 8

# 7. Git log clean
git log --oneline | head -25
# Expected: ~14 clean commits from Day 4
```

---

**Branch:** `feat/mindforge-enterprise-integrations`
**Day 4 implementation complete. Proceed to DAY4-REVIEW.md.**
