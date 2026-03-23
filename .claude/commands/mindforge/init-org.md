---
name: mindforge:init-org
description: Set up MindForge at the organization level with standardized context
argument-hint: [--org-name "Name"] [--update]
allowed-tools:
  - run_command
  - list_dir
  - write_to_file
  - view_file
---

<objective>
Establish a consistent engineering culture and governance framework by generating organization-wide context files, security policies, and tech stack defaults for all projects.
</objective>

<execution_context>
.claude/commands/mindforge/init-org.md
</execution_context>

<context>
Scope: Organization-wide (Tier 1/2).
Output: Shared `.mindforge/org/` repository or npm package.
Governance: Defines Tier 2/3 approver lists and compliance burdens.
</context>

<process>
1. **Interview**: Conduct a structured interview about org identity, tech stack, deployment defaults, and compliance (GDPR, HIPAA, etc.).
2. **Generate Defaults**:
    - `ORG.md`: Mission and global architecture defaults.
    - `CONVENTIONS.md`: Tech-stack-specific coding standards.
    - `SECURITY.md`: Compliance-mapped security policies.
    - `TOOLS.md`: Approved library and dependency list.
3. **Configuration**: Pre-populate `INTEGRATIONS-CONFIG.md` and `GOVERNANCE-CONFIG.md`.
4. **Skill Recommendation**: Suggest core and compliance skills to install org-wide.
5. **Distribution**: Offer to package the configuration into an npm package for project-wide inheritance.
6. **Audit**: Log `org_initialised` with frameworks and recommended skills.
</process>
