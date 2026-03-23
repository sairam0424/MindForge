---
name: mindforge:install-skill
description: Install a skill from a remote registry or package
argument-hint: [skill-name|package-name] [--tier 1|2|3] [--registry URL]
allowed-tools:
  - run_command
  - list_dir
  - write_to_file
---

<objective>
Enable the rapid extension of agent capabilities by resolving, downloading, validating, and registering pre-built skills from official or private registries.
</objective>

<execution_context>
.claude/commands/mindforge/install-skill.md
</execution_context>

<context>
Registry Client: registry-client.md
Validation: Level 1 + Level 2 via skill-validator.md.
Security: Enforces injection guards before installation.
</context>

<process>
1. **Resolve**: Map the skill name to its registry package name.
2. **Fetch**: Download the package to a secure temporary directory.
3. **Validate**: Run strict structural and security checks (Injection guards, frontmatter validation).
4. **Deploy**: Move the skill to the target tier directory (Default: Tier 2).
5. **Register**: Append the skill to `MANIFEST.md`.
6. **Audit**: Log `skill_installed` event.
</process>
