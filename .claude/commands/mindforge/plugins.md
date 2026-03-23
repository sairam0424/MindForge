---
name: mindforge:plugins
description: Manage MindForge plugins and their permission scopes
argument-hint: [list|install|uninstall|info|validate|create]
allowed-tools:
  - run_command
  - list_dir
  - view_file
  - write_to_file
---

<objective>
Extend MindForge core functionality through a secure plugin architecture, managing the lifecycle and security boundaries of installed extensions.
</objective>

<execution_context>
.claude/commands/mindforge/plugins.md
</execution_context>

<context>
Manifest: PLUGINS-MANIFEST.md
Loader: plugin-loader.md
Security: Level 1+2 skill validation, injection guards, and explicit permission prompts.
</context>

<process>
1. **Route Action**:
    - `list`: Show installed plugins and versions.
    - `install`: Execute the full installation protocol (download, validate manifest, run security guards, prompt for permissions).
    - `uninstall`: Cleanly remove all components and update the manifest.
    - `validate`: Audit all installed plugins for injection safety and permission compliance.
2. **Permission Management**: Display a clear list of requested permissions (network, registry, audit write) and await user approval.
3. **Audit**: Log all plugin installations and removals.
</process>
