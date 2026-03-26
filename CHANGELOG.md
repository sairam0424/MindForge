# Changelog

## [2.6.0] — Temporal Vision (Time-Travel Debugging) — 2026-03-27

🚀 **MindForge v2.6.0 — The Observability Revolution**

This update introduces "Temporal Vision," a high-fidelity time-travel debugging system that allows developers to scrub through execution history, explore past states, and perform "Hindsight Injection" to repair architectural drift automatically.

### Added (v2.6.0)

- **Temporal Vision Engine**:
  - **Temporal Hub**: Synchronous state snapshotting of the `.planning/` directory at every significant audit point.
  - **State Snapshots**: High-fidelity records of `.md`, `.json`, and `.log` files stored in `.planning/history/[audit_id]/`.
  - **Hindsight Injection**: Automated state repair protocol that rolls back history to a specific point ($T_n$), injects a correction, and re-triggers autonomous execution.
- **Observability Interface (Dashboard Integration)**:
  - **Temporal API**: REST endpoints for history navigation, snapshot exploration, and remote hindsight injection.
  - **Auto-Runner Integration**: Unified event ID generation and automated state capture embedded in the core loop.
- **CLI Extensions**:
  - `/mindforge:temporal status`: View snapshot density and history stats.
  - `/mindforge:temporal inject`: Manual hindsight injection from the terminal.
  - `/mindforge:temporal cleanup`: Automated purge of stale history snapshots.
- **Governance**:
  - **Temporal Protocol (`temporal-protocol.md`)**: Definition of safety rules, recovery boundaries, and state integrity checks.

### [2.5.0] — Local-First Knowledge Graph (RAG 2.0) — 2026-03-27

🚀 **MindForge v2.5.0 — The Knowledge Graph Revolution**

This update introduces a sophisticated Local-First Knowledge Graph (RAG 2.0), moving beyond flat vector search to a typed-edge, traversable knowledge architecture with proactive context shadowing.

### Added (v2.5.0)

- **Local-First Knowledge Graph (RAG 2.0)**:
  - **Embedding Engine**: Custom local TF-IDF vectorizer with bigram detection and camelCase splitting. Zero external dependencies.
  - **Graph Engine**: Typed-edge graph (6 types) with BFS traversal, cycle detection, and SHA-256 edge integrity.
  - **Auto-Shadow Engine**: Proactive "ghost-pattern" context injection for subagents based on graph proximity and semantic similarity.
  - **Typed Edges**: Support for `RELATED_TO`, `CAUSED_BY`, `SUPERSEDES`, `DEPENDS_ON`, `INFORMS`, and `CONTRADICTS` relationships.
  - **Graph-Aware Capture**: Automatic edge inference during memory capture from bug patterns and review findings.
  - **Maintenance Tools**: Integrity verification, edge weight decay (time-based), and orphan node pruning.
- **SDK Extensions**:
  - Full TypeScript support for graph traversal, edge management, and hybrid similarity queries.

### Fixed (v2.5.0)


- **macOS App Sandbox Compatibility**: Implemented `setTestMode()` in memory engines to bypass nesting-related EPERM errors when running from sandboxed editors.

🚀 **MindForge v2.4.0 — The Core Pillars Optimization**


This major architectural update introduces a dynamic, SRD-based memory sharding system and the Adversarial Decision Synthesis (ADS) protocol, replacing legacy monolithic handoffs with a hardened, high-fidelity Tri-Tier Memory model.

### Added (v2.4.0)

- **Adversarial Decision Synthesis (ADS)**:
  - **ADS Engine**: Integrated a 3-model synthesis loop (Architect/Auditor/Synthesizer) for peer-reviewed architectural planning.
  - **SOUL Scoring Engine**: New scoring metric `(Impact * Leverage * Reversibility) / (Effort * Risk * Cost)` for objective decision ranking.
  - **Red-Team Jailbreak**: Enforced architectural auditing that forces the identification of at least 3 critical system flaws.
  - **Automated ADR Workflow**: synthesis results are now persisted as SOUL-scored Decision Records in `.planning/decisions/`.
