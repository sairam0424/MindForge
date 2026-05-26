---
name: mutation-testing
version: 1.0.0
min_mindforge_version: 10.0.8
status: stable
triggers: mutation testing, stryker, mutmut, mutation score, surviving mutant, killed mutant, mutation operator, test strength, weak test detection, mutation coverage, test effectiveness, kill ratio
compose: testing-standards
---

# Mutation Testing

## When this skill activates

This skill activates when evaluating test suite effectiveness, identifying weak tests, configuring mutation testing tools, or analyzing mutation testing results. It applies whenever the question is "are my tests actually catching bugs?" rather than "do my tests pass?"

## Mandatory actions when this skill is active

### Before

1. Verify the project has a passing test suite (mutation testing requires green tests as baseline).
2. Identify the language and select the appropriate tool (Stryker for JS/TS, mutmut for Python, PIT for Java).
3. Determine scope: full codebase or targeted (changed files only for CI, full for periodic audits).
4. Check that test execution time is reasonable (mutation testing multiplies runtime by mutant count).
5. Establish the target kill ratio (minimum 80%, aim for 90%+ on critical paths).

### During

**Core Concept:**
- Mutation testing modifies your source code (introduces bugs) and checks if tests fail.
- If a test fails after mutation: the mutant is **killed** (good — tests caught the bug).
- If all tests pass after mutation: the mutant **survived** (bad — tests missed the bug).
- Surviving mutants reveal exactly where test coverage is superficial.

**Mutation Operators:**
- **Arithmetic**: Replace `+` with `-`, `*` with `/`.
- **Conditional**: Replace `>` with `>=`, `==` with `!=`, flip `&&` to `||`.
- **Boundary**: Change `i < 10` to `i <= 10` (off-by-one detection).
- **Return value**: Replace `return x` with `return 0`, `return null`, `return !x`.
- **Removal**: Delete function calls, remove assignments, skip statements.
- **String**: Replace string literals with empty string or different value.

**Metrics and Interpretation:**
- **Mutation score** = (killed mutants / total mutants) * 100%.
- **Killed**: Test suite detected the mutation (test failed). This is the goal.
- **Survived**: No test caught the mutation. Investigate WHY.
- **Timeout**: Mutation caused infinite loop. Counted as killed (behavior changed).
- **No coverage**: No test executes the mutated line. Add tests for this code.
- **Equivalent mutant**: Mutation produces identical behavior (e.g., `x * 1`). Ignore these.

**Investigating Surviving Mutants:**
1. Look at the mutated line and the operator applied.
2. Ask: "What assertion would fail if this mutation were a real bug?"
3. If no assertion exists: write a test that specifically validates that behavior.
4. If assertion exists but passes: the assertion is too weak (not checking the right value).
5. Common causes: missing boundary tests, testing only happy path, asserting on wrong property.

**Tool Configuration:**

*Stryker (JavaScript/TypeScript):*
- Configure `mutate` array to target source files (exclude test files, configs).
- Use `--incremental` for CI (only mutate changed files).
- Set thresholds: `{ high: 90, low: 80, break: 75 }`.

*mutmut (Python):*
- Run `mutmut run` for full analysis, `mutmut results` for summary.
- Use `--paths-to-mutate` to scope to specific modules.
- Inspect survivors with `mutmut show <id>`.

*PIT (Java):*
- Configure via Maven/Gradle plugin with target classes and test classes.
- Use `STRONGER` mutator group for comprehensive coverage.
- Set `mutationThreshold` in build to fail below target.

**Performance Optimization:**
- In CI: only mutate files changed in the PR (incremental mode).
- Use parallel execution (Stryker supports `--concurrency`).
- Exclude generated code, DTOs, and trivial getters/setters.
- Run full mutation analysis on a schedule (nightly/weekly), not every commit.

### After

1. Kill ratio meets the configured threshold (80%+ minimum).
2. All surviving mutants in critical code paths have been investigated.
3. New tests written to kill meaningful surviving mutants.
4. Equivalent mutants documented and excluded from score calculation.
5. CI is configured to run incremental mutation testing on PRs.

## Self-check before task completion

- [ ] Mutation testing tool is configured correctly for the project language.
- [ ] Scope is appropriate (not wasting time on generated/trivial code).
- [ ] Kill ratio meets the minimum threshold for the module's criticality.
- [ ] Surviving mutants have been triaged: fix (write test) or dismiss (equivalent mutant).
- [ ] New tests added actually kill the previously surviving mutants (verified by re-run).
- [ ] CI integration uses incremental mode to keep pipeline fast.
- [ ] Results are documented for team visibility (report or dashboard).
- [ ] Performance impact is acceptable (total mutation test time within budget).
