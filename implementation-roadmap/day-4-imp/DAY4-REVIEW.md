# MindForge — Day 4 Review Prompt
# Branch: `feat/mindforge-enterprise-integrations`
# Run this AFTER DAY4-IMPLEMENT.md is complete

---

## CONTEXT

You are performing a **Day 4 Architecture & Enterprise Security Review** of the
MindForge integration layer, governance system, multi-developer HANDOFF, and
audit archiving.

Activate **`architect.md` + `security-reviewer.md`** simultaneously.

Day 4 risk profile is unique: every component touches **external systems and
credentials**. The primary risk is not missing functionality — it is:
1. **Credential exposure** — integration configs leaking secrets
2. **Governance bypass** — approval workflows that can be circumvented
3. **Integration failure blast radius** — a broken Jira sync crashing a phase
4. **Data contamination** — wrong data published to Confluence or Jira

Review every component with an adversarial mindset: "How would an engineer
accidentally (or intentionally) bypass this governance control?"

---

## REVIEW PASS 1 — Connection Manager: Security Hardening

Read `connection-manager.md` completely.

### Credential safety
- [ ] Does the spec explicitly say to NEVER log the token value during health checks?
  The health check uses `JIRA_API_TOKEN` in a `curl` command — if `set -x` is on,
  the token appears in the terminal/log. Add: "Ensure shell debug mode (`set -x`)
  is disabled before running any credential-bearing commands."
- [ ] Base64 encoding of credentials: `echo -n "${JIRA_USER_EMAIL}:${JIRA_API_TOKEN}" | base64`
  This appears in shell history. Add: "Run credential encoding in a subshell
  and unset immediately. Or use a function that avoids shell history."
- [ ] The rate limiting section says "wait 60 seconds, retry once."
  What if the retry also returns 429? Infinite loop risk.
  Add: "On second 429: stop. Write AUDIT entry. Alert user. Do not retry further."

### Integration availability
- [ ] "Graceful skip" when a credential is missing is correct.
  But: should a missing Slack credential silently skip a CRITICAL security finding
  notification? That is a governance failure, not a graceful skip.
  Add: "For CRITICAL security finding notifications: if Slack is unconfigured,
  write to STATE.md under 'Undelivered alerts' and display prominently in
  the next /mindforge:status output."

- [ ] The INTEGRATIONS-CONFIG.md template includes `SLACK_CHANNEL_ID`.
  Channel IDs are not sensitive but they ARE platform-specific identifiers.
  What happens when the channel is archived or deleted?
  The integration should detect 404 responses from Slack and flag: "SLACK_CHANNEL_ID
  appears invalid. Update INTEGRATIONS-CONFIG.md."

---

## REVIEW PASS 2 — Jira Integration: Correctness

Read `jira.md` completely.

### API correctness
- [ ] The Epic creation payload uses `customfield_10014` for the Epic Name field.
  This field ID varies by Jira instance. It is `10014` on Cloud but may differ.
  Add: "Verify the Epic Name field ID in your Jira instance with:
  `GET /rest/api/3/field` — filter for `name: Epic Name`."

- [ ] The Story creation uses `"parent": { "key": "${EPIC_KEY}" }` for epic linking.
  In Jira Cloud, linking a Story to an Epic uses the `parent` field only in
  Next-gen projects. In Classic projects, it uses `customfield_10014`.
  Add: "Check project type before creating stories:
  Next-gen: use `parent.key`. Classic: use `customfield_10014`."

- [ ] The transition IDs (11 for Start Progress, 31 for Done) are hardcoded.
  Transition IDs are NOT universal across Jira instances.
  This is a correctness bug — it will fail silently or throw a 400 error.
  Add: "Before using transition IDs, fetch them:
  `GET /rest/api/3/issue/{issueKey}/transitions`
  and match by transition name (not ID). Cache the mapping."

- [ ] Rate limiting: "wait 200ms between calls."
  Jira Cloud rate limit is actually enforced per OAuth token, not per request.
  The spec says 10 req/sec — this is approximately correct for Jira Cloud REST.
  Consider: for batch operations (creating 10 stories), is 200ms sufficient?
  Add: "For batch operations creating > 10 tickets: implement exponential backoff
  starting at 500ms."

