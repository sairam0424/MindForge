---
name: mindforge:release
description: Execute the MindForge framework release pipeline
argument-hint: [--version X.Y.Z] [--dry-run]
allowed-tools:
  - run_command
  - view_file
  - write_to_file
---

<objective>
Coordinate the release of the MindForge framework itself (Core Team only), ensuring all readiness checks pass, changelogs are updated, and packages are correctly versioned.
</objective>

<execution_context>
.claude/commands/mindforge/release.md
</execution_context>

<context>
Scope: Framework Core (not project phases).
Gates: Production readiness checklist.
</context>

<process>
1. **Checklist Audit**: Verify all framework readiness items (tests, docs, security) are marked [x].
2. **Dry Run**: Preview the release artifacts and target version.
3. **Pipeline Execution**: Bump versions, update the main CHANGELOG.md, and tag the release in git.
4. **Finalize**: Trigger the publication to the official registry.
</process>
