# Temporal Vision & Hindsight Protocol (v3.0.0)

## Overview
Temporal Vision enables high-fidelity "Time-Travel Debugging" by snapshotting the `.planning/` directory at every significant audit point. Hindsight Injection allows agents to learn from past failures by rolling back state and re-executing waves with injected corrections.

## Snapshot Rules
1. **Triggering**: Snapshots MUST be triggered on any `state-changing` audit event:
   - `auto_mode_started`
   - `phase_planned`
   - `task_completed`
   - `hindsight_injected`
2. **Persistence**: Snapshots are stored in `.planning/history/[audit_id]/`.
3. **Retention**: The system retains snapshots for the current milestone. Completed milestones should be archived or purged using `/mindforge:temporal --cleanup`.

## Hindsight Injection Protocol
Hindsight Injection is a powerful tool and must be used according to these safety rules:

### 1. Identify the Failure Coordinate ($T_n$)
- Use the Dashboard Temporal Slider to find the exact audit entry where the "architectural drift" or "logic failure" occurred.

### 2. Inject the Correction
- The correction must be a concise "Steering Instruction" (e.g., "The database schema should use UUID instead of INT").
- The system will:
  - Rollback `.planning/` to $T_n$.
  - Append the `hindsight_injected` event.
  - Set state to `awaiting_regeneration`.

### 3. Verification
- After injection, the `AutoRunner` will re-trigger the wave. 
- The agent must verify that the new execution path resolves the original failure.

## Security Controls
- **Integrity**: Each snapshot includes a `SNAPSHOT-META.json` with a timestamp and file list.
- **Local-Only**: Rollback APIs are restricted to 127.0.0.1 ( localhost) to prevent remote state manipulation.
- **Atomic Operations**: History restoration uses synchronous file copies to prevent partial state corruption.

## Common Operations
- `GET /api/temporal/history`: View the timeline.
- `POST /api/temporal/inject`: Perform hindsight repair.
- `/mindforge:temporal --status`: Check history size and snapshot count.
