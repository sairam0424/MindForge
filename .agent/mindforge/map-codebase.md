# MindForge — Map Codebase Command
# Usage: /mindforge:map-codebase [area]
# Onboards MindForge to an existing (brownfield) codebase.
# Run this INSTEAD of /mindforge:init-project when joining an existing project.

## When to use this command
- Joining an existing project that has no MindForge context files
- Adding MindForge to a team that already has a codebase
- Onboarding to a new-to-you repository
- Re-mapping after major architectural changes

## What it produces
- `.planning/ARCHITECTURE.md` — system architecture discovered from code
- `.planning/PROJECT.md` — project identity inferred from codebase + user confirmation
- `.mindforge/org/CONVENTIONS.md` — actual conventions found in the code
- `.planning/STATE.md` — current position (MindForge onboarded, ready to plan)
- `.planning/decisions/ADR-NNN-[title].md` — key architectural decisions found

## Step 1 — Codebase inventory

Spawn FOUR parallel subagents. Each focuses on one analysis area.
Each subagent writes its findings to a temporary file.

### Subagent A — Technology Stack Analyst
Context: minimal (CONVENTIONS.md template + task description)
Persona: architect.md
Task:
```
Analyse this repository's technology stack. Read:
- package.json / requirements.txt / Cargo.toml / go.mod (root and workspaces)
- Dockerfile, docker-compose.yml (if present)
- CI/CD configuration: .github/workflows/, .gitlab-ci.yml, .circleci/
- Infrastructure files: terraform/, pulumi/, k8s/, helm/

Write to: .planning/map-temp/STACK.md
Include:
- Runtime/language and version
- Framework(s) and versions
- Database(s) used
- Cache and queue systems
- Testing framework(s)
- Build and bundling tools
- Deployment target (AWS/GCP/Azure/bare metal/etc.)
- External services integrated (payment, email, auth, etc.)
```

### Subagent B — Architecture Analyst
Context: minimal
Persona: architect.md
Task:
```
Analyse this repository's architecture. Read:
- All files in src/ (or equivalent) — structure, not content
- README.md and any docs/ directory
- Any architecture diagrams (look for .png, .svg, .drawio in docs/)
- Entry points: index.ts, main.py, app.go, server.ts (root-level)

Write to: .planning/map-temp/ARCHITECTURE-RAW.md
Include:
- Architectural pattern: MVC / Clean Architecture / Hexagonal / Modular Monolith / Microservices
- Domain model: what are the core entities? (infer from models/, entities/, types/)
- API surface: public endpoints found in routes/, controllers/, handlers/
- Module structure: how is the code organised? Feature-based / Layer-based?
- Key design patterns in use: Repository, Service, Factory, Observer, etc.
```

For large codebases (> 200 source files): sample representative files from each
subdirectory rather than reading all files. Read 2-3 files per major directory,
prioritising entry points and largest files.

### Subagent C — Conventions Analyst
Context: minimal
Persona: developer.md
Task:
```
Analyse the actual coding conventions used in this repository.
Read 5-10 representative source files from different areas of the codebase.

Write to: .planning/map-temp/CONVENTIONS-RAW.md
Infer and document:
- Naming conventions: variables, functions, classes, files, database columns
- Import order and grouping style
- Error handling patterns: how are errors thrown and caught?
- TypeScript patterns: preferred type patterns, generic usage
- Comment style: JSDoc, inline, etc.
- Test file naming and location pattern
- Async patterns: callbacks / promises / async-await
- State management (frontend): if applicable
- Any recurring patterns that appear across multiple files

Important: document what IS there, not what should be there.
This is a description of reality, not a prescription.
```

### Subagent D — Quality Baseline Analyst
Context: minimal
Persona: qa-engineer.md
Task:
```
Assess the current quality baseline of this repository.

Write to: .planning/map-temp/QUALITY-BASELINE.md
Check:
- Test coverage: does a test suite exist? What framework? Run: [test command] --coverage
- Linting: is a linter configured? (.eslintrc, .pylintrc, ruff.toml, etc.)
- Type checking: TypeScript config? Strict mode enabled?
- CI/CD: does it run tests on PRs?
- Security: any security scanning in CI?
- Known issues: open GitHub/GitLab issues, TODO count in source

Note: do not fix anything. Only document what exists.
```

