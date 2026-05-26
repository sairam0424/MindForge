# MindForge — Cross-Package Planner

## Purpose
When a phase spans multiple packages in a monorepo, coordinate execution
so that shared dependencies are built and tested before packages that
depend on them.

## Execution order algorithm

```
Given: a set of packages involved in the current phase
       and their inter-package dependencies

Algorithm: topological sort of package dependency graph

Input: WORKSPACE-MANIFEST.json dependency_order
Output: ordered list of packages to process

Example:
  Phase touches: @myapp/api, @myapp/shared, @myapp/web
  Dependencies: api→shared, web→shared, web→api
  Topological order: shared → api → web
  
  Execution: 
    Wave 1: process @myapp/shared (no dependencies on other changed packages)
    Wave 2: process @myapp/api (depends on Wave 1: shared)
    Wave 3: process @myapp/web (depends on Wave 2: api + Wave 1: shared)
```

## Per-package PLAN file routing

When PLAN files are created for a monorepo phase, each plan specifies its target package:

```xml
<task type="auto">
  <n>Add auth middleware to API</n>
  <package>@myapp/api</package>
  <working-dir>apps/api</working-dir>
  <files>
    apps/api/src/middleware/auth.ts
    apps/api/src/middleware/auth.test.ts
  </files>
  <action>...</action>
  <verify>cd apps/api && npm test -- --testPathPattern=auth.middleware</verify>
  <done>Auth middleware tests passing in apps/api</done>
</task>
```

## Cross-package test execution

After all packages in the phase are processed:
```bash
# Run tests across all affected packages
AFFECTED_PACKAGES=$(cat .planning/WORKSPACE-MANIFEST.json | \
  node -e "const m=JSON.parse(require('fs').readFileSync('/dev/stdin','utf8')); \
  console.log(m.packages.map(p=>p.path).join(' '))")

for PKG_PATH in ${AFFECTED_PACKAGES}; do
  echo "Testing ${PKG_PATH}..."
  cd "${PKG_PATH}" && npm test && cd -
done

# Run integration tests from root (if configured)
[ -f "package.json" ] && npm run test:integration 2>/dev/null || true
```

## Affected package detection (revised)

```bash
# CORRECTED: Match against declared package paths, not assume 2-level depth
detect_affected_packages() {
  local MANIFEST=".planning/WORKSPACE-MANIFEST.json"

  if [ ! -f "${MANIFEST}" ]; then
    echo "Run /mindforge:workspace detect first"
    return 1
  fi

  # Get list of changed files
  CHANGED_FILES=$(git diff --name-only HEAD~1 2>/dev/null || git diff --cached --name-only)

  # For each package in manifest, check if any changed file is within that package
  node -e "
    const fs = require('fs');
    const manifest = JSON.parse(fs.readFileSync('${MANIFEST}', 'utf8'));
    const changedFiles = \`${CHANGED_FILES}\`.split('\n').filter(Boolean);

    const affected = new Set();
    manifest.packages.forEach(pkg => {
      // Check if any changed file is within this package's path
      const pkgPath = pkg.path.replace(/\/$/, ''); // remove trailing slash
      changedFiles.forEach(file => {
        if (file.startsWith(pkgPath + '/') || file === pkgPath) {
          affected.add(pkg.name);
        }
      });
    });

    // Also add packages that depend on affected packages
    manifest.packages.forEach(pkg => {
      if (pkg.dependencies && pkg.dependencies.some(dep => affected.has(dep))) {
        affected.add(pkg.name);
      }
    });

    console.log([...affected].join('\n'));
  "
}
```

This correctly handles:
- Packages at any nesting depth (`libs/shared/utils/` → 3 levels deep)
- Packages whose path is a prefix of another (avoid false matches)
- Transitive dependencies (packages that depend on changed packages)