- **Semantic Context Sharding**:
  - **Tri-Tier Memory Controller**: Integrated `shard-controller.md` to manage memory transitions across Hot (`HANDOFF.json`), Warm (`.planning/memories/`), and Cold (`.mindforge/memory/`) tiers.
  - **SRD Scoring Engine**: New weighted Semantic Relevance Density (SRD) scoring for contextual items based on Decisiveness, Frequency, and Impact.
  - **Beast Mode Hardening**: Implemented SHA-256 integrity verification and automated semantic tagging for all memory shards.
  - **Proactive Warm Retrieval**: Updated the context injector to automatically pull relevant shards based on task sub-context.
- **Shard Helper Utility**: New `bin/shard-helper.js` for standalone memory analysis and integrity auditing.

### Changed (v2.4.0)

- **Planning Protocol**: `/mindforge:plan-phase` now officially supports the `--ads` flag for high-fidelity synthesis cycles.
- **Compaction Protocol V3**: Upgraded the standard compaction flow to include `Step 4.5: Semantic Sharding`, preventing long-term context window pollution and reducing context overhead by ~35%.

🚀 **MindForge v2.4.0 — Semantic Context Sharding (Tri-Tier Memory)**

This major architectural update introduces a dynamic, SRD-based memory sharding system, replacing legacy monolithic handoffs with a hardened, high-fidelity Tri-Tier Memory model (Hot, Warm, Cold).

### Added (v2.4.0)

- **Tri-Tier Memory Controller**: Integrated `shard-controller.md` to manage memory transitions across Hot (`HANDOFF.json`), Warm (`.planning/memories/`), and Cold (`.mindforge/memory/`) tiers.
- **SRD Scoring Engine**: New weighted Semantic Relevance Density (SRD) scoring for contextual items based on Decisiveness, Frequency, and Impact.
- **Beast Mode Hardening**: Implemented SHA-256 integrity verification and automated semantic tagging for all memory shards.
- **Proactive Warm Retrieval**: Updated the context injector to automatically pull relevant shards based on task sub-context.
- **Shard Helper Utility**: New `bin/shard-helper.js` for standalone memory analysis and integrity auditing.

### Changed (v2.4.0)

- **Compaction Protocol V3**: Upgraded the standard compaction flow to include `Step 4.5: Semantic Sharding`, preventing long-term context window pollution.
- **Context Hygiene**: Reduced baseline context overhead for long-running sessions by ~35% through aggressive tiering.

## [2.3.5] — Intelligent Asset Sync & Merge — 2026-03-26

🚀 **MindForge v2.3.5 — Intelligent Asset Sync & Merge**

This release transforms the installation engine from a static "skip if exists" model to an intelligent "Merge & Sync" system, ensuring all framework assets, documentation, and advanced modules are correctly deployed even into existing project environments.

### Added (v2.3.5)

- **Intelligent Merging**: Refactored `copyDir` to support `noOverwrite` mode, allowing the installer to add missing subfolders and templates without disrupting user-customized files.
- **Advanced Module Sync**: Added explicit path mapping for `memory`, `plugins`, `intelligence`, and `dashboard` modules into the standard installation payload.
- **Expanded Asset Types**: Upgraded runtime definitions to include `memorySubdir` and `pluginsSubdir` for all supported IDE environments.

### Fixed (v2.3.5)

- **Sync Gating**: Removed restrictive directory existence checks that caused the installer to skip entire asset categories if the parent folder already existed.
- **Documentation Parity**: Hardened the documentation sync logic to ensure `references/` and `templates/` always reach the `.agents/docs/` target.

## [2.3.4] — Architectural Sync & Zero-GSD Purge — 2026-03-25

### Added (v2.3.4)

- **Comprehensive Planning Sync**: Expanded `.planning` deployment to include `ROADMAP.md`, `ARCHITECTURE.md`, `REQUIREMENTS.md`, and `RELEASE-CHECKLIST.md` by default.
- **Zero-GSD Standard**: Completed the removal of all "GSD" instances from the installer logic and internal system identifiers.

### Fixed (v2.3.4)

- **Documentation Payload**: Fixed a discrepancy in the path-mapping for documentation subdirectories (`references/`, `templates/`) ensuring they correctly sync into `.agents/docs/`.
- **Directory Persistence**: Ensured that empty planning subdirectories correctly persist with `.gitkeep` during fresh installations.

## [2.3.3] — Payload Cleanup & Enterprise Pruning — 2026-03-25

