---
description: Monorepo workspace management.
---
# MindForge — Workspace Command
# Usage: /mindforge:workspace [detect|list|plan phase N|test]

Monorepo workspace management.

## detect
Run workspace detector from `.mindforge/monorepo/workspace-detector.md`.
Write WORKSPACE-MANIFEST.json.
Report: workspace type, packages found, dependency order.

## list
Read WORKSPACE-MANIFEST.json and display package list:
```
Workspace: Turborepo (4 packages)
  packages/shared    → @myapp/shared   (lib, 0 dependents)
  apps/api           → @myapp/api      (api, depends on: shared)
  apps/web           → @myapp/web      (web, depends on: shared, api)
  apps/mobile        → @myapp/mobile   (mobile, depends on: shared)
Execution order: shared → api → (web, mobile in parallel)
```

## plan phase N
Create a phase plan that spans multiple packages.
Uses cross-package-planner.md to determine package execution order.
Each PLAN file includes a `<package>` and `<working-dir>` field.

## test
Run tests across all packages in dependency order.
Report per-package test results and aggregate coverage.
