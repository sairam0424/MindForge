---
description: Run the full 6-phase verification gate (Build, Type Check, Lint, Test, Security Scan, Diff Review). Usage - /mindforge:verify-loop [--phase N] [--fix] [--skip-build]
---

<objective>
Execute the complete verification pipeline to confirm code is ready to ship.
Runs 6 sequential quality gates, failing fast on any issue.
</objective>

<execution_context>
@.mindforge/skills/verification-loop/SKILL.md
@.mindforge/engine/verification-pipeline.md
</execution_context>

<context>
$ARGUMENTS
</context>

<process>
1. Parse flags: --phase (start from specific phase), --fix (auto-fix where possible), --skip-build.
2. **Phase 1 — Build** (skip if --skip-build):
   - Run `npm run build` (or project equivalent)
   - PASS: zero errors. FAIL: report errors, halt.
3. **Phase 2 — Type Check:**
   - Run `npx tsc --noEmit` (or project equivalent)
   - PASS: zero type errors. FAIL: report errors, halt.
4. **Phase 3 — Lint:**
   - Run `npm run lint`
   - If --fix: run with `--fix` flag first, then re-check
   - PASS: zero errors. FAIL: report errors, halt.
5. **Phase 4 — Test:**
   - Run `npm test`
   - PASS: zero failures, no skipped tests without reason. FAIL: report failures, halt.
6. **Phase 5 — Security Scan:**
   - Grep for hardcoded secrets, dangerous patterns, new vulnerable deps
   - Apply security-review skill checklist to the diff
   - PASS: no findings. FAIL: report findings with severity, halt.
7. **Phase 6 — Diff Review:**
   - Run `git diff --staged` or `git diff main...HEAD`
   - Check for: debug code, unintended changes, sensitive data, logic errors
   - PASS: clean diff. FAIL: flag specific lines, halt.
8. On any failure: report which phase failed, what the error is, suggest fix.
9. On all pass: report "All 6 verification gates passed. Safe to proceed."
10. Log verification result in AUDIT with per-phase timing.
</process>
