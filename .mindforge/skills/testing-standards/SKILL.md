---
name: testing-standards
version: 1.0.0
min_mindforge_version: 0.1.0
status: stable
triggers: test, tests, spec, unit test, integration test, e2e, coverage, jest, vitest, pytest, mocha, assertion, mock, stub, spy, fixture, TDD
---

# Skill — Testing Standards

## When this skill activates
Any task involving writing, running, or improving tests.

## Mandatory actions when this skill is active

### Before writing tests
1. Identify the exact behavior to verify.
2. Define the failure condition you expect to prevent.

### During testing
- Use the AAA pattern with clear separation.
- Keep tests isolated and deterministic.
- Cover both happy and error paths.

### After testing
- Run the full test suite.
- Record any new tests in SUMMARY.md with paths.

## Coverage targets
| Test type        | Target  | Measured on               |
|------------------|---------|---------------------------|
| Unit             | 80%     | Business logic files only |
| Integration      | 100%    | All API endpoints         |
| E2E              | 100%    | Critical user flows       |

## Test structure — AAA pattern (non-negotiable)
```typescript
it('should return 401 when token is expired', async () => {
  // Arrange
  const expiredToken = generateExpiredToken()
  const request = buildRequest({ authorization: `Bearer ${expiredToken}` })

  // Act
  const response = await handler(request)

  // Assert
  expect(response.status).toBe(401)
  expect(response.body.error.code).toBe('TOKEN_EXPIRED')
})
```
Blank line between Arrange, Act, and Assert sections. Always.

## Test naming convention
Pattern: `should [expected behaviour] when [condition]`
- ✅ `should return 404 when user does not exist`
- ✅ `should hash password before storing in database`
- ❌ `user test 4`
- ❌ `test password`

## Test isolation requirements
- Every test must be able to run independently in any order
- No shared mutable state between tests
- Database state reset between integration tests (use transactions or test containers)
- External services mocked (HTTP, email, SMS, payment providers)
- No sleeps or arbitrary timeouts — use proper async patterns

## What to test (and what not to)
**Test:**
- Business logic and domain rules
- Edge cases: null, empty, boundary values
- Error paths: what happens when dependencies fail
- Security: auth bypass attempts, injection attempts

**Do not test:**
- Framework internals (trust the framework)
- Simple getters/setters with no logic
- Third-party library behaviour

## File placement
- Unit tests: co-located with source (`auth.ts` → `auth.test.ts`)
- Integration tests: `/tests/integration/`
- E2E tests: `/tests/e2e/`
- Test utilities/fixtures: `/tests/utils/`

## Before marking any task done
Run the full test suite. If any test fails: do not commit. Fix it first.

## Self-check before task completion

Before marking a task done when this skill was active:

- [ ] Did I read the full SKILL.md before starting? (Not just the triggers)
- [ ] Did I activate the corresponding persona file?
- [ ] Did I apply every mandatory action in this skill, not just the ones
  I remembered off the top of my head?
- [ ] If this skill produced an output file (review, security report, etc.),
  has that file been written to the correct path?
