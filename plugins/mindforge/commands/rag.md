---
description: "Design RAG pipeline architecture with chunking and retrieval. Usage - /mindforge:rag [corpus] [--chunking semantic|fixed] [--retrieval hybrid] [--rerank]"
---

<objective>
Design a production RAG (Retrieval-Augmented Generation) pipeline with optimized
chunking, hybrid retrieval, and re-ranking. Covers corpus ingestion, embedding
strategy, retrieval quality evaluation, and context window packing.
</objective>

<execution_context>
@.mindforge/skills/rag-architecture/SKILL.md
</execution_context>

<context>
$ARGUMENTS
</context>

<process>
1. Analyze the corpus: document types (PDF, markdown, code, HTML), average document length, structure (headings, tables, code blocks), and total size. Identify natural semantic boundaries.
2. Choose chunking strategy based on --chunking flag: semantic (split at paragraph/section boundaries, variable size 200-1000 tokens) or fixed (512 tokens with 50-token overlap). For code: chunk at function/class boundaries.
3. Select embedding model based on corpus domain and latency requirements: OpenAI text-embedding-3-large (general, high quality), Cohere embed-v3 (multilingual), or local (BAAI/bge-large for privacy). Benchmark on domain-specific queries.
4. Configure retrieval strategy based on --retrieval flag: dense-only (vector similarity), sparse-only (BM25/TF-IDF), or hybrid (dense + sparse with Reciprocal Rank Fusion, alpha=0.7 dense weight). Hybrid recommended for most cases.
5. Add re-ranking if --rerank flag is set: retrieve top-50 candidates with fast retrieval, then re-rank with cross-encoder (ms-marco-MiniLM or Cohere rerank-v3) to get top-k (k=5-10). Dramatically improves precision.
6. Design context packing strategy: order chunks by relevance, fit within context window budget (reserve 30% for generation), deduplicate overlapping chunks, and include metadata (source, page, section title).
7. Set up evaluation pipeline: measure recall@k (are relevant chunks in top-k?), MRR (Mean Reciprocal Rank), and end-to-end answer quality. Build a golden test set of 50+ query-answer pairs with source attribution.
8. Iterate on retrieval quality: tune chunk size, overlap, embedding model, retrieval weights, and re-ranker threshold. Use evaluation metrics to drive decisions. Target recall@10 > 0.9 on golden set.
9. Design the ingestion pipeline: document parsing, chunking, embedding generation, vector store upsert. Handle incremental updates (add/modify/delete documents) without full re-index.
10. Log rag invocation in AUDIT with: corpus size, chunking strategy, embedding model, retrieval method, evaluation metrics (recall@k, MRR).
</process>
