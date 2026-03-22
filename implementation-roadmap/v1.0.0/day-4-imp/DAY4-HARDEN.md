# MindForge — Day 4 Hardening Prompt
# Branch: `feat/mindforge-enterprise-integrations`
# Run this AFTER DAY4-REVIEW.md is APPROVED

---

## CONTEXT

You are performing **Day 4 Hardening** of the MindForge enterprise integration
and governance layer.

Activate the **`architect.md` + `security-reviewer.md`** personas simultaneously.

Day 4 hardening has a distinct focus from previous days:

**Day 4 hardening = security-first, then resilience, then completeness.**

The governance layer is only useful if it cannot be bypassed. The integration
layer is only useful if it fails gracefully. These two properties must be
hardened before any additional features are added.

Confirm all review findings resolved:

```bash
git log --oneline | head -30   # look for review fix commits
node tests/install.test.js && \
node tests/wave-engine.test.js && \
node tests/audit.test.js && \
node tests/compaction.test.js && \
node tests/skills-platform.test.js && \
node tests/integrations.test.js && \
node tests/governance.test.js
# all 7 suites must pass
```

---

## HARDEN 1 — Fix all review findings

For every BLOCKING and MAJOR finding from DAY4-REVIEW.md:
1. Read the finding and recommendation precisely
2. Make the exact change
3. Commit: `fix(day4-review): [finding title]`

One fix per commit. After all fixes, re-run the full battery.

---

## HARDEN 2 — Fix Jira transition ID dynamic lookup

The hardcoded transition IDs (11, 31) are the most likely runtime failure
in the Jira integration. Fix by adding a lookup function.

Add to `jira.md` after the "Update Story Status" section:

