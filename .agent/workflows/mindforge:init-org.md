---
description: Set up MindForge at the organisation level — create standardised org-level
---
# MindForge — Init Org Command
# Usage: /mindforge:init-org [--org-name "Name"] [--update]

## Purpose
Set up MindForge at the organisation level — create standardised org-level
context files that are shared across ALL projects in the organisation.

Intended to be run ONCE by a platform engineer or engineering lead.
Output is committed to a shared `mindforge-org-config` repository
and distributed to projects as a git submodule or npm package.

## Step 1 — Gather org information

Ask (one question at a time):
1. "What is your organisation name?"
2. "Describe what your organisation builds in 1-2 sentences."
3. "What is your primary tech stack? (describe in plain English)"
4. "What is your default deployment target? (AWS / GCP / Azure / self-hosted / hybrid)"
5. "What regulatory frameworks apply to your organisation?"
   Options: GDPR / HIPAA / SOC 2 / PCI-DSS / ISO 27001 / None / Multiple
6. "What is your source control platform?" (GitHub / GitLab / Bitbucket / Azure DevOps)
7. "What is your issue tracker?" (Jira / GitHub Issues / Linear / Azure DevOps / None)
8. "Who are your Tier 3 compliance approvers? (email addresses, comma-separated)"

## Step 2 — Generate org-level context files

Create (or update with `--update`) these files:

### `.mindforge/org/ORG.md`
Populated from answers with:
- Organisation identity and mission
- Default tech stack with version recommendations
- Architecture defaults
- Team conventions
- Compliance requirements

### `.mindforge/org/CONVENTIONS.md`
Generate sensible defaults based on the tech stack detected.
For TypeScript/Node.js stacks: strict TypeScript, ESLint, Conventional Commits
For Python stacks: ruff, mypy, black formatting
For Go: standard Go toolchain conventions
Mark each section clearly: [DEFAULT] or [CUSTOMISE THIS]

### `.mindforge/org/SECURITY.md`
Generate based on declared compliance frameworks:
- GDPR → include GDPR-specific policies
- HIPAA → include PHI handling requirements
- PCI-DSS → include card data handling policies
- SOC 2 → include access control requirements
Mark critical sections: [REVIEW WITH SECURITY TEAM]

### `.mindforge/org/TOOLS.md`
Generate approved library list based on tech stack.
Include common forbidden libraries (moment.js, request, etc.)
Mark: [ADD YOUR APPROVED LIBRARIES]

### `.mindforge/org/integrations/INTEGRATIONS-CONFIG.md`
Pre-populate based on declared platforms:
- GitHub → fill GitHub config section
- Jira → fill Jira config section
Mark credential fields clearly: [SET VIA ENVIRONMENT VARIABLE]

### `.mindforge/governance/GOVERNANCE-CONFIG.md`
Pre-populate based on declared approvers and compliance frameworks.
Higher compliance burden → lower Tier 2/3 thresholds.
Stricter approval SLAs for HIPAA/PCI-DSS organisations.

## Step 3 — Generate skills recommendation

Based on the tech stack and compliance requirements, recommend skills to install:

```
Recommended skills for your tech stack:

Core skills (already included — v0.6.0):
  ✅ security-review, code-quality, api-design, testing-standards, documentation,
     performance, accessibility, data-privacy, incident-response, database-patterns

Additional skills recommended for your stack:
  [tech-stack-specific recommendations from registry]

For your compliance requirements:
  [compliance-specific skill recommendations]

Install all recommendations?
  yes → npx mindforge-skills install [list]
  no  → I'll show you the install commands for each
```

## Step 4 — Create distribution package

Offer to create an org-skills npm package for distributing org-level config:

```
Create `@your-org/mindforge-config` npm package?
This package will distribute your org-level MindForge configuration
to all projects in your organisation via: npx @your-org/mindforge-config

Files included:
  .mindforge/org/ORG.md
  .mindforge/org/CONVENTIONS.md
  .mindforge/org/SECURITY.md
  .mindforge/org/TOOLS.md
  .mindforge/org/skills/MANIFEST.md
  .mindforge/org/integrations/INTEGRATIONS-CONFIG.md (without credentials)
  .mindforge/governance/GOVERNANCE-CONFIG.md (without credentials)
```

## Step 5 — Write AUDIT entry and report

```json
{ "event": "org_initialised", "org_name": "[name]", "compliance_frameworks": [...], "skills_recommended": [...] }
```

Report:
```
✅ MindForge organisation configuration complete.

Files created:
  .mindforge/org/ORG.md
  .mindforge/org/CONVENTIONS.md
  .mindforge/org/SECURITY.md
  .mindforge/org/TOOLS.md
  .mindforge/governance/GOVERNANCE-CONFIG.md

Next steps:
  1. Review each file — look for [CUSTOMISE THIS] markers
  2. Fill in SECURITY.md with your security team
  3. Commit to your org's mindforge-config repository
  4. Share with all projects: npx @your-org/mindforge-config (if you created the package)
```
