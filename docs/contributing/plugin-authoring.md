# Plugin Authoring Guide (v1.0.0)

## Overview
Plugins extend MindForge with commands and skills. They are installed from npm
under the `mindforge-plugin-*` namespace.

## Structure
```
my-plugin/
  plugin.json
  commands/
    my-command.md
  skills/
    my-skill/
      SKILL.md
```

## plugin.json (required)
```json
{
  "name": "mindforge-plugin-example",
  "version": "1.0.0",
  "mindforge_plugin_api_version": "1.0.0",
  "min_mindforge_version": "1.0.0",
  "commands": ["commands/my-command.md"],
  "skills": ["skills/my-skill/SKILL.md"],
  "permissions": {
    "read_state": true,
    "write_state": false,
    "network": false
  }
}
```

## Command authoring
Command files are standard MindForge command markdown. The first non-empty line
is used as the command description.

## Compatibility
- `mindforge_plugin_api_version` must be `1.0.0` for MindForge v1.x.x
- Command name conflicts are auto-renamed per `plugin-loader.md`

## Security guidelines
- Keep permissions minimal
- Never exfiltrate project data without explicit user approval
- Pass injection guard (no override or jailbreak phrases)

## Test locally
Use `/mindforge:plugins validate` and `/mindforge:plugins install --local` to
validate and install into a test project.