### jira-sync.json
- [ ] The sync state file stores `story_keys` but not the inverse: Jira ticket →
  MindForge plan. If a Jira ticket is manually closed, MindForge has no way to
  detect this during sync. Note this limitation explicitly:
  "Jira→MindForge sync (reading Jira state back into MindForge) is out of scope
  for Day 4. MindForge is the source of truth; Jira reflects it."

- [ ] The `_warning` field in jira-sync.json is present. ✅ Good.
  But the file also stores `story_keys` and `epic_key` — these are not credentials
  but they are sensitive project data. Should this file be gitignored for
  open-source projects? Flag as a SUGGESTION.

---

## REVIEW PASS 3 — Governance Layer: Bypass Vectors

This is the most critical review pass. Governance only works if it cannot be bypassed.

### Change classifier (`change-classifier.md`)

- [ ] **Tier 3 pattern matching is file-path-based.**
  What if a developer puts auth code in `src/utils/helper.ts`?
  The file name doesn't match any Tier 3 pattern.
  How does the classifier catch security-critical code NOT in expected paths?
  Recommendation: add code pattern scanning (not just path scanning):
  - Scan the actual diff for `bcrypt`, `argon2`, `jwt.sign`, `jwt.verify`, `stripe.`
  - These code patterns should trigger Tier 3 regardless of file path.
  Flag as MAJOR if code pattern scanning is not in the spec.

- [ ] **"Changes affecting > 10 files or > 300 lines" → Tier 2.**
  What about a change that touches 9 files but is a new auth system?
  File count is a proxy for risk, not a perfect signal. Make clear:
  "File count is one signal. Code pattern matching for Tier 3 has higher priority."

- [ ] **Classifier is triggered "before every phase execution."**
  But when exactly? Before Wave 1? Before each plan? Before the PR?
  The timing matters: classify before PR creation (diff is known). For execution:
  classify before each PLAN executes (since each plan modifies specific files).
  Clarify the exact trigger point.

### Approval workflow (`approval-workflow.md`)

- [ ] **Approver verification uses `git config user.email`.**
  This is trivially spoofable — anyone can set `git config user.email` to any value.
  In a real enterprise environment, approvals need stronger identity verification.
  Acknowledge this limitation: "In the current implementation, approver identity
  is based on git config user.email. For higher-assurance environments, integrate
  with your IdP (Okta, Azure AD) for approval identity verification."

- [ ] **"Emergency overrides are limited to users in EMERGENCY_APPROVERS config list."**
  But EMERGENCY_APPROVERS is not defined in INTEGRATIONS-CONFIG.md.
  Add it to the config template.

- [ ] **Approval expiry: "poll for approval every 5 minutes."**
  If the MindForge session is not running, polling does not happen.
  An approval request created at 2pm that expires at 2am — if no session runs
  between those times, the expiry is not processed until the next session.
  This is acceptable but should be acknowledged: "Expiry processing is session-dependent.
  Approval requests are not processed when no MindForge session is active."

- [ ] **Rejection response:** the spec says "create a fix task and re-request approval."
  But creating a new approval request for the same change after rejection requires
  understanding what was rejected. The fix task should explicitly include the
  rejection reason as context. Verify this is stated in the spec.

### Compliance gates (`compliance-gates.md`)

- [ ] **Gate 3 (no secrets) says "Override: Not possible."**
  But what happens in the following scenario: an engineer is writing a test
  that checks the secret detection logic itself and needs to commit a test file
  with a deliberately fake API key?
  Add: "Test files containing deliberately fake secrets for testing purposes
  must use patterns that do not match the detection regex:
  use `TEST_ONLY_FAKE_KEY_abc123` (prefix makes it a non-matching pattern)."

- [ ] **Gate 4 (GDPR) is only active "when data-privacy skill was active."**
  What if the developer forgot to load the data-privacy skill for a task that
  adds a PII field? The gate only fires if the skill was loaded — creating a
  detection gap.
  Add: "Gate 4 scans the diff independently of skill loading. If a new database
  column name matches PII patterns (email, phone, address, ssn, dob, etc.),
  trigger Gate 4 regardless of whether data-privacy skill was loaded."

---

## REVIEW PASS 4 — Slack Integration: Security and Reliability

Read `slack.md` completely.

### Token exposure
- [ ] The `send_notification` curl command uses `${SLACK_BOT_TOKEN}` as a Bearer token.
  If the notification fails (connection refused, timeout), does the error message
  include the token? Check: `curl` error output with `-v` flag includes headers.
  Add: "Never run notification commands with `-v` (verbose) flag.
  Error output from failed Slack calls should be captured and logged without
  the Authorization header."

