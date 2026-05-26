---
name: code-quality
version: 1.0.0
min_mindforge_version: 0.1.0
status: stable
triggers: refactor, code review, review, quality, tech debt, complexity, clean up, cleanup, lint, linting, code smell, duplication, naming, readability
---

# Skill — Code Quality

## When this skill activates
Any code review, refactoring task, or implementation where maintaining
quality standards is the primary goal.

## Mandatory actions when this skill is active

### Before writing any code
1. Read CONVENTIONS.md and apply all rules.
2. Identify complexity risks (hot paths, long functions, nested logic).
3. Decide up front where tests will be added or updated.

### During implementation or review
- Enforce function length and complexity limits.
- Remove unused code and dead imports.
- Replace magic numbers with named constants.

### After implementation or review
- Run linters and type checks for the project.
- Record findings or fixes in SUMMARY.md or the review report.

## Quality dimensions to evaluate

### Readability
- Can a new engineer understand this function in under 2 minutes?
- Are names precise and unambiguous? (Not `data`, `info`, `temp`, `flag`)
- Is every non-obvious decision explained with a comment?
- Are there magic numbers? (Replace with named constants)

### Complexity limits
- Functions: ≤ 40 lines. If longer, extract sub-functions.
- Cyclomatic complexity: ≤ 10 per function.
- Nesting depth: ≤ 3 levels. Extract to separate function if deeper.
- Parameters: ≤ 4 per function. If more, use an options object.

### Duplication
- DRY (Don't Repeat Yourself): extract any logic appearing 3+ times.
- Exception: duplication in tests is acceptable for clarity.

### Error handling
- Every async operation must have explicit error handling.
- No empty catch blocks (`catch(e) {}`).
- No swallowed errors (`catch(e) { return null }`).
- Errors must be logged with enough context to diagnose.

### Dependencies
- Before adding any new dependency: check bundle size, CVEs, last commit date,
  weekly downloads, and licence compatibility.
- Prefer native platform APIs over dependencies for simple tasks.

## Metrics to check before marking a task done
Run these and fix any failures:
```bash
# TypeScript projects
npx tsc --noEmit
npx eslint . --ext .ts,.tsx

# Python projects
ruff check .
mypy .

# All projects
[project test command]
```

## Output
If performing a code review: write findings to `.planning/phases/phase-N/CODE-REVIEW-N.md`
with file, line, severity (blocking / suggestion), and recommended fix.

## Self-check before task completion

Before marking a task done when this skill was active:

- [ ] Did I read the full SKILL.md before starting? (Not just the triggers)
- [ ] Did I activate the corresponding persona file?
- [ ] Did I apply every mandatory action in this skill, not just the ones
  I remembered off the top of my head?
- [ ] If this skill produced an output file (review, security report, etc.),
  has that file been written to the correct path?
