---
name: codebase-onboarding
version: 1.0.0
min_mindforge_version: 10.0.4
status: stable
triggers: onboarding, new repo, unfamiliar codebase, codebase summary, knowledge graph, entry points, learning path, repo overview, architecture discovery, codebase map, project familiarization, code exploration
---

# Skill — Codebase Onboarding

## When this skill activates

When entering a new or unfamiliar repository for the first time, when asked to
summarize or map a codebase, or when needing to build a mental model before
making changes. Also activates when explicitly asked to generate an onboarding
report or learning path.

## Mandatory actions when this skill is active

Execute the following auto-summarization pipeline in order:

### Step 1 — Detect Stack

Identify the technology stack by examining:

- **Language(s)**: file extensions, shebang lines, language-specific config files
- **Framework(s)**: package.json dependencies, requirements.txt, go.mod, Cargo.toml
- **Build system**: Makefile, webpack, vite, turbopack, gradle, cargo, mix
- **Test framework**: jest, pytest, vitest, go test, RSpec, xUnit
- **Package manager**: npm, yarn, pnpm, pip, poetry, cargo, go modules
- **Infrastructure**: Docker, Kubernetes, Terraform, CDK, serverless configs

### Step 2 — Find Entry Points

Locate all entry points into the application:

- Main files (main.ts, index.ts, app.py, main.go, Program.cs)
- CLI entry points (bin/ directory, package.json bin field)
- Route definitions (router files, controller registrations)
- Event handlers (message consumers, cron jobs, webhook handlers)
- Worker/queue processors
- Migration entry points (seed files, migration runners)

### Step 3 — Build Module Dependency Graph

Create a graph where:

- **Nodes** = modules, packages, or major source directories
- **Edges** = imports, function calls, event emissions between modules
- Identify circular dependencies (flag as architectural debt)
- Note external service dependencies (databases, APIs, queues)

### Step 4 — Identify Hot Paths

Find the most critical files by measuring:

- **Most imported**: files that appear in the most import statements
- **Most modified**: files with the highest git commit frequency (last 90 days)
- **Largest fan-out**: files that import the most other modules
- **Gateway files**: files that bridge between major subsystems

### Step 5 — Generate Learning Path

Create an ordered reading list that builds understanding progressively:

1. Configuration files (understand the shape of the project)
2. Entry points (understand how the system starts)
3. Core domain logic (understand what the system does)
4. Infrastructure/adapters (understand how it connects to the world)
5. Edge cases and error handling (understand failure modes)
6. Tests (understand expected behavior and invariants)

### Step 6 — Output Report

Write `ONBOARDING-REPORT.md` to `.planning/` containing:

- Stack summary (one-line per technology)
- Entry points list (file path + purpose)
- Dependency graph (ASCII or Mermaid format)
- Hot paths table (file, import count, commit frequency)
- Learning path (ordered reading list with file paths)
- Key architectural decisions or patterns observed
- Known debt or areas of concern

## Self-check before task completion

Before marking a task done when this skill was active:

- [ ] Did I identify the stack correctly (language, framework, build, test)?
- [ ] Did I find ALL entry points (not just the obvious main file)?
- [ ] Did I build a dependency graph showing module relationships?
- [ ] Did I identify hot paths (most-imported and most-modified)?
- [ ] Did I create a usable learning path (ordered, progressive)?
- [ ] Did I output ONBOARDING-REPORT.md to .planning/?
- [ ] Is the report useful to someone with zero prior context?
