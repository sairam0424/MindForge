---
name: data-modeling
version: 1.0.0
min_mindforge_version: 10.0.7
status: stable
triggers: data modeling, dimensional model design, star schema design, snowflake schema design, normalization decision, schema evolution strategy, data contract definition, slowly changing dimension, entity relationship design, data warehouse modeling, schema lifecycle, data lineage mapping
---

# Data Modeling

## When this skill activates

This skill activates when the user is designing, implementing, or evolving data models.
This includes entity-relationship design, dimensional modeling (star/snowflake schemas),
normalization decisions, slowly changing dimension strategies, schema evolution planning,
data contract definitions between producers and consumers, and data lineage mapping
across transformation pipelines.

## Mandatory actions

### Before

1. Identify the workload type: OLTP (transactional) vs OLAP (analytical) vs hybrid.
2. Determine the primary consumers of the data (applications, analysts, ML pipelines).
3. Assess data volume, velocity, and variety characteristics.
4. Review existing schemas and their evolution history.
5. Identify upstream data sources and downstream consumers (lineage context).

### During

**Modeling Phases (Conceptual to Logical to Physical):**
- **Conceptual:** Business entities and relationships, no implementation details. Stakeholder-readable.
- **Logical:** Attributes, data types, keys, constraints. Technology-agnostic.
- **Physical:** Indexes, partitions, storage engines, materialized views. Technology-specific.
- Always start conceptual, refine to logical, then optimize physical. Never skip phases.

**Normalization (OLTP):**
- **1NF:** Eliminate repeating groups; atomic values in every column.
- **2NF:** Remove partial dependencies (all non-key columns depend on the full primary key).
- **3NF:** Remove transitive dependencies (non-key columns depend only on the key).
- **BCNF:** Every determinant is a candidate key.
- Normalize for OLTP (reduces anomalies, ensures consistency).
- Denormalize for OLAP (reduces joins, improves query performance).
- Document every denormalization decision with rationale.

**Star Schema (Dimensional Modeling):**
- **Fact tables:** Measurable events (transactions, clicks, shipments). Contain foreign keys + metrics.
- **Dimension tables:** Descriptive context (who, what, where, when, how).
- **Grain definition:** The most atomic level of detail in a fact table. Define grain FIRST.
- Prefer conformed dimensions (shared across fact tables) for consistency.
- Junk dimensions: combine low-cardinality flags into a single dimension.

**Snowflake Schema:**
- Use when dimensions have natural sub-hierarchies (geography: country → state → city).
- Normalizes dimension tables to reduce redundancy.
- Trade-off: more joins but less storage and clearer hierarchy.
- Prefer star schema unless dimension table size or update frequency justifies snowflaking.

**Slowly Changing Dimensions (SCD):**
- **Type 0:** Fixed, never changes (date of birth).
- **Type 1:** Overwrite old value. No history preserved. Use for corrections.
- **Type 2:** Add new row with version tracking (start_date, end_date, is_current). Full history.
- **Type 3:** Add "previous" column alongside current. Limited history (one prior value).
- **Type 6 (Hybrid):** Combines Types 1, 2, and 3 for maximum flexibility.
- Default to Type 2 unless storage or query complexity is a concern.

**Data Contracts:**
- Agreement between data producer and consumer on schema + semantics + SLA.
- Schema: field names, types, nullability, constraints.
- Semantics: business meaning of each field (not just technical definition).
- SLA: freshness guarantee, completeness threshold, availability window.
- Enforce contracts via schema validation in pipelines (Great Expectations, dbt tests).
- Breaking contract changes require notification and migration period.

**Schema Evolution:**
- **Additive (safe):** New optional columns, new tables, new indexes.
- **Breaking (dangerous):** Column removal, type changes, renaming, adding NOT NULL without default.
- Use migration scripts (Flyway, Alembic, Liquibase) for all schema changes.
- Version schemas and maintain a changelog.
- Test migrations against production-like data volumes before deploying.

**Data Lineage:**
- Track data from source → transformation → consumption.
- Document at column-level granularity for critical fields.
- Use tools (dbt lineage graph, Apache Atlas, DataHub) for automated discovery.
- Lineage enables impact analysis (what breaks if this source changes?).
- Required for regulatory compliance (GDPR: where does PII flow?).

### After

1. Verify grain is explicitly defined for every fact table.
2. Confirm normalization level matches workload type (OLTP normalized, OLAP denormalized).
3. Validate SCD strategy is documented for every dimension with mutable attributes.
4. Ensure data contracts exist between all critical producer-consumer pairs.
5. Check that schema evolution follows additive-first principles.
6. Verify lineage is documented for compliance-sensitive data flows.

## Self-check before task completion

- [ ] Modeling followed the conceptual → logical → physical progression.
- [ ] Normalization level is appropriate for the workload (OLTP vs OLAP).
- [ ] Fact table grain is explicitly defined and documented.
- [ ] SCD types are chosen and justified for mutable dimensions.
- [ ] Data contracts define schema, semantics, and SLA for critical interfaces.
- [ ] Schema evolution strategy avoids breaking changes without migration.
- [ ] Data lineage is mapped for compliance-sensitive and business-critical paths.
- [ ] Physical optimizations (indexes, partitions) are justified by query patterns.
