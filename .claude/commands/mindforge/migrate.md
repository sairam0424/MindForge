---
name: mindforge:migrate
description: Run explicit schema migrations for planning artifacts
argument-hint: [--from X.Y.Z] [--to X.Y.Z] [--dry-run] [--force]
allowed-tools:
  - run_command
  - list_dir
  - view_file
  - write_to_file
---

<objective>
Ensures consistency and compatibility of planning files (.planning/*.md, handoff.json) across different versions of MindForge by executing structured schema migrations.
</objective>

<execution_context>
.claude/commands/mindforge/migrate.md
</execution_context>

<context>
Detection: Compares `schema_version` in HANDOFF.json with current framework version.
Safety: Mandatory backup before mutation.
Engine: bin/migrations/migrate.js
</context>

<process>
1. **Detect Path**: Determine the migration range based on HANDOFF.json vs package.json.
2. **Backup**: Create a timestamped backup of the `.planning/` directory.
3. **Dry-run**: Show the user which files will be modified and describe any breaking schema changes.
4. **Execute**: Run the migration scripts sequentially across the target files.
5. **Verify**: Run `/mindforge:health` to ensure the post-migration state is valid.
6. **Audit**: Log success or failure of the migration process.
</process>
