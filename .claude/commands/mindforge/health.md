---
name: mindforge:health
description: Run the MindForge health engine to diagnose and repair issues
argument-hint: [--repair] [--category C] [--verbose]
allowed-tools:
  - run_command
  - list_dir
  - view_file
---

<objective>
Ensure the MindForge environment and project state are valid, secure, and optimally configured by running a suite of diagnostic checks across multiple categories.
</objective>

<execution_context>
.claude/commands/mindforge/health.md
</execution_context>

<context>
Engine: .mindforge/intelligence/health-engine.md
Categories: installation, context, skills, personas, state, integrations, security.
Flags: --repair (auto-fix), --verbose (full details).
</context>

<process>
1. **Initialize Diagnostics**: Load the health engine and target specifically requested categories (or all by default).
2. **Execute Checks**: Scan for configuration errors, missing files, security misconfigurations, and state inconsistencies.
3. **Repair (Optional)**: If `--repair` is set, apply safe automated fixes for detected issues.
4. **Report Findings**: Categorize results into Errors (must fix), Warnings (should fix), and Info.
5. **Audit**: Log `health_check_completed` with counts of errors, warnings, and repairs.
</process>
