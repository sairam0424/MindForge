# ADR-040: Additive Schema Migration Strategy

## Status
Accepted

## Context
MindForge v2.0.0 introduces new fields to `AUDIT.jsonl` and `token-usage.jsonl`. Previous migrations sometimes involve destructive changes or complex transformations. To ensure data integrity for enterprise users, we need a safer, more robust migration path.

## Decision
We will adopt an **additive-only** migration strategy for v2.0.0.

1.  **Non-Destructive**: Every migration step must strictly append or backfill missing values without overwriting existing data.
2.  **Smart Skipping**: Migration scripts must detect if a file is already at the target schema level and skip processing (idempotency).
3.  **Backup-First**: Automatic creation of `.backups/` directories before any file modification.
4.  **Audit Backfill**: Pre-v2.0.0 audit entries will be backfilled with `runtime: "unknown"` and `agent_id: "migrated-v1"` to preserve historical consistency.

## Consequences
- **Positive**: Zero risk of data loss during v1-to-v2 upgrades.
- **Positive**: Simplified testing of migration logic (only new fields need verification).
- **Positive**: Enterprise-grade reliability for long-running audit logs.
- **Negative**: Historical entries will contain placeholder values for new fields.
