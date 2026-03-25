# Refactoring with Confidence

Step 3 of the TDD loop is **Refactor**. This is where we move from "working code" to "clean code".

## The Refactoring Workflow
1. **Ensure tests are Green**: Never refactor while tests are failing.
2. **Make small changes**: One variable rename, one function extraction, or one pattern application.
3. **Run tests after EVERY change**: If they turn red, undo immediately.
4. **Repeat** until the code is clean.

## Refactoring-Safe Tests
Tests that facilitate refactoring have the following traits:
- **Implementation Agnostic**: They don't care *how* the result is calculated.
- **Explicit**: They clearly state the business rule being protected.
- **Fast**: They run in milliseconds, allowing for frequent execution.

## Signs You Need to Refactor
- Duplicated code logic.
- Long methods (> 20 lines).
- Large classes with multiple responsibilities.
- Hard-coded values that should be configuration.
