# MindForge Plugin System — Schema v1.0.0

## Philosophy
Plugins extend MindForge without modifying the core framework files.
They are first-class citizens: versioned, validated, injection-guarded, and audited.

## Package naming convention
`mindforge-plugin-[category]-[name]`

Examples:
- `mindforge-plugin-jira-advanced`    — Advanced Jira sprint and velocity commands
- `mindforge-plugin-testing-playwright` — Playwright E2E testing skill and commands
- `mindforge-plugin-cloud-aws`        — AWS deployment patterns and runbooks
- `mindforge-plugin-design-figma`     — Figma design review integration

## What a plugin can provide

| Component | Description | File location |
|---|---|---|
| Commands | New slash commands | `commands/[name].md` |
| Skills | New skill packs | `skills/[name]/SKILL.md` |
| Personas | New agent personas | `personas/[name].md` |
| Hooks | Lifecycle event handlers | `hooks/[hook-name].md` |

## `plugin.json` manifest (required in every plugin package)

### Required fields
- `name` (string) — package name
- `version` (semver)
- `mindforge_plugin_api_version` (string, must be `1.0.0` for v1.x.x)
- `min_mindforge_version` (string)
- `commands` (array of command file paths)
- `skills` (array of SKILL.md paths)
- `permissions` (object, see below)

### Permissions — advisory model
The permission system is advisory, not OS‑enforced. Permissions are:
- **Declared** in `plugin.json` before installation
- **Displayed** to the user for review at install time
- **Recorded** in `AUDIT.jsonl` with plugin name as the agent field
- **Enforced** through MindForge governance (plan‑first, audit, gates)

The permission declaration is a statement of intent — it enables trust
decisions, not OS‑level sandboxing.

Example permissions object:
```json
\"permissions\": {
  \"read_state\": true,
  \"write_state\": false,
  \"network\": false,
  \"network_access\": false,
  \"file_system_write\": false
}
```

### Reserved command names (v1.0.0)
These names are permanently reserved for MindForge built‑ins. If a plugin
declares a command with one of these names, it must be renamed at install time:

```
help, init-project, plan-phase, execute-phase, verify-phase, ship,
next, quick, status, debug, skills, review, security-scan, map-codebase,
discuss-phase, audit, milestone, complete-milestone, approve, sync-jira,
sync-confluence, health, retrospective, profile-team, metrics, init-org,
install-skill, publish-skill, pr-review, workspace, benchmark, update,
migrate, plugins, tokens, release
```
