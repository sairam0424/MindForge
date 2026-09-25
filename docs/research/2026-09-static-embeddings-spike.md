# Static Embedding Models for MindForge's Memory Layer — Feasibility Spike (2026-09-25)

> **Status:** Discovery spike only. No code changed. This document exists to answer one
> question honestly before any implementation task is written for it: does a static
> (distillation-based, lookup-table) embedding model — the kind the research synthesis
> flagged as installable in ~30 seconds from any existing Sentence Transformers model,
> with no native/compiled dependency — *replace* something MindForge's memory layer
> already calls, or would it be **brand-new functionality**? **Answer: brand-new
> functionality.** MindForge's retrieval stack has no external or neural embedding model
> call site anywhere today; everything the code calls "embedding" is sparse lexical
> TF-IDF/BM25 arithmetic. Full reasoning below.

**Scope:** Task 7 of `docs/superpowers/plans/2026-09-25-v13-upgrade-research-adoption.md`
Phase 6. Fully independent of Tasks 1–6; no shared files.

## Bottom line

MindForge's memory layer does not call an external embedding model, does not vendor a
neural network, and does not ship or download model weights of any kind. Every function
named `embed*`/`Embed*`/`buildEmbeddings` in `bin/memory/` computes a **sparse TF-IDF
vector** — a plain `{ token: weight }` object built from tokenizing text and weighting by
term frequency × inverse document frequency (`bin/memory/embedding-engine.js`). Retrieval
ranking elsewhere in the memory layer (`bin/memory/vector-hub.js`, SQLite FTS4 tables) is
BM25-style lexical scoring computed in JS over `matchinfo()` — also not a neural model.
"Vector" and "embedding" in this codebase are naming choices for lexical-statistics data
structures, not references to dense/neural sentence embeddings.

Because there is no existing dense-embedding call site, a static embedding model (e.g. a
Model2Vec-style distillation: a per-token vector lookup table with mean pooling, no
forward pass through a transformer) would not be a drop-in swap for anything. It would be
a **new retrieval signal added alongside** the existing TF-IDF/BM25 signals — new data
(a shipped or downloaded vector table), a new module, and a new fan-in point into the
ranked-list fusion that already exists for exactly this kind of multi-signal merge
(`bin/memory/retrieval-fusion.js`'s `fuseResults()`, which does Reciprocal Rank Fusion
over ranked lists specifically because they can have "incomparable scoring functions").

## What was checked, and how

### Step 1 — locate the current embedding call site

```
$ grep -rln "embedding\|Embedding" bin/memory/*.js
bin/memory/auto-shadow.js
bin/memory/embedding-engine.js
bin/memory/knowledge-indexer.js
bin/memory/knowledge-graph.js
bin/memory/retrieval-fusion.js
bin/memory/federated-sync.js
bin/memory/knowledge-capture.js
```

Read every file this found. Findings per file:

- **`bin/memory/embedding-engine.js`** (388 lines) — its own header states the design
  intent plainly: *"MindForge v2.4.0 — Embedding Engine (RAG 2.0). Local-first TF-IDF
  vector space for semantic similarity. No external API dependencies — runs entirely on
  local compute."* (`embedding-engine.js:1-13`). Concretely:
  - `tokenize()` (`:48-61`) — regex-based tokenizer (camelCase/snake_case splitting,
    stopword filtering). No model.
  - `computeTfIdfVector()` (`:102-131`) — classic TF × smoothed-IDF, capped to the
    top-200 terms by weight (`MAX_VECTOR_TERMS`, `:23`). This is what every "vector" in
    this module actually is: a sparse `{token: weight}` object, dimensionality = however
    many distinct tokens survive the cap, not a fixed dense dimension.
  - `cosineSimilarity()` (`:200-229`) — dot product over the *shared keys* of two sparse
    objects. Works because the vectors are sparse lexical, not dense.
  - `bm25Score()` / `buildBM25Index()` (`:144-190`) — a second, independent lexical
    scorer (BM25 with `k1=1.5`, `b=0.75`), also token-based.
  - `buildEmbeddings()` / `embedQuery()` / `findSimilar()` / `inferEdges()`
    (`:238-319`) — corpus-level orchestration: tokenize everything, build one shared
    document-frequency table, vectorize, rank by cosine similarity. All lexical.
  - `saveCache()` / `loadCache()` (`:330-368`) — persists the TF-IDF vectors + df table
    to `.mindforge/memory/embeddings.json`. The file is named `embeddings.json` but its
    schema (`schema_version`, `df`, `vectors`) is TF-IDF cache data, not model weights.

- **`bin/memory/knowledge-graph.js`** — `require('./embedding-engine')` as `Embedder`
  (`:18`). The one call site that matters most for "where would this plug in": exported
  function `findRelated(queryText, vectors, df, N, opts)` (`:389-448`) calls
  `Embedder.findSimilar(queryText, vectors, df, N, topK * 2)` at `:393` to get its first
  ranked list, then does graph traversal from the top matches, then blends the two with
  a fixed weighting `score = embeddingScore * 0.6 + graphScore * 0.4` (`:439`). The
  `vectors`/`df`/`N` arguments passed in are the TF-IDF cache from `embedding-engine.js`
  — there is no separate dense-vector store behind this function.

