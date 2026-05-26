# MindForge — Dependency Graph Builder

## Purpose
Build a dependency graph of packages in a monorepo to support topological
ordering and affected package detection.

## Input
- `.planning/WORKSPACE-MANIFEST.json`
- Each package's `package.json` dependencies

## Output
A directed graph where nodes are packages and edges represent internal
package dependencies.

Example:
```
@myapp/shared → @myapp/api
@myapp/shared → @myapp/web
@myapp/api    → @myapp/web
```

## Steps

1. Load `WORKSPACE-MANIFEST.json`.
2. For each package, read `dependencies` and `devDependencies`.
3. Filter dependencies to only those that match workspace package names.
4. Build adjacency list and compute topological order.
5. Write to `.planning/WORKSPACE-MANIFEST.json` as `dependency_order`.

## Failure modes
- Cycles detected: stop, report cycle path, require manual resolution.
- Missing package metadata: warn and skip.
