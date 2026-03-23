---
name: mindforge:skills
description: Manage the MindForge skills registry and validation status
argument-hint: [list|info|search|validate|add|update] [skill-name]
allowed-tools:
  - list_dir
  - view_file
  - write_to_file
  - run_command
---

<objective>
Provide a centralized interface for managing, searching, and validating the project's skill registry, ensuring all automated knowledge is current, conflict-free, and healthy.
</objective>

<execution_context>
.claude/commands/mindforge/skills.md
</execution_context>

<context>
Manifest: MANIFEST.md
Structure: Organized by Tier 1 (Core), Tier 2 (Org), and Tier 3 (Project).
Validation: Checks semver, required fields, trigger conflicts, and file accessibility.
</context>

<process>
1. **Route Subcommand**:
    - `list`: Render a formatted table of all registered skills and their active versions.
    - `info`: Display detail for a specific skill (triggers, changelog, status).
    - `search`: Show which skills would activate for a specific query.
    - `validate`: Audit the full registry for broken paths, invalid frontmatter, or trigger overlaps.
    - `add`: Register a new skill directory, prompting for tier and confirming the manifest entry.
    - `update`: Handle version bumps, showing breaking changes for major updates.
2. **Enforce Health**: If validation finds critical errors, block phase execution.
3. **Commit**: Automatically commit manifest changes with structured messages.
</process>
