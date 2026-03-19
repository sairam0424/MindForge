# MindForge Engine — Verification Pipeline

## Purpose
Automatically verify that a completed phase has actually delivered what it
promised in REQUIREMENTS.md. This is the agent's self-audit before human UAT.

## Four verification stages

### Stage 1 — Automated test suite
```bash
# Run the project's test suite (adapt command to project)
npm test
# or
pytest
# or
cargo test
```

Pass criteria: ALL tests pass, zero failures.
If any fail: stop. Do not proceed to Stage 2.
Record in VERIFICATION.md: "Stage 1: FAILED — [X] tests failing"

### Stage 2 — Requirement traceability
For each functional requirement tagged v1 for this phase in REQUIREMENTS.md:

1. Read the requirement and its acceptance criterion
2. Search the codebase for the implementation:
   ```bash
   grep -r "[key term from requirement]" src/ --include="*.ts"
   ```
3. Find a test that covers this requirement:
   ```bash
   grep -r "[acceptance criterion term]" tests/ --include="*.test.ts"
   ```
4. Classify:
   - ✅ Implemented and tested
   - ⚠️  Implemented but no test
   - ❌ Not found

Any ❌ result: create a fix plan before proceeding to Stage 3.
Any ⚠️  result: create a test task for the next phase backlog.

### Stage 3 — Type safety and linting (TypeScript/Python projects)
```bash
# TypeScript
npx tsc --noEmit
npx eslint . --ext .ts,.tsx --max-warnings 0

# Python
mypy .
ruff check .
```

Pass criteria: Zero errors, zero warnings.
If any errors: create targeted fix tasks. Do not proceed to Stage 4 with errors.

### Stage 4 — Security regression check
Activate `security-reviewer.md` persona.
Run the OWASP checklist from `security-review/SKILL.md` against all files
modified in this phase.

Specifically look for:
- Any new endpoints without authentication (if the project uses auth)
- Any new database queries without parameterisation
- Any new file handling without MIME type validation
- Any new environment variables without validation at startup

Write findings to `.planning/phases/[N]/SECURITY-REVIEW-[N].md`.

## VERIFICATION.md template

Write to `.planning/phases/[N]/VERIFICATION.md`:

```markdown
# Phase [N] Verification Report

## Date
[ISO-8601]

## Stage 1 — Test suite
- Command: `[test command]`
- Result: [X] tests passing, [Y] failing
- Status: ✅ PASS / ❌ FAIL

## Stage 2 — Requirement traceability

| FR ID | Requirement                   | Status | Evidence                        |
|-------|-------------------------------|--------|---------------------------------|
| FR-01 | [requirement text]            | ✅     | `src/auth/login.ts:47` + test   |
| FR-02 | [requirement text]            | ✅     | `src/auth/register.ts:23` + test|
| FR-03 | [requirement text]            | ⚠️     | `src/auth/reset.ts:15`, no test |

## Stage 3 — Static analysis
- TypeScript errors: [0 / N]
- ESLint warnings: [0 / N]
- Status: ✅ PASS / ❌ FAIL

## Stage 4 — Security regression
- New endpoints reviewed: [X]
- New database queries reviewed: [X]
- Findings: [None / see SECURITY-REVIEW-[N].md]
- Status: ✅ PASS / ❌ FAIL

## Overall status
✅ All stages passed — ready for human UAT
❌ [N] stages failed — fix plans created

## Fix plans created (if any)
- `PLAN-[N]-FIX-01.md`: [what it fixes]
```
