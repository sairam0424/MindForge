---
name: monorepo-management
version: 1.0.0
min_mindforge_version: 10.0.8
status: stable
triggers: monorepo, nx workspace, turborepo, task pipeline, affected analysis, workspace dependency, publish strategy, monorepo structure, package boundary, workspace protocol, change detection, monorepo tooling
---

# Monorepo Management

## When this skill activates

This skill activates when setting up, restructuring, or optimizing a monorepo workspace. It applies to task orchestration, dependency management between packages, affected analysis for CI, publishing strategies, and enforcing package boundaries.

## Mandatory actions when this skill is active

### Before

1. Identify the monorepo tool in use or to be adopted (Nx, Turborepo, Lerna, pnpm workspaces, Bazel).
2. Map the dependency graph between packages (which packages depend on which).
3. Determine the publishing model (unified versioning vs independent versioning).
4. Assess current CI times and identify optimization opportunities.
5. Review existing package boundaries (are internals leaking between packages?).

### During

**Tool Selection:**
- **Nx**: Full-featured. Generators, dependency graph visualization, distributed task execution, plugins for frameworks. Best for large teams with complex dependency graphs.
- **Turborepo**: Lightweight. Fast caching, simple pipeline config, minimal setup. Best for smaller monorepos or teams that want minimal tooling overhead.
- **pnpm workspaces**: Package manager-level workspace support. Good foundation, pair with Turbo or Nx for task orchestration.
- **Bazel**: Hermetic builds, language-agnostic, extreme scale. Steep learning curve. Best for very large codebases (1000+ packages).

**Workspace Structure:**
```
/apps          — Deployable applications (web-app, api-server, mobile)
/packages      — Shared libraries (ui-components, utils, types, config)
/tools         — Build tools, scripts, generators, codemods
/docs          — Documentation site (if applicable)
```
- Each package has its own `package.json`, `tsconfig.json`, and test config.
- Shared config lives in root (ESLint, Prettier, TypeScript base config).
- Apps import packages; packages never import apps.

**Task Pipelines:**
- Define build order from the dependency graph (if B depends on A, build A first).
- Run independent tasks in parallel (lint all packages simultaneously).
- Cache task outputs by input fingerprint (source files + deps + config).
- Pipeline config example: `build` depends on `^build` (build deps first).

**Affected Analysis:**
- On PR: determine which packages changed (git diff against base branch).
- Include transitive dependents (if `utils` changed, rebuild everything that imports `utils`).
- Run only affected tests/builds/lints in CI to save time.
- Full suite runs on merge to main (catch transitive issues).

**Package Boundaries (Critical):**
- Each package exports explicitly via `index.ts` or `exports` field in `package.json`.
- NEVER import from internal paths (`@myorg/ui/src/internal/Button`). Only use public API.
- Enforce with ESLint rules (`@nx/enforce-module-boundaries` or custom no-restricted-imports).
- Circular dependencies between packages are FORBIDDEN. Detect with `madge` or Nx graph.
- If two packages need each other, extract shared logic into a third package.

**Caching Strategy:**
- **Local cache**: Default. Store task outputs on developer machine (~/.turbo or .nx/cache).
- **Remote cache**: Share cache across CI and team (Nx Cloud, Turborepo Remote Cache, custom S3).
- **Fingerprint inputs**: source files, dependency versions, env vars, tool versions.
- Cache hit = skip task entirely (return cached output in milliseconds).
- Invalidate cache when: source changes, deps update, config changes, tool version bumps.

**Publishing Strategy:**
- **Changesets** (recommended): Developers declare changes in PRs, automated versioning on merge.
- **Independent versioning**: Each package has its own semver. Publish only changed packages.
- **Unified versioning**: All packages share one version number. Simpler but more publishes.
- **Canary releases**: Publish from PR branches for pre-merge testing (`0.0.0-canary.abc123`).
- Always publish from CI (never from local machines).

**Dependency Management:**
- Pin shared dependencies to same version across workspace (avoid version drift).
- Use `pnpm` or `yarn` dedupe to eliminate duplicate installations.
- Internal packages use `workspace:*` protocol (resolved at install, not publish).
- External dependency updates: use Renovate/Dependabot with grouped PRs per scope.

### After

1. Dependency graph is acyclic and visualizable.
2. Package boundaries are enforced (lint rule prevents deep imports).
3. CI only runs affected tasks (measured improvement in pipeline time).
4. Caching is configured and verified (cache hit rate > 70% on typical PRs).
5. Publishing pipeline is automated and tested.

## Self-check before task completion

- [ ] Dependency graph has zero circular dependencies.
- [ ] Package boundaries enforced via tooling (not just convention).
- [ ] Task pipeline correctly orders builds based on dependency graph.
- [ ] Affected analysis is configured for CI (not running everything on every PR).
- [ ] Local and remote caching is operational with verified cache hits.
- [ ] Publishing strategy is documented and automated.
- [ ] New packages have a clear owner and explicit public API surface.
- [ ] Workspace structure follows the apps/packages/tools convention.
