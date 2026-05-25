---
name: testing-anti-patterns
version: 1.0.0
min_mindforge_version: 10.0.4
status: stable
triggers: testing anti-pattern, mock behavior, test-only method, test smell, over-mocking, incomplete mock, integration afterthought, test fragility, testing iron law, test coupling, bad test practice
compose:
  - testing-standards
---

# Skill — Testing Anti-Patterns (Detection & Remediation)

## When this skill activates
When writing, reviewing, or debugging tests. This skill acts as a negative-space
guide — it defines what NOT to do, complementing the testing-standards skill which
defines what TO do. Activate whenever test suites feel brittle, when mocks dominate
test code, or when tests pass but production breaks.

## Mandatory actions when this skill is active

### Before writing or reviewing tests

1. **Internalize the Three Iron Laws:**
   - **Iron Law 1**: Test behavior, not implementation. If you refactor internals and tests break without behavior changing, the tests are wrong.
   - **Iron Law 2**: Mocks verify contracts, not internals. A mock should assert "I called the dependency with these inputs and expected this shape of output" — never "I called internal method X before internal method Y."
   - **Iron Law 3**: Integration tests validate the seams. Unit tests prove components work in isolation. Integration tests prove they work together. Both are required — neither substitutes for the other.

2. **Load the Red Flags Checklist** (scan code for these signals):
   - [ ] Test file is longer than the source file it tests
   - [ ] More than 5 mocks in a single test setup
   - [ ] Test names describe implementation steps, not behaviors
   - [ ] Changing a private method breaks tests
   - [ ] Tests pass with an obviously wrong implementation (tests test nothing)
   - [ ] Mock setup is copy-pasted across 10+ tests identically
   - [ ] No integration tests exist for code with 2+ external dependencies
   - [ ] Tests assert on internal state rather than observable output
   - [ ] Test requires `sleep()` or arbitrary timeouts to pass
   - [ ] Removing a test causes no coverage decrease (dead test)

### During test writing/review

**The Five Named Anti-Patterns:**

---

**Anti-Pattern 1: Mock Behavior Testing**

*What it looks like:*
```typescript
// BAD: Testing that the mock returns what you told it to return
mockDb.query.mockResolvedValue([{ id: 1, name: 'Alice' }]);
const result = await getUser(1);
expect(result).toEqual({ id: 1, name: 'Alice' }); // You're testing the mock!
```

*Detection gate:*
```
IF test assertion matches mock return value exactly
AND no transformation logic exists between mock and assertion
THEN this is Mock Behavior Testing
```

*Why it's harmful:* You're verifying your test setup, not your code. The test will pass even if `getUser` is `return mockDb.query()` with zero logic.

*Fix:*
```typescript
// GOOD: Test the transformation/logic your code adds
mockDb.query.mockResolvedValue([{ id: 1, name: 'alice', role_id: 3 }]);
const result = await getUser(1);
// Assert on the TRANSFORMATION your code performs
expect(result.displayName).toBe('Alice'); // capitalization logic
expect(result.permissions).toContain('read'); // role mapping logic
```

*Decision tree:*
1. Does my code transform the mock's return value? → If NO, this test adds zero value
2. Am I testing the transformation or the passthrough? → Must be transformation
3. Would this test catch a real bug? → If you can't name the bug, delete the test

---

**Anti-Pattern 2: Test-Only Methods**

*What it looks like:*
```typescript
class PaymentService {
  // This method exists ONLY so tests can inspect internal state
  _getInternalQueue() { return this.queue; }
  
  // This method exists ONLY so tests can bypass validation
  _processWithoutValidation(payment) { ... }
}
```

*Detection gate:*
```
IF method is prefixed with _ or marked @visibleForTesting
AND method is called ONLY in test files (zero production callers)
AND method exposes internal state or bypasses guards
THEN this is a Test-Only Method
```

*Why it's harmful:* It couples tests to internals, creates maintenance burden, and the bypassed logic is now untested in the path that matters.

*Fix:*
- Test through the public API only
- If you can't test behavior through the public API, your design needs refactoring (extract a collaborator, use dependency injection)
- If state inspection is needed: add an observable side-effect (event emitted, log written, metric incremented)

*Decision tree:*
1. Is this method called anywhere in production code? → If NO, delete it
2. Can I verify the same behavior through a public method? → If YES, use that instead
3. Do I need to see internal state? → Refactor: make the state observable through legitimate outputs

---

**Anti-Pattern 3: Mocking Without Understanding**

*What it looks like:*
```typescript
// BAD: Blindly mocking everything without understanding contracts
jest.mock('./emailService');
jest.mock('./database');
jest.mock('./cache');
jest.mock('./logger');
jest.mock('./metrics');
// Test only proves: "my code calls things" — not that it calls them CORRECTLY
```

*Detection gate:*
```
IF mock count > 3 in a single test
AND mock return values are generic/default (undefined, {}, [])
AND no assertions verify mock call arguments
THEN this is Mocking Without Understanding
```

*Why it's harmful:* The mocks don't reflect real behavior. When the real dependency changes its contract, these tests keep passing while production breaks.