## Step 2 — Synthesise findings

Read all four temp files. Synthesise into the permanent context files.

### Write `.planning/ARCHITECTURE.md`

Use ARCHITECTURE-RAW.md as input. Write a clean, structured architecture document:

```markdown
# [Project Name] — Architecture

## System overview
[2-3 sentences from the subagent's findings]

## Technology stack
[From STACK.md — organised by layer]

## Architectural pattern
[From ARCHITECTURE-RAW.md]

## Domain model
[Core entities and their relationships]

## API surface
[Key endpoints / GraphQL operations / gRPC services found]

## Module structure
[How the codebase is organised]

## External integrations
[Third-party services found]

## Known architectural decisions
[Any ADRs, architecture docs, or README decisions found]

## Quality baseline
[From QUALITY-BASELINE.md — honest assessment]

## MindForge onboarding notes
[What was inferred vs. confirmed, what needs human review]
```

### Write `.mindforge/org/CONVENTIONS.md`

Use CONVENTIONS-RAW.md as input. Write the conventions file in the standard format,
but clearly mark inferred conventions:

```markdown
# Coding Conventions — [Project Name]
# Source: Inferred from codebase analysis by MindForge
# Status: DRAFT — confirm with team before treating as authoritative

## IMPORTANT
These conventions were inferred from code analysis. Review each section
and mark as [CONFIRMED] or [NEEDS REVIEW] before running /mindforge:plan-phase.

## Naming conventions [NEEDS REVIEW]
[What was found]
```

## Step 3 — Present findings for confirmation

Present a summary to the user. Ask for confirmation and corrections:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
MindForge Codebase Analysis Complete

  Stack:
    Runtime   : Node.js 20 (inferred from .nvmrc)
    Framework : Next.js 14 (inferred from package.json)
    Database  : PostgreSQL via Prisma (inferred from prisma/schema.prisma)
    Auth      : NextAuth.js (inferred from package.json)

  Architecture:
    Pattern   : Feature-based modular (inferred from src/ structure)
    Entities  : User, Organization, Project, Task (inferred from Prisma schema)
    API       : REST API in src/app/api/ (24 route files found)

  Quality baseline:
    Tests     : Vitest, ~340 test files, ~67% coverage (inferred from coverage report)
    Linting   : ESLint configured, strict TypeScript
    CI/CD     : GitHub Actions (4 workflows)

  Conventions: see .mindforge/org/CONVENTIONS.md (DRAFT — needs review)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Does this look correct? (yes / correct [field]: [value] / no)
```

Wait for user confirmation. Apply any corrections the user provides.

## Step 4 — Write PROJECT.md and STATE.md

After confirmation, write:

`.planning/PROJECT.md` — populated with confirmed findings
`.planning/STATE.md` — status: "Codebase mapped. Ready to plan first phase."
Add a warning in STATE.md if CONVENTIONS.md is still DRAFT and requires review.
`.planning/HANDOFF.json` — updated with onboarding completion

## Step 5 — Clean up and report

Before analysis begins, delete any existing `.planning/map-temp/` to avoid stale data.

```bash
rm -rf .planning/map-temp/
```

Report to user:
"✅ Codebase mapped.

  Files created:
    .planning/ARCHITECTURE.md
    .planning/PROJECT.md
    .mindforge/org/CONVENTIONS.md (DRAFT — please review)
    .planning/STATE.md

  Review .mindforge/org/CONVENTIONS.md and mark each section as [CONFIRMED].
  Then run /mindforge:plan-phase 1 to begin your first phase."

Write AUDIT entry:
```json
{
  "event": "codebase_mapped",
  "files_analysed": [N],
  "entities_found": [N],
  "api_routes_found": [N],
  "conventions_confidence": "medium",
  "requires_human_review": [".mindforge/org/CONVENTIONS.md"]
}
```
