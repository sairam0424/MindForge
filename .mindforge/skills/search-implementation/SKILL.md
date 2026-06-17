---
name: search-implementation
version: 1.0.0
min_mindforge_version: 10.0.7
status: stable
triggers: search implementation, full text search design, vector search architecture, hybrid search fusion, ranking algorithm design, BM25 tuning, semantic search pipeline, faceted search design, autocomplete implementation, inverted index design, search relevance tuning, search engine architecture
---

# Search Implementation

## When this skill activates

This skill activates when the user is designing, implementing, or optimizing search
functionality. This includes full-text search with inverted indexes, vector/semantic
search with embeddings, hybrid search fusion (combining BM25 + vector), ranking
algorithm design, faceted search, autocomplete/typeahead implementation, relevance
tuning, and search infrastructure architecture decisions.

## Mandatory actions

### Before

1. Identify the search use case (product catalog, document search, knowledge base, logs, code search).
2. Determine data volume and growth rate (affects index strategy and infrastructure).
3. Assess query patterns (keyword, natural language, filtered, faceted, autocomplete).
4. Identify relevance requirements (precision vs recall trade-off for the use case).
5. Review existing data pipeline and determine indexing latency tolerance (real-time vs batch).

### During

**Full-Text Search (Lexical):**
- **Inverted Index:** Maps terms to document lists with positions. Foundation of all text search.
- **BM25 Scoring:** Ranks by term frequency (TF), inverse document frequency (IDF), and document length normalization. The standard baseline for lexical relevance.
- **Analysis Pipeline:** Tokenization → lowercasing → stemming/lemmatization → stopword removal. Customize per language.
- **Field Boosting:** Weight title matches higher than body matches (title^3, body^1).
- **Phrase Matching:** Preserve term proximity for multi-word queries.
- Use Elasticsearch, OpenSearch, Solr, or PostgreSQL full-text for lexical search.

**Vector Search (Semantic):**
- **Embedding:** Convert queries and documents into dense vectors (768-1536 dimensions). Use sentence-transformers, OpenAI embeddings, or Cohere embed.
- **Similarity:** Cosine similarity or dot product between query vector and document vectors.
- **ANN Indexes:** Approximate Nearest Neighbor for sub-linear search. HNSW (best recall/speed trade-off), IVF (better for very large datasets), ScaNN.
- **Chunking:** Split long documents into passages (256-512 tokens) before embedding. Overlap chunks by 10-20%.
- Use Qdrant, Pinecone, Weaviate, pgvector, or Elasticsearch kNN for vector search.

**Hybrid Search (Fusion):**
- **Reciprocal Rank Fusion (RRF):** Merge BM25 and vector result lists. Score = sum(1 / (k + rank)) across both lists. k=60 is a common default.
- **Linear Combination:** Normalize scores from each system and combine with weights (alpha * BM25 + (1-alpha) * vector). Tune alpha per use case.
- Hybrid outperforms either alone for most use cases (lexical catches exact matches, semantic catches intent).
- Run both searches in parallel, fuse results, then apply final re-ranking.

**Faceted Search:**
- Pre-compute aggregations per field (category, price range, brand, rating).
- Return facet counts alongside search results for filter UI.
- Apply filters BEFORE computing facets (post-filter facets confuse users).
- Use bucket aggregations (terms, range, date histogram) in search engines.
- Optimize with doc_values for facetable fields.

**Autocomplete:**
- **Prefix matching:** Trie data structure or edge n-gram tokenizer (index "search" as "s", "se", "sea", "sear", "searc", "search").
- **Popularity weighting:** Boost suggestions by query frequency or click-through rate.
- **Fuzzy matching:** Tolerate typos with edit distance (Levenshtein distance <= 2).
- **Contextual suggestions:** Use recent user behavior to personalize completions.
- Target response time: < 100ms for autocomplete (users expect instant feedback).

**Relevance Tuning:**
- **Field boosting:** Prioritize title > tags > body matches.
- **Recency decay:** Score newer documents higher (exponential decay function).
- **Popularity signals:** Boost by click-through rate, view count, or purchase frequency.
- **User behavior:** Learn from clicks (Learning to Rank — LTR models).
- **A/B testing:** Measure relevance changes with online metrics (click-through, session success).
- Use NDCG (Normalized Discounted Cumulative Gain) as the offline relevance metric.

**Architecture:**
- Separate search index from primary database (search is a read-optimized view).
- Async indexing pipeline: primary DB → change stream/CDC → transform → index.
- Index latency SLA: define acceptable delay (real-time: <1s, near-real-time: <30s, batch: hours).
- Replicate search indexes for availability and read throughput.
- Monitor index lag, query latency (p50, p95, p99), and zero-result rate.

### After

1. Verify search returns relevant results for representative queries (spot-check top 10).
2. Confirm indexing pipeline is running and latency is within SLA.
3. Validate autocomplete responds within 100ms target.
4. Check facet counts are accurate and filters work correctly.
5. Measure zero-result rate and establish baseline relevance metrics (NDCG).

## Self-check before task completion

- [ ] Search type is appropriate for the use case (lexical, vector, hybrid).
- [ ] Inverted index analysis pipeline is configured for the content language.
- [ ] Vector embeddings use an appropriate model and chunk size.
- [ ] Hybrid fusion strategy (RRF or linear combination) is implemented if both systems are used.
- [ ] Autocomplete targets < 100ms latency with typo tolerance.
- [ ] Relevance tuning includes field boosting and recency/popularity signals.
- [ ] Search index is separate from primary DB with async indexing pipeline.
- [ ] Monitoring covers query latency, index lag, and zero-result rate.
