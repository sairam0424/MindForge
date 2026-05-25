---
description: "Design data schema with evolution strategy. Usage: /mindforge:data-model [domain] [--style oltp|olap|hybrid] [--contracts]"
---

<objective>
Design a data schema with proper modeling approach, evolution strategy, data contracts, and lineage documentation for a given domain.
</objective>

<execution_context>
@.mindforge/skills/data-modeling/SKILL.md
</execution_context>

<context>
Arguments: $ARGUMENTS (domain name, optional --style oltp|olap|hybrid, optional --contracts flag)
Knowledge: Current database schemas, domain model, access patterns, data volume projections.
</context>

<process>
1. **Identify entities and relationships**: Map the domain:
   - List all entities (nouns in the domain: User, Order, Product, etc.)
   - Define relationships (one-to-one, one-to-many, many-to-many)
   - Identify aggregates (consistency boundaries)
   - Mark ownership (which service owns which entity)
   - Document cardinality estimates (how many of each entity expected)
   - Identify temporal aspects (does data change over time, need history?)

2. **Choose modeling approach**: Based on --style flag or access patterns:
   - **OLTP (normalized)**: 3NF for transactional workloads, minimize write anomalies
   - **OLAP (dimensional)**: Star/snowflake schema for analytical queries, optimize reads
   - **Hybrid**: Normalized for writes + materialized views for reads
   - Consider: read/write ratio, query patterns, data volume, consistency requirements
   - Document trade-offs of chosen approach vs alternatives

3. **Define schema**: For each entity, specify:
   - Table/collection name (plural, snake_case)
   - Columns with types, constraints, and descriptions
   - Primary key strategy (UUID v7 for distributed, SERIAL for simple)
   - Foreign keys and referential integrity rules
   - Indexes (covering indexes for hot queries, partial indexes for filtered queries)
   - Partitioning strategy if data volume warrants it (by time, by tenant)
   - Soft delete vs hard delete decision per entity

4. **Plan evolution strategy**: Design for safe schema changes:
   - Additive-only migrations (add columns, add tables — never remove in-place)
   - Expand-contract pattern for breaking changes (3-phase: add new → migrate data → remove old)
   - Backward compatibility window (N-1 app version must work with N schema)
   - Migration testing: run against production-size dataset before deploy
   - Rollback plan for each migration (reverse migration script)
   - Version tracking: migration numbering, applied_at timestamps

5. **Define data contracts**: When --contracts flag is set:
   - Schema contract: exact field types, nullability, enum values
   - SLA contract: freshness (max age), completeness (% populated), volume (expected range)
   - Quality contract: uniqueness constraints, valid value ranges, referential integrity
   - Breaking change policy: versioned contracts, deprecation notices, consumer notification
   - Contract validation: automated checks in CI pipeline
   - Owner and consumer registry: who produces, who consumes each dataset

6. **Document lineage**: Trace data flow end-to-end:
   - Source systems (where data originates)
   - Transformation steps (ETL/ELT pipeline stages)
   - Storage layers (raw → cleaned → aggregated → served)
   - Consumers (which services/dashboards read this data)
   - Freshness chain (latency from source to each consumer)
   - Data classification (PII, sensitive, public) per field

7. **Output data model**: Deliver:
   - Entity-relationship diagram (ASCII or description)
   - DDL scripts (CREATE TABLE with all constraints)
   - Migration scripts for initial setup
   - Index strategy document
   - Data contract definitions (JSON Schema or Avro)
   - Lineage diagram
   - Capacity planning estimates (storage growth per month)
</process>
