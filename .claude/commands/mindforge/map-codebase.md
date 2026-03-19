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

## Step 2 — Synthesis

After all subagents complete, synthesize their outputs into canonical files:

1. `.planning/PROJECT.md`
   - Project name
   - One-line description
   - Tech stack summary
   - Primary users (if inferred)

2. `.planning/ARCHITECTURE.md`
   - Based on ARCHITECTURE-RAW.md
   - Organised by subsystem and data flow

3. `.mindforge/org/CONVENTIONS.md`
   - Based on CONVENTIONS-RAW.md
   - Capture the existing conventions (do not introduce new ones)

4. `.planning/STATE.md`
   - Status: MindForge onboarded
   - Last action: map-codebase
   - Next action: run /mindforge:discuss-phase 1

5. ADRs (if architectural decisions are inferred)
   - Create ADRs for any major decisions observed

## Step 3 — Confirm with user

Present a summary of the inferred architecture and conventions.
Ask the user to confirm or correct any inaccuracies.
Update files with corrections before continuing.

## Step 4 — Clean up

Delete `.planning/map-temp/` after synthesis to avoid stale info.

## Audit entry

Write a `map_codebase_completed` entry to AUDIT.jsonl.
