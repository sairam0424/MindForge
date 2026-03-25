# Writing Effective TDD Tests

Your tests are the specification for your system. Treat them as first-class citizens.

## The Test Anatomy: AAA

- **Arrange**: Set up the environment, dependencies, and inputs.
- **Act**: Call the method/function being tested.
- **Assert**: Verify the result or state change.

## High-Quality TDD Tests

### 1. Single Responsibility
Each test should verify exactly **one** requirement. If a test has "and" in its name, it's likely two tests.

### 2. Descriptive Naming
Use the `should ... when ...` pattern.
- ✅ `should_calculate_discount_when_user_is_premium`
- ❌ `test_discount_logic_1`

### 3. Avoid Logic in Tests
If your test has `if` statements or `for` loops, it's too complex. Tests should be straightforward declarations of expected behavior.

### 4. Zero Watermarks
Ensure your tests clean up after themselves (e.g., deleting temporary files or resetting mocks) to avoid "leaky state" affecting other tests.

## Running Tests
Always keep your test runner in "watch mode" during TDD. The feedback loop must be near-instant.
