---
name: de-sloppify
version: 1.0.0
min_mindforge_version: 10.0.4
status: stable
triggers: de-slop, cleanup pass, remove debug code, remove test slop, commented code, inconsistent naming, TODO hack, post-implementation cleanup, code hygiene, slop removal, dead code removal, polish pass
---

# Skill — De-Sloppify

## When this skill activates

After implementation is complete and working. This skill runs as a dedicated
cleanup pass, separate from the implementation phase. Never during initial
development — the implementer's job is to BUILD. De-sloppify runs AFTER to
clean up the inevitable residue of rapid development.

**Core principle**: No negative instructions to the implementer. Do not tell
them "don't leave console.logs" or "don't forget to clean up." Let them build
freely. This skill handles the cleanup as a distinct, focused phase.

## Mandatory actions when this skill is active

### Scan for all 5 slop categories

#### Category 1 — Debug Code

Detect and remove:

- `console.log`, `console.debug`, `console.warn` (unless behind a debug flag)
- `debugger` statements
- `print()` statements not wrapped in a logging framework
- `dump()`, `dd()`, `var_dump()` calls
- Temporary `alert()` calls

**Exception**: Logging that uses a structured logger (winston, pino, logging module)
with appropriate log levels is NOT slop.

#### Category 2 — Test Slop

Detect and fix:

- Skipped tests (`it.skip`, `xit`, `@pytest.mark.skip` without documented reason)
- Commented-out test cases
- Test-only backdoors in production code (e.g., `if (process.env.TEST) skip_auth()`)
- Hardcoded test data left in source files (not in fixtures/factories)
- `fit`, `fdescribe` (focused tests that exclude other tests)

#### Category 3 — Commented Code Blocks

Detect and remove:

- Any block of 3+ consecutive commented lines that contain valid code
- "Just in case" commented alternatives
- Commented-out function bodies or class methods
- Old implementations left as "reference"

**Exception**: Comments that explain WHY (not what) are not slop, even if long.
License headers are not slop.

#### Category 4 — Inconsistent Naming

Detect and fix:

- camelCase/snake_case mixing within the same file
- Inconsistent abbreviations (e.g., `btn` in one place, `button` in another)
- Single-letter variables outside of tight loops or lambdas
- Hungarian notation mixed with modern naming in the same module

**Rule**: Match the dominant convention of the file. If the file is 80% camelCase,
convert the remaining 20%.

#### Category 5 — TODO Hacks

Detect and evaluate:

- TODOs that are actually shipped workarounds (not future work)
- `// HACK:` comments with no linked ticket
- `// FIXME:` that has been present for > 30 days (check git blame)
- Temporary code with no expiration or tracking

**Action**: Either fix the hack, or convert to a tracked issue with a link.
Untracked TODOs in shipped code are technical debt that compounds silently.

### Commit discipline

- Each category fix is a SEPARATE atomic commit
- Commit message format: `chore(cleanup): remove [category] slop from [scope]`
- Never combine cleanup across categories in a single commit
- This enables easy revert if any cleanup accidentally changes behavior

### Verification

After ALL cleanup is complete:

- Run the full test suite
- Verify no behavior change (tests pass identically)
- If any test fails after cleanup, the cleanup introduced a regression — revert that commit
- Compare test output before/after: same pass count, same coverage

### Output

Write `CLEANUP-REPORT.md` to `.planning/` containing:

- Summary: total issues found and fixed per category
- Before/after counts for each category
- Files touched per category
- Any items intentionally left (with justification)
- Test results: pass/fail count before and after cleanup

## Self-check before task completion

Before marking a task done when this skill was active:

- [ ] Did I scan for ALL 5 categories (debug, test slop, commented code, naming, TODOs)?
- [ ] Did I commit each category fix as a separate atomic commit?
- [ ] Did I verify tests still pass after every cleanup commit?
- [ ] Did I confirm no behavior change was introduced?
- [ ] Did I write CLEANUP-REPORT.md with before/after counts?
- [ ] Did I leave justified exceptions documented (not silently skipped)?
