---
description: Read PLUGINS-MANIFEST.md. Display installed plugins with version and permissions.
---

# MindForge — Plugins Command
# Usage: /mindforge:plugins [list|install|uninstall|info|validate|create] [name]

## list
Read PLUGINS-MANIFEST.md. Display installed plugins with version and permissions.
If no plugins: "No plugins installed. Find plugins: npm search mindforge-plugin"

## install [plugin-name]
Full installation protocol per plugin-loader.md:
1. Resolve package: `mindforge-plugin-[name]` convention
2. Download to chmod 700 temp directory
3. Validate plugin.json manifest
4. Check plugin_api_version compatibility (1.0.0 required)
5. Run injection guard on ALL .md files in the plugin
6. Run Level 1 + 2 skill validation on all SKILL.md files
7. Display permission list for user approval:
   ```
   Plugin: mindforge-plugin-jira-advanced v1.0.0
   Requests these permissions:
     • read_audit_log:  read AUDIT.jsonl ✅ (safe)
     • write_audit_log: append to AUDIT.jsonl ⚠️
     • network_access:  make HTTP requests ⚠️
   Install? (yes/no)
   ```
8. Install components (commands, skills, personas, hooks)
9. Add to PLUGINS-MANIFEST.md
10. Write AUDIT entry

## uninstall [plugin-name]
Remove all installed components. Update PLUGINS-MANIFEST.md.
Confirm: "This will remove [N] commands, [N] skills from this plugin."

## info [plugin-name]
Display: version, description, author, permissions, commands, skills, personas, hooks.

## validate
Validate all installed plugins for compatibility, injection safety, permission scope.

## create [plugin-name]
Generate a plugin scaffold:
