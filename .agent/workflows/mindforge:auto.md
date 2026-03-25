---
description: Starts the MindForge Autonomous Execution Engine for the
---
# /mindforge:auto [Phase N]

**Purpose**: Starts the MindForge Autonomous Execution Engine for the
specified phase. The agent will execute all waves, handle repairs, and
perform compliance gates without requiring human confirmation.

## Usage
- `/mindforge:auto --phase 3` (Standard unattended mode)
- `/mindforge:auto --resume` (Resumes from last checkpoint)
- `/mindforge:auto --headless` (CI/CD optimized output)
- `/mindforge:auto --dry-run` (Show the wave DAG and plan without executing)

## Behavior
- **Zero-Interaction**: Auto-approves Tier 1/2 changes if gates pass.
- **Self-Repair**: Tries RETRY/DECOMPOSE before asking for help.
- **Checkpointing**: Constant state persistence in `HANDOFF.json`.
- **Governance**: ESCALATES on Tier 3 changes (Auth/Payment/PII).

## Environment Variables
- `AUTO_MODE_TIMEOUT_MINUTES`: Default 120.
- `AUTO_PUSH_ON_WAVE_COMPLETE`: Default false.
- `SLACK_WEBHOOK_URL`: Required for notifications.
