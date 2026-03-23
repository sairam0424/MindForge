---
name: mindforge:publish-skill
description: Validate and publish a skill to a registry
argument-hint: [skill-dir] [--registry URL] [--dry-run]
allowed-tools:
  - run_command
  - view_file
---

<objective>
Facilitate code reuse and community contribution by verifying, packaging, and uploading local skills to an npm or private registry after passing rigorous quality checks.
</objective>

<execution_context>
.claude/commands/mindforge/publish-skill.md
</execution_context>

<context>
Auditors: Level 1, 2, and 3 validation from skill-validator.md.
Format: Standard npm package with `mindforge` fields.
</context>

<process>
1. **Audit**: Run full multi-level validation. Fail on structural or security issues.
2. **Metadata Check**: Ensure `package.json`, `SKILL.md`, and `CHANGELOG.md` are in sync and complete.
3. **Preview**: Run `npm pack --dry-run` and list files for user confirmation.
4. **Publish**: Upload the package (public by default) to the resolved registry.
5. **Verify**: Query the registry to confirm the version is live.
6. **Audit**: Log `skill_published` with package name and version.
</process>
