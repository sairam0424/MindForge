# Changelog

All notable changes to MindForge are documented here.
Format follows [Keep a Changelog](https://keepachangelog.com).

## [0.6.0] — Day 6 Distribution Platform

### Added
- Public skills registry: `npx mindforge-skills install/publish/search` (npm-based)
- Skill validator: 3-level validation schema (schema, content, quality)
- MINDFORGE.md JSON Schema: validation with non-overridable field markers
- MindForge CI mode: GitHub Actions / GitLab CI / Jenkins integration
- GitHub Actions workflow: health, security, quality, AI review jobs
- AI PR Review Engine: Claude API-powered code review with context loading
- Monorepo/workspace support: npm/pnpm/Nx/Turborepo/Lerna detection
- Cross-package planner: topological execution order for monorepo phases
- @mindforge/sdk: TypeScript SDK with client, event stream, and command builders
- SSE event stream: real-time progress events via Server-Sent Events
- /mindforge:init-org — organisation-wide MindForge setup command
- /mindforge:install-skill — install skill from public/private registry
- /mindforge:publish-skill — publish skill to npm registry
- /mindforge:pr-review — AI code review powered by Claude API
- /mindforge:workspace — monorepo workspace management
- /mindforge:benchmark — skill effectiveness benchmarking
- 3 new ADRs: ADR-015 npm registry, ADR-016 CI timeout, ADR-017 localhost SDK

### Hardened
- Registry: TOCTOU-safe temp directory (chmod 700), tarball size verification
- CI: timeout exits with code 0 (soft stop), clear Tier 3 block messages
- SDK: localhost-only SSE binding, Linux inotify fallback
- AI review: robust daily limit (parse error tolerant), file-based diff truncation
- Monorepo: affected package detection uses manifest paths (not depth assumption)

## [0.5.0] — Day 5 Intelligence Layer

### Added
- framework health engine with 7-category diagnostics and safe auto-repair guidance
- smart context compaction with Level 1/2/3 protocols and structured handoff extraction
- phase difficulty scorer with weighted composite and task-granularity feedback
- anti-pattern detection engine with false-positive controls for C01/B03/D01
- skill gap analyzer for pre-planning capability coverage checks
- team profile system and per-developer profile templates
- metrics schema and quality tracker (`session`, `phase`, `skill usage`, `compaction quality`)
- project constitution file: `MINDFORGE.md`
- setup wizard modules: environment detection, idempotent config generation, interactive flow
- 4 new commands: `/mindforge:health`, `/mindforge:retrospective`,
  `/mindforge:profile-team`, `/mindforge:metrics`
- 3 ADRs: ADR-012, ADR-013, ADR-014
- new Day 5 test suites: `tests/intelligence.test.js`, `tests/metrics.test.js`

### Changed
- CLAUDE runtime contract now includes Day 5 intelligence behavior and
  non-overridable MINDFORGE enforcement
- package entrypoint now points to setup wizard

### Fixed
- AUDIT corruption handling now quarantines invalid lines instead of deleting entries
- wizard reliability improvements: stdin TTY fallback, end-of-flow credential guidance,
  and idempotent config replacement behavior

## [0.4.0] — Day 4 Enterprise Integrations and Governance

### Added
- enterprise integration specs for Jira, Confluence, Slack, GitHub, and GitLab
- integration connection manager with credential hygiene and retry guidance
- governance layer: change classification, approvals, and compliance gates
- multi-developer handoff and session merger protocols
- 6 new commands: `/mindforge:audit`, `/mindforge:milestone`,
  `/mindforge:complete-milestone`, `/mindforge:approve`,
  `/mindforge:sync-jira`, `/mindforge:sync-confluence`
- Day 4 test suites: `tests/integrations.test.js`, `tests/governance.test.js`
- enterprise setup and governance guide docs

### Changed
- README and CLAUDE entrypoint updated for enterprise governance workflows
- audit schema expanded for integration and governance events

### Fixed
- Jira transition handling now documents dynamic transition lookup instead of
  hardcoded IDs
- governance tiering now covers code-content matches and audit-history escalation

## [0.3.0] — Day 3 Skills Platform

### Added
- 5 new core skill packs: performance, accessibility, data-privacy,
  incident-response, database-patterns
- Skills distribution engine: registry, loader, versioning, conflict resolver
- 5 new commands: /mindforge:skills, /mindforge:review, /mindforge:security-scan,
  /mindforge:map-codebase, /mindforge:discuss-phase
- Persona customisation override system (project and phase level)
- Skills Manifest (MANIFEST.md) with tier-based registration
- Skills Authoring Guide for creating org and project skills
- Injection guard for Tier 2/3 skill validation

### Changed
- execute-phase now uses multi-tier skills loading
- plan-phase now reads CONTEXT.md from discuss-phase if available
- CLAUDE.md updated with skills platform and new command awareness

### Fixed
- cursor pagination correctness in database-patterns skill (compound cursor)

## [0.2.0] — Day 2 Wave Engine

### Added
- Wave-based parallel execution engine
- Dependency parser and wave grouper
- Context injector with minimum-context principle
- Compaction protocol (automated at 70% context)
- AUDIT.jsonl append-only pipeline with full schema
- 4 new commands: /mindforge:next, /mindforge:quick, /mindforge:status, /mindforge:debug

## [0.1.0] — Day 1 Foundation

### Added
- Core directory scaffold
- CLAUDE.md agent entry point
- 8 agent persona definitions
- 5 initial core skill packs
- 6 slash commands: help, init-project, plan-phase, execute-phase, verify-phase, ship
- npm installer (npx mindforge-cc)
- State management: STATE.md, HANDOFF.json
- Org context templates: ORG.md, CONVENTIONS.md, SECURITY.md, TOOLS.md
