# Changelog

## [2.0.0-alpha.11] — Persistent Knowledge Graph — 2026-03-24
### Added
- **Persistent Knowledge Graph**: Core engine for long-term memory across projects.
- **`remember` CLI**: New command for manual knowledge management and semantic search.
- **Automated Capture**: Hooks in `AutoRunner` and `CrossReviewEngine` to ingest insights automatically from phase completions and review reports.
- **Context Injection**: `installer-core.js` now auto-injects relevant historical context into `CLAUDE.md` during installation.
- **`test-memory` CLI**: New command for memory suite verification.

## [2.0.0-alpha.10] — Skill Installation & Validation CLI — 2026-03-24
### Added
- New CLI commands: `validate-skill`, `install-skill`, `register-skill`, `audit-skill`.
- Robust skill validation logic (Level 1 & 2) in `bin/skill-validator.js`.
- Automated manifest management and audit logging in `bin/skill-registry.js`.
- Integrated CLI commands into the `install-skill.md` agentic workflow for higher reliability.

## [2.0.0-alpha.9] — Verified Antigravity Compatibility — 2026-03-23
### Fixed
- Fixed critical installer regression where `files` variable was undefined during command installation.
- Fixed `resolveBaseDir` hardcoding that prevented `.agents/` relocation in non-standard environments.
- Verified end-to-end Antigravity fix for command visibility and YAML frontmatter.

## [2.0.0-alpha.8] — Antigravity Visibility Fix — 2026-03-23

### Fixed
- **Antigravity Command Visibility**: Relocated workflows to `.agents/workflows/` (from `agents/`) and injected mandatory YAML frontmatter (`description`) to ensure registration in Antigravity.
- **Zero-Config Sync**: Updated `init-project` command to reflect the new `.agents` directory standard.

## [2.0.0-alpha.7] — Day 12: Real-time Observability Dashboard — 2026-03-22

- [v2.0.0-alpha.7 (2026-03-22)]
  - [NEW] Real-time Dashboard Server (Express + SSE Bridge).
  - [NEW] Premium 5-tab UI: Activity, Metrics, Approvals, Memory, Team.
  - [NEW] Live Data Streaming for Audit Logs, Quality, Costs, and Team Activity.
  - [NEW] Hardened Tier 3 Governance: Mandatory Plan ID typing for sensitive approvals.
  - [NEW] Metrics Aggregator: Multi-source JSONL processing for observability.
  - [NEW] CLI Command: `/mindforge:dashboard` for server lifecycle management.
  - [NEW] ADR-033: Real-time Observability Architecture.
  - [HARDENED] SSE Rotation Detection (Inode-based).
  - [HARDENED] Localhost-only Security Model (Strict CORS/Binding).

## [2.0.0-alpha.4] — Day 11: Persistent Knowledge Graph (Long-Term Memory) — 2026-03-22

- [v2.0.0-alpha.4 (2026-03-22)]
  - [NEW] Persistent Knowledge Graph for long-term memory across sessions.
  - [NEW] TF-IDF search engine with confidence-based relevance ranking.
  - [NEW] Automated Knowledge Capture from ADRs, Debug Reports, and Retrospectives.
  - [NEW] Global Knowledge Sync for machine-wide insight sharing (`~/.mindforge/global-knowledge-base.jsonl`).
  - [NEW] Skill SDK integration for programmatic memory access.
  - [NEW] Manual memory management command (`/mindforge:remember`).
  - [NEW] Append-only audit-ready storage schema for all knowledge types.
  - [NEW] ADR-030, ADR-031, ADR-032.

## [2.0.0-alpha.3] — Day 10: Multi-Model Intelligence Layer — 2026-03-22

- [v2.0.0-alpha.3 (2026-03-22)]
  - [NEW] Unified Multi-Model Intelligence Layer (Anthropic, OpenAI, Gemini).
  - [NEW] Dynamic Model Router with Persona and Tier-based logic.
  - [NEW] Real-time Cost Tracking and Daily Budget Enforcement.
  - [NEW] Adversarial Cross-Model Code Review Engine (`/mindforge:cross-review`).
  - [NEW] Deep Research Engine with Gemini 1.5 Pro 1M context support (`/mindforge:research`).
  - [NEW] Model usage and cost reporting (`/mindforge:costs`).
  - [NEW] Secure API handling with SSRF protection and header-based auth.
  - [NEW] ADR-027, ADR-028, ADR-029.

## [2.0.0-alpha.2] — Day 9: Visual QA Engine (Browser Runtime Engine) — 2026-03-22

- [v2.0.0-alpha.2 (2026-03-22)]
  - [NEW] Persistent Browser Runtime (Playwright-powered Chromium daemon).
  - [NEW] Visual Verification Hook (`<verify-visual>`) in PLAN files.
  - [NEW] Systematic Visual QA Engine (`/mindforge:qa`).
  - [NEW] Persistent Session Management for Browser Control.
  - [NEW] ADR-024, ADR-025, ADR-026.

- [v2.0.0-alpha.1 (2026-03-22)]
  - Initial v2 scaffolding.

## [2.0.0-alpha.1] — Day 8: Autonomous Execution Engine — 2026-03-22

