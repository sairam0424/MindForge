---
name: mindforge:marketplace
description: Discover, evaluate, and install community-published skills
argument-hint: [search|featured|trending|install|publish]
allowed-tools:
  - run_command
  - list_dir
  - view_file
---

<objective>
Provide a central hub for sharing and consuming battle-tested MindForge skills, allowing developers to extend their agent's capabilities without manual documentation research.
</objective>

<execution_context>
.claude/commands/mindforge/marketplace.md
</execution_context>

<context>
Platform: Curated layer over npm.
Subcommands: search, featured, trending, install, publish.
Quality: Enforces quality scores and session quality lift metrics.
</context>

<process>
1. **Query Subcommand**:
    - `search`: Find relevant skills based on tech stack or domain keywords.
    - `featured/trending`: Display curated or popular skill lists.
2. **Install Flow**: Delegate to `/mindforge:install-skill` while surfacing quality scores and expected quality lift.
3. **Publish Flow**: Validate skill directory for quality (score >= 80), injection safety, and complete history before pushing.
4. **Render Format**: Display skills with detailed metrics (installs, lifters, triggers).
5. **Audit**: Log `marketplace_action` including query/skill name and quality scores.
</process>
