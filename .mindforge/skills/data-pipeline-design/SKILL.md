---
name: data-pipeline-design
version: 1.0.0
min_mindforge_version: 10.1.1
status: stable
triggers: data pipeline design, ETL pipeline, ELT pattern, batch vs streaming pipeline, exactly-once processing pipeline, schema registry pipeline, data quality gate, pipeline orchestration, data ingestion, pipeline backfill, pipeline monitoring, data freshness
---

# Skill — Data Pipeline Design

## When this skill activates
Any task involving designing data ingestion, transformation, or delivery pipelines.
Includes ETL/ELT architecture, batch vs streaming decisions, schema management,
data quality enforcement, and pipeline orchestration.

## Mandatory actions when this skill is active

### Before writing any code
1. Define data contract (schema, freshness SLA, volume, sources, consumers).
2. Decide batch vs streaming (latency requirement is the primary driver).
3. Identify exactly-once requirements (financial data = must, analytics = can relax).
4. Plan schema evolution strategy (backward-compatible changes only).

### During implementation
- Implement data quality gates before consumers see data.
- Use schema registry for all structured data exchange.
- Make all transformations idempotent (safe to re-run).
- Include dead-letter queues for malformed/failed records.
- Add lineage tracking (where did this data come from?).
- Monitor freshness SLA with alerting.

### After implementation
- Verify backfill capability (can we reprocess historical data?).
- Test schema evolution (add column, change type) without breaking consumers.
- Confirm quality gates catch known bad data patterns.
- Validate freshness SLA is met under normal load.
- Document data lineage for every output table.

## ETL vs ELT Decision

### ETL (Extract → Transform → Load)
- Transform before loading into destination.
- Best for: structured sources, known transformations, data quality at boundary.
- Tools: Airflow + Python, Spark, custom processors.
- Advantage: Clean data in warehouse, fewer warehouse compute costs.

### ELT (Extract → Load → Transform)
- Load raw data, transform in the warehouse/lakehouse.
- Best for: diverse sources, evolving transformations, exploratory analysis.
- Tools: Fivetran/Airbyte (extract+load) + dbt (transform).
- Advantage: Raw data preserved, transformations versioned and testable.

### Decision Matrix
| Factor | ETL | ELT |
|--------|-----|-----|
| Source diversity | Low (known schema) | High (many sources) |
| Transformation stability | Stable, well-defined | Evolving, experimental |
| Data volume | Moderate | Very high |
| Warehouse compute cost | Sensitive | Acceptable |
| Need raw data access | No | Yes |

## Batch vs Streaming

### Batch Processing
- Process data in scheduled intervals (hourly, daily).
- Simpler implementation, easier debugging.
- Cheaper for high-volume, latency-tolerant workloads.
- Tools: Airflow, Spark Batch, dbt.

### Stream Processing
- Process events as they arrive (real-time or near-real-time).
- Complex: windowing, ordering, late-arriving data.
- Required when business needs data in <5 minutes.
- Tools: Kafka Streams, Flink, Spark Structured Streaming.

### Decision: Use streaming only when
- Business requires <5 minute data freshness.
- Events must trigger immediate actions (fraud, alerts).
- Source naturally produces events (clickstream, IoT).

Otherwise, batch is simpler and cheaper.

## Exactly-Once Processing

### Why It's Hard
Network failures + retries = potential duplicates.

### Strategies
1. **Idempotent sinks**: Write operations produce same result regardless of repetition (UPSERT, conditional write).
2. **Deduplication keys**: Assign unique ID to each record, deduplicate at sink.
3. **Checkpointing**: Record progress markers, resume from checkpoint on failure.
4. **Transactional outbox**: Atomic write to source + outbox table, separate relay.

### Practical Guarantees
| Guarantee | Cost | Use When |
|-----------|------|----------|
| At-most-once | Lowest | Metrics where loss is acceptable |
| At-least-once + idempotent sink | Medium | Most pipelines |
| Exactly-once (Kafka transactions) | Highest | Financial, billing |

## Schema Registry

### Purpose
- Central source of truth for data schemas.
- Enforce compatibility between producers and consumers.
- Enable schema evolution without breaking downstream.

### Compatibility Modes
- **Backward compatible**: New schema can read old data (add optional fields).
- **Forward compatible**: Old schema can read new data (remove optional fields).
- **Full compatible**: Both backward and forward (safest, most restrictive).

### Rules
- All structured data exchange goes through schema registry.
- Use Avro or Protobuf (self-describing, compact, evolvable).
- Test schema changes against compatibility rules in CI.
- Never break backward compatibility without coordinated migration.

## Data Quality Gates

### Checks to Implement
| Check | Example | Severity |
|-------|---------|----------|
| Not null | Primary keys must exist | CRITICAL |
| Uniqueness | No duplicate records | CRITICAL |
| Range | Age between 0-150 | HIGH |
| Freshness | Data < 1 hour old | HIGH |
| Volume | Row count ±10% of expected | MEDIUM |
| Referential | Foreign keys resolve | MEDIUM |
| Format | Email matches pattern | LOW |

### Implementation
- Run quality checks BEFORE exposing data to consumers.
- Quarantine failing records in dead-letter table.
- Alert on quality degradation trends.
- Track quality metrics over time (quality score per table).

## Pipeline Orchestration

### Airflow DAG Best Practices
- One DAG per logical pipeline.
- Idempotent tasks (re-runnable without side effects).
- Explicit dependencies (no implicit ordering).
- SLA alerts for late-running pipelines.
- Backfill support (catchup=True with idempotent tasks).
- Retry with exponential backoff for transient failures.

### Monitoring
- Freshness SLA: alert when data is older than threshold.
- Pipeline duration: alert on >2x normal runtime.
- Record count: alert on ±20% deviation from expected.
- Error rate: alert on >1% record failures.

## Backfill Strategy

### Requirements
- Every pipeline must support historical reprocessing.
- Backfill must be idempotent (running twice = same result).
- Partition by date for efficient backfill of specific ranges.
- Backfill should not interfere with production pipeline runs.

## Self-check
- [ ] Data contract defined (schema, freshness, volume).
- [ ] Batch vs streaming decision justified by latency requirement.
- [ ] Quality gates implemented before consumer access.
- [ ] Schema registered and compatibility mode set.
- [ ] All transformations are idempotent.
- [ ] Dead-letter queue configured for failures.
- [ ] Backfill capability tested.
- [ ] Freshness SLA monitored with alerting.
- [ ] Data lineage documented.
