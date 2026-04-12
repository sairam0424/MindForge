---
name: testing-standards
triggers: test, spec, unit test, integration test, coverage, jest, vitest, pytest, verify
---

# Testing Standards Skill

## Coverage targets
- Unit tests: 80% line coverage minimum on business logic
- Integration tests: All API endpoints must have at least one happy-path and one error-path test
- E2E: Critical user flows only (login, core action, logout)

## What every test file must have
- Descriptive test names: "should return 401 when token is expired" not "auth test 3"
- Arrange / Act / Assert structure with a blank line between each section
- No test should depend on another test's side effects (fully isolated)
- No hardcoded test data that overlaps with production data

## Test file placement
- Unit tests: co-located with source file (`auth.ts` → `auth.test.ts`)
- Integration tests: `/tests/integration/`
- E2E tests: `/tests/e2e/`

## What to do when this skill activates
1. Before implementing a feature, write the test first (TDD where possible)
2. After implementing, run the full test suite — do not mark task complete if tests fail
3. Check coverage with `[project test coverage command]` — must meet targets above
