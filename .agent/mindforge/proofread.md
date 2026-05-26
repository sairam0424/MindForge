---
description: "Run copy editing pass for grammar, tone, clarity, and readability. Usage: /mindforge:proofread [file] [--tone formal|casual|technical] [--fix]"
---

<objective>
Perform a thorough copy editing pass on a document or code comments, checking grammar, tone consistency, clarity, terminology, and readability — then either report findings or apply fixes directly.
</objective>

<execution_context>
@.mindforge/skills/proofreader/SKILL.md
</execution_context>

<context>
Arguments: $ARGUMENTS (file path to proofread, optional --tone target, optional --fix to auto-apply corrections)
Knowledge: Project terminology from CONVENTIONS.md, brand voice guidelines, target audience.
</context>

<process>
1. **Read for flow**: Read the entire document once without marking issues. Assess:
   - Does the document have a clear logical structure?
   - Does each section follow naturally from the previous?
   - Are there abrupt transitions or missing connective tissue?
   - Is the overall length appropriate for the content?
   - Does it achieve its stated purpose?

2. **Check grammar**: Scan for grammatical issues:
   - Subject-verb agreement
   - Tense consistency (past/present/future mixed incorrectly)
   - Dangling modifiers and misplaced clauses
   - Pronoun-antecedent agreement and clarity
   - Run-on sentences and comma splices
   - Incorrect word usage (affect/effect, its/it's, their/there)

3. **Check clarity**: Evaluate sentence-level clarity:
   - Sentence length (flag any over 30 words — suggest splitting)
   - Active vs passive voice ratio (prefer active, flag unnecessary passive)
   - Nominalization (verbs turned to nouns: "implementation of" → "implement")
   - Hedge words that weaken claims (somewhat, rather, quite, basically)
   - Ambiguous pronouns ("this", "it" without clear referent)

4. **Check tone consistency**: Against --tone flag or inferred tone:
   - `formal`: No contractions, no colloquialisms, third person
   - `casual`: Contractions OK, direct address (you/we), conversational
   - `technical`: Precise terminology, no anthropomorphism, specification-style
   - Flag any sections that deviate from the target tone
   - Note if tone shifts are intentional (e.g., callout boxes)

5. **Check terminology**: Verify consistent term usage:
   - Build a glossary of domain terms used in the document
   - Flag synonyms used interchangeably (user/customer/client — pick one)
   - Verify capitalization consistency for product names and features
   - Check abbreviation introduction (first use should be spelled out)
   - Cross-reference with CONVENTIONS.md terminology if available

6. **Score readability**: Compute metrics:
   - Average sentence length (target: 15-20 words)
   - Average paragraph length (target: 3-5 sentences)
   - Flesch-Kincaid grade level (target depends on audience)
   - Percentage of passive voice (target: <15%)
   - Jargon density (specialized terms per 100 words)

7. **Check formatting**: Verify structural consistency:
   - Heading hierarchy (no skipped levels)
   - List formatting (parallel structure within lists)
   - Code block syntax highlighting language tags
   - Link text is descriptive (not "click here")
   - Consistent use of bold/italic/code formatting

8. **Report findings**: If --fix is NOT set, output a structured report:
   - Summary statistics (word count, readability score, issue count by severity)
   - Issues grouped by type (grammar, clarity, tone, terminology)
   - Each issue: line number, original text, suggested fix, severity (error/warning/style)
   - Top 3 most impactful improvements to make

9. **Apply fixes**: If --fix IS set:
   - Apply all error-severity fixes automatically
   - Apply warning-severity fixes automatically
   - Present style-level suggestions for user approval
   - Show a diff summary of all changes made
   - Preserve the author's voice — improve, don't rewrite

10. **Final assessment**: Provide an overall quality rating:
    - Grade: A (publish-ready) / B (minor polish needed) / C (significant editing needed) / D (rewrite recommended)
    - Strengths of the writing (what works well)
    - Top 3 areas for improvement
    - Estimated time to address remaining issues
</process>
