---
name: "mindforge:knowledge-graph"
description: "Design knowledge graph architecture. Usage: /mindforge:knowledge-graph [domain] [--db neo4j|neptune|dgraph] [--scale nodes]"
argument-hint: "[domain] [--db neo4j|neptune|dgraph] [--scale nodes]"
allowed-tools:
  - list_dir
  - view_file
---

<objective>
Design a scalable knowledge graph system for relationship-rich data modeling, entity resolution, and semantic querying. This command creates graph database architecture with schema design, query optimization strategies, entity linking pipelines, and reasoning capabilities for complex relationship traversals and inference.
</objective>

<execution_context>
@.mindforge/skills/knowledge-graphs/SKILL.md
</execution_context>

<context>
Skills Directory: `.mindforge/skills/knowledge-graphs/`
State: Analyzes domain entity relationships, query patterns, scale requirements, and reasoning needs to design graph schema, database selection, ingestion pipelines, and query optimization strategies.
</context>

<process>
1. **Domain and Schema Modeling**: Identify core entities and relationship types, design ontology with classes, properties, and constraints, model multi-hop relationships and temporal dimensions, and define cardinality rules and validation logic.

2. **Graph Database Selection**: Compare options (Neo4j for ACID/Cypher, Neptune for AWS integration, Dgraph for distributed scale), evaluate trade-offs (consistency vs availability, query expressiveness vs performance), and specify deployment topology (single-node, cluster, multi-region).

3. **Data Ingestion and ETL**: Design entity extraction pipelines from structured/unstructured sources, implement entity resolution and deduplication with fuzzy matching, create relationship inference rules from co-occurrence patterns, and build incremental update mechanisms for real-time graphs.

4. **Query Optimization**: Implement indexing strategies for high-cardinality properties, design query patterns for common traversals (shortest path, neighborhood expansion, pattern matching), optimize for specific workloads (OLTP vs OLAP graph queries), and create materialized views for frequent aggregations.

5. **Entity Linking and Enrichment**: Design entity disambiguation with contextual embeddings, implement cross-source entity alignment, create knowledge base augmentation from external graphs (Wikidata, DBpedia), and build confidence scoring for inferred relationships.

6. **Graph Reasoning and Inference**: Implement rule-based inference (transitive closure, property inheritance), design probabilistic reasoning with uncertainty quantification, create graph neural network embeddings for link prediction, and specify reasoning depth limits for query performance.

7. **Monitoring and Maintenance**: Define graph quality metrics (completeness, consistency, freshness), implement anomaly detection for suspicious relationships, design archival and pruning strategies for temporal graphs, and create versioning mechanisms for schema evolution.
</process>
