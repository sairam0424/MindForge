---
name: mindforge:auto
description: Start the MindForge Autonomous Execution Engine
argument-hint: [Phase N] [--resume] [--headless] [--dry-run]
allowed-tools:
  - run_command
  - list_dir
  - view_file
  - write_to_file
---

<objective>
Execute a planned phase entirely unattended, coordinating wave fulfillment, self-repair of minor failures, and compliance gating while maintaining a persistent state checkpoint.
</objective>

<execution_context>
.claude/commands/mindforge/auto.md
</execution_context>

<context>
Storage: HANDOFF.json checkpoints.
Governance: Auto-approves Tier 1/2; Escalates Tier 3.
Notifications: Requires Slack/Discord webhooks for mission-critical alerts.
</context>

<process>
1. **Boot**: Load the specifies phase or resume from the last known checkpoint in `HANDOFF.json`.
2. **Wave Engine**: Execute the DAG of tasks sequentially or in parallel based on dependencies.
3. **Self-Repair**: Automatically attempt to retry or decompose tasks that encounter recoverable errors.
4. **Gating**: Evaluate compliance gates between waves. Escalates to human for Tier 3 changes.
5. **Persistence**: Save state after every successful tool call or task completion.
6. **Finalize**: Shift status to "Verify Pending" once all waves are complete.
</process>
