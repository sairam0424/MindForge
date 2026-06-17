---
name: "mindforge:data-pipeline"
description: "Design data pipeline with quality gates. Usage: /mindforge:data-pipeline [domain] [--type batch|streaming|hybrid] [--orchestrator airflow|dagster]"
argument-hint: "[domain] [--type batch|streaming|hybrid] [--orchestrator airflow|dagster]"
allowed-tools:
  - list_dir
  - view_file
---

<objective>
Design a data pipeline architecture with schema enforcement, quality gates, orchestration, and lineage tracking that ensures data freshness SLAs are met with full auditability.
</objective>

<execution_context>
@.mindforge/skills/data-pipeline-design/SKILL.md
</execution_context>

<context>
Skills Directory: `.mindforge/skills/data-pipeline-design/`
State: Models data flow from sources through transformations to consumers with quality enforcement at each stage.
</context>

<process>
1. **Define Data Sources and Consumers**: Inventory all data producers (APIs, databases, event streams, files) and consumers (analytics, ML models, dashboards, downstream services). Document schema expectations at each boundary.
2. **Choose Batch vs. Streaming**: Evaluate latency requirements, data volume, and processing complexity to select batch (scheduled ETL), streaming (continuous), or hybrid (lambda/kappa architecture). Document the tradeoff decision.
3. **Design Schema with Registry**: Define schemas for all pipeline stages using a schema registry (Avro, Protobuf, or JSON Schema). Enforce backward/forward compatibility rules and version evolution strategy.
4. **Implement Extraction Layer**: Design source connectors with change data capture (CDC) where possible. Handle incremental extraction with watermarks, full refresh fallback, and source system rate limiting.
5. **Add Quality Gates**: Implement data quality checks at ingestion and transformation boundaries — null rate thresholds, value range validation, freshness checks, row count anomaly detection, and schema conformance verification.
6. **Configure Orchestration**: Design the DAG with appropriate retry policies, backoff strategies, timeout limits, and dependency management. Include SLA monitoring and alerting for late-running tasks.
7. **Plan Backfill Strategy**: Design the mechanism for historical data reprocessing — idempotent transformations, partition-based reruns, and backfill scheduling that does not interfere with real-time processing.
8. **Monitor Freshness SLA**: Define freshness targets per dataset and implement monitoring that tracks end-to-end latency from source event to consumer availability. Alert before SLA breach.
9. **Document Lineage**: Implement column-level lineage tracking showing data provenance from source through all transformations to final consumption. Enable impact analysis for upstream schema changes.
10. **Design Failure Recovery**: Specify dead-letter handling, partial failure semantics, exactly-once vs. at-least-once guarantees, and manual intervention procedures for unrecoverable failures.
</process>
