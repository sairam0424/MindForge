---
name: "mindforge:embeddings"
description: "Design embedding and vector search system. Usage: /mindforge:embeddings [domain] [--db pinecone|weaviate|qdrant|pgvector] [--hybrid true|false]"
argument-hint: "[domain] [--db pinecone|weaviate|qdrant|pgvector] [--hybrid true|false]"
allowed-tools:
  - list_dir
  - view_file
---

<objective>
Design a comprehensive embedding and vector search system for semantic retrieval, recommendation engines, or similarity matching. This command creates architecture for embedding generation, vector database selection, indexing strategies, and hybrid search combining dense vectors with keyword search for optimal recall and precision.
</objective>

<execution_context>
@.mindforge/skills/embedding-systems/SKILL.md
</execution_context>

<context>
Skills Directory: `.mindforge/skills/embedding-systems/`
State: Analyzes domain requirements, data characteristics, query patterns, and scale constraints to recommend embedding models, vector databases, indexing configurations, and retrieval strategies.
</context>

<process>
1. **Domain and Data Analysis**: Characterize input data types (text, images, multimodal), assess volume and dimensionality, analyze query patterns (exact match, semantic similarity, filtering), and define latency/throughput requirements.

2. **Embedding Model Selection**: Recommend models by domain (text: OpenAI ada-002/text-embedding-3, Cohere, E5; images: CLIP, DINOv2), evaluate trade-offs (dimensionality vs accuracy, speed vs quality), and specify fine-tuning requirements for domain adaptation.

3. **Vector Database Architecture**: Compare database options (Pinecone for managed simplicity, Qdrant for control, Weaviate for multimodal, pgvector for SQL integration), design sharding and replication strategies for scale, and specify index types (HNSW, IVF, flat) based on query patterns.

4. **Hybrid Search Implementation**: Design keyword search integration (BM25, Elasticsearch) alongside vector search, implement score fusion strategies (RRF, weighted combination), and optimize for both semantic understanding and exact term matching.

5. **Indexing and Optimization**: Configure HNSW parameters (M, ef_construction) for speed/accuracy balance, implement quantization (product quantization, scalar quantization) for memory efficiency, and design incremental indexing for real-time updates.

6. **Query Optimization**: Implement query preprocessing (normalization, expansion, reranking), design filtered search with metadata constraints, and create multi-stage retrieval pipelines (coarse-to-fine, two-tower reranking).

7. **Monitoring and Evaluation**: Define retrieval quality metrics (precision@k, recall@k, MRR, NDCG), implement latency tracking and cost monitoring per query, and design A/B testing framework for embedding model comparisons.
</process>
