---
name: mindforge:dashboard
description: Start the MindForge real-time web dashboard
argument-hint: [--port N] [--open] [--stop] [--status]
allowed-tools:
  - run_command
  - list_dir
  - view_file
  - open_browser_url
---

<objective>
Provide a real-time web-based observability interface for the project, allowing the team to monitor execution progress, quality metrics, pending approvals, and team activity.
</objective>

<execution_context>
.claude/commands/mindforge/dashboard.md
</execution_context>

<context>
Port: Default 7339 (configurable via --port).
Security: Binding to 127.0.0.1 (local only).
Features: Server-Sent Events for live updates, no-auth by design.
</context>

<process>
1. **Handle Flags**:
    - If `--stop`: Find the PID from the PID file and terminate the process.
    - If `--status`: Check if the dashboard is running and report the URL/PID.
    - Default: Start the server.
2. **Start Server**: Execute the dashboard binary/script on the specified port.
3. **Open Browser**: If `--open` is provided, trigger the default system browser to the dashboard URL.
4. **Monitor**: Listen for steering inputs from the dashboard and route them to the active MindForge session.
5. **Log**: Record `dashboard_started` or `dashboard_stopped` in the audit log.
</process>
