---
name: mindforge:sync-confluence
description: Publish approved planning artifacts to Confluence
argument-hint: [--architecture] [--phase N] [--milestone name]
allowed-tools:
  - run_command
  - view_file
  - write_to_file
---

<objective>
Automate the publication of key project documentation and architectural decisions to Confluence, providing a durable and searchable record for the broader organization.
</objective>

<execution_context>
.claude/commands/mindforge/sync-confluence.md
</execution_context>

<context>
Auth: Managed via `connection-manager.md`.
Exclusion: Secrets, raw logs, and PII are strictly filtered before publication.
</context>

<process>
1. **Assemble Content**: Gather target artifacts (ARCHITECTURE.md, Phase Plans, Milestone reports).
2. **Filter & Sanitize**: Remove all sensitive data (passwords, tokens, raw audit trails).
3. **Publish**: Update existing pages or create new ones in the specified Confluence space.
4. **Indempotency**: Match pages by title or project-wide ID to avoid duplication.
5. **Audit**: Log publication success or skipped files.
</process>