- **`bin/memory/knowledge-capture.js`** — `require('./embedding-engine')` as `Embedder`
  (`:13`); calls `Embedder.buildEmbeddings(allEntries)` (`:89`) purely to auto-infer
  `RELATED_TO` graph edges between knowledge entries above the similarity threshold.
  Same TF-IDF vectors, different consumer.

- **`bin/memory/auto-shadow.js`** — same pattern: builds TF-IDF embeddings
  (`Embedder.buildEmbeddings`, `:66`) then queries both the knowledge graph (traversal)
  and the embedding engine (cosine similarity) for auto-shadow retrieval.

- **`bin/memory/federated-sync.js`** — calls `EmbeddingEngine.cosineSimilarity(
  EmbeddingEngine.computeTfIdfVector(...), EmbeddingEngine.computeTfIdfVector(...))`
  directly (`:186-188`), TF-IDF vectors built per-comparison rather than from a shared
  corpus. Used to detect near-duplicate entries during federated memory sync.

- **`bin/memory/knowledge-indexer.js`** — imports `buildBM25Index`/`bm25Score` from
  `embedding-engine.js` (`:15`) — the BM25 lexical scorer, not the TF-IDF cosine path.

- **`bin/memory/retrieval-fusion.js`** — implements Reciprocal Rank Fusion
  (`fuseResults()`, `:31-56`) to merge multiple ranked lists by rank position only,
  independent of each list's underlying score scale. Its header comment explains *why*
  RRF is the right tool here: *"RRF eliminates the need for score normalization across
  retrieval paths with incomparable scoring functions (embedding similarity, BM25, graph
  traversal, FTS rank)"* (`:6-8`). That comment describes RRF's general applicability —
  today the "embedding similarity" list it fuses is still the TF-IDF cosine list from
  `embedding-engine.js`, not a neural embedding. This module is nonetheless the correct
  integration point for a *future* dense-embedding ranked list, precisely because it was
  built to fuse heterogeneous scores without caring what produced them.

- **`bin/memory/vector-hub.js`** (1079 lines, sql.js/WASM-SQLite persistence layer) —
  grepped explicitly for `embedding`/`Embedding`: **zero matches**. Despite the module
  name, it does not compute or store embeddings at all. It is an FTS4 (SQLite full-text
  search) query builder and JS-side BM25-style ranker over `matchinfo('pcnx')` blobs
  (`:13-49`), addressing a documented ranking bug (FTS-01) where unranked FTS4 results
  had measured recall@10 of 0.0000 on the repo's own eval corpus. "Vector" in the module
  name refers to the file's role in the broader memory/vector subsystem, not to
  dense-vector storage — there is no vector column, no `sqlite-vec`/`pgvector`-style
  extension, and no ANN index anywhere in this file.

- **`bin/memory/semantic-hub.js`** (207 lines) — grepped explicitly: **zero matches**
  for `embedding`/`Embedding` as well, despite the "semantic" name.

Confirmed independently with broader greps across the same directory for any sign of an
external or neural embedding dependency:

```
$ grep -rn "sentence-transformer\|OpenAI\|text-embedding\|dense vector\|neural embed\|@xenova\|transformers\b" bin/memory/*.js
(no matches)

$ grep -rn "model2vec\|static.embed\|potion\|distill" bin/ .mindforge/
(no matches outside of unrelated prose, e.g. "distill" used in a persona description)
```

**Conclusion for Step 1: MindForge's retrieval stack runs on sparse lexical
statistics (TF-IDF + BM25) end to end. There is no external or neural embedding model
call site to swap out anywhere in `bin/memory/`.**

### Step 2 — would/how a static embedding model plug in

Given Step 1's finding, a static embedding model is **new capability, not a
replacement**, and it would need to be evaluated on its own merits rather than assumed
as a straightforward upgrade:

- **What it would add:** static (distilled) embedding models — the Model2Vec pattern
  the research synthesis referenced — reduce a sentence-transformer to a per-token
  vector lookup table (typically produced via PCA + Zipf-weighting distillation from an
  existing sentence-transformer, which is where "~30-second distillation" comes from),
  then compute a sentence embedding at inference time as a lookup-and-mean-pool over
  that table — genuinely no forward pass through a neural network at inference time, so
  the runtime cost claim is plausible and the "no native dependency" claim is credible
  too: the inference-time computation is pure array arithmetic (lookups + averaging),
  which fits MindForge's zero-native-dep constraint (no node-gyp, no compiled binary,
  same reasoning that led to sql.js/WASM for SQLite here). This would give MindForge a
  **dense semantic-similarity signal** — catching paraphrases and synonyms that
  TF-IDF/BM25 miss because they require literal token overlap — which is a real gap:
  `vector-hub.js`'s own comments document a *lexical* ranking-recall problem already
  found and partially fixed (FTS-01: recall@10 0.0000 → 0.6417 on the 517-doc/10-query
  eval corpus via BM25-style JS ranking) — but BM25 still cannot match a query to a
  document that shares no tokens with it, which is exactly what a dense embedding can do
  and TF-IDF/BM25 structurally cannot.

