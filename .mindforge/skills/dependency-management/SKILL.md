---
name: dependency-management
version: 1.0.0
min_mindforge_version: 0.3.0
status: stable
triggers: dependency management, version resolution, lockfile strategy, dep hoisting, peer dependency, transitive audit, dependency graph, version conflict, dependency update, semver resolution, dependency pruning, phantom dependency
compose: supply-chain-security
---

# Skill — Dependency Management

## When this skill activates
Any task involving package management, version conflicts, lockfile strategies,
dependency auditing, update workflows, or supply chain concerns.

## Mandatory actions when this skill is active

### Before modifying dependencies
1. Understand the current dependency graph and any existing conflicts.
2. Check if the new dependency is actively maintained (last commit, open issues).
3. Verify license compatibility with the project.

### Lockfiles

- **Always commit lockfiles** (package-lock.json, yarn.lock, pnpm-lock.yaml).
- **CI must use --frozen-lockfile** (or equivalent) to prevent drift.
- **Review lockfile changes in PRs** — unexpected transitive additions are a signal.
- Never manually edit lockfiles — use the package manager to resolve.
- If lockfile conflicts in merge: delete lockfile, reinstall, commit fresh.

### Version resolution by package manager

**npm (nearest-wins, hoisted):**
- Hoists shared deps to root node_modules.
- Different versions of same package can coexist in nested node_modules.
- Potential for phantom dependencies (using undeclared deps that happen to be hoisted).

**pnpm (strict, isolated):**
- Symlink-based, no hoisting by default.
- Catches phantom dependencies immediately.
- Content-addressable store saves disk space.
- Recommended for monorepos and strict environments.

**yarn (hoisted, PnP optional):**
- Classic: hoisted like npm.
- PnP (Plug'n'Play): no node_modules, direct resolution via .pnp.cjs.
- PnP is strict but has ecosystem compatibility challenges.

### Peer dependencies

- **Declare compatibility range** in your library's peerDependencies.
- **Do not install** peer deps in the library — the consuming application does.
- Use `peerDependenciesMeta` to mark optional peers.
- Test against the minimum AND maximum of your declared peer range.

### Phantom dependencies

- Dependencies you use in code but did not explicitly declare in package.json.
- They work by accident (hoisted from a transitive dep).
- **Detection:** use pnpm (strict mode) or run `depcheck`.
- **Fix:** add to dependencies explicitly or remove the usage.

### Update strategy

**Automated (Dependabot/Renovate):**
- Configure for weekly minor/patch updates.
- Group related deps (e.g., all @testing-library/* together).
- Auto-merge if CI passes for patch updates.
- Require manual review for major bumps.

**Manual quarterly major bumps:**
- Schedule quarterly "dependency day" for major version upgrades.
- Read changelogs and migration guides before upgrading.
- Upgrade one major dep at a time, verify tests pass.

### Pruning

- **Find unused deps:** run `depcheck` or `knip` regularly.
- **Remove aggressively** — fewer deps = smaller attack surface + faster installs.
- Check for lighter alternatives (e.g., date-fns instead of moment).
- Evaluate if a dep is worth it: if you only use one function, inline it.

### Monorepo-specific

- Use workspace protocols (workspace:*) for internal packages.
- Hoist shared devDependencies to root.
- Keep runtime deps in each package's own package.json.
- Use changesets or lerna for coordinated versioning.

## Self-check before task completion
- [ ] Did I follow the mandatory actions for this skill?
- [ ] Did I apply the patterns appropriate to the context?
- [ ] Did I verify the implementation meets the criteria above?
- [ ] Did I document decisions and trade-offs made?
