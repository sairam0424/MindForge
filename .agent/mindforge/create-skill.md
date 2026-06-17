---
description: Interactive skill creation with eval loop and trigger optimization. Usage - /mindforge:create-skill [name] [--from-instinct inst-xxx] [--iterate N]
---

<objective>
Author a new MindForge skill iteratively using interview-driven capture,
parallel eval comparison (with-skill vs baseline), and trigger optimization.
</objective>

<execution_context>
@.mindforge/skills/skill-creator-meta/SKILL.md
@.mindforge/skills/eval-harness/SKILL.md
@.mindforge/org/skills/MANIFEST.md
</execution_context>

<context>
$ARGUMENTS
</context>

<process>
1. If --from-instinct provided: load instinct as starting point for skill content.
2. Interview: what does the skill do? When should it trigger? What output format? Edge cases?
3. Generate draft SKILL.md following schema (frontmatter + body, under 500 lines).
4. Create test cases in `.mindforge/evals/[name]/test-cases.json` (2-3 realistic prompts).
5. Run parallel eval: with-skill vs baseline (no-skill) for each test case.
6. Draft assertions (objectively verifiable), grade outputs, aggregate to benchmark.json.
7. Create 20 trigger evaluation queries: 10 should-trigger, 10 should-NOT-trigger.
8. Run trigger optimization (up to 5 iterations on name/description/triggers).
9. Present results to user: benchmark scores + trigger accuracy.
10. If user provides feedback: improve skill, retest in next iteration directory.
11. Repeat until user approves or --iterate limit reached.
12. On approval: register in MANIFEST.md, verify no trigger conflicts with existing skills.
13. Log skill creation event in AUDIT.
</process>
