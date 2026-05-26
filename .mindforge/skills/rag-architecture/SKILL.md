---
name: rag-architecture
version: 1.0.0
min_mindforge_version: 0.1.0
status: stable
triggers: rag architecture, chunking strategy, embedding model selection, retrieval pipeline, dense retrieval, sparse retrieval, hybrid retrieval, re-ranking, context packing, semantic chunking, overlap strategy, retrieval evaluation
---

# Skill — RAG Architecture

## When this skill activates
Any task involving Retrieval-Augmented Generation pipeline design, document
chunking, embedding model selection, retrieval strategies, re-ranking, or
RAG evaluation metrics.

## Mandatory actions when this skill is active

### Before writing any code
1. Define the corpus characteristics (document types, sizes, update frequency).
2. Choose chunking strategy based on content structure.
3. Select embedding model based on accuracy vs cost vs latency trade-offs.

### During implementation
- Implement hybrid retrieval (dense + sparse) with score fusion.
- Add re-ranking stage for precision improvement.
- Instrument retrieval metrics (latency, recall, relevance scores).

### After implementation
- Evaluate with ground-truth Q&A pairs (recall@k, MRR, answer correctness).
- Document the RAG pipeline in ARCHITECTURE.md.
- Set up monitoring for retrieval quality degradation.

## Chunking Strategies

### Fixed-Size Chunking
- Split at token/character boundary (e.g., 512 tokens per chunk).
- Add overlap between chunks (50-100 tokens) to preserve context at boundaries.
- Simplest approach, works well for homogeneous content.
- Trade-off: may split mid-sentence or mid-concept.

### Semantic Chunking
- Split on topic/meaning boundaries (not arbitrary positions).
- Use embedding similarity: when similarity drops between sentences, split there.
- Better for: heterogeneous documents, technical content.
- More expensive to compute but produces coherent chunks.

### Recursive/Hierarchical Chunking
- Split by document structure: headers → paragraphs → sentences.
- Respect document hierarchy (never split a heading from its content).
- Best for: well-structured documents (markdown, HTML, documentation).
- Preserves context and organizational meaning.

### Chunking Parameters
| Parameter | Recommended Range | Trade-off |
|-----------|------------------|-----------|
| Chunk size | 256-1024 tokens | Larger = more context, less precise retrieval |
| Overlap | 10-20% of chunk size | More overlap = fewer boundary issues, more storage |
| Min chunk size | 50 tokens | Avoid tiny fragments that lack meaning |

## Embedding Models

### Commercial Models
| Model | Dimensions | Context | Best For |
|-------|-----------|---------|----------|
| OpenAI text-embedding-3-large | 3072 | 8191 tokens | Highest accuracy, general purpose |
| OpenAI text-embedding-3-small | 1536 | 8191 tokens | Good accuracy, lower cost |
| Cohere embed-v3 | 1024 | 512 tokens | Multilingual, search-optimized |

### Open-Source Models
| Model | Dimensions | Context | Best For |
|-------|-----------|---------|----------|
| bge-large-en-v1.5 | 1024 | 512 tokens | English, self-hosted |
| e5-large-v2 | 1024 | 512 tokens | Instruction-tuned retrieval |
| GTE-large | 1024 | 512 tokens | General text embeddings |

### Selection Criteria
- **Accuracy**: benchmark on your domain data (MTEB leaderboard as starting point).
- **Cost**: per-token pricing for commercial, compute cost for self-hosted.
- **Latency**: batch encoding speed matters for ingestion pipeline.
- **Dimensions**: higher = more accurate but more storage and slower search.

## Retrieval Strategies

### Dense Retrieval (Vector Search)
- Embed query → find nearest neighbors in vector space.
- Good for: semantic similarity, paraphrase matching.
- Weak for: exact keyword matching, rare terms, proper nouns.
- Indexes: HNSW (fast, approximate), IVF (memory-efficient), flat (exact).

### Sparse Retrieval (BM25/TF-IDF)
- Term frequency-based scoring.
- Good for: exact keyword matching, rare/specific terms, proper nouns.
- Weak for: semantic similarity, paraphrases.
- Fast, no GPU needed, works out-of-the-box.

### Hybrid Retrieval (Recommended)
- Run both dense and sparse retrieval.
- Combine results using Reciprocal Rank Fusion (RRF):
```
RRF_score = sum(1 / (k + rank_i)) for each retrieval method
k = 60 (standard constant)
```
- Gets best of both worlds: semantic understanding + keyword precision.

## Re-Ranking

### Cross-Encoder Re-Ranking
- Take top-k results from retrieval (e.g., top 20-50).
- Score each (query, document) pair with a cross-encoder model.
- Re-order by cross-encoder score, return top-n (e.g., top 5).
- Much more accurate than bi-encoder similarity, but slower.

### Models for Re-Ranking
- Cohere Rerank v3 (commercial, high quality).
- bge-reranker-large (open-source, good quality).
- ms-marco-MiniLM (lightweight, fast).

### When to Re-Rank
- Always (unless latency budget is extremely tight).
- Especially valuable when initial retrieval returns many marginal results.
- Cost: adds 50-200ms per query (for 20-50 candidates).

## Context Packing

### Strategies
- Fill LLM context window efficiently with retrieved chunks.
- Order by relevance (most relevant first).
- Deduplicate overlapping chunks (remove redundant content).
- Include source metadata (document title, section heading) for grounding.

### Context Window Management
```
[System prompt] + [Retrieved chunks] + [User query] + [Generation buffer]
     ~500 tokens    ~3000-6000 tokens    ~100 tokens     ~1000 tokens
```

### Diminishing Returns
- More context is not always better.
- After ~5-8 highly relevant chunks, quality often plateaus or degrades.
- "Lost in the middle" effect: LLMs pay less attention to middle of context.
- Place most relevant chunks at beginning and end.

## Evaluation Metrics

### Retrieval Quality
| Metric | Description | Target |
|--------|-------------|--------|
| Recall@k | % of relevant docs in top-k results | > 0.85 at k=10 |
| MRR (Mean Reciprocal Rank) | Average 1/rank of first relevant result | > 0.7 |
| NDCG@k | Normalized discounted cumulative gain | > 0.75 |
| Precision@k | % of top-k results that are relevant | > 0.5 at k=5 |

### End-to-End Quality
| Metric | Description | Target |
|--------|-------------|--------|
| Answer correctness | Does the answer match ground truth? | > 0.8 |
| Faithfulness | Is the answer supported by retrieved context? | > 0.9 |
| Relevance | Are retrieved documents relevant to query? | > 0.85 |

### Evaluation Process
1. Create ground-truth dataset: 50-200 Q&A pairs with source documents.
2. Run queries through pipeline, measure retrieval metrics.
3. Generate answers, measure end-to-end metrics.
4. Iterate on chunking/retrieval/prompting based on results.

## Self-check before task completion

Before marking a task done when this skill was active:

- [ ] Did I read the full SKILL.md before starting? (Not just the triggers)
- [ ] Is chunking strategy appropriate for the content type?
- [ ] Is hybrid retrieval implemented (dense + sparse)?
- [ ] Is re-ranking applied to improve precision?
- [ ] Is context packing efficient (deduplication, relevance ordering)?
- [ ] Are evaluation metrics defined with ground-truth data?
- [ ] Is retrieval quality monitored in production?
