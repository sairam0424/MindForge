# MindForge — Monorepo Workspace Detector

## Purpose
Detect and understand monorepo structures (npm workspaces, pnpm workspaces,
Nx, Turborepo, Lerna) so MindForge can plan and execute phases across
multiple packages correctly.

## Supported monorepo types

| Type | Detection file | Package locations |
|---|---|---|
| npm workspaces | `package.json` with `"workspaces":` | Defined in workspaces array |
| pnpm workspaces | `pnpm-workspace.yaml` | Defined in packages array |
| Nx | `nx.json` | `apps/` and `libs/` |
| Turborepo | `turbo.json` | `apps/` and `packages/` |
| Lerna | `lerna.json` | Defined in packages array |
| Yarn workspaces | `package.json` with `"workspaces":` | Same as npm |

## Detection protocol

```bash
detect_workspace_type() {
  local ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"

  # Check in priority order
  if [ -f "${ROOT}/nx.json" ]; then
    echo "nx"
  elif [ -f "${ROOT}/turbo.json" ]; then
    echo "turborepo"
  elif [ -f "${ROOT}/lerna.json" ]; then
    echo "lerna"
  elif [ -f "${ROOT}/pnpm-workspace.yaml" ]; then
    echo "pnpm"
  elif node -e "
    const p = require('./package.json');
    process.exit(p.workspaces ? 0 : 1)
  " 2>/dev/null; then
    echo "npm-workspaces"
  else
    echo "none"
  fi
}

list_packages() {
  local TYPE="$1"
  case "${TYPE}" in
    nx)
      find apps/ libs/ -name "package.json" -not -path "*/node_modules/*" \
        -exec dirname {} \; 2>/dev/null | sort
      ;;
    turborepo)
      find apps/ packages/ -name "package.json" -not -path "*/node_modules/*" \
        -exec dirname {} \; 2>/dev/null | sort
      ;;
    pnpm)
      cat pnpm-workspace.yaml | grep "^  -" | sed "s/  - '//;s/'$//"
      ;;
    npm-workspaces|lerna)
      node -e "
        const p = require('./package.json');
        const ws = p.workspaces || require('./lerna.json').packages || [];
        ws.forEach(w => console.log(w.replace(/\/\*$/, '')));
      " 2>/dev/null
      ;;
  esac
}
```

## Package metadata extraction

For each detected package, extract:
```javascript
{
  "name": "package name from package.json",
  "path": "relative path from monorepo root",
  "type": "app | lib | shared | api | web | cli",
  "dependencies": ["list of internal package dependencies"],
  "scripts": {
    "build": "build command",
    "test": "test command",
    "lint": "lint command"
  },
  "mindforge": {
    "phase-scope": "global | package-specific",
    "test-command": "override test command if needed",
    "affected-by": ["list of packages that affect this one"]
  }
}
```

## Workspace manifest

Write to `.planning/WORKSPACE-MANIFEST.json`:

```json
{
  "schema_version": "1.0.0",
  "workspace_type": "turborepo",
  "root": "/path/to/project",
  "packages": [
    {
      "name": "@myapp/api",
      "path": "apps/api",
      "type": "api",
      "dependencies": ["@myapp/shared"],
      "test_command": "npm test",
      "build_command": "npm run build"
    },
    {
      "name": "@myapp/web",
      "path": "apps/web",
      "type": "web",
      "dependencies": ["@myapp/shared", "@myapp/ui"],
      "test_command": "npm test",
      "build_command": "npm run build"
    },
    {
      "name": "@myapp/shared",
      "path": "packages/shared",
      "type": "lib",
      "dependencies": [],
      "test_command": "npm test",
      "build_command": "npm run build"
    }
  ],
  "dependency_order": ["@myapp/shared", "@myapp/api", "@myapp/web"],
  "affected_packages": {}
}
```
