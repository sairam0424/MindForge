---
name: mindforge:research
description: Perform deep technical or architectural research
argument-hint: [topic] [--type library|codebase|compliance]
allowed-tools:
  - run_command
  - read_url_content
  - view_file
---

<objective>
Leverage large-context models to ingest massive amounts of external documentation and local code simultaneously to answer complex architectural or compliance questions.
</objective>

<execution_context>
.claude/commands/mindforge/research.md
</execution_context>

<context>
Engine: Gemini 2.0 Pro (high token limit required).
Analysis Areas: Library integration, codebase-wide patterns, compliance audits.
</context>

<process>
1. **Define Scope**: Identify target documentation URLs and local source paths.
2. **Ingest**: Read all relevant sources into the analysis model's context.
3. **Synthesize**: Answer the user's research topic with citations to specific docs and files.
4. **Document**: Capture key findings for possible promotion to a skill via `/mindforge:learn`.
</process>
