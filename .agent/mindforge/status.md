# MindForge — Status Command
# Usage: /mindforge:status

Display a rich dashboard of the current project state.
Pull data from STATE.md, AUDIT.jsonl, REQUIREMENTS.md, and the phases directory.

## Dashboard sections

### Section 1 — Project header
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⚡ MindForge Status — [Project Name]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Last updated : [STATE.md last updated timestamp]
  Current phase: Phase [N] — [phase description]
  Status       : [status from STATE.md]
```

### Section 2 — Phase progress
```
Phase Progress
───────────────────────────────────────────────────────
  Phase 1  [████████████████████] 100% — Complete ✅
  Phase 2  [████████░░░░░░░░░░░░]  40% — In progress
  Phase 3  [░░░░░░░░░░░░░░░░░░░░]   0% — Not started
  Phase 4  [░░░░░░░░░░░░░░░░░░░░]   0% — Not started
```
Calculate percentage from: tasks with SUMMARY files / total tasks in phase.
Count ONLY SUMMARY files that contain `Status: Completed ✅` (or `Status` + `Completed`).
Do not count failed tasks as progress.
If VERIFICATION.md is missing for a phase: label it "In progress" not "0% verified".

### Section 3 — Requirements coverage
Read REQUIREMENTS.md and count:
- Total v1 requirements
- Requirements with a passing test (from VERIFICATION.md files)
- Requirements implemented but untested
- Requirements not yet started

```
Requirements (v1)
───────────────────────────────────────────────────────
  Total        : [N]
  ✅ Done + tested  : [N]
  ⚠️  Done, no test : [N]
  🔴 Not started   : [N]
```

### Section 4 — Recent activity (from AUDIT.jsonl)
Read the last 10 entries from AUDIT.jsonl and display:
```
Recent Activity
───────────────────────────────────────────────────────
  [timestamp]  task_completed  Plan 03: User API endpoints ✅
  [timestamp]  task_completed  Plan 02: Product model ✅
  [timestamp]  task_started    Plan 03: User API endpoints
  [timestamp]  task_completed  Plan 01: User model ✅
  [timestamp]  context_compaction  Phase 2, Plan 03 (72% context)
```
If AUDIT.jsonl is empty or missing, display:
```
Recent Activity
───────────────────────────────────────────────────────
  No activity logged yet. Activity will appear here
  after running /mindforge:execute-phase.
```

### Section 5 — Open issues
Check for:
- Any open SECURITY-REVIEW files with CRITICAL or HIGH findings
- Any BUGS.md files with open issues
- Any failed tasks in WAVE-REPORT files
- Any blockers in STATE.md

```
Open Issues
───────────────────────────────────────────────────────
  🔴 CRITICAL: [if any — from SECURITY-REVIEW]
  🟠 HIGH:     [if any]
  ✅ No open issues
```

### Section 6 — Next action
```
Next Action
───────────────────────────────────────────────────────
  [What STATE.md says the next action is]
  Run: /mindforge:next
     to auto-execute the next step.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

## Data sources (in priority order)
1. STATE.md — authoritative for current status
2. AUDIT.jsonl — authoritative for history
3. REQUIREMENTS.md — authoritative for scope
4. VERIFICATION.md files — authoritative for test coverage
5. WAVE-REPORT files — authoritative for execution history
6. HANDOFF.json — authoritative for session state

## Performance notes
- For recent activity, read only the last 500 bytes of AUDIT.jsonl:
  `tail -c 500 .planning/AUDIT.jsonl | [parse last complete JSON objects]`
- For requirement counts, count lines starting with `| FR-` instead of parsing the whole file.
