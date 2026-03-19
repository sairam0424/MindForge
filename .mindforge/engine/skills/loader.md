# MindForge Skills Engine — Loader

## Purpose
Discover, load, and inject the correct skill packs for any given task context.
The loader is invoked at the start of every task execution.

## Loading sequence

### Step 1 — Build the trigger index
At session start (or when skills are updated):
1. Read MANIFEST.md to get all registered skills
2. For each valid skill, read its frontmatter `triggers:` list
3. Build an in-memory trigger index:
   ```
   {
     "auth":           ["security-review"],
     "authentication": ["security-review"],
     "password":       ["security-review"],
     "refactor":       ["code-quality"],
     "performance":    ["performance"],
     "N+1":            ["database-patterns"],
     "GDPR":           ["data-privacy"],
     ...
   }
   ```
4. Where multiple skills share a trigger, record all of them (conflict resolution happens at load time)

### Step 2 — Match task to skills
Given a task description and the files in `<files>`:

**Text matching (primary):**
For every word and phrase in the task description `<n>`, `<action>`, and `<context>` fields:
- Exact keyword match against the trigger index
- Case-insensitive matching
- Word-boundary matching (match whole words, not substrings)
- Multi-word trigger matching: "database migration" matches "migration" trigger
- Acronym expansion: "a11y" matches "accessibility" trigger

**File path matching (secondary):**
Examine the file paths in `<files>` for structural hints:
- `/auth/` or `/security/` in path → load security-review
- `/api/` or `/routes/` in path → load api-design
- `/tests/` or `.test.ts` in path → load testing-standards
- `/db/` or `/migrations/` in path → load database-patterns
- `/components/` or `.tsx` in path → load accessibility (UI components should be accessible)
- `privacy` or `consent` in path → load data-privacy

**File NAME matching (in addition to directory matching):**

Also check the file name itself (not just the directory path) for trigger signals:

```
login.ts, logout.ts, auth.ts, session.ts → security-review
password.ts, token.ts, credentials.ts   → security-review
payment.ts, billing.ts, stripe.ts       → security-review
migration.ts, migrate.ts                → database-patterns
*.test.ts, *.spec.ts                    → testing-standards
*.component.tsx, *.page.tsx             → accessibility
privacy.ts, consent.ts, gdpr.ts         → data-privacy
runbook.md, postmortem.md               → incident-response
```

File name matching uses ENDS-WITH logic (not contains), to avoid false matches
on files like `create-user.ts` triggering on "auth" merely because the word
"authenticate" appears in the file content later.

**Combined match:**
Skills triggered by EITHER text OR file path matching are loaded.
A skill only needs ONE matching signal to be loaded.

### Step 3 — Resolve conflicts
If two skills from the same tier both match:
- See `conflict-resolver.md` for the resolution protocol
- Default: load both skills, but flag the overlap to the agent

### Step 4 — Load the matched skills
For each matched skill (in tier priority order: Project → Org → Core):
1. Read the full SKILL.md content
2. Check compatibility: does `min_mindforge_version` in frontmatter satisfy current version?
   If not: warn but still load (do not block execution on version mismatch)
3. Inject the skill content into the agent's context package (per `context-injector.md`)
4. Log which skills were loaded in the task's `task_started` AUDIT entry

### Step 5 — Post-load verification
After loading:
- Report to the agent: "Skills loaded for this task: [list]"
- If zero skills were loaded for a complex task: consider whether any manual skill
  loading is appropriate. Some tasks genuinely need no skills (simple refactors, etc.)
- If more than 3 skills are loaded simultaneously: warn that context budget may be tight.
  Summarise the less-relevant skills rather than injecting their full content.

## Context budget management for skills

Each SKILL.md file costs tokens when injected. Track the budget:

| Skills loaded | Estimated cost | Status |
|---|---|---|
| 1 skill | ~3-5K tokens | ✅ Comfortable |
| 2 skills | ~6-10K tokens | ✅ Fine |
| 3 skills | ~9-15K tokens | ⚠️ Monitor total context |
| 4+ skills | 12K+ tokens | 🔴 Summarise lower-priority skills |

When injecting 4+ skills: summarise skills ranked 4th and below to their
trigger keywords, mandatory actions list, and output format only.
Do not inject the full content. Full content goes to the top 3 most relevant skills.

**Summarisation format for skills ranked 4th and below:**

When injecting 4+ skills, skills beyond the top 3 are summarised.
Priority for summarisation (summarise these first):
1. Core (Tier 1) skills if Project (Tier 3) or Org (Tier 2) skills are present
2. Within same tier: skills with fewest matching trigger keywords for this task
3. Never summarise a security skill — always inject security-review in full

**Summary format (max 150 words per summarised skill):**
```
[Skill name] v[version] — SUMMARISED (full version available at [path])

Triggers: [comma-separated trigger keywords]

Mandatory: [3-5 bullet points — the MUST-DO items only]

Output: [one line — what file the skill produces]
```

After summarisation, estimate total tokens again. If still > 30K:
report to user: "Context budget tight with [N] skills. Recommend splitting
this task into sub-tasks with fewer skills each."

## Skills loading report format

After loading, write to the task's AUDIT `task_started` entry:
```json
{
  "skills_loaded": [
    { "name": "security-review", "version": "1.0.0", "tier": 1, "trigger": "auth" },
    { "name": "api-design", "version": "1.0.0", "tier": 1, "trigger": "/api/" }
  ],
  "skills_summarised": [],
  "total_skill_tokens_est": 8500
}
```
