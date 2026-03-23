# MindForge v2 — Learn Protocol

## Purpose
Convert any knowledge source (URL, local file/dir, or current session) into a
reusable, validated, committed MindForge SKILL.md file.

## Activation sources

### Source type: URL
```
/mindforge:learn https://docs.prisma.io/concepts/components/prisma-schema
```
Use RESEARCH_MODEL (default: gemini-2.5-pro with 1M context) to ingest and
analyse the documentation. For large documentation sets, Gemini 2.5 Pro can
read the entire page including all examples at once.

### Source type: local file or directory
```
/mindforge:learn ./docs/api-conventions.md
/mindforge:learn ./docs/internal/
```
Read file(s) directly (no model call needed for reading). Use EXECUTOR_MODEL
to analyse content and extract patterns.

### Source type: session
```
/mindforge:learn --session
```
Analyse the current session's SUMMARY files, ADR files, debug reports, and
HANDOFF.json implicit_knowledge to find patterns worth capturing.

### Source type: npm package docs
```
/mindforge:learn npm:zod
/mindforge:learn npm:prisma
```
Fetch from npmjs.com/package/[name] and read the README + linked docs.

## Step-by-step learn protocol

### Step 1: Read and understand the source
For URLs: use `source-loader.js` to fetch content (with SSRF protection).
For local: use `source-loader.js` to read file(s) with walkDir().
For session: read all SUMMARY-*.md and HANDOFF.json implicit_knowledge.
For npm: fetch README from npmjs.com API.

Maximum context: 900K chars for Gemini (1M context); 50K chars for other models.

### Step 2: Identify the top 10 reusable patterns or rules
Ask the analysis model:
```
You are an expert at reading technical documentation and extracting reusable
engineering rules and patterns.

Read this documentation carefully:
[source content]

Identify exactly 10 reusable patterns, rules, or best practices that would
be most valuable to inject into an AI agent before it works with this technology.

For each pattern:
- Give it a short title (≤ 60 chars)
- Write a concise rule statement (≤ 150 chars, actionable)
- Include a code example showing correct usage (TypeScript/JavaScript preferred)
- Identify if there is a common anti-pattern to warn against
- Rate importance: CRITICAL | HIGH | MEDIUM | LOW

Format as JSON array: [{ title, rule, example, anti_pattern, importance }]
```

### Step 3: Identify 15-25 trigger keywords
Ask the analysis model:
```
Based on the patterns above, identify 15-25 keywords that, if found in a
task description or code file path, should trigger this skill to load.

Rules for good trigger keywords:
- 2-4 words each (single-word triggers are too broad)
- Specific to this technology (not generic like "database" or "model")
- Cover: package names, file extensions, common function names, config file names
- Include both noun and verb forms where applicable

Return as JSON array of strings: ["keyword1", "keyword2", ...]
```

### Step 4: Write the SKILL.md following the authoring template
Use the standard MindForge SKILL.md format from `docs/skills-authoring-guide.md`.
Populate all sections:
- Frontmatter (name, version, status, triggers, description)
- Purpose (why this skill exists)
- Key patterns (from Step 2 — the 10 patterns)
- Anti-patterns to avoid
- Code examples (at least 3 complete, working examples)
- Self-check checklist (5-10 items)
- Version history

### Step 5: Run Level 1 + Level 2 validation
Level 1 (schema): frontmatter complete, triggers present, mandatory sections exist.
Level 2 (content): no placeholder text, code examples parse, triggers are specific.

Use `skill-scorer.js` to compute the quality score (target: ≥ 60 for register,
≥ 80 for community publish).

If score < 60: report the specific gaps and ask user whether to fix or discard.

### Step 6: Present to user for review and approval

Display:
```
📚 Skill Generated: [skill-name]
─────────────────────────────────────────────────────
Source:        [source type and location]
Quality score: [score]/100 ([breakdown])
Patterns:      [N] extracted
Triggers:      [K] keywords
Tier:          [Core/Org/Project]

Preview (first 3 patterns):
  1. [title]: [rule]
  2. [title]: [rule]
  3. [title]: [rule]

Skill file: .mindforge/skills/[name]/SKILL.md

[ y ] Register and commit
[ n ] Discard
[ e ] Edit before registering
[ p ] Publish to community marketplace (requires quality score ≥ 80)
```

### Step 7: If approved — register and commit
```bash
# Register in MANIFEST.md (tier determined by target: project=T3, org=T2, core=T1)
# Default for learned skills: Project tier (T3) unless explicitly set
node bin/skills-builder/skill-registrar.js --tier project --name [skill-name]

# Write AUDIT entry
{
  "event": "skill_learned",
  "source_type": "url|local|session|npm",
  "source": "[url or path]",
  "skill_name": "[name]",
  "quality_score": [score],
  "pattern_count": [N],
  "trigger_count": [K]
}

# Commit
git add .mindforge/skills/[name]/SKILL.md .mindforge/org/skills/MANIFEST.md
git commit -m "feat(skills): learn [skill-name] from [source type]"
```

## Session-based learning (`--session` flag)
Analyse these sources in order:
1. All SUMMARY-*.md files in .planning/phases/[current phase]/
2. HANDOFF.json implicit_knowledge array (Level 2+ compaction entries)
3. All ADR-*.md files created in the current phase
4. RETROSPECTIVE-*.md if it exists in the current phase

Ask: "What patterns emerged that would have been useful to know before this phase?"
Generate up to 3 skills from this analysis (not more — quality over quantity).