*Fix:*
```typescript
// GOOD: Mock with contract awareness
const mockEmail = {
  send: jest.fn().mockImplementation((to, subject, body) => {
    // Validate contract: email service requires these fields
    if (!to.includes('@')) throw new Error('Invalid email');
    if (!subject) throw new Error('Subject required');
    return Promise.resolve({ messageId: 'msg-123', status: 'queued' });
  })
};
// Assert on the CONTRACT, not just "was called"
expect(mockEmail.send).toHaveBeenCalledWith(
  expect.stringContaining('@'),
  expect.stringMatching(/Order #\d+/),
  expect.objectContaining({ html: expect.any(String) })
);
```

*Decision tree:*
1. Do I know what the real dependency's contract is? → If NO, read its docs/types first
2. Does my mock enforce the same constraints as the real dep? → If NO, fix the mock
3. Am I asserting on call arguments? → If NO, add contract assertions

---

**Anti-Pattern 4: Incomplete Mocks (Happy Path Only)**

*What it looks like:*
```typescript
// BAD: Only mocking the success case
mockPaymentGateway.charge.mockResolvedValue({ success: true });
// Never testing: what if it throws? Returns { success: false }? Times out? Returns malformed data?
```

*Detection gate:*
```
IF mock only has .mockResolvedValue / .mockReturnValue (never .mockRejectedValue)
AND the real dependency can fail (network, validation, timeout)
AND no test exercises the failure path
THEN this is Incomplete Mocking
```

*Why it's harmful:* Production failures in dependency error paths are the #1 source of incidents. If you only test happy path, you're only testing the path that rarely breaks.

*Fix:*
```typescript
// GOOD: Test all response categories
describe('PaymentService.charge', () => {
  it('should process successful payment', async () => {
    mockGateway.charge.mockResolvedValue({ success: true, txId: '123' });
    // ...assert success handling
  });

  it('should handle declined card gracefully', async () => {
    mockGateway.charge.mockResolvedValue({ success: false, code: 'DECLINED' });
    // ...assert decline handling (user message, no retry)
  });

  it('should retry on transient network error', async () => {
    mockGateway.charge
      .mockRejectedValueOnce(new Error('ETIMEDOUT'))
      .mockResolvedValue({ success: true, txId: '456' });
    // ...assert retry logic
  });

  it('should circuit-break after 3 consecutive failures', async () => {
    mockGateway.charge.mockRejectedValue(new Error('SERVICE_UNAVAILABLE'));
    // ...assert circuit breaker trips
  });
});
```

*Decision tree:*
1. Can this dependency fail? → YES (all external deps can fail)
2. How many failure modes does it have? → List them: timeout, rejection, malformed, partial
3. Do I have a test for each failure mode? → If NO, add them

---

**Anti-Pattern 5: Integration-as-Afterthought**

*What it looks like:*
- 200 unit tests, 0 integration tests
- All dependencies mocked in every test
- Tests pass, but the system fails when components connect
- "Works on my machine" because mocks hide contract mismatches

*Detection gate:*
```
IF test suite has > 50 unit tests
AND zero integration tests exist
AND code has 2+ external dependencies (DB, API, queue, cache)
THEN this is Integration-as-Afterthought
```

*Why it's harmful:* Unit tests prove each brick is solid. Integration tests prove the mortar holds. Without integration tests, you have a pile of solid bricks, not a wall.

*Fix:*
- For every external dependency boundary, write at least one integration test that uses the real (or containerized) dependency
- Integration tests should cover: connection setup, happy path through the seam, error propagation across the seam
- Use test containers (Docker) for databases, queues, caches
- Use contract tests (Pact) for HTTP API dependencies
- Minimum ratio: 1 integration test per 10 unit tests for code with external deps

*Decision tree:*
1. Does this module talk to something external? → If YES, integration tests required
2. Do I have at least one test that uses the real dependency? → If NO, add one
3. Have I tested error propagation across the boundary? → If NO, add failure path integration tests

---

### After test review

**Gate Function Summary — Run these checks on every test file:**

```
GATE 1 (Iron Law 1): For each test, ask:
  "If I refactored internals without changing behavior, would this test break?"
  → If YES: test is coupled to implementation. Rewrite to test behavior.

GATE 2 (Iron Law 2): For each mock assertion, ask:
  "Does this verify the CONTRACT with the dependency or INTERNAL sequencing?"
  → If INTERNAL: rewrite to verify inputs/outputs at the boundary.

GATE 3 (Iron Law 3): For the module as a whole, ask:
  "If all mocks were replaced with real deps, would the system work?"
  → If UNSURE: you need integration tests to find out.
```

**Remediation priority:**
1. Fix Anti-Pattern 4 first (incomplete mocks) — highest incident correlation
2. Fix Anti-Pattern 5 next (missing integration tests) — catches contract drift
3. Fix Anti-Pattern 1 (mock behavior testing) — eliminate false confidence
4. Fix Anti-Pattern 3 (mocking without understanding) — improve mock fidelity
5. Fix Anti-Pattern 2 (test-only methods) — clean up API surface

## Self-check before task completion

Before marking a task done when this skill was active:

- [ ] Did I verify tests test behavior, not implementation? (Iron Law 1)
- [ ] Did I check that mock contracts match real dependency contracts? (Iron Law 2)
- [ ] Did I verify integration test coverage exists for external boundaries? (Iron Law 3)
- [ ] Did I scan the Red Flags Checklist (10 items)?
- [ ] Did I run the 3 Gate Functions on modified test files?
- [ ] For each mock: does it enforce constraints the real dep enforces?
- [ ] For each mock: are failure paths tested, not just happy paths?
- [ ] Are there zero test-only methods in production code?