- **What it would cost / require, concretely:**
  1. **A shipped or fetched model artifact.** Even a small static-embedding table (the
     smallest public Model2Vec-style models are single-digit megabytes; general-purpose
     ones are tens of MB) is a real asset that has to live somewhere — bundled into the
     npm package (growing its install size, which cuts against the "lightweight,
     zero-native-dep" positioning the memory layer's other modules lean on) or fetched
     on first use (a new runtime dependency: network access, a download/cache/version
     step, and a new failure mode — none of which exist in `embedding-engine.js` today,
     which works fully offline by design).
  2. **A new module**, e.g. a sibling to `embedding-engine.js` (not an edit to it — the
     TF-IDF/BM25 code should stay, since RRF is explicitly designed to fuse it with a
     second signal rather than have one replace the other). It would need its own
     tokenizer/pooling logic matched to whatever model format is chosen, its own vector
     dimensionality (fixed, dense — unlike TF-IDF's variable-width sparse vectors, which
     changes how similarity and caching work), and its own on-disk cache format
     (parallel to, not reusing, `saveCache()`/`loadCache()`'s TF-IDF-shaped schema at
     `embedding-engine.js:330-368`).
  3. **A new fan-in point**, not a modified one. The natural integration seam is
     `bin/memory/retrieval-fusion.js`'s `fuseResults()` (`:31-56`) — it already accepts
     `Array<Array<{id, ...}>>` and fuses by rank regardless of scoring function, so a
     third ranked list (dense-embedding cosine similarity) could be added alongside the
     existing TF-IDF and BM25 lists without changing `fuseResults()` itself. The current
     consumer that would need to change to *produce* that third list and pass it in is
     `bin/memory/knowledge-graph.js`'s `findRelated()` (`:389-448`), which today computes
     its own fixed `embeddingScore * 0.6 + graphScore * 0.4` blend directly rather than
     calling `fuseResults()` at all — so wiring in a dense signal here would also mean
     first routing this function through the RRF fuser it currently bypasses.
  4. **No existing test or eval baseline for a dense signal.** `vector-hub.js`'s
     comments describe `npm run eval:retrieval` as the harness that measured the FTS-01
     recall fix — that script is explicitly noted elsewhere in this repo as "deliberately
     not wired" into CI, so even the tooling to evaluate whether a static embedding model
     helps is not currently exercised automatically.

**No current call site exists for this to modify in place.** The honest scope statement
for a follow-on implementation task, if this is pursued, is: *add a new static-embedding
module, decide on ship-vs-fetch for the model artifact, add it as a third ranked list
alongside TF-IDF and BM25, and route `findRelated()` through `retrieval-fusion.js`'s
`fuseResults()` instead of its current hand-rolled 0.6/0.4 blend* — a multi-file feature
addition with real packaging and offline-operation tradeoffs to resolve first, not a
one-file swap.

## Disposition

**Do not carry this into a Phase 7 implementation task as scoped.** This spike found a
genuine capability gap (no semantic/paraphrase retrieval signal, only lexical), but
closing it is new functionality with unresolved packaging tradeoffs (bundle size vs.
network fetch, both in tension with this codebase's stated zero-native-dep/offline-first
design), not a bounded, low-risk swap of an existing call site. If the project wants to
pursue it, it needs its own separately-scoped plan that makes an explicit ship-vs-fetch
decision for the model artifact and defines a recall@10/nDCG@10 target against
`npm run eval:retrieval`'s existing corpus before implementation — mirroring how Task 6
closed its own item rather than inventing a workaround for a question the evidence
didn't support.

## Sources

- `bin/memory/embedding-engine.js:1-388` (full file read)
- `bin/memory/knowledge-graph.js:18,49-57,377-448` (`Embedder` import, cache path,
  `findRelated()`)
- `bin/memory/knowledge-capture.js:13,80-90` (`Embedder` import, `buildEmbeddings()` call)
- `bin/memory/auto-shadow.js:8,20,58-69` (header comment, `Embedder` import, corpus build)
- `bin/memory/federated-sync.js:12,186-188` (direct TF-IDF vector comparison)
- `bin/memory/knowledge-indexer.js:15` (`buildBM25Index`/`bm25Score` import)
- `bin/memory/retrieval-fusion.js:1-58` (full file read — RRF `fuseResults()`)
- `bin/memory/vector-hub.js:1-100` (module header, FTS-01 comment block; grepped in full
  for `embedding`/`Embedding` — zero matches)
- `bin/memory/semantic-hub.js` (grepped in full for `embedding`/`Embedding` — zero
  matches)
- Repo-wide greps for `sentence-transformer`, `OpenAI`, `text-embedding`,
  `dense vector`, `neural embed`, `@xenova`, `transformers`, `model2vec`,
  `static.embed`, `potion`, `distill` — no relevant matches found in `bin/` or
  `.mindforge/`.