### Added (MindForge v2.0.0-alpha.1)
**Autonomous execution engine:**
- `/mindforge:auto` — walk-away autonomous phase/milestone execution
- `/mindforge:steer` — mid-execution guidance injection from second terminal
- Node repair operator: RETRY → DECOMPOSE → PRUNE → ESCALATE
- Stuck detection engine: 5 patterns (S01-S05)
- Headless CLI mode: `mindforge-cc headless --phase N`
- `.planning/steering-queue.jsonl` — steering instruction queue
- `.planning/auto-state.json` — real-time execution state

**MINDFORGE.md v2 settings:**
- AUTO_MODE_DEFAULT_TIMEOUT_MINUTES, AUTO_MODE_UAT
- AUTO_NODE_REPAIR_BUDGET, AUTO_RETRY_ON_VERIFY_FAIL
- AUTO_TASK_MAX_TOKENS, AUTO_TASK_TIMEOUT_MINUTES
- AUTO_PUSH_ON_WAVE_COMPLETE, AUTO_NOTIFY_ON_ESCALATION

### Hardened
- Gate 3 (secret detection) now runs PRE-COMMIT in auto mode
- Pre-flight dirty check excludes `.planning/` state files
- DECOMPOSE: dependency chain correctly updated in downstream plans
- S01 stuck detection requires consecutive failures
- S03 error normalization preserves module/package names
- Steering injection guard validates all instructions
- SIGTERM handler waits for task cleanup before saving state

### Architecture Decisions
- ADR-021: Autonomy Boundary
- ADR-022: Node Repair Hierarchy
- ADR-023: Gate 3 Timing

## [1.0.5] — v1.0.5 Minimal Install Option — 2026-03-22

### Added
- `--minimal` flag to install only essential project scaffolding.

## [1.0.4] — v1.0.4 Antigravity Install Fix — 2026-03-22

### Fixed
- Antigravity local install now correctly copies commands and CLAUDE.md into `agents/`.

## [1.0.3] — v1.0.3 Antigravity Agents Folder — 2026-03-22

### Changed
- Local Antigravity installs now target `agents/` by default (legacy `.agent/` detected and supported).

## [1.0.2] — v1.0.2 CLI Bin Fix — 2026-03-22

### Fixed
- npm bin entry now uses a path format accepted by npm publish.

## [1.0.1] — v1.0.1 Installer and Packaging Fixes — 2026-03-22

### Fixed
- Interactive setup now uses installer-core directly (no recursive wizard call).
- Package bin entry corrected to use `mindforge-cc` → `bin/install.js`.

### Changed
- Added publish whitelist to reduce package size and exclude build-only files.

## [1.0.0] — v1.0.0 First Stable Public Release — 2026-03-22

🎉 **MindForge v1.0.0 — Enterprise Agentic Framework — First Stable Release**
Release published: v1.0.0 (GitHub Releases).

Built over 7 focused sprints, MindForge transforms Claude Code and Antigravity
from powerful-but-unstructured AI tools into production-grade engineering
partners with full governance, observability, and enterprise integration.

### What ships in v1.0.0

**36 commands** across 7 workflow categories  
**10 core skill packs** with three-tier registry (Core/Org/Project)  
**8 specialised agent personas** covering all engineering roles  
**Wave-based parallel execution** with dependency graph and automatic compaction  
**Enterprise integrations**: Jira, Confluence, Slack, GitHub, GitLab  
**Three-tier governance**: Tier 1 (auto) / Tier 2 (peer review) / Tier 3 (compliance)  
**Five non-bypassable compliance gates** (secret detection, CRITICAL findings, tests, CVEs, GDPR)  
**Intelligence layer**: health engine, difficulty scorer, anti-pattern detector, team profiling  
**Public skills registry**: npm-based `mindforge-skill-*` ecosystem  
**CI/CD integration**: GitHub Actions, GitLab CI, Jenkins adapters  
**@mindforge/sdk**: TypeScript SDK with client, event stream, and command builders  
**Monorepo support**: npm/pnpm/Nx/Turborepo/Lerna workspace detection  
**AI PR Review**: Claude API-powered code review with context loading  
**Self-update mechanism**: version check, changelog diff, scope-preserving apply  
**Version migration engine**: schema migration from v0.1.0 through v1.0.0  
**Plugin system**: extensible via `mindforge-plugin-*` npm namespace  
**Token usage optimiser**: profiling and efficiency strategies  
**50-point production readiness checklist**: fully verified before this release  

**20 Architecture Decision Records** documenting every major design choice  
**15 test suites** with 3× consecutive run requirement  
**Complete reference documentation**: commands, security, ADR index, threat model  

### Stable interface contract
See ADR-020. All 36 commands, HANDOFF.json schema, AUDIT event types,
@mindforge/sdk exports, and plugin.json format are stable in 1.x.x.

### Breaking changes from 0.6.0
- VERIFY_PASS_RATE_WARNING_THRESHOLD in MINDFORGE.md is now 0.0-1.0 (was 0-100)
  Run `/mindforge:migrate` to auto-convert
- AUDIT.jsonl session_id field is now required (auto-backfilled by migration)
- HANDOFF.json plugin_api_version field required for plugin compatibility

### Installation
```bash
npx mindforge-cc@latest
# or
npx mindforge-cc@1.0.0 --claude --global
```

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