🚀 **MindForge v2.3.3 — Payload Cleanup & Enterprise Pruning**

This release strictly prunes the installation payload to remove legacy GSD artifacts, project-specific state, and development-only folders, ensuring a clean "out-of-the-box" enterprise experience.

### Fixed (v2.3.3)

- **Installation Payload**: Removed legacy migration folders (`01-migrate-legacy-to-mindforge`, `day1`, `day2`, `day3`).
- **State Leakage**: Excluded project-specific state files (`AUDIT.jsonl`, `HANDOFF.json`, `jira-sync.json`, `slack-threads.json`) from distribution.
- **Enterprise Pruning**: Updated `installer-core.js` to automatically filter out development-only framework folders (e.g., `distribution`, `monorepo`, `production`).

## [2.3.2] — Asset Sync Repair — 2026-03-25

🚀 **MindForge v2.3.2 — Asset Sync Repair**

This release fixes documentation asset synchronization and repairs logic corruption in the installer core.

### Added (v2.3.2)

- **Docs & Templates Sync**: Integrated `docs/references` and `docs/templates` into the standard installation payload.
- **Recursive Counting**: Implemented deep directory file counting for accurate manifest reporting.

### Fixed (v2.3.2)

- **Installer Logic**: Repaired syntax corruption and removed duplicated code blocks in `installer-core.js`.

## [2.1.2] — Beast Mode Branding & CI Fix — 2026-03-25

🚀 **MindForge v2.1.2 — Beast Mode Branding & CI Fix**

This release transforms the MindForge installation experience with a high-impact "Beast Mode" CLI interface and resolves critical CI/CD integration issues.

### Added (v2.1.2)

- **Beast Mode CLI Branding**: New ultra-blocky ASCII "MINDFORGE" branding and high-contrast "Digital Architect" design system.
- **Payload Manifest Summary**: Architectural summary screen displaying dynamic counts of deployed Personas, Skills, and Integrations.
- **"TRY IT NOW" Utility**: Boxed terminal widget providing immediate post-install command guidance.
- **Enhanced Status Reporting**: Unified architectural status grid for environment detection.

### Fixed (v2.1.2)

- **CI/CD Permissions**: Resolved `RequestError [HttpError]: GitHub Actions is not permitted to create or approve pull requests` by adding `contents: write` to `auto-pr.yml`.

## [2.1.1] — Core Migration Finalization — 2026-03-25

🧩 **MindForge v2.1.1 — Core Migration Finalization**

This release completes the structural rebranding and migration of the MindForge framework into MindForge. It finalizes the path alignment for all 120+ assets, hardens the core configuration management, and fully integrates the expanded persona ecosystem.

### Added (v2.1.1)

- **Finalized Path Mapping**: All framework assets (skills, workflows, bin) now reside in a unified, flat `.agent/` structure for cross-IDE compatibility.
- **32-Persona Ecosystem**: Full integration of 32 specialized engineering personas with defined tool permissions and capability matrices.
- **Unified 4-Pillar Workflow**: Hardened `plan`, `execute`, `verify`, and `ship` logic with project-level `.agent/` integrity.
- **Enterprise Manifest**: New `file-manifest.json` serving as the single source of truth for multi-project codebase mapping.
- **Consolidated Configuration**: Unified framework settings and project-level governance in `.mindforge/` and `.agent/`.
- **Rebranded Lifecycle Hooks**: 5 new high-performance hooks for context monitoring, prompt guarding, and real-time status updates.

### Changed (v2.1.1)

- **Zero-Watermark Integrity**: 100% elimination of residual "MindForge" and "get-shit-done" identifiers from codebase, documentation, and metadata.
- **Documentation Overhaul**: Modernized the entire documentation suite, including Architecture, Personas, Skills Authoring, and Command References.
- **Hardened Settings**: `settings.json` now features dynamic hook pathing for increased portability across system environments.

## [2.1.0] — The Specialized Expansion — 2026-03-24

🧩 **MindForge v2.1.0 — The Specialized Expansion**

This release significantly expands the MindForge persona ecosystem, integrating 18+ high-performance specialized agents from the MindForge framework. This expansion doubles the framework's baseline capabilities in research, architecture, execution, and quality assurance.

