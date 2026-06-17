---
name: proofreader
version: 1.0.0
min_mindforge_version: 10.0.6
status: stable
triggers: proofread, copy edit, grammar check, tone consistency, voice alignment, clarity check, readability score, writing quality, prose review, editing pass, style consistency, language polish
compose: documentation
---

# Skill — Proofreader

## When this skill activates

When reviewing or improving written content for grammar, clarity, tone, voice
consistency, and readability. Use for documentation, README files, blog posts,
commit messages, comments, user-facing copy, error messages, and any prose that
will be read by humans.

This skill is NOT about content accuracy (that is the domain expert's job) — it is
about how clearly, consistently, and correctly the content communicates its intent.

## Mandatory actions when this skill is active

### Before the editing pass

1. **Identify the target context:**
   - What type of content is this? (technical docs, marketing copy, error messages, comments)
   - Who is the audience? (developers, end users, executives, mixed)
   - What tone is expected? (formal, conversational, neutral, urgent)
   - Is there an existing style guide to follow? (check for STYLE.md, .vale.ini, etc.)

2. **Establish baseline metrics:**
   - Current word count
   - Approximate readability grade level (Flesch-Kincaid)
   - Person/voice used (first/second/third, active/passive)
   - Terminology consistency (scan for variant spellings of key terms)

3. **Define the editing scope:**

   | Scope | Covers | Does NOT cover |
   |-------|--------|----------------|
   | Light | Typos, grammar, punctuation | Restructuring, rewording |
   | Medium | + Clarity, conciseness, consistency | Tone overhaul, content gaps |
   | Heavy | + Tone alignment, voice, restructuring | Content accuracy, fact-checking |

### During the editing pass

**Category 1 — Grammar and Mechanics:**
- Subject-verb agreement (especially with compound subjects or collective nouns)
- Tense consistency within paragraphs and across sections
- Punctuation: serial comma (use consistently — pick one style and hold it)
- Possessives vs contractions (`its` vs `it's`, `your` vs `you're`)
- Dangling modifiers and misplaced clauses
- Parallel structure in lists and enumerations
- Hyphenation of compound modifiers before nouns ("well-known pattern" vs "the pattern is well known")

**Category 2 — Clarity and Conciseness:**
- Sentence length: aim for under 25 words; flag sentences over 35
- One idea per sentence — split compound sentences when both halves carry weight
- Active voice preferred over passive (unless passive is intentional for emphasis)
- Remove hedge words that add no value: "basically", "actually", "simply", "just"
- Replace jargon with plain language when the audience does not require it
- Eliminate redundancies: "completely finished" → "finished", "advance planning" → "planning"
- Front-load important information (inverted pyramid: conclusion first, details after)

**Category 3 — Tone and Voice:**
- Identify the dominant tone in the document and flag deviations
- Common tone mismatches to catch:
  - Technical docs that suddenly become chatty
  - Error messages that blame the user
  - Professional copy that uses slang inconsistently
  - Passive-aggressive wording disguised as neutral
- Person consistency:
  - Pick one: "you" (second person) or "the user" (third person) — never mix
  - For guides/tutorials: second person ("you will create...")
  - For reference docs: third person or imperative ("Creates a new instance...")
- Register consistency: do not switch between formal and informal within a section

**Category 4 — Technical Writing Specifics:**
- Code references: use backticks for inline code, code blocks for multi-line
- Acronyms: define on first use, then abbreviate ("Model Context Protocol (MCP)")
- Numbers: spell out one through nine, use digits for 10+
- Lists: use numbered lists for sequences, bullets for unordered sets
- Headings: sentence case or title case (pick one, apply consistently)
- Links: descriptive text (not "click here" — use "see the installation guide")
- Terminology consistency: create a term → canonical form mapping:
  ```
  backend / back-end / back end → "backend" (pick one)
  setup / set up → "setup" (noun), "set up" (verb)
  e-mail / email → "email"
  ```

**Category 5 — Readability Metrics:**
- **Flesch-Kincaid Grade Level targets:**
  - User-facing documentation: grade 8-10
  - Technical reference: grade 10-12
  - Academic/research: grade 12-14
  - Marketing copy: grade 6-8
- **Signals of poor readability:**
  - Average sentence length > 20 words
  - Paragraph length > 6 sentences
  - More than 3 subordinate clauses in one sentence
  - Passive voice > 20% of sentences
  - Abstract nouns without concrete examples

**Output format for findings:**
```markdown
## Proofreading Report

**Document:** [filename or section]
**Scope:** [light / medium / heavy]
**Readability:** Grade [X] (target: [Y])

### Findings

| # | Line/Section | Category | Issue | Suggestion |
|---|-------------|----------|-------|------------|
| 1 | Line 42 | Grammar | Subject-verb disagreement | "The list of items **are**" → "The list of items **is**" |
| 2 | Para 3 | Clarity | 47-word sentence | Split at "however" into two sentences |
| 3 | Header 2.1 | Voice | Switches to passive | "The file is read by..." → "The parser reads..." |

### Summary
- Total findings: N
- Grammar: X | Clarity: Y | Tone: Z | Style: W
- Estimated readability improvement: Grade [before] → Grade [after]
```

### After the editing pass

1. **Consistency verification:**
   - Re-scan the full document for terminology consistency after edits
   - Verify that fixes did not introduce new issues (especially tense/person shifts)
   - Check that heading hierarchy still makes logical sense after restructuring
   - Confirm list parallelism was maintained through all modifications

2. **Final readability check:**
   - Calculate final Flesch-Kincaid score
   - Compare against target range for the content type
   - If still outside target: identify the top 3 sentences dragging the score down

3. **Preserve author voice:**
   - Proofreading improves clarity, it does NOT rewrite in your own style
   - If unsure whether a phrasing is intentional: flag it as a suggestion, not a fix
   - Maintain the author's preferred terminology unless it causes genuine confusion
   - When in doubt between two valid phrasings: keep the original

## Self-check before task completion

Before marking a proofreading task done:

- [ ] Did I identify the content type, audience, and expected tone before editing?
- [ ] Did I check all 5 categories (grammar, clarity, tone, technical style, readability)?
- [ ] Did I maintain consistent person (first/second/third) throughout?
- [ ] Did I verify terminology is used consistently (no variant spellings of same concept)?
- [ ] Did I check that sentence length averages under 25 words?
- [ ] Did I preserve the author's voice rather than imposing my own style?
- [ ] Did I provide a readability score and compare it to the target range?
- [ ] Did I format findings as actionable suggestions with before/after examples?
