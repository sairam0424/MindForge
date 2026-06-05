---
description: "Generate a knowledge graph, entry point summary, and learning path for the current or specified codebase. Usage - /mindforge:onboard [path] [--depth shallow|deep] [--output ONBOARDING-REPORT.md]"
---

<objective>
Rapidly understand an unfamiliar codebase by generating structured summaries,
identifying entry points, and creating an ordered learning path.
</objective>

<execution_context>
@.mindforge/skills/codebase-onboarding/SKILL.md
@.mindforge/engine/knowledge-graph-protocol.md
</execution_context>

<context>
$ARGUMENTS
</context>

<process>
1. Determine target directory (default: current working directory).
2. Detect stack: scan for package.json, Cargo.toml, go.mod, pyproject.toml, etc.
3. Identify languages, frameworks, build tools, and test frameworks.
4. Find entry points: main files, bin entries, route definitions, CLI commands, event handlers.
5. If --depth deep: build full module dependency graph (nodes=files, edges=imports).
6. If --depth shallow: identify top 10 most-imported modules only.
7. Identify hot paths: files modified most frequently (git log --name-only).
8. Generate learning path: ordered file reading sequence (config → entry → core → utilities → edge cases).
9. Write ONBOARDING-REPORT.md (or --output path) to `.planning/` with sections:
   - Overview (1-paragraph summary)
   - Tech Stack (detected languages, frameworks, tools)
   - Entry Points (with file paths)
   - Architecture (module graph summary)
   - Hot Paths (most-active areas)
   - Learning Path (ordered reading list with WHY for each file)
   - Concerns (potential issues spotted during exploration)
10. Log onboarding event in AUDIT.
</process>
