---
description: Set up monorepo with task pipelines. Usage - /mindforge:monorepo [--tool nx|turborepo] [--packages N]
---

<objective>
Design and configure a monorepo architecture with efficient task pipelines,
dependency-aware build ordering, and intelligent caching. Optimizes for
developer velocity while maintaining clear package boundaries.
</objective>

<execution_context>
@.mindforge/skills/monorepo-management/SKILL.md
</execution_context>

<context>
$ARGUMENTS
</context>

<process>
1. Choose the monorepo tool based on --tool flag or project needs. Nx for larger projects needing computation caching and module federation; Turborepo for simpler pipeline orchestration with minimal config.
2. Define workspace structure: separate `apps/` (deployable applications) from `packages/` (shared libraries). Establish naming conventions and package scoping (@org/package-name).
3. Configure the task pipeline with dependency relationships — build depends on ^build (dependencies first), test depends on ^build, lint runs in parallel with no dependencies.
4. Set up affected analysis so only packages impacted by a change are built/tested. Configure the base branch for comparison and ignore patterns (docs, README).
5. Configure caching at two levels: local cache (filesystem, immediate hits on repeated runs) and remote cache (shared across team/CI for cross-machine cache hits).
6. Define package boundaries and enforce them: no circular dependencies, explicit public API exports, lint rules preventing deep imports across package boundaries.
7. Set up publishing workflow for shared packages: conventional commits, automated versioning (independent or fixed), changelog generation, and npm/registry publishing.
8. Configure CI to leverage affected analysis and remote cache — skip unchanged packages, parallelize independent tasks, fail fast on first error.
9. Document the monorepo conventions: how to add a new package, how to add cross-package dependencies, how to run tasks for specific packages, and troubleshooting cache misses.
10. Log monorepo invocation in AUDIT with: tool selected, package count, cache strategy, pipeline definition.
</process>
