# MindForge Plugin Registry

## Purpose
Defines how MindForge discovers, validates, and installs third-party plugins
from the npm ecosystem.

## Naming convention
Plugins must be published under the `mindforge-plugin-*` namespace.
Format:
- `mindforge-plugin-<category>-<name>`

Examples:
- `mindforge-plugin-jira-advanced`
- `mindforge-plugin-testing-playwright`

## Registry source
The public npm registry is the default source. Private registries are supported
via standard npm configuration (`.npmrc`) and environment variables.

## Install flow (high level)
1. Resolve package name and version (default: latest)
2. Download tarball to a temp directory (mode 700)
3. Validate structure and `plugin.json`
4. Run injection guard on all `.md` files
5. Copy into `.mindforge/plugins/<plugin-name>/`
6. Append to `PLUGINS-MANIFEST.md`
7. Log AUDIT event `plugin_installed`

## Validation rules (summary)
- `plugin.json` is required and must match schema in `plugin-schema.md`
- Commands and skills must be listed in `plugin.json`
- Any command name conflicts with built-ins must be renamed per `plugin-loader.md`
- Plugins with `write_state: true` must be listed in `ELEVATED_PLUGINS`

## Uninstall flow
- Remove plugin directory
- Remove manifest entry
- Log AUDIT event `plugin_uninstalled`

## Security posture
Plugins are powerful. Treat them like VSCode extensions:
- Install only from trusted sources
- Review command content before enabling
- Prefer version pinning in production environments
