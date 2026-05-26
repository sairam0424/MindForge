---
description: Review mature instincts and promote qualifying ones to full skills. Usage - /mindforge:evolve-skills [--dry-run] [--threshold 0.85] [--min-applications 5]
---

<objective>
Scan the instinct store for entries that have proven themselves through repeated
successful application, and promote them to full MindForge skills.
</objective>

<execution_context>
@.mindforge/engine/instincts/promotion-engine.md
@.mindforge/engine/instincts/instinct-schema.md
@.mindforge/skills/continuous-learning/SKILL.md
@.mindforge/org/skills/MANIFEST.md
</execution_context>

<context>
$ARGUMENTS
</context>

<process>
1. Parse flags: --dry-run (show candidates without acting), --threshold (confidence minimum, default 0.85), --min-applications (default 5).
2. Read `.mindforge/engine/instincts/instinct-store.jsonl`.
3. **Identify candidates** meeting ALL criteria:
   - confidence >= threshold
   - times_applied >= min-applications
   - times_succeeded >= 80% of times_applied
   - status == "active"
   - No existing skill covers same behavior (check MANIFEST.md triggers)
4. **Rank candidates** by impact score: confidence * times_applied.
5. **Present candidates** to user:
   ```
   Promotion Candidates (ranked by impact):
   1. [observation] — confidence: 0.92, applied: 12x, success: 11/12
   2. [observation] — confidence: 0.88, applied: 7x, success: 6/7
   ```
6. If --dry-run: stop here, report what would be promoted.
7. **For each approved candidate:**
   a. Generate SKILL.md draft:
      - name: derived from instinct tags
      - triggers: derived from observation keywords
      - content: expanded from behavior field
   b. Create `.mindforge/skills/[name]/SKILL.md`
   c. Add entry to MANIFEST.md (Project tier by default)
   d. Mark instinct as promoted: `"status": "promoted", "promoted_to_skill": "[name]"`
8. Report: "Promoted [N] instincts to skills. New skills: [list]."
9. Log in AUDIT: skill_promoted events with instinct_id and skill_name.
10. Remind: "Monitor promoted skills — if they prove unhelpful, they can be reverted."
</process>
