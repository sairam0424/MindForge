---
name: mindforge:audit
description: Query the .planning/AUDIT.jsonl log by phase, event, date, or severity
argument-hint: [filters]
allowed-tools:
  - run_command
  - view_file
  - list_dir
---

<objective>
Provide a structured interface to query and validate the project's audit logs, ensuring accountability and traceability of all agent actions and system events.
</objective>

<execution_context>
.claude/commands/mindforge/audit.md
</execution_context>

<context>
Storage: .planning/AUDIT.jsonl
Archive: .planning/audit-archive/
Filters: --phase, --event, --agent, --severity, --date, --summary, --verify, --export
</context>

<process>
1. **Parse Filters**: Identify the search criteria (phase, event, severity, etc.).
2. **Execute Query**:
    - Use `grep` or `jq` (if available via bash) to filter the JSONL file.
    - If `--summary`: Aggregate counts by event and severity.
    - If `--verify`: Check for JSON validity and chronological integrity.
3. **Handle Large Logs**: If the log exceeds 10,000 lines, rotate it to the archive directory.
4. **Export (Optional)**: If `--export` is used, write filtered results to the target path (ensuring project boundary safety).
5. **Display**: Present the filtered log or summary to the user.
</process>
