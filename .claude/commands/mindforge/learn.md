---
name: mindforge:learn
description: Convert any knowledge source into a reusable, validated MindForge skill
argument-hint: [url|path|--session|npm:package] [--name name] [--tier T]
allowed-tools:
  - read_url_content
  - run_command
  - view_file
  - write_to_file
---

<objective>
Capture institutional or technical knowledge from external documentation, local files, npm packages, or the current session and transform it into a structured, validated, and automatically-loading `SKILL.md` file.
</objective>

<execution_context>
.claude/commands/mindforge/learn.md
</execution_context>

<context>
Sources: URLs (with SSRF protection), local markdown/directories, npm READMEs, or session summaries.
Models: Gemini 2.0 Pro (for large docs), Claude 3.5 Sonnet (for analysis).
Tiers: project (T3), org (T2), core (T1).
</context>

<process>
1. **Ingest Content**: Fetch the URL, read the local path, or pull the npm README.
2. **Analyze Patterns**:
    - Use high-context models to extract key architectural patterns.
    - Generate 15-25 trigger keywords for automatic activation.
3. **Draft Skill**: Write the initial `SKILL.md` following the standard template.
4. **Score Quality**: Audit the draft against the quality rubric (triggers, actions, examples, safety).
5. **Review**: Present the skill and its score (0-100) to the user for approval, editing, or registration.
6. **Register**: Add the skill to the appropriate manifest tier and commit the change.
7. **Audit**: Log `skill_learned` with source, name, quality score, and cost.
</process>
