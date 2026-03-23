---
name: mindforge:update
description: Safely check for and apply MindForge framework updates
argument-hint: [--apply] [--force] [--check] [--skip-changelog]
allowed-tools:
  - run_command
  - view_file
  - write_to_file
---

<objective>
Keep the project's MindForge installation up to date with the latest features, bug fixes, and security patches while ensuring no data loss or architectural regression.
</objective>

<execution_context>
.claude/commands/mindforge/update.md
</execution_context>

<context>
Platform: bin/updater/self-update.js
Scope: Local vs. Global detection.
Security: Enforces schema migration during the update process.
</context>

<process>
1. **Check**: Query the registry for the latest version and compare with the current installation.
2. **Changelog**: Display relevant updates, highlighting **BREAKING CHANGES** for major versions.
3. **Pre-update State**: Capture the `schema_version` from HANDOFF.json.
4. **Apply**: If `--apply` is set, download and install the new version into the detected scope.
5. **Migrate**: Run `/mindforge:migrate` to reconcile the project schema with the new framework version.
6. **Verify**: Run `/mindforge:health` to confirm the update succeeded without introducing errors.
7. **Audit**: Log `update_completed` with the jump range (X.Y.Z -> A.B.C).
</process>