### Added
- **18+ New Specialized Personas**: Integration of advanced agents including `nyquist-auditor`, `user-profiler`, `advisor-researcher`, `ui-auditor`, and more.
- **Extended Mapping & Strategy**: Enhanced `roadmapper-extend` and `codebase-mapper-extend` for deep project lifecycle management.
- **Comprehensive Permissions Audit**: Full tool-access transparency for all 32 personas in `docs/PERSONAS.md`.
- **Architectural State Update**: `Master-Context.md` now reflects the 32-persona structural foundation.

### Changed
- **Documentation Overhaul**: Complete update of `PERSONAS.md` and `Master-Context.md` to reflect the expanded ecosystem.
- **Branding Alignment**: All integrated MindForge personas rebranded and fully sanitized for MindForge native use.

---

## [2.0.0] — The Autonomous Enterprise — 2026-03-24

🚀 **MindForge v2.0.0 — The Autonomous Enterprise — Major Release**

This major release transforms MindForge from a Claude-centric framework into a universal AI agent operating system. With support for 6 major runtimes and a hardened autonomous execution engine, v2.0.0 is built for enterprise-scale AI orchestration.

### Added
- **6-Runtime Multi-Platform Support**: Official support for Claude Code, Antigravity, Cursor, OpenCode, Gemini CLI, and GitHub Copilot.
- **Runtime Adapters**: Automatic content transformation for Gemini (model/filename mapping) and preambles for non-slash runtimes (Cursor/Copilot).
- **`/mindforge:new-runtime`**: Rapidly scaffold custom AI agent runtimes with correct directory structures and command visibility.
- **Unified Migration Engine (v2.0.0)**: Additive schema upgrades for `AUDIT.jsonl` (runtime/agent_id) and `token-usage.jsonl` (model_group).
- **Hardened Self-Building Skills**: Automated skill capture from documentation and phase outputs.
- **7-Dimension Quality Scorer**: Enhanced static analysis for skill authoring.
- **MindForge Integration**: 10 new advanced commands for design-first planning, zero-friction capture, and smart routing.
- **`/mindforge:do`**: Smart natural language dispatcher that routes intent to the correct command.
- **`/mindforge:ui-phase` & `/mindforge:ui-review`**: Tier-1 visual design contract and visual audit engine.
- **`/mindforge:note`**: Instant idea capture with todo promotion.
- **`/mindforge:validate-phase`**: Requirement coverage and test gap identification.
- **`/mindforge:session-report`**: Professional stakeholder summary with token profiling.
- **Backlog & Seed Management**: `/mindforge:add-backlog`, `/mindforge:review-backlog`, and `/mindforge:plant-seed`.
- **Parallel Workstreams**: `/mindforge:workstreams` for concurrent milestone execution.
- **65-Point Production Checklist**: Exhaustive verification suite for enterprise readiness.

### Changed
- **Directory Standard**: Antigravity local workflows moved to `.agents/workflows/` with mandatory YAML frontmatter.
- **Migration Strategy**: Transitioned to an idempotent, backup-first migration model with smart skipping.
- **Stable Interface Contract**: Hardened internal members (RUNTIMES, generateEntryContent) for extensibility.

### Architecture Decisions
- **ADR-039**: Multi-Runtime Platform Support.
- **ADR-040**: Additive Schema Migration Strategy.
- **ADR-041**: Stable Runtime Interface Contract.

---

## [2.0.0-alpha.12] — Self-Building Skills Platform — 2026-03-24
### Added
- **Self-Building Skills Platform**: Intelligent engine for automatically capturing skills from documentation, sessions, and npm packages.
- **`/mindforge:learn`**: High-level orchestration command for 7-step skill generation pipeline.
- **`/mindforge:marketplace`**: Seamless integration with npm registry for community skills discovery and installation.
- **7-Dimension Quality Scorer**: Static analysis tool ensuring high-quality, injection-safe skill authoring.
- **Auto-Capture Hook**: Automatic pattern detection from phase outputs (SUMMARY, ADR, HANDOFF).
- **CLI Commands**: `learn-skill` and `marketplace` added to `bin/mindforge-cli.js`.
- **ADR-036, ADR-037, ADR-038**: New architectural decisions for skill sourcing, capture thresholds, and quality gates.

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
