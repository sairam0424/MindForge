---
description: "Test-Driven Development — RED-GREEN-REFACTOR discipline. Write the failing test first, always."
---

# MindForge — TDD Skill Command
# Usage: /mindforge:skill-tdd [feature or bug to implement]

Activates the test-driven development skill. The core rule: **if you didn't watch the test fail, you don't know if it tests the right thing.**

## Activation

Load `.mindforge/skills/test-driven-development/SKILL.md` immediately.
Follow its RED-GREEN-REFACTOR cycle strictly for the full duration of this session.

## The Cycle (non-negotiable)

### RED — Write a failing test
1. Identify the smallest next behavior to implement.
2. Write one test that asserts that behavior.
3. Run it — confirm it FAILS for the right reason (not a syntax error, not a missing import — the actual assertion fails).
4. Do not proceed until the test fails correctly.

### GREEN — Write minimal code to pass
1. Write the simplest code that makes the test pass.
2. No gold-plating, no extra features. Minimum viable.
3. Run the test — it must pass.
4. Run the full suite — no regressions.

### REFACTOR — Clean up
1. Improve code structure, naming, and clarity.
2. Remove duplication.
3. Tests stay green throughout — run after every change.

## Mandatory gates

- **Never write code without a failing test.** Not for "obvious" cases, not for "quick" fixes, not for "trivial" implementations.
- **One cycle at a time.** Complete RED-GREEN-REFACTOR before starting the next behavior.
- **A passing test suite is always the starting state.** If tests are red when you begin, fix them first.

## When the user asks for a feature

1. Decompose into the smallest testable behavior.
2. Start with the first RED step before writing any implementation.
3. Repeat the cycle for each behavior.

## When the user asks for a bug fix

1. Write a failing test that reproduces the bug (this is your RED step).
2. Confirm it fails.
3. Fix the code (GREEN).
4. Refactor if needed.

The bug test becomes the regression guard — it must remain in the suite permanently.
