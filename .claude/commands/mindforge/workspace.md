---
name: mindforge:workspace
description: Manage monorepo workspaces and cross-package dependencies
argument-hint: [detect|list|plan phase N|test]
allowed-tools:
  - run_command
  - list_dir
  - view_file
  - write_to_file
---

<objective>
Enable seamless development within monorepo environments by detecting package structures, managing cross-package dependencies, and coordinating multi-package phase planning and testing.
</objective>

<execution_context>
.claude/commands/mindforge/workspace.md
</execution_context>

<context>
Metadata: WORKSPACE-MANIFEST.json
Engine: workspace-detector.md, cross-package-planner.md
Subcommands: detect, list, plan, test.
</context>

<process>
1. **Detect**: Run the workspace detector to identify the monorepo type and generate `WORKSPACE-MANIFEST.json`.
2. **List**: Present a structured view of all packages, their types, and dependency relationships.
3. **Plan**: Generate a phase plan that spans multiple packages, ensuring execution follows the correct dependency order.
4. **Test**: Execute the test suite for all packages in the correct topological order and aggregate results.
5. **Confirm**: Update the user on workspace health and detected configurations.
</process>
