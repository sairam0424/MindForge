---
name: real-time-analytics
version: 1.0.0
min_mindforge_version: 10.6.0
status: stable
triggers: real-time analytics architecture, OLAP cube design, materialized view strategy, pre-aggregation pipeline, sub-second query optimization, real-time dashboard backend, clickhouse architecture, druid pinot design, real-time metric computation, live analytics, streaming analytics, real-time aggregation
---

# Skill — Real-Time Analytics

## When this skill activates
This skill activates when building sub-second query systems for analytical workloads, implementing real-time dashboards, or designing OLAP architectures. Use when users need live insights rather than batch-refreshed reports.

## Mandatory actions when this skill is active

### Before writing any code
1. Profile query patterns to identify: aggregation dimensions, filter selectivity, time ranges, and concurrency requirements for index and materialization strategy
2. Select appropriate OLAP engine: ClickHouse (fast scans, columnar), Druid (streaming ingestion, roll-ups), Pinot (low-latency queries), Redshift (AWS ecosystem)
3. Design pre-aggregation strategy: which dimensions to roll up, granularity levels (minute/hour/day), and cardinality explosion prevention
4. Calculate data volume and query throughput requirements: events/sec, retention period, query concurrency, and acceptable latency (p95/p99)

### During implementation
- Implement streaming ingestion pipeline: Kafka → transformation → OLAP store with exactly-once semantics and backpressure handling
- Design table schema optimized for query patterns: sorting keys matching filters, partition keys for time pruning, materialized columns for computed fields
- Create pre-aggregation jobs for common metrics: tumbling windows for counts/sums, HyperLogLog for distinct counts, quantile sketches for percentiles
- Build materialized views for expensive joins and aggregations: incrementally updated, proper indexing, and staleness monitoring
- Implement query optimization: partition pruning, secondary indexes, caching layer (Redis), and query result memoization
- Design data retention policies: hot tier (recent, full granularity), warm tier (older, partial roll-up), cold tier (archived, summarized)
- Create query routing layer: directing simple queries to pre-aggregations, complex queries to raw data with circuit breakers for expensive operations

### After implementation
- Build monitoring for ingestion pipeline: lag, throughput, error rates, and duplicate detection with alerting on anomalies
- Create query performance dashboards: latency percentiles, query volume, cache hit rates, expensive queries, and optimization opportunities
- Generate cost analysis reports: storage by tier, compute costs, query costs, and optimization recommendations (better indexes, more pre-aggs)
- Document query best practices: efficient filtering, avoiding full scans, using pre-aggregations, and when to use caching

## Self-check before task completion
- [ ] Query latency meets SLA (typically p95 <1s, p99 <3s) for common dashboard queries under expected concurrency
- [ ] Pre-aggregation strategy covers 80%+ of query patterns with automated refresh and staleness monitoring
- [ ] Ingestion pipeline handles peak load with <1 minute lag and proper backpressure to prevent data loss
- [ ] Data retention policy implemented with automated tiering and archival to optimize costs
- [ ] Query optimization tested with partition pruning verified and slow query identification for further tuning
