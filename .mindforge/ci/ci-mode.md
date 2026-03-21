# MindForge CI Mode

## Purpose
Enable MindForge to run in non-interactive CI/CD environments.
CI mode is fully automated — no user prompts, no interactive approvals,
no waiting for human input. All decisions are pre-configured.

## Activating CI mode

CI mode activates automatically when:
1. `CI=true` environment variable is set (standard in GitHub Actions, GitLab CI, Jenkins)
2. `MINDFORGE_CI=true` is explicitly set
3. `process.stdin.isTTY === false` (piped or non-interactive shell)

In CI mode:
- All interactive prompts are skipped — pre-configured answers are used
- Approval workflows use the CI approval policy (see below)
- Progress output is structured JSON (parseable by CI log processors)
- Exit codes communicate status (0 = success, 1 = failure)
- Slack/GitHub notifications are sent as configured (integrations still work)

## CI mode configuration

Add to `MINDFORGE.md` for CI-specific settings:

```
## CI/CD configuration

# Which phases to execute in CI (comma-separated phase numbers, or "all")
CI_EXECUTE_PHASES=all

# Auto-approve Tier 2 changes in CI (default: false — safer)
CI_AUTO_APPROVE_TIER2=false

# Block CI on MEDIUM security findings (default: false)
CI_BLOCK_ON_MEDIUM_SECURITY=false

# Run full security scan in CI (default: true)
CI_SECURITY_SCAN=true

# Skip human UAT in CI — only run automated verification (default: true)
CI_SKIP_UAT=true

# Fail CI if test coverage drops below this threshold
CI_MIN_COVERAGE_PCT=80

# Timeout for entire CI run in minutes (default: 60)
CI_TIMEOUT_MINUTES=60

# Output format for CI logs: json | text | github-annotations
CI_OUTPUT_FORMAT=github-annotations
```

## CI approval policy

Tier 1: always auto-approved (same as interactive mode)
Tier 2: auto-approved IF `CI_AUTO_APPROVE_TIER2=true` in MINDFORGE.md
         rejected (build fails) IF `CI_AUTO_APPROVE_TIER2=false`
Tier 3: ALWAYS fails the build in CI — Tier 3 changes require human review.

The CI build should never be the first time a Tier 3 change is seen.
Engineers should get Tier 3 changes approved BEFORE pushing to CI.

## CI output format

### JSON format (`CI_OUTPUT_FORMAT=json`)
```json
{
  "mindforge_version": "0.6.0",
  "phase": 3,
  "status": "running | success | failure | warning",
  "timestamp": "ISO-8601",
  "tasks_completed": 5,
  "tasks_total": 8,
  "current_task": "Plan 3-06: Implement auth middleware",
  "gates": {
    "secrets_clean": true,
    "tests_passing": true,
    "security_findings_critical": 0,
    "security_findings_high": 0,
    "coverage_pct": 84
  },
  "events": [
    { "time": "ISO-8601", "type": "task_completed", "plan": "3-01", "commit": "abc1234" },
    { "time": "ISO-8601", "type": "security_finding", "severity": "MEDIUM", "finding": "..." }
  ]
}
```

### GitHub Annotations format (`CI_OUTPUT_FORMAT=github-annotations`)
```
::group::MindForge Phase 3 Execution
::notice::Task 3-01 completed: Create auth middleware [abc1234]
::notice::Task 3-02 completed: Add JWT validation [def5678]
::warning file=src/auth/session.ts,line=47::Medium security finding: Verbose error message exposes stack trace
::notice::Phase 3 complete: 8/8 tasks, all tests passing
::endgroup::
```

### Error output
```
::error::MindForge CI failed: Task 3-06 verify step failed
::error file=src/api/users.ts,line=89::TypeScript error: Type 'string' is not assignable to 'number'
::error::Quality gate failed: test coverage 68% (minimum: 80%)
```

## CI environment requirements

```bash
# Required environment variables for full CI functionality:
ANTHROPIC_API_KEY=     # Claude API access (required for AI features)
GITHUB_TOKEN=          # For PR creation and status checks
JIRA_API_TOKEN=        # Optional — for Jira sync
SLACK_BOT_TOKEN=       # Optional — for notifications
```

## CI timeout and exit codes

**Exit code policy:**
| Situation | Exit code | Meaning |
|---|---|---|
| All phases complete, gates passed | 0 | Success |
| Quality gate failed | 1 | Hard failure — fix required |
| Tier 2/3 governance block | 1 | Hard failure — approval required |
| CI timeout reached | 0 | Soft stop — work saved, resume next run |
| No MindForge project found | 1 | Configuration error |

**Important:** GitHub Actions (and most CI systems) treat ANY non-zero exit code
as failure. Exit code 2 does NOT mean "warning" in CI — it means failure.

**Timeout handling (exit 0 with state preservation):**
```bash
# Set up timeout trap
CI_TIMEOUT_SECONDS=$((${CI_TIMEOUT_MINUTES:-60} * 60))
timeout_handler() {
  echo "::warning::MindForge CI timeout reached after ${CI_TIMEOUT_MINUTES} minutes"
  echo "::warning::Progress saved. Next CI run will resume from: $(cat .planning/HANDOFF.json | python3 -c 'import sys,json; print(json.load(sys.stdin).get("next_task","unknown"))')"

  # Write resume info to GitHub Actions step summary
  cat >> "${GITHUB_STEP_SUMMARY:-/dev/null}" << 'SUMMARY_EOF'
## ⏱️ MindForge CI Timeout

CI timeout reached. Progress has been saved.

Next run will resume from:
$(cat .planning/HANDOFF.json | python3 -c 'import sys,json; d=json.load(sys.stdin); print(d.get("next_task","unknown"))')

Run the CI pipeline again to continue.
SUMMARY_EOF

  # Commit HANDOFF.json so next run can resume
  git add .planning/HANDOFF.json .planning/STATE.md
  git commit -m "ci: save MindForge progress on timeout [skip ci]" || true
  git push origin HEAD || true

  exit 0  # Exit 0 — timeout is not a failure
}

trap 'timeout_handler' TERM
(sleep "${CI_TIMEOUT_SECONDS}"; kill -TERM $$) &
TIMEOUT_PID=$!
```

## CI timeout and resource management

```
Default execution limits per CI run:
  Maximum tasks per session: 25
  Maximum parallel subagents: 5 (respect CI runner memory limits)
  Task timeout: 10 minutes per task
  Phase timeout: 45 minutes
  Full CI timeout: 60 minutes

On timeout:
  1. Write current state to HANDOFF.json
  2. Exit with code 0 (soft stop)
  3. The next CI run resumes from HANDOFF.json
  4. Report: "CI timeout reached. Run will resume from: [next_task]"
```
