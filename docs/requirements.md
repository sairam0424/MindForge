# MindForge Requirements (v1.0.0)

Use this checklist before installation to avoid surprises.

## System requirements
- **Node.js:** 18+ (20 LTS recommended)
- **Git:** 2.30+
- **OS:** macOS, Linux, or Windows (WSL supported)
- **Disk:** ~200MB free for framework + caches

## Runtime requirements
- **Claude Code** or **Antigravity** installed and working
- Network access to npm registry for `npx mindforge-cc@latest`

## Optional (but recommended)
- `jq` for audit log queries
- `gh` CLI for GitHub release workflows

## Quick environment check
```bash
node -v
npm -v
git --version
```

## If you are in CI
- Ensure `CI=true`
- Use a Node 20 image
- Keep `.planning/` writable
