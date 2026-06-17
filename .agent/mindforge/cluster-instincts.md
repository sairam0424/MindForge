---
description: Group related instincts by tag overlap and batch-promote qualifying clusters to skills. Usage - /mindforge:cluster-instincts [--dry-run] [--min-cluster 3] [--min-confidence 0.7]
---

<objective>
Automatically identify groups of related instincts that together form a
coherent skill, and promote them as a single combined skill.
</objective>

<execution_context>
@.mindforge/skills/instinct-clustering/SKILL.md
@.mindforge/skills/continuous-learning/SKILL.md
@.mindforge/engine/instincts/promotion-engine.md
</execution_context>

<context>
$ARGUMENTS
</context>

<process>
1. Read `.mindforge/engine/instincts/instinct-store.jsonl`, filter to active instincts.
2. Deduplication pass: merge instincts with >80% observation word overlap (keep higher confidence).
3. Compute pairwise tag overlap using Jaccard similarity: |A∩B| / |A∪B|.
4. Form clusters: group instincts with jaccard > 0.5 AND same project scope.
5. Filter clusters: minimum --min-cluster instincts (default 3), avg confidence > --min-confidence (default 0.7).
6. For each qualifying cluster: generate proposed skill name from most common tags.
7. If --dry-run: report clusters with proposed names, member instincts, and avg confidence. Stop.
8. Present clusters to user for approval (show: name, member count, avg confidence, combined behavior).
9. For each approved cluster:
   a. Generate combined SKILL.md (merge behaviors in logical order, deduplicate triggers).
   b. Create skill directory and register in MANIFEST.md.
   c. Mark all member instincts as promoted (status: "promoted", promoted_to_skill: "[name]").
10. Write CLUSTER-REPORT.md to `.planning/` with all clusters (approved + rejected).
11. Log clustering event in AUDIT with: clusters found, clusters promoted, instincts affected.
</process>