```markdown
## Dynamic transition ID lookup

Jira transition IDs are instance-specific. Never hardcode them.
Before any status transition, fetch the available transitions:

```bash
# Fetch available transitions for a Jira issue
TRANSITIONS=$(curl -s \
  -H "Authorization: Basic ${AUTH_HEADER}" \
  "${JIRA_BASE_URL}/rest/api/3/issue/${ISSUE_KEY}/transitions" \
  | python3 -c "
import sys, json
data = json.load(sys.stdin)
for t in data.get('transitions', []):
    print(t['id'] + ':' + t['name'])
")

# Extract the transition ID for a given name
get_transition_id() {
  local TARGET_NAME="$1"
  echo "${TRANSITIONS}" | while IFS=: read id name; do
    if [ "${name}" = "${TARGET_NAME}" ]; then
      echo "${id}"
      break
    fi
  done
}

# Usage:
IN_PROGRESS_ID=$(get_transition_id "In Progress")
DONE_ID=$(get_transition_id "Done")
```

### Transition name mapping
MindForge task state → Jira transition name (not ID):

| MindForge event | Jira transition name | Notes |
|---|---|---|
| `task_started` | "In Progress" | Most Jira workflows have this |
| `task_completed` | "Done" | Or "Resolve Issue", "Close Issue" |
| `task_failed` | "On Hold" | Or "Blocked" — check your workflow |
| `UAT_signed_off` | "Done" | For epic-level transitions |

If a transition name is not found:
- Log AUDIT: `"sync_warning": "transition not found: In Progress"`
- Skip the transition
- Never fail a task because Jira transition lookup failed

### Caching transition IDs
Cache fetched transition IDs in `jira-sync.json` per project key:

```json
{
  "transition_cache": {
    "ENG": {
      "in_progress_id": "21",
      "done_id": "31",
      "blocked_id": "41",
      "cached_at": "ISO-8601"
    }
  }
}
```

Refresh the cache if a transition ID returns 400 (transition no longer exists).
```

**Commit:**
```bash
git add .mindforge/integrations/jira.md
git commit -m "harden(jira): replace hardcoded transition IDs with dynamic lookup"
```

---

## HARDEN 3 — Harden credential handling against shell history exposure

Add to `connection-manager.md`:

```markdown
## Credential hygiene in shell operations

### Preventing token exposure in shell history

When constructing authentication headers, avoid inline command substitution
that captures the token in history:

```bash
# ❌ Appears in shell history with token value visible:
AUTH_HEADER=$(echo -n "${JIRA_USER_EMAIL}:${JIRA_API_TOKEN}" | base64)
curl -H "Authorization: Basic ${AUTH_HEADER}" ...

# ✅ Use a function — function calls appear in history without arguments:
build_auth_header() {
  printf '%s' "${1}:${2}" | base64
}
AUTH_HEADER=$(build_auth_header "${JIRA_USER_EMAIL}" "${JIRA_API_TOKEN}")
unset JIRA_API_TOKEN  # Clear from environment after use

# ✅ Or use a temporary credentials file (if supported by the API client):
# Never a permanent file — always delete after use
```

### Debug mode prohibition
Never run integration commands with shell debug mode active:
```bash
# ❌ These expose tokens in output:
set -x
bash -x script.sh
sh -xv script.sh

# If debug mode is needed for non-credential scripts: explicitly disable
# debug mode before any credential-bearing commands:
set +x
# ... credential operations ...
set -x   # re-enable after if needed
```

### curl verbose mode prohibition
Never use `-v` or `--verbose` with any curl command that includes
an Authorization header:
```bash
# ❌ Logs the Authorization header value to stderr:
curl -v -H "Authorization: Bearer ${GITHUB_TOKEN}" ...

# ✅ Use -s (silent) and check HTTP status code:
HTTP_STATUS=$(curl -s -o response.json -w "%{http_code}" \
  -H "Authorization: Bearer ${GITHUB_TOKEN}" ...)
if [ "${HTTP_STATUS}" != "200" ]; then
  echo "API call failed: HTTP ${HTTP_STATUS}" >&2
  cat response.json >&2
fi
```

### Unset credentials after use
```bash
# After integration operations complete, unset sensitive variables:
unset JIRA_API_TOKEN
unset GITHUB_TOKEN
unset SLACK_BOT_TOKEN
# The variables will be re-read from environment on next invocation
```
```

**Commit:**
```bash
git add .mindforge/integrations/connection-manager.md
git commit -m "harden(credentials): add shell credential hygiene and debug-mode prohibition"
```

---

## HARDEN 4 — Harden governance: add code-pattern Tier 3 scanning

The review identified that Tier 3 classification based only on file paths
misses security-critical code in non-standard locations.

Update `change-classifier.md` — replace the Step 2 section:

```markdown
## Step 2 — Apply Tier 3 rules first

Tier 3 classification uses THREE independent signals. Any single match = Tier 3.

### Signal A: File path patterns
Scan changed file paths for security-critical directories and names:
```
Directories: auth/, security/, payment/, billing/, privacy/, crypto/, secrets/
File names (exact):
  login.ts    logout.ts    token.ts     password.ts  credentials.ts
  session.ts  oauth.ts     jwt.ts       hash.ts      encrypt.ts
  stripe.ts   payment.ts   billing.ts   pii.ts       consent.ts
```

### Signal B: Code content patterns (scan the actual diff)
Scan the diff content — not just filenames — for security-critical patterns:
```bash
# Run against git diff output
DIFF_CONTENT=$(git diff HEAD)

# Libraries and functions that indicate security-critical code:
TIER3_PATTERNS=(
  "bcrypt"          # Password hashing
  "argon2"          # Password hashing
  "jwt.sign"        # JWT creation
  "jwt.verify"      # JWT verification
  "jose.sign"       # Modern JWT
  "jose.verify"     # Modern JWT
  "stripe\."        # Payment processing
  "paypal\."        # Payment processing
  "createCipheriv"  # Node.js crypto
  "createDecipheriv"# Node.js crypto
  "crypto.subtle"   # Web Crypto API
  "hashPassword"    # Common auth function name
  "verifyPassword"  # Common auth function name
  "encrypt\("       # Generic encrypt calls
  "decrypt\("       # Generic decrypt calls
  "role.*permission" # RBAC patterns
  "hasPermission"   # RBAC patterns
  "SET ROLE"        # PostgreSQL role switching
  "GRANT"           # Database permissions
)

for PATTERN in "${TIER3_PATTERNS[@]}"; do
  if echo "${DIFF_CONTENT}" | grep -qE "${PATTERN}"; then
    echo "Tier 3 triggered by code pattern: ${PATTERN}"
    # Classify as Tier 3
    break
  fi
done
```

### Signal C: AUDIT history patterns
Check the current session's AUDIT log. If there are recent `security_finding`
events with HIGH or CRITICAL severity for this phase:
The next change in this phase is elevated to Tier 3 automatically.
Rationale: if security issues were found in this phase, all subsequent changes
deserve elevated scrutiny.

### Tier 3 determination
If ANY of Signal A, B, or C matches: Tier 3.
The AUDIT entry must record WHICH signal triggered:
```json
{
  "event": "change_classified",
  "tier": 3,
  "classification_reason": "code pattern: jwt.sign found in src/utils/helper.ts",
  "signals_checked": ["file_path", "code_content", "audit_history"],
  "signal_triggered": "code_content",
  "pattern_matched": "jwt.sign"
}
```
```

**Commit:**
```bash
git add .mindforge/governance/change-classifier.md
git commit -m "harden(governance): add code-content and audit-history Tier 3 classification signals"
```

---

## HARDEN 5 — Add EMERGENCY_APPROVERS to INTEGRATIONS-CONFIG.md

Update `.mindforge/org/integrations/INTEGRATIONS-CONFIG.md` — add after Slack:

```markdown
## Governance Configuration

# Tier 2 peer review — who can approve
TIER2_APPROVERS=senior-engineer-1,senior-engineer-2,tech-lead

# Tier 3 compliance review — who can approve
# These individuals are responsible for security and compliance sign-off
TIER3_APPROVERS=security-officer,compliance-officer,cto

# Emergency override — who can approve P0 emergency bypasses
# This list should be SHORTER than Tier 3 approvers
# Document who is on this list and why
EMERGENCY_APPROVERS=cto,vp-engineering

# Approval SLAs
TIER2_SLA_HOURS=24
TIER3_SLA_HOURS=4
TIER2_ESCALATE_AFTER_HOURS=48
TIER3_ESCALATE_AFTER_HOURS=8

# Approval expiry — after how long to expire pending requests
TIER2_EXPIRY_HOURS=48
TIER3_EXPIRY_HOURS=8

# Escalation path (when SLA is breached)
ESCALATION_CONTACT=engineering-lead@your-org.com
ESCALATION_SLACK_CHANNEL=C0ESCALATE
```

Also update `approve.md` to read `EMERGENCY_APPROVERS` from the config file:

```markdown
## Validating emergency approver identity

Before processing an emergency override:

1. Read `EMERGENCY_APPROVERS` from INTEGRATIONS-CONFIG.md
2. Get current developer identity: `git config user.email` or `$USER`
3. Verify the identity is in the emergency approvers list
4. If NOT in the list:
   ```
   ❌ Emergency override denied.
   Your identity ([identity]) is not in the EMERGENCY_APPROVERS list.
   EMERGENCY_APPROVERS: [list from config]
   
   To use emergency override: ensure your git config user.email matches
   an entry in INTEGRATIONS-CONFIG.md EMERGENCY_APPROVERS.
   ```
5. If yes: proceed with emergency approval, log identity in AUDIT entry
```

**Commit:**
```bash
git add .mindforge/org/integrations/INTEGRATIONS-CONFIG.md \
        .claude/commands/mindforge/approve.md \
        .agent/mindforge/approve.md
git commit -m "harden(governance): add EMERGENCY_APPROVERS config, identity validation in approve command"
```

---

## HARDEN 6 — Seal the GDPR Gate 4 independence from skill loading

Update `compliance-gates.md` — replace Gate 4 definition:

```markdown
### Gate 4 — GDPR/PII compliance check

**IMPORTANT: This gate runs independently of skill loading.
It does NOT require the data-privacy skill to have been active.**

**Trigger conditions (checks the diff):**
1. New database column names matching PII patterns:
   ```
   email, phone, mobile, address, postcode, zip, ssn, dob, birth_date,
   first_name, last_name, full_name, surname, national_id, passport,
   credit_card, card_number, bank_account, iban, bic
   ```
2. New fields in request/response schemas matching the same patterns
3. New data model files (prisma schema, SQLAlchemy models, Django models)
   that contain any PII pattern fields

**Detection command:**
```bash
# Scan diff for PII column additions
git diff HEAD | grep "^+" | grep -iE \
  "(email|phone|mobile|address|postcode|zip_code|ssn|date_of_birth|first_name|last_name|national_id|credit_card|bank_account)"
```

**If triggered — check for retention period documentation:**
Verify that ARCHITECTURE.md has a data model section with a retention period
documented for the matching field.

```bash
# Check ARCHITECTURE.md for retention documentation
grep -i "retention" .planning/ARCHITECTURE.md
```

If no retention period is documented:
- Block phase completion
- Write AUDIT entry: `"event": "compliance_gate_failed", "gate": "GDPR_retention"`
- Report: "PII field added without documented retention period.
  Update ARCHITECTURE.md Data Model section with retention policy for [field name]."

**Override:** Requires compliance officer approval (Tier 3).
```

**Commit:**
```bash
git add .mindforge/governance/compliance-gates.md
git commit -m "harden(governance): make Gate 4 GDPR-independent of skill loading, add PII detection"
```

---

## HARDEN 7 — Fix the milestone archive scope bug

Update `complete-milestone.md` — replace Step 8 archive section:

```markdown
## Step 8 — Archive milestone artifacts (scoped to this milestone only)

Archive ONLY the phases included in this milestone, not all phases:

```bash
# Read the milestone's phase list from the milestone file
MILESTONE_PHASES=$(grep "Phase [0-9]" ".planning/milestones/MILESTONE-${MILESTONE_NAME}.md" \
  | grep -o "Phase [0-9]*" | grep -o "[0-9]*")

# Create the milestone archive directory
mkdir -p ".planning/archive/milestone-${MILESTONE_NAME}"

# Archive only the relevant phases
for PHASE_NUM in ${MILESTONE_PHASES}; do
  if [ -d ".planning/phases/${PHASE_NUM}" ]; then
    cp -r ".planning/phases/${PHASE_NUM}" \
          ".planning/archive/milestone-${MILESTONE_NAME}/phase-${PHASE_NUM}"
    echo "  Archived Phase ${PHASE_NUM}"
  fi
done

# Archive the requirements and architecture snapshots (point-in-time)
cp ".planning/REQUIREMENTS.md" \
   ".planning/archive/milestone-${MILESTONE_NAME}/REQUIREMENTS-snapshot.md"
cp ".planning/ARCHITECTURE.md" \
   ".planning/archive/milestone-${MILESTONE_NAME}/ARCHITECTURE-snapshot.md"

# Write an archive manifest
cat > ".planning/archive/milestone-${MILESTONE_NAME}/ARCHIVE-MANIFEST.md" << EOF
# Milestone Archive: ${MILESTONE_NAME}
**Archived:** $(date -u +%Y-%m-%dT%H:%M:%SZ)
**Phases:** ${MILESTONE_PHASES}
**Release tag:** v${VERSION}

## Files archived
$(ls ".planning/archive/milestone-${MILESTONE_NAME}/" | grep -v ARCHIVE-MANIFEST)
EOF

echo "  Archive complete: .planning/archive/milestone-${MILESTONE_NAME}/"
```

### What is NOT archived
- Phases from PREVIOUS milestones (they have their own archives)
- The full `.planning/` directory (would duplicate previous milestones' archives)
- Development tools and configuration (.mindforge/ directory)

After archiving, the active phases remain in `.planning/phases/` for reference
but are logically "owned" by the milestone archive. The next milestone's phases
will use new phase numbers continuing from the last used phase number.
```

**Commit:**
```bash
git add .claude/commands/mindforge/complete-milestone.md \
        .agent/mindforge/complete-milestone.md
git commit -m "harden(milestone): fix archive scope to milestone phases only, prevent exponential growth"
```

---

## HARDEN 8 — Add resilience patterns to all integrations

All three integrations (Jira, Confluence, Slack) need a shared resilience pattern.
Add to `connection-manager.md`:

```markdown
## Integration resilience: shared patterns for all integrations

### Non-fatal integration failures
Integration failures must NEVER fail a MindForge phase execution.
The following are non-fatal:
- Jira ticket creation fails
- Confluence page publish fails
- Slack notification fails
- GitHub PR creation fails (warn user, but phase is complete)

The following ARE fatal (stop execution):
- The source code change itself fails (test suite failure, verify step failure)
- A compliance gate fails
- A Tier 3 approval is rejected

### Retry policy (apply to all integrations)

```
Attempt 1: immediately
Attempt 2: after 5 seconds (exponential: 2^1 × 2.5s ≈ 5s)
Attempt 3: after 20 seconds (exponential: 2^2 × 5s = 20s)
Give up after attempt 3.
```

Never retry more than 3 times. After 3 failures:
1. Log AUDIT: `"event": "integration_action", "status": "failed", "attempts": 3`
2. Write to STATE.md under "Pending integration actions":
   ```markdown
   ## Pending integration actions (manual retry needed)
   - [2026-03-20 14:32] Jira: Failed to create story for Plan 3-02 (3 attempts)
     Retry command: /mindforge:sync-jira --phase 3
   ```
3. Alert the user: "Jira sync failed after 3 attempts. Added to pending actions.
   Run /mindforge:sync-jira to retry when the service is available."
4. Continue with the next step of the phase. Never block.

### Timeout policy

Every integration API call has a 10-second timeout:
```bash
curl -s --max-time 10 -H "Authorization: ..." ...
# If curl returns exit code 28 (timeout): treat as connection failure
```

### Circuit breaker pattern

If an integration fails 3 times in a row (across different API calls in the same session):
- Mark the integration as "circuit-open" in the session state
- Skip all subsequent calls to that integration for the rest of the session
- Log: `"event": "integration_circuit_opened", "integration": "jira", "reason": "3 consecutive failures"`
- The circuit resets on the next session start
```

**Commit:**
```bash
git add .mindforge/integrations/connection-manager.md
git commit -m "harden(integrations): add resilience patterns — retry policy, timeouts, circuit breaker"
```

---

## HARDEN 9 — Write 3 new ADRs for Day 4 decisions

### `.planning/decisions/ADR-009-integration-credential-model.md`

```markdown
# ADR-009: Environment-variable-only credential storage for integrations

**Status:** Accepted
**Date:** [today]

## Context
MindForge integrations (Jira, Confluence, Slack, GitHub) require API credentials.
The question is: where to store them.

## Decision
Credentials ONLY in environment variables. Never in MindForge config files.
INTEGRATIONS-CONFIG.md stores only non-sensitive values (URLs, project keys, channel IDs).

## Rationale
Config files are committed to git. A credentials file committed accidentally
becomes a security incident with an indefinite blast radius (all forks, all
clones, all GitHub Actions that ran while it was committed). Environment variables
are ephemeral, scoped to the process, and never committed to source control.

## Consequences
- Developers must configure environment variables before using integrations
- CI/CD must configure secrets in the CI environment
- The integration is skipped gracefully if credentials are absent
- No rotation mechanism is needed (rotating env vars is standard practice)
```

### `.planning/decisions/ADR-010-governance-non-bypass.md`

```markdown
# ADR-010: Compliance gates are non-bypassable; approval workflows are not

**Status:** Accepted
**Date:** [today]

## Context
Two types of governance controls exist: compliance gates and approval workflows.
The question is whether both should allow emergency bypass.

## Decision
- Compliance gates (Gate 1-5): NO bypass. Must be resolved.
- Approval workflows (Tier 2/3): emergency bypass available for designated approvers.

## Rationale

**Compliance gates** enforce technical correctness, not organisational process.
A secret in a diff is a security incident regardless of business urgency.
A CRITICAL security finding cannot be "approved away" — it must be fixed.
These are objective conditions with verifiable resolution paths.

**Approval workflows** enforce organisational oversight of risky changes.
In a genuine P0 production outage, the cost of waiting for approvals may
exceed the cost of the risk. Emergency overrides allow rapid response while
maintaining a full audit trail and requiring post-incident review.

## Consequences
- Developers must fix compliance gate failures — there is no shortcut
- Emergency overrides are rare, logged, and reviewed post-incident
- The audit trail captures all emergency overrides for compliance reporting
```

### `.planning/decisions/ADR-011-integration-non-blocking.md`

```markdown
# ADR-011: Integration failures are non-blocking for phase execution

**Status:** Accepted
**Date:** [today]

## Context
Jira/Confluence/Slack/GitHub integrations can fail (service downtime, rate limits,
credential expiry). Should integration failure block phase execution?

## Decision
Integration failures NEVER block phase execution. They are logged, queued for
retry, and reported to the user — but execution continues.

## Rationale
The integration layer is a convenience layer, not a correctness layer. The source
of truth for MindForge project state is the local `.planning/` directory and git
history — not Jira or Confluence. If Jira is down for 30 minutes, a developer
should not be blocked from executing their planned tasks. The sync can happen
when Jira recovers.

**Exception**: if an integration action is REQUIRED for governance (e.g., creating
a Jira approval ticket for a Tier 3 change), and the integration is unavailable:
the change is blocked by GOVERNANCE (not by the integration). The developer
must wait for the governance control to be satisfiable — which may require
manual Jira ticket creation as an alternative path.

## Consequences
- The `/mindforge:status` command shows "Pending integration actions" for failed syncs
- Teams must monitor pending actions and run sync commands when services recover
- The audit log captures all failed integration attempts for reliability analysis
```

**Commit:**
```bash
git add .planning/decisions/
git commit -m "docs(adr): add ADR-009 credential model, ADR-010 non-bypass, ADR-011 non-blocking"
```

---

## HARDEN 10 — Expand test suites with hardening-prompted cases

Add to `tests/governance.test.js`:

```javascript
// Add after existing tests:

console.log('\nHardening-prompted governance tests:');

test('change classifier detects Tier 3 code pattern in non-standard file', () => {
  // jwt.sign in a file named utils/helper.ts (not in auth/ directory)
  function classifyByContent(content) {
    const tier3Patterns = ['bcrypt', 'argon2', 'jwt.sign', 'jwt.verify', 'stripe.'];
    return tier3Patterns.some(p => content.includes(p)) ? 3 : 1;
  }
  assert.strictEqual(classifyByContent('const token = jwt.sign(payload, secret)'), 3);
  assert.strictEqual(classifyByContent('const formatted = format(date)'), 1);
});

test('EMERGENCY_APPROVERS is referenced in INTEGRATIONS-CONFIG.md', () => {
  const content = readMd('.mindforge/org/integrations/INTEGRATIONS-CONFIG.md');
  assert.ok(content.includes('EMERGENCY_APPROVERS'), 'INTEGRATIONS-CONFIG.md should define EMERGENCY_APPROVERS');
});

test('approve command validates emergency approver identity', () => {
  const content = readMd('.claude/commands/mindforge/approve.md');
  assert.ok(
    content.includes('EMERGENCY_APPROVERS') && (content.includes('identity') || content.includes('denied')),
    'Approve command should validate emergency approver identity against config'
  );
});

test('compliance Gate 4 runs independently of data-privacy skill', () => {
  const content = readMd('.mindforge/governance/compliance-gates.md');
  assert.ok(
    content.includes('independently') || content.includes('NOT require'),
    'Gate 4 should state it runs independently of skill loading'
  );
});

test('governance config file has Tier3 approvers defined', () => {
  const content = readMd('.mindforge/org/integrations/INTEGRATIONS-CONFIG.md');
  assert.ok(content.includes('TIER3_APPROVERS'), 'Config should define TIER3_APPROVERS');
});
```

Add to `tests/integrations.test.js`:

```javascript
// Add after existing tests:

console.log('\nHardening-prompted integration tests:');

test('jira.md has dynamic transition lookup (not hardcoded IDs)', () => {
  const content = readMd('.mindforge/integrations/jira.md');
  assert.ok(
    content.includes('transition_cache') || content.includes('dynamic') || content.includes('get_transition_id'),
    'Jira spec should use dynamic transition ID lookup, not hardcoded IDs'
  );
});

test('connection-manager has shell credential hygiene section', () => {
  const content = readMd('.mindforge/integrations/connection-manager.md');
  assert.ok(
    content.includes('shell history') || content.includes('credential hygiene'),
    'Should have shell credential hygiene documentation'
  );
});

test('connection-manager prohibits curl verbose mode', () => {
  const content = readMd('.mindforge/integrations/connection-manager.md');
  assert.ok(
    content.includes('-v') || content.includes('verbose'),
    'Should prohibit curl verbose mode with credentials'
  );
});

test('connection-manager has circuit breaker pattern', () => {
  const content = readMd('.mindforge/integrations/connection-manager.md');
  assert.ok(
    content.includes('circuit') || content.includes('circuit breaker'),
    'Should have circuit breaker resilience pattern'
  );
});

test('complete-milestone archives phases selectively (not all phases)', () => {
  const content = readMd('.claude/commands/mindforge/complete-milestone.md');
  assert.ok(
    content.includes("milestone's phase list") || content.includes('scoped to'),
    'complete-milestone should archive only milestone phases, not all phases'
  );
});

test('integration failures are non-blocking for phase execution', () => {
  const content = readMd('.mindforge/integrations/connection-manager.md');
  assert.ok(
    content.includes('non-fatal') || content.includes('Non-fatal'),
    'Integration failures should be documented as non-fatal'
  );
});
```

**Commit:**
```bash
git add tests/governance.test.js tests/integrations.test.js
git commit -m "test(day4): add hardening-prompted test cases for governance and integrations"
```

---

## HARDEN 11 — Write `docs/enterprise-setup.md` and `docs/governance-guide.md`

### `docs/enterprise-setup.md`

```markdown
# MindForge Enterprise Setup Guide

## Prerequisites
- MindForge v0.4.0+ installed (`npx mindforge-cc@latest`)
- Jira Cloud account with API token (optional but recommended)
- Confluence Cloud account (optional but recommended)
- Slack workspace with bot token (optional but recommended)
- GitHub or GitLab account with personal access token (optional)

## Step 1 — Configure environment variables

Add to your shell profile (`~/.zshrc`, `~/.bashrc`) or CI/CD secrets:

```bash
# Jira (obtain token from https://id.atlassian.com/manage-profile/security/api-tokens)
export JIRA_BASE_URL="https://your-org.atlassian.net"
export JIRA_USER_EMAIL="you@your-org.com"
export JIRA_API_TOKEN="your-api-token"

# Confluence (same token as Jira for Atlassian Cloud)
export CONFLUENCE_BASE_URL="https://your-org.atlassian.net/wiki"
export CONFLUENCE_API_TOKEN="${JIRA_API_TOKEN}"   # Reuse Atlassian token

# Slack (create at https://api.slack.com/apps)
export SLACK_BOT_TOKEN="xoxb-your-bot-token"

# GitHub (create at https://github.com/settings/tokens)
export GITHUB_TOKEN="ghp_your-personal-access-token"
```

## Step 2 — Configure INTEGRATIONS-CONFIG.md

Open `.mindforge/org/integrations/INTEGRATIONS-CONFIG.md`.
Fill in all non-credential configuration values.
Critical: verify `JIRA_PROJECT_KEY` matches your actual Jira project key.

## Step 3 — Configure GOVERNANCE-CONFIG.md

Open `.mindforge/governance/GOVERNANCE-CONFIG.md`.
Set: `TIER2_APPROVERS`, `TIER3_APPROVERS`, `EMERGENCY_APPROVERS`.
These should be the git config user.email values of the appropriate team members.

## Step 4 — Fill in org context templates

Customise these files for your organisation:
- `.mindforge/org/ORG.md` — your organisation and tech stack defaults
- `.mindforge/org/CONVENTIONS.md` — your actual coding conventions
- `.mindforge/org/SECURITY.md` — your security policies
- `.mindforge/org/TOOLS.md` — your approved libraries

## Step 5 — Test the integrations

```bash
# Test Jira connection
/mindforge:sync-jira --dry-run

# Test Confluence connection
/mindforge:sync-confluence --dry-run

# Test Slack notification
# (runs connection health check from connection-manager.md)
/mindforge:status
```

## Step 6 — Initialise your first project

```bash
# For a new project:
/mindforge:init-project

# For an existing codebase:
/mindforge:map-codebase
```
```

### `docs/governance-guide.md`

```markdown
# MindForge Governance Guide

## Understanding approval tiers

MindForge uses three tiers of change governance. Understanding these helps
your team configure the right approvers and set realistic SLA expectations.

### Tier 1 — No approval needed
Routine changes: bug fixes, documentation, test additions, PATCH dependency updates.
MindForge auto-approves these after quality gates pass. No human action required.

### Tier 2 — Peer review required
New features, schema changes, new dependencies, infrastructure changes.
Requires one approval from the `TIER2_APPROVERS` list within 24 hours.
Suitable reviewer: senior engineer, tech lead, or domain expert.

### Tier 3 — Compliance review required
Auth, payments, PII, security-critical changes.
Requires one approval from the `TIER3_APPROVERS` list within 4 hours.
Suitable reviewer: security officer, compliance officer, or CTO.

## How to approve a change

1. Receive Slack notification (or check with `/mindforge:approve`)
2. Review the change description and risk assessment in the notification
3. Click the review link to see the actual diff
4. Run: `/mindforge:approve [approval-id] --reason "Your notes here"`
5. Or reject: `/mindforge:approve [approval-id] --reject --reason "Reason"`

## Compliance gates — what they check

| Gate | What fails it | How to fix |
|---|---|---|
| No CRITICAL security findings | `security_finding` with `severity: CRITICAL` | Fix the security issue and re-scan |
| Test suite passing | Any failing test | Fix the failing tests |
| No secrets in diff | Credential pattern in staged files | Remove secret, rotate credential |
| Dependency CVE clearance | `npm audit` HIGH/CRITICAL | Update the vulnerable package |
| GDPR retention | PII field without retention period in ARCHITECTURE.md | Document retention period |

## Querying the audit log for compliance

```bash
# All security findings (for security auditors)
/mindforge:audit --event security_finding --export security-report.md

# All approvals and rejections (for governance review)
/mindforge:audit --event change_approved --event change_rejected

# Emergency overrides (should be rare — investigate if frequent)
/mindforge:audit --event change_approved | grep emergency

# All activity for a specific phase
/mindforge:audit --phase 3
```
```

**Commit:**
```bash
git add docs/enterprise-setup.md docs/governance-guide.md
git commit -m "docs: add enterprise setup guide and governance guide"
```

---

## HARDEN 12 — Bump version and update CHANGELOG.md

Update `package.json`:
```json
{ "version": "0.4.0" }
```

Update `CHANGELOG.md` — prepend:

```markdown
## [0.4.0] — Day 4 Enterprise Integrations

### Added
- Jira integration: bidirectional sync with epics, stories, and security bugs
- Confluence integration: publish architecture docs, ADRs, phase docs
- Slack integration: structured Block Kit notifications for phase events
- GitHub integration: enhanced PR creation with templates and reviewer assignment
- GitLab integration: equivalent MR workflow for GitLab teams
- Governance layer: three-tier change classifier (Tier 1/2/3)
- Approval workflow: pending approvals, expiry, emergency overrides
- Compliance gates: 5 non-bypassable quality and security gates
- Multi-developer HANDOFF: per-developer session files, conflict detection
- Session merger: artifact reconciliation for multi-developer workflows
- AUDIT.jsonl archiving: rotate at 10,000 lines, archive to `audit-archive/`
- /mindforge:audit — query audit log with filters and export
- /mindforge:milestone — create and track milestones
- /mindforge:complete-milestone — ship a milestone with release tag
- /mindforge:approve — process approval requests
- /mindforge:sync-jira — synchronise with Jira
- /mindforge:sync-confluence — publish to Confluence
- 3 new ADRs: ADR-009, ADR-010, ADR-011
- Enterprise setup guide and governance guide

### Hardened
- Dynamic Jira transition ID lookup (was hardcoded — would fail on non-standard workflows)
- Shell credential hygiene (prevent token exposure in shell history and curl verbose mode)
- Tier 3 change classification now includes code-content scanning (not just file paths)
- Gate 4 (GDPR) runs independently of data-privacy skill loading
- Milestone archive scoped to milestone phases only (prevents exponential archive growth)
- Circuit breaker pattern added to all integrations
```

**Commit:**
```bash
git add package.json CHANGELOG.md
git commit -m "chore(release): bump to v0.4.0, update CHANGELOG.md"
```

---

## HARDEN 13 — Final pre-merge checklist

```bash
# 1. All 7 test suites pass
node tests/install.test.js         && echo "✅ install"
node tests/wave-engine.test.js     && echo "✅ wave-engine"
node tests/audit.test.js           && echo "✅ audit"
node tests/compaction.test.js      && echo "✅ compaction"
node tests/skills-platform.test.js && echo "✅ skills-platform"
node tests/integrations.test.js    && echo "✅ integrations"
node tests/governance.test.js      && echo "✅ governance"

# 2. All 21 commands in both runtimes
ls .claude/commands/mindforge/ | wc -l     # Expected: 21
ls .agent/mindforge/ | wc -l               # Expected: 21
diff <(ls .claude/commands/mindforge/ | sort) <(ls .agent/mindforge/ | sort)
# Expected: no output

# 3. No credentials in any file
grep -rE "xox[pb]-[a-zA-Z0-9-]+|ghp_[a-zA-Z0-9]+|glpat-[a-zA-Z0-9]+" \
  --include="*.md" --include="*.json" --include="*.js" \
  --exclude-dir=node_modules --exclude-dir=.git . 2>/dev/null
# Expected: no output

# 4. ADRs — now 11 total
ls .planning/decisions/*.md | wc -l       # Expected: 11

# 5. Integration files have content
for f in jira confluence slack github gitlab connection-manager; do
  SIZE=$(wc -c < .mindforge/integrations/${f}.md)
  echo "${f}: ${SIZE} bytes"
  [ "${SIZE}" -gt 500 ] || echo "WARNING: ${f} seems too small"
done

# 6. Governance files have content
for f in approval-workflow change-classifier compliance-gates; do
  SIZE=$(wc -c < .mindforge/governance/${f}.md)
  echo "${f}: ${SIZE} bytes"
  [ "${SIZE}" -gt 500 ] || echo "WARNING: ${f} seems too small"
done

# 7. INTEGRATIONS-CONFIG.md has EMERGENCY_APPROVERS
grep "EMERGENCY_APPROVERS" .mindforge/org/integrations/INTEGRATIONS-CONFIG.md
# Expected: one match

# 8. package.json version
node -e "const p=require('./package.json'); console.log('Version:', p.version)"
# Expected: 0.4.0

# 9. CHANGELOG.md has 0.4.0 entry
grep "0.4.0" CHANGELOG.md
# Expected: match

# 10. Git log — clean Day 4 commits
git log --oneline | head -30
# Expected: ~14 clean commits
```

---

## FINAL COMMIT AND PUSH

```bash
git add .
git commit -m "harden(day4): complete Day 4 enterprise hardening — governance, credentials, resilience"
git push origin feat/mindforge-enterprise-integrations
```

---

## DAY 4 COMPLETE — What you have built

| Component | Files Added/Updated | Status |
|---|---|---|
| Connection manager | connection-manager.md | ✅ |
| Jira integration | jira.md + jira-sync.json schema | ✅ |
| Confluence integration | confluence.md + confluence-sync.json schema | ✅ |
| Slack integration | slack.md + slack-threads.json schema | ✅ |
| GitHub integration | github.md + PR template | ✅ |
| GitLab integration | gitlab.md | ✅ |
| Governance: classifier | change-classifier.md (3-signal Tier 3) | ✅ |
| Governance: approvals | approval-workflow.md + approval JSON schema | ✅ |
| Governance: gates | compliance-gates.md (5 gates) | ✅ |
| Governance config | GOVERNANCE-CONFIG.md | ✅ |
| Multi-dev HANDOFF | multi-handoff.md + session-merger.md | ✅ |
| AUDIT archiving | archive protocol in AUDIT-SCHEMA.md | ✅ |
| `/mindforge:audit` | 21st command | ✅ |
| `/mindforge:milestone` | 22nd command | ✅ |
| `/mindforge:complete-milestone` | 23rd command | ✅ |
| `/mindforge:approve` | 24th command | ✅ |
| `/mindforge:sync-jira` | 25th command | ✅ |
| `/mindforge:sync-confluence` | 26th command | ✅ |
| Integration test suite | integrations.test.js | ✅ |
| Governance test suite | governance.test.js | ✅ |
| 3 new ADRs | ADR-009, ADR-010, ADR-011 | ✅ |
| Enterprise docs | enterprise-setup.md + governance-guide.md | ✅ |
| CHANGELOG.md | v0.4.0 | ✅ |

**MindForge is now v0.4.0 — 21 commands, 10 skills, 11 ADRs, 7 test suites.**

---

## DAY 5 PREVIEW

```
Branch: feat/mindforge-intelligence-layer

Day 5 scope:
- /mindforge:health — comprehensive framework health check and self-repair
- /mindforge:profile-team — generate team capability and preference profiles
- Intelligent context compaction (AI-summarised, not truncated)
- Phase difficulty scoring — estimate effort before planning
- Anti-pattern detection engine — proactively flag known pitfalls
- Skill gap analysis — what skills are missing for the next phase
- /mindforge:retrospective — structured phase and milestone retrospectives
- Agent performance metrics — track quality scores over time
- MINDFORGE.md — project-level override file for all MindForge defaults
- npx mindforge-cc interactive setup wizard — guided first-run experience
```

**Branch:** `feat/mindforge-enterprise-integrations`
**Day 4 complete. Open PR → assign reviewer → merge to main.**
