---
name: mindforge:sync-jira
description: Synchronize MindForge phase and plan metadata to Jira
argument-hint: [--phase N] [--plan M]
allowed-tools:
  - run_command
  - view_file
  - write_to_file
---

<objective>
Maintain parity between local MindForge planning state and the enterprise Jira issue tracker, ensuring stakeholders have visibility into phase progress and task status.
</objective>

<execution_context>
.claude/commands/mindforge/sync-jira.md
</execution_context>

<context>
Metadata: .planning/jira-sync.json
Auth: Managed via `connection-manager.md`.
Resilience: Failures are non-fatal; state is logged in `STATE.md` for retry.
</context>

<process>
1. **Verify Connection**: Ensure Jira API availability and auth tokens are valid.
2. **Resolve Mappings**: Map Phase and Plan IDs to Jira Epics and Stories.
3. **Transition Issues**: Update Jira statuses based on verification results (e.g., Verified -> Done).
4. **Sync Content**: Push plan descriptions and requirements to the relevant Jira tickets.
5. **Preserve Manual Edits**: Avoid overwriting manual comments or fields in Jira.
6. **Audit**: Log the sync event with counts of updated and created tickets.
</process>
