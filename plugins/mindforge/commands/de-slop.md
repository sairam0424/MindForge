---
description: "Run post-implementation cleanup pass. Removes debug code, test slop, commented blocks, inconsistent naming, and TODO hacks. Usage - /mindforge:de-slop [path] [--dry-run] [--category debug|test|comments|naming|todos|all]"
---

<objective>
Dedicated cleanup pass that runs AFTER implementation is complete. Finds and
fixes cosmetic issues without changing behavior. Each fix is an atomic commit.
</objective>

<execution_context>
@.mindforge/skills/de-sloppify/SKILL.md
</execution_context>

<context>
$ARGUMENTS
</context>

<process>
1. Parse target path (default: current diff) and category filter (default: all).
2. Run tests BEFORE cleanup to establish baseline (must pass).
3. Scan for slop by category:
   - debug: console.log, debugger, print(), var_dump() not behind debug flags
   - test: skipped tests (@skip without reason), commented test blocks, test-only exports
   - comments: blocks of 3+ commented lines (dead code, not explanations)
   - naming: camelCase/snake_case mixing within same file
   - todos: TODO/FIXME/HACK that are actually shipped workarounds
4. If --dry-run: report findings only (file:line for each), do not modify.
5. If not dry-run: fix each category in sequence, one atomic commit per category.
6. After EACH fix commit: re-run tests. If tests fail → revert that commit, report conflict.
7. Write CLEANUP-REPORT.md with: category, items found, items fixed, items skipped (with reason).
8. Report summary: "Cleaned X items across Y categories. Z commits. Tests pass."
9. Log de-slop event in AUDIT.
</process>
