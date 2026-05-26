---
name: verification-loop
version: 1.0.0
min_mindforge_version: 10.0.3
status: stable
triggers: verification, quality gate, build check, type check, full verification, security scan, diff review, pre-merge, CI gate, green build, ship check, verify all
compose:
  - security-review
---

# Skill — Verification Loop (6-Phase Quality Gate)

## When this skill activates
Before shipping, merging, or marking any implementation task as complete.
Provides a systematic 6-phase verification pipeline that catches issues
at the cheapest point to fix them.

## Mandatory actions when this skill is active

### The 6 Phases (sequential, fail-fast)

**Phase 1 — Build**
```bash
npm run build  # or equivalent for project
```
- Must produce zero errors
- Warnings are acceptable but logged
- If build fails: fix before proceeding (no skipping)

**Phase 2 — Type Check**
```bash
npx tsc --noEmit  # or equivalent
```
- All type errors must be resolved
- No `@ts-ignore` without documented reason
- Generic `any` types flagged as warnings

**Phase 3 — Lint**
```bash
npm run lint
```
- All lint errors must be resolved
- Auto-fixable issues: fix immediately (`--fix`)
- Non-auto-fixable: resolve manually before proceeding

**Phase 4 — Test**
```bash
npm test
```
- All tests must pass (zero failures)
- No skipped tests without documented reason
- If new code was added: verify test coverage exists
- Coverage threshold: per project config (default 80%)

**Phase 5 — Security Scan**
- Check for hardcoded secrets (grep for API keys, passwords, tokens)
- Check for new dependencies with known vulnerabilities
- Verify no dangerous code execution patterns (dynamic code evaluation, innerHTML, SQL concatenation) introduced
- Run security-review skill checklist on the diff

**Phase 6 — Diff Review**
```bash
git diff --staged  # or git diff main...HEAD
```
- Review every changed line for:
  - Accidental debug code (console.log, debugger, TODO)
  - Unintended file changes (lock files, configs)
  - Sensitive data exposure
  - Logic errors visible in the diff

**Phase 6.5 — De-Slop Scan (Informational)**
- Run de-sloppify skill in dry-run scan mode on the current diff
- Report findings count per category:
  - Debug code (console.log, debugger, print statements)
  - Test slop (skipped tests, test-only exports)
  - Commented code blocks (3+ consecutive commented lines)
  - Naming inconsistencies (mixed camelCase/snake_case)
  - TODO hacks (shipped workarounds disguised as TODOs)
- This phase is **INFORMATIONAL ONLY** — it does NOT block shipping
- If findings > 0: append summary to verification output as advisory
- Rationale: awareness of residual slop before shipping, without blocking velocity

### Execution Rules
- Phases execute in ORDER (1→2→3→4→5→6)
- Each phase must PASS before the next begins (fail-fast)
- On failure: report which phase failed, what the error is, suggest fix
- After fixing: restart from the FAILED phase (not from Phase 1)
- All 6 phases passing = "green" verification = safe to ship

### Integration
- `/mindforge:verify-loop` invokes this full pipeline
- `/mindforge:ship` MUST run verify-loop before proceeding
- Autonomous mode runs verify-loop after every task (Phase 4+5+6 minimum)

### After verification passes
- Log verification result in AUDIT with per-phase timing
- Report: "All 6 verification gates passed (+ Phase 6.5 advisory). Safe to proceed."
