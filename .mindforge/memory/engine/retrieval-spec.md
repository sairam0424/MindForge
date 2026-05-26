# MindForge v2 — Knowledge Retrieval Specification

## Purpose

The Retrieval Engine is responsible for identifying and loading the most relevant pieces of long-term memory into the current session context to improve agent performance and consistency.

## Components

- **Indexer (`knowledge-indexer.js`)**: Handles the scoring and ranking of knowledge entries.
- **Session Loader (`session-memory-loader.js`)**: Orchestrates the loading of relevant memories at the start of a session.

## Scoring Logic (TF-IDF + Heuristics)

Relevance is calculated using a multi-factor scoring model:

1. **Text Search (TF-IDF)**:
    - Tokenizes the query and knowledge text.
    - Calculates Term Frequency (TF) and Inverse Document Frequency (IDF).
    - Entries must have a positive TF-IDF score to be considered relevant if keywords are present.

2. **Confidence & Recency**:
    - **Confidence Score**: Boosts entries with higher confidence levels (reinforced over time).
    - **Recency Decay**: Prefer more recent knowledge entries, especially for bug patterns.

3. **Tag Overlap**:
    - Queries can include required tags (e.g., `#typescript`).
    - Entries with matching tags receive a significant boost.

4. **Inhibitors**:
    - Deprecated entries are never retrieved.
    - Low-confidence "noise" entries are filtered out.

## Context Injection

During session start, the loader:
1. Performs a broad search based on the current project's primary technology stack and recent activities.
2. Selects the top `N` (default 5-10) most relevant entries.
3. Injects them into the agent's secondary context (e.g., as a dedicated "Memory context" block).

## SDK Interface

```typescript
const relevantKnowledge = await memory.query("query string", ["#tag1"], 5);
```
