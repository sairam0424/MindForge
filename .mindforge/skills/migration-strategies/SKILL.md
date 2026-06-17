---
name: migration-strategies
version: 1.0.0
min_mindforge_version: 0.1.0
status: stable
compose: database-patterns
triggers: zero downtime migration, expand contract migration, shadow table, backfill pattern, feature flag migration, online schema change, blue green migration, migration rollback, data migration, schema migration pattern, migration verification, dual write
---

# Skill — Migration Strategies

## When this skill activates
Any task involving database schema migrations, data migrations, zero-downtime
deployments requiring data changes, or expand-contract patterns.

## Mandatory actions when this skill is active

### Before writing any code
1. Assess the migration risk (table size, lock duration, rollback complexity).
2. Choose the migration pattern appropriate to the risk level.
3. Design the rollback path before implementing the forward migration.

### During implementation
- Ensure backward compatibility at every intermediate step.
- Implement batched processing with rate limiting for data backfills.
- Add verification queries to confirm migration correctness.

### After implementation
- Run verification (row counts, checksums, sample validation).
- Confirm rollback path works in staging.
- Document the migration in the changelog with rollback instructions.

## Expand-Contract Pattern

The safest approach for schema changes in production:

### Phase 1: Expand
- Add new column/table (nullable or with default).
- Deploy code that writes to BOTH old and new locations.
- No reads from new location yet.

### Phase 2: Migrate
- Backfill existing data from old location to new.
- Batched, rate-limited, resumable, idempotent.
- Verify all data migrated correctly.

### Phase 3: Switch Reads
- Deploy code that reads from new location.
- Old location still being written (safety net).
- Monitor for correctness issues.

### Phase 4: Contract
- Remove writes to old location.
- Drop old column/table after grace period.
- Final verification and cleanup.

## Shadow Tables

- Create new table with desired schema.
- Dual-write: every mutation hits both old and new table.
- Compare outputs periodically to verify consistency.
- Switch reads to new table when confidence is high.
- Drop old table after grace period.

## Zero-Downtime Online Schema Changes

For large tables where ALTER TABLE would lock:

### Tools
- **pt-online-schema-change** (Percona): creates shadow table, syncs via triggers.
- **gh-ost** (GitHub): triggerless, uses binary log replication.
- **pg_repack** (PostgreSQL): repacks tables without locks.

### Principles
- Never run ALTER on tables > 1M rows in production without online tools.
- Test migration duration in staging with production-sized data.
- Schedule during low-traffic windows even with online tools.
- Monitor replication lag during migration.

## Backfill Patterns

### Batched Processing
```
loop:
  SELECT batch WHERE not_migrated LIMIT 1000
  UPDATE batch SET new_column = transform(old_column)
  SLEEP(rate_limit_interval)
  IF no_more_rows: BREAK
```

### Requirements
- **Resumable**: track progress (last processed ID), restart from checkpoint.
- **Idempotent**: running twice produces same result (use upserts).
- **Rate-limited**: don't overwhelm the database (pause between batches).
- **Observable**: log progress, ETA, error counts.

## Migration Verification

### Row Count Comparison
- Count rows in source and target (should match for 1:1 migrations).
- Account for in-flight writes during comparison.

### Checksum Validation
- Hash critical columns in both source and target.
- Compare checksums batch by batch.

### Sample Validation
- Randomly sample N rows from source.
- Verify each exists in target with correct values.
- Catch edge cases that aggregate checks miss.

## Rollback Strategy

- Every migration must have a documented rollback path.
- Intermediate states must be backward-compatible (old code can still run).
- Keep old columns/tables for a grace period (minimum 7 days in production).
- Test rollback in staging before executing forward migration in production.
- Feature flags to switch between old and new code paths instantly.

## Self-check before task completion

Before marking a task done when this skill was active:

- [ ] Did I read the full SKILL.md before starting? (Not just the triggers)
- [ ] Is the migration zero-downtime (no table locks on large tables)?
- [ ] Is there a documented rollback path?
- [ ] Are backfills batched, resumable, and idempotent?
- [ ] Did I verify with row counts, checksums, or sample validation?
- [ ] Is every intermediate state backward-compatible?
