# MindForge Engine — Semantic Shard Controller

## Purpose
Manage the tiered storage of session context items to maintain high reasoning performance while minimizing token waste.

## 1. The Tri-Tier Memory Model

| Tier | Storage Location | Retention Scope | Content Type |
| :--- | :--- | :--- | :--- |
| **Hot** | `HANDOFF.json` | 1-2 Sessions | Active tasks, current file offsets, uncommitted intent. |
| **Warm** | `.planning/memories/WARM-SHARD-N.jsonl` | Phase/Milestone | Decisions with rationale, discoveries, implicit quirks. |
| **Cold** | `.mindforge/memory/*.jsonl` | Project Life | Architecture patterns, global team preferences, recurring bugs. |

## 2. Semantic Relevance Density (SRD) Scoring

Every context item (Decision, Discovery, Task Result) is scored before compaction using the following formula:

**SRD = (D * 0.6) + (F * 0.1) + (I * 0.3)**

- **D (Decisiveness)**: 1.0 for terminal decisions (ADRs), 0.5 for transient discoveries.
- **F (Frequency)**: Count of references in the last 10 tool calls (normalized 0-1).
- **I (Impact)**: 1.0 for security/core-logic, 0.5 for UI/Docs, 0.1 for housekeeping.

### Tier Routing Gates
- **SRD > 0.8**: Tier 1 (Hot) -> Retain in `HANDOFF.json`.
- **0.4 <= SRD <= 0.8**: Tier 2 (Warm) -> Move to `WARM-SHARD-N.jsonl`.
- **SRD < 0.4**: Tier 3 (Cold/Drop) -> Archive to `.mindforge/memory` or drop if redundant.

## 3. Shard Management Logic

### On Compaction Trigger (70% Context)
1. Invoke `bin/shard-helper.js --analyse` to generate SRD scores.
2. Filter items by SRD.
3. Append Warm items to `.planning/memories/WARM-SHARD-N.jsonl`.
4. Update `HANDOFF.json` with only the Hot items.
5. Record `sharding_completed` in `AUDIT.jsonl`.

### On Session Restart
1. Load `HANDOFF.json`.
2. Locate `WARM-SHARD-N.jsonl` for the current phase.
3. Perform **Semantic Retrieval**: Load top 5 most relevant Warm items based on the `next_task` description.
4. Load top 3 most relevant Cold items from the Knowledge Graph.

## 4. Governance & Constraints
- **Security First**: Never shard secrets or credentials (enforced by Gate 3).
- **Deduplication**: Before appending to a shard, check for identical `topic` or `id` to avoid context cycles.
- **Pruning**: Warm shards are archived to Cold storage upon Phase Completion.

## 5. Enterprise-Grade — Hardening Phase
- **Temporal Integrity**: Every shard entry must contain a `sha256` checksum. `bin/shard-helper.js --verify` ensures zero corruption.
- **Semantic Indexing**: Shards are tagged automatically during compaction for O(1) keyword retrieval.
- **Hindsight Injection**: If a "Warm" decision is corrected in a later session, the shard is updated with a `superseded_by` pointer.
- **Atomic Writes**: Shard appends are followed by a `fsync` to ensure durability.
