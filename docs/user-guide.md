# MindForge User Guide (v1.0.0)

This guide gets you from install to productive, with the minimum needed to run
MindForge in a real project. It assumes Node.js 18+.

## 1. Install

### Claude Code (global)
```bash
npx mindforge-cc@latest --claude --global
```

### Claude Code (local, per project)
```bash
npx mindforge-cc@latest --claude --local
```

Optional utilities:
```bash
npx mindforge-cc@latest --claude --local --with-utils
```

Minimal scaffolding:
```bash
npx mindforge-cc@latest --claude --local --minimal
```

### Antigravity
```bash
npx mindforge-cc@latest --antigravity --global
# or
npx mindforge-cc@latest --antigravity --local
```

### Both runtimes
```bash
npx mindforge-cc@latest --all --global
```

## 2. Verify installation
Open Claude Code or Antigravity in your project directory and run:
```
/mindforge:health
```

If health reports issues, run:
```
/mindforge:health --repair
```

## 3. Initialize a new project
```
/mindforge:init-project
```
This creates the core planning artifacts in `.planning/`.

## 4. Brownfield onboarding (existing codebase)
```
/mindforge:map-codebase
```
This generates `.planning/ARCHITECTURE.md` and an inferred conventions file.

## 5. Standard workflow
```
/mindforge:plan-phase 1
/mindforge:execute-phase 1
/mindforge:verify-phase 1
/mindforge:ship 1
```

## 6. Update and migration
### Check for updates
```
/mindforge:update
```

### Apply updates
```
/mindforge:update --apply
```

### Run schema migrations manually
```
/mindforge:migrate --from v0.6.0 --to v1.0.0
```

## 7. Plugins
### List / validate
```
/mindforge:plugins list
/mindforge:plugins validate
```

### Install
```
/mindforge:plugins install mindforge-plugin-<name>
```

## 8. Skills
```
/mindforge:skills list
/mindforge:skills validate
```

To publish or install a skill, see `docs/skills-publishing-guide.md`.

## 9. Token usage profiling
```
/mindforge:tokens --profile
/mindforge:tokens --summary
```

Token optimization policies are defined in:
- `.mindforge/production/token-optimiser.md`

## 10. Configuration (MINDFORGE.md)
Key settings live in `MINDFORGE.md`. See:
- `docs/reference/config-reference.md`

Common settings:
- `PLANNER_MODEL`, `EXECUTOR_MODEL`, `REVIEWER_MODEL`
- `VERIFY_PASS_RATE_WARNING_THRESHOLD`
- `TOKEN_WARN_THRESHOLD`, `TOKEN_LEAN_MODE`
- `MINDFORGE_AUTO_CHECK_UPDATES`

## 11. Troubleshooting
- Health issues: run `/mindforge:health --repair`
- Schema drift: run `/mindforge:migrate --dry-run` then apply
- Installer issues: re-run with `--force`
- CI mode: set `CI=true` and check `.mindforge/ci/` docs

## 12. Security
MindForge never stores credentials in files. See:
- `docs/security/SECURITY.md`
- `docs/security/threat-model.md`

## 13. Reference docs
- Commands: `docs/reference/commands.md`
- SDK: `docs/reference/sdk-api.md`
- Skills: `docs/reference/skills-api.md`
- Audit events: `docs/reference/audit-events.md`
