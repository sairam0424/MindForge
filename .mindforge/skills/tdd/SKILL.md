---
name: tdd
version: 1.0.0
min_mindforge_version: 0.1.0
status: stable
triggers: tdd, test-driven, red-green-refactor, fail first, test-first, design-by-test
---

# Skill — Test-Driven Development (TDD)

## When this skill activates
Any task involving the creation of new features, refactoring existing logic, or fixing bugs using a test-first approach.

## Philosophy
TDD is not about testing; it's about **design**. We write tests to define the interface and behavior of our code before the implementation exists.

## The TDD Loop (Red-Green-Refactor)

### 🔴 1. RED: Write a failing test
- Define the smallest possible increment of behavior.
- Run the test and confirm it fails for the **right reason**.
- See: [tests.md](file:///Users/sairamugge/Desktop/MindForge/.mindforge/skills/tdd/tests.md)

### 🟢 2. GREEN: Make it pass
- Write the **minimum** amount of code to make the test pass.
- Do not optimize or add extra features.
- Goal: Get back to a stable state as quickly as possible.

### 🔵 3. REFACTOR: Clean up
- Remove duplication.
- Improve naming and structure.
- Ensure the code follows [interface-design.md](file:///Users/sairamugge/Desktop/MindForge/.mindforge/skills/tdd/interface-design.md).
- The tests must remain green throughout.

## Core Modules

- **[Deep Modules](file:///Users/sairamugge/Desktop/MindForge/.mindforge/skills/tdd/deep-modules.md)**: Strategies for testing complex internal logic without over-mocking.
- **[Interface Design](file:///Users/sairamugge/Desktop/MindForge/.mindforge/skills/tdd/interface-design.md)**: How TDD informs better API and component boundaries.
- **[Mocking](file:///Users/sairamugge/Desktop/MindForge/.mindforge/skills/tdd/mocking.md)**: When to mock, when to use fakes, and how to avoid "brittle test" syndrome.
- **[Refactoring](file:///Users/sairamugge/Desktop/MindForge/.mindforge/skills/tdd/refactoring.md)**: Patterns for safe code evolution.

## Mandatory Rules
1. **No production code without a failing test.**
2. **One assertion per test** (ideally) to keep failures specific.
3. **Tests are documentation.** They should explain *what* the system does, not *how* it does it.
