---
description: "Generate code review checklist for current PR. Usage: /mindforge:review-guide [--depth quick|standard|deep] [--focus security|perf|correctness]"
---

<objective>
Generate a tailored code review checklist for the current PR based on scope analysis, review depth, and focus areas — defining LGTM criteria and distinguishing blocking from advisory comments.
</objective>

<execution_context>
@.mindforge/skills/code-review-methodology/SKILL.md
</execution_context>

<context>
Arguments: $ARGUMENTS (optional --depth quick|standard|deep, optional --focus security|perf|correctness)
Knowledge: Current PR diff, files changed, domain context, team review standards, past review findings.
</context>

<process>
1. **Analyze PR scope**: Understand what changed:
   - Files changed count and total lines added/removed
   - Domains touched (auth, payments, UI, data, infra)
   - Type of change (feature, bugfix, refactor, config, dependency update)
   - Risk assessment: does this touch critical paths? (auth, payments, data deletion)
   - Blast radius: how many users/services affected if this breaks?
   - Previous bugs in these files (git blame for recent fixes)

2. **Select review depth**: Based on --depth flag or scope analysis:
   - **Quick** (< 50 lines, config/docs): Verify correctness, check for typos, 5-minute review
   - **Standard** (50-500 lines, feature/fix): Full checklist, test coverage, 30-minute review
   - **Deep** (> 500 lines, architecture/security): Line-by-line analysis, threat model, 1-hour+ review
   - Auto-escalate: any change to auth/payments/PII always gets deep review regardless of size

3. **Generate checklist**: Build review items by category:
   - **Correctness**: Does the code do what the PR description claims? Edge cases handled? Off-by-one errors? Null/undefined handling? Race conditions?
   - **Security**: Input validation present? SQL injection possible? XSS vectors? Auth checks on new endpoints? Secrets exposed? CSRF protection?
   - **Performance**: N+1 queries introduced? Unbounded loops? Missing indexes for new queries? Large payload without pagination? Memory leaks in event listeners?
   - **Readability**: Clear naming? Comments where behavior is non-obvious? Functions under 50 lines? Nesting under 4 levels? Dead code removed?
   - **Testing**: New code has tests? Edge cases tested? Mocks appropriate (not testing mocks)? Flaky test risk? Coverage meets threshold?
   - **Architecture**: Follows established patterns? DRY (no copy-paste)? Single responsibility? Dependency direction correct? Breaking API changes versioned?

4. **Define LGTM criteria**: What must be true to approve:
   - Zero blocking findings (see below for blocking definition)
   - All checklist items for selected depth addressed
   - Tests pass in CI
   - No security findings of Medium+ severity
   - PR description accurately reflects the change
   - Breaking changes documented and migration path provided

5. **Note blocking vs suggestion comments**: Classify findings:
   - **Blocking** (must fix): Security vulnerabilities, correctness bugs, data loss risk, missing auth check, breaking API without versioning, test failures
   - **Suggestion** (should fix): Performance improvements, naming improvements, code organization, additional test cases, documentation gaps
   - **Nit** (optional): Style preferences, minor rewording, alternative approaches that are equally valid
   - Label each finding clearly: [BLOCKING], [SUGGESTION], or [NIT]

6. **Output review guide**: Deliver the complete review artifact:
   - PR summary (one paragraph: what, why, risk level)
   - Categorized checklist tailored to this specific PR
   - Focus areas highlighted based on --focus flag
   - LGTM criteria specific to this PR
   - Estimated review time
   - Recommended reviewers (based on domain expertise in changed files)
   - Template for review comments with severity labels
</process>
