---
description: Create a pull request from completed phase/milestone work, generate a rich PR body from planning artifacts, optionally run code review, and prepare for merge. Closes the plan → execute → verify → ship loop.
---
Create a release PR for a verified phase. Usage: /mindforge:ship [N]

## Step 0 — Protocol Activation

**MANDATORY**: Invoke the `mindforge-ship_extended` skill.
This ensures the shipping process uses rigorous quality gates, branch sanitization, and automated PR body generation.

## Pre-check
Read UAT.md for phase N. If status is not "All passed ✅": stop.
Tell the user: "Phase [N] has not been fully verified. Run /mindforge:verify-phase [N] first."

## Step 1 — Generate changelog entry
Read all SUMMARY files for phase N.
Read REQUIREMENTS.md for phase N items.
Generate a CHANGELOG.md entry following Keep a Changelog format:

```markdown
## [Unreleased] — Phase [N]: [Phase description]

### Added
- [New feature from this phase]

### Changed
- [Changed behaviour]

### Fixed
- [Bug fixes]

### Security
- [Security improvements]
```

Prepend this to CHANGELOG.md.

## Step 2 — Run final quality gates
Run all of the following and report results:
```bash
# Type checking
npx tsc --noEmit

# Linting
npx eslint . --ext .ts,.tsx --max-warnings 0

# Tests
npm test

# Security scan (if npm project)
npm audit --audit-level=high
```

If any gate fails: stop. Report the failures. Do not proceed to PR creation.

## Step 3 — Create PR description
Generate a complete PR description:

```markdown
## MindForge Phase [N] — [Phase description]

### Summary
[2-3 sentences describing what this phase delivered]

### Changes
[Bullet list of major changes from SUMMARY files]

### Requirements delivered
| FR ID | Description                  | Verified |
|-------|------------------------------|----------|
| FR-01 | ...                          | ✅       |

### Testing
- Unit tests: [pass/fail + coverage %]
- Integration tests: [pass/fail]
- UAT: Completed and signed off (see UAT.md)

### Security
- [ ] Security review completed (see SECURITY-REVIEW-N.md)
- [ ] No hardcoded secrets in diff
- [ ] All dependencies scanned for CVEs

### Checklist
- [x] CHANGELOG.md updated
- [x] All tests pass
- [x] No linter errors
- [x] UAT signed off
- [ ] Reviewed by: [assign]
```

## Step 4 — Commit and tag
```bash
git add CHANGELOG.md
git commit -m "docs(changelog): add Phase [N] release notes"
git push origin feat/mindforge-core-scaffold
```

Tell the user the PR description and instruct them to open the PR manually
(or provide the `gh pr create` command if GitHub CLI is available).

Tell the user:
"✅ Phase [N] ready to ship.
 PR description generated above.
 Open your PR, assign reviewers, and merge when approved."

## Step 5 — Update state
Update STATE.md to mark Phase [N] as shipped.
Update HANDOFF.json with next phase number.
