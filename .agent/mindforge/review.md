---
description: - /mindforge:review (no args) → review all uncommitted changes (git diff)
---

# MindForge — Review Command
# Usage: /mindforge:review [path|phase N|--staged|--last-commit]
# Performs a comprehensive code review using code-quality and security skills.

## Review targets
- `/mindforge:review` (no args) → review all uncommitted changes (`git diff`)
- `/mindforge:review --staged` → review staged changes (`git diff --cached`)
- `/mindforge:review --last-commit` → review the last commit (`git diff HEAD~1`)
- `/mindforge:review phase [N]` → review all commits in phase N
- `/mindforge:review [file-path]` → review a specific file
- `/mindforge:review [dir-path]` → review all files in a directory

## Step 1 — Establish review scope

Based on the target argument, build the file list to review:
```bash
# Uncommitted changes
git diff --name-only

# Staged changes
git diff --cached --name-only

# Last commit
git diff HEAD~1 --name-only

# Phase N (all commits between phase start and phase end tags)
git log --oneline --name-only [phase-start-sha]..[phase-end-sha]
```

Display the file list to the user before reviewing:
"Reviewing [N] files: [list]"

## Step 2 — Load review personas and skills

Activate TWO personas simultaneously for a comprehensive review:

**Primary:** `code-quality.md` — structural quality, conventions, complexity
**Secondary:** `security-reviewer.md` — security issues, data exposure, auth

Load these skills:
- `code-quality/SKILL.md` — always
- `security-review/SKILL.md` — always
- Contextual skills based on file types detected in the diff:
  - `.ts`/`.tsx` → also load `api-design/SKILL.md` (if routes present)
  - Database migration files → also load `database-patterns/SKILL.md`
  - UI component files → also load `accessibility/SKILL.md`

## Step 3 — Review each file

For each file in the review scope:

**Read the full file content** (not just the diff — context matters).
**Read the diff for this file** to understand what changed.

Apply ALL of the following checks:

### Code quality checks
- [ ] Functions within length limits (CONVENTIONS.md standard)
- [ ] Cyclomatic complexity ≤ 10 (count if/else/switch/catch/ternary branches)
- [ ] No magic numbers (named constants used instead)
- [ ] No commented-out code
- [ ] No `TODO` or `FIXME` left uncommitted
- [ ] Error handling is explicit (no empty catch blocks)
- [ ] Naming is precise and unambiguous (no `data`, `info`, `temp`)
- [ ] Every exported function has a JSDoc/docstring
- [ ] DRY: no logic duplicated 3+ times
- [ ] No dead code (imports/variables defined but never used)

### Convention checks (from CONVENTIONS.md)
- [ ] File naming follows convention
- [ ] Import order follows the defined order
- [ ] All forbidden patterns are absent
- [ ] Architecture boundaries respected (services don't import routes, etc.)

### Security checks (from security-review SKILL)
- [ ] No hardcoded credentials or secrets
- [ ] User input validated at boundaries
- [ ] SQL queries parameterised
- [ ] Sensitive data not in logs or error messages
- [ ] New dependencies CVE-scanned

### Type safety (TypeScript projects)
- [ ] No `any` types without justification comment
- [ ] No `as unknown as X` casting without justification
- [ ] All function parameters typed (no implicit any)
- [ ] Return types explicitly declared on public functions

## Step 4 — Write the review report

Create `.planning/phases/[current-phase]/CODE-REVIEW-[timestamp].md`
or `.planning/quick/review-[timestamp].md` for ad-hoc reviews:

```markdown
# Code Review Report
**Date:** [ISO-8601]
**Reviewer:** MindForge (code-quality + security-reviewer)
**Scope:** [what was reviewed]
**Files reviewed:** [N]

## Summary
[2-3 sentences: overall quality, major themes, recommendation]

## Findings

### 🔴 Blocking (must fix before merge)
| # | File | Line | Issue | Recommendation |
|---|---|---|---|---|
| 1 | src/auth/login.ts | 47 | Parameterised query not used | Use `db.query('SELECT * FROM users WHERE id = $1', [id])` |

### 🟠 Major (should fix in this PR)
| # | File | Line | Issue | Recommendation |
|---|---|---|---|---|
| 1 | src/api/users.ts | 23 | Function is 67 lines (limit: 40) | Extract `validateUserInput` to separate function |

### 🟡 Minor (fix in follow-up)
| # | File | Line | Issue | Recommendation |
|---|---|---|---|---|
| 1 | src/models/order.ts | 8 | Missing JSDoc on exported function | Add `@param`, `@returns`, `@throws` |

### 💡 Suggestions (optional improvements)
| # | File | Line | Suggestion |
|---|---|---|---|
| 1 | src/services/email.ts | 15 | Consider memoising the template compilation |

## Metrics
- Files reviewed: [N]
- Lines reviewed: [N]  
- Blocking findings: [N]
- Major findings: [N]
- Minor findings: [N]
- Suggestions: [N]

## Verdict
✅ APPROVED — No blocking or major findings
⚠️  APPROVED WITH CONDITIONS — Fix [N] major findings
❌ CHANGES REQUIRED — [N] blocking findings must be fixed
```

## Step 5 — Write AUDIT entry

```json
{
  "event": "code_review_completed",
  "scope": "[what was reviewed]",
  "files_reviewed": [N],
  "blocking_findings": [N],
  "major_findings": [N],
  "verdict": "approved | changes_required",
  "report_path": ".planning/.../CODE-REVIEW-[timestamp].md"
}
```

## Step 6 — Report to user

Display a summary of findings.
If blocking findings exist: do not allow merge.
Tell the user: "Fix the [N] blocking issues, then run /mindforge:review again to re-check."