### Block Kit message safety
- [ ] The phase completion template includes `[project name]` from PROJECT.md.
  Could a project name contain special characters that break the JSON payload?
  (e.g., a project name with double quotes would break the JSON string)
  Add: "Sanitise all dynamic content inserted into Block Kit JSON:
  escape double quotes (`"` → `\"`), newlines (`\n` → `\\n`), and backslashes."

### Thread management
- [ ] `slack-threads.json` stores thread timestamps indexed by phase/milestone.
  What if a Slack workspace is reset or the channel is recreated?
  Old thread timestamps would point to non-existent threads.
  The Slack API returns an error on `thread_ts` that doesn't exist.
  Add: "On Slack API error with existing thread_ts: clear the thread entry from
  slack-threads.json and create a new thread (don't retry with invalid ts)."

---

## REVIEW PASS 5 — Multi-Developer HANDOFF: Race Conditions

Read `multi-handoff.md` and `session-merger.md` completely.

### Race condition risks
- [ ] **Two developers starting the same plan simultaneously.**
  Developer A starts Plan 03 at 2pm. Developer B also starts Plan 03 at 2:05pm
  (they each had separate sessions and both saw Plan 03 as unstarted).
  Both write to the same files. The second commit wins — the first is overwritten.
  Mitigation: "When starting a plan, check the shared HANDOFF.json `active_developers`
  field. If another developer is listed for the same plan: warn and ask for
  clarification before proceeding."

- [ ] **Shared HANDOFF.json update race.**
  Both developers update HANDOFF.json simultaneously when completing tasks.
  The second write overwrites the first.
  Mitigation: "Shared HANDOFF.json must be updated via a git commit to track changes.
  Conflicts will manifest as git merge conflicts — which is the correct resolution
  mechanism for shared file state."

- [ ] **`active_developers.last_seen` — stale detection.**
  If Developer A's session crashes (power outage, disconnect), they stay listed
  in `active_developers` forever.
  Add: "Developers listed in `active_developers` with `last_seen` > 4 hours old
  are considered stale. Remove them from the active list automatically on session start."

### Session merger
- [ ] The merger says "AUDIT.jsonl is already complete — no merge needed."
  This assumes all developers committed their AUDIT.jsonl updates.
  But AUDIT.jsonl is a file — if one developer's entries weren't committed,
  they are lost.
  Add: "Ensure each developer's session commits their AUDIT entries
  as part of task completion commits. AUDIT.jsonl should be committed
  after every task_completed or task_failed entry."

---

## REVIEW PASS 6 — Commands: UX and Logic Gaps

### `/mindforge:audit` command

- [ ] **`--summary` output** — the phase count says "Phases covered: 1, 2, 3."
  How is this derived? By reading the `phase` field of AUDIT entries.
  But what if some entries have `"phase": null` (quick tasks, project init)?
  These should be counted separately or grouped as "project-level" entries.

- [ ] **`--export` flag** — exports to a user-specified path.
  What if the path is outside the project directory?
  (Path traversal via export: `--export ../../../etc/cron.d/mindforge`)
  Add: "Validate the export path is within the project directory or a
  user-specified safe location. Default to `.planning/` if path traversal detected."

- [ ] **`--verify` flag integrity check** — checks timestamps are chronological.
  But the check uses ISO-8601 string comparison.
  ISO-8601 strings are lexicographically sortable, so this works — confirm this
  is explicit in the spec. Add: "Timestamp comparison uses string comparison,
  which is valid for ISO-8601 format in UTC (Z suffix required)."

### `/mindforge:approve` command

- [ ] **Listing pending approvals** — requires scanning `.planning/approvals/`.
  What if the directory has many old (expired/resolved) approval files?
  The list command should filter to only `status: pending` entries.
  Verify this is explicit.

- [ ] **`--emergency` flag** — "limited to users in EMERGENCY_APPROVERS config list."
  But EMERGENCY_APPROVERS uses `git config user.email` for identity — which is
  spoofable (as noted in Pass 3). Flag consistently: same limitation applies here.

### `/mindforge:complete-milestone` command

- [ ] **Archive step** — `cp -r .planning/phases/ .planning/archive/milestone-[name]/`
  This copies the ENTIRE phases directory. For a project with 10 milestones,
  each milestone archives all previous phases too (they were all in `.planning/phases/`).
  This creates exponential archive growth.
  Fix: copy only the phases INCLUDED in this milestone, not all phases.

- [ ] **After milestone completion**, what happens to STATE.md?
  Does STATE.md reset to "ready for next milestone"? Or does it accumulate history?
  Specify: "After milestone completion, STATE.md retains the milestone summary
  and is updated with: 'Ready for [next version].' History is preserved in the
  archived phases directory."

---

## REVIEW PASS 7 — GitHub Integration: API Correctness

Read `github.md` completely.

### API version
- [ ] The spec says to use "GitHub REST API v4 (GraphQL) for complex queries,
  REST v3 for mutations."
  But the PR creation uses `POST /repos/{owner}/{repo}/pulls` — this is REST v3,
  not GraphQL v4. The spec is inconsistent.
  Clarify: "Use REST API v3 for all operations. GraphQL v4 is optional for
  complex queries only and requires a different auth header format."

### Branch protection check
- [ ] The pre-flight branch protection check calls:
  `GET /repos/{repo}/branches/{branch}/protection`
  This returns 404 if branch protection is not configured (not an error).
  The spec must handle 404 as "branch protection not configured" (not a failure).
  Add: "404 from branch protection check means no protection rules are configured.
  This is not an error. Proceed with PR creation."

### PR creation
- [ ] The spec does not handle the case where the branch has no commits ahead of base.
  GitHub returns a 422 error for PRs with no diff.
  Add: "Before PR creation, verify the branch has at least one commit ahead of base:
  `git log origin/${DEFAULT_BRANCH}..HEAD --oneline | wc -l`
  If zero: alert user and skip PR creation."

---

## REVIEW PASS 8 — Test Suite Quality

Read `tests/integrations.test.js` and `tests/governance.test.js`.

### Missing integration tests
- [ ] No test for Jira rate limiting behaviour (wait and retry)
- [ ] No test that `jira-sync.json` has a `_warning` field
- [ ] No test for Confluence idempotency (no duplicate pages created)
- [ ] No test for Slack `slack-threads.json` schema
- [ ] No test that `INTEGRATIONS-CONFIG.md` does NOT contain token patterns

### Missing governance tests
- [ ] No test for the exact Tier 3 code pattern trigger (not just file path)
  Add: verify that a file named `helper.ts` with content including `jwt.sign` is Tier 3
- [ ] No test for approval expiry detection
- [ ] No test that emergency override requires `--emergency` flag
  (not just `--reason`)
- [ ] No test for multi-developer stale detection (> 4 hours)

### Governance test simulation quality
- [ ] The `classifyChange` function in the test file takes `files` and two boolean flags.
  This simulates the classifier but doesn't test the actual code pattern scanning.
  The test is testing the test's own simulation, not the governance spec's protocol.
  This is acceptable for now but note it: "These tests simulate the classifier logic.
  Integration tests against actual diffs would provide stronger guarantees."

---

## REVIEW OUTPUT FORMAT

```
## Finding [N] — [Severity]: [Short title]

**File:** [path]
**Category:** [Credentials / Jira API / Governance / Slack / GitHub / Commands / Tests]
**Severity:** BLOCKING | MAJOR | MINOR | SUGGESTION

**Issue:** [Specific description]
**Impact:** [What fails if unfixed]
**Recommendation:** [Exact change]
```

---

## REVIEW SUMMARY TABLE

```
## Day 4 Review Summary

| Category        | BLOCKING | MAJOR | MINOR | SUGGESTION |
|-----------------|----------|-------|-------|------------|
| Credentials     |          |       |       |            |
| Jira API        |          |       |       |            |
| Governance      |          |       |       |            |
| Slack           |          |       |       |            |
| GitHub API      |          |       |       |            |
| Commands        |          |       |       |            |
| Tests           |          |       |       |            |
| **TOTAL**       |          |       |       |            |

## Verdict
[ ] ✅ APPROVED — Proceed to DAY4-HARDEN.md
[ ] ⚠️  APPROVED WITH CONDITIONS — Fix [N] major findings first
[ ] ❌ NOT APPROVED — [N] blocking findings. Fix and re-review.
```

---

**Branch:** `feat/mindforge-enterprise-integrations`
**All BLOCKING items resolved → proceed to DAY4-HARDEN.md**
