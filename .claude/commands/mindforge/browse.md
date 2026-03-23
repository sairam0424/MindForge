---
name: mindforge:browse
description: Control the persistent MindForge browser daemon for visual verification
argument-hint: <url | action>
allowed-tools:
  - open_browser_url
  - run_command
---

<objective>
Enable the agent to interact with web interfaces, maintain persistent sessions, and perform visual audits of UI changes using an automated browser daemon.
</objective>

<execution_context>
.claude/commands/mindforge/browse.md
</execution_context>

<context>
Security: Daemon binds to 127.0.0.1. Sessions are gitignored.
State: Supports cookie/localStorage persistence via named sessions.
</context>

<process>
1. **Control Daemon**: Start, stop, or query the health/active sessions of the browser daemon.
2. **Session Management**: Switch between browser contexts or import sessions from the host (Chrome/Arc).
3. **Navigate & Interact**: Load URLs, click selectors, and type text into input fields.
4. **Verify**: Capture screenshots of the current viewport for visual confirmation.
</process>
