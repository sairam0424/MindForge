---
description: Generate a post-session summary document capturing work performed and resource usage
---
<objective>
Generate a comprehensive summary of an active coding session, providing a clear trail of work for stakeholders and a diagnostic record of resource usage (tokens, time, etc.).
</objective>

<execution_context>
.claude/commands/mindforge/session-report.md
</execution_context>

<context>
Storage: .planning/reports/
Data sources: Git logs, terminal history, `STATE.md`, and session memory.
</context>

<process>
1. **Gather Data**:
    - Get recent git commits and diff summaries.
    - Read the current `STATE.md` for phase/plan status updates.
    - Extract key decisions or findings from the session.
2. **Profile Resources**:
    - Estimate token usage if possible.
    - Calculate session duration.
3. **Draft Report**: Create `SESSION_REPORT_[timestamp].md` containing:
    - Summary of Work Performed
    - Outcomes achieved (Plans "completed")
    - Key Decisions
    - Resource Usage Profile
4. **Confirm**: Notify the user and provide a link to the report.
</process>
