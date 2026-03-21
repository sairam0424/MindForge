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
