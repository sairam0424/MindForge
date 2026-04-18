# MindForge — Continuation State File
# Generated: Complete
# Purpose: Provide full context for resuming in a new chat session

---

## PROJECT IDENTITY

**Name:** MindForge (`mindforge-cc` on npm)
**Tagline:** Enterprise Agentic Framework — the best agentic framework
**Repository:** `github.com/mindforge-dev/mindforge` (conceptual)
**npm package:** `npx mindforge-cc@latest`
**Current version:** v8.2.0 (Autonomous SRE Era)
**Runtimes supported:** Claude Code (`.claude/`) and Antigravity (`.agent/`)
**License:** MIT

**Purpose:** Transform Claude Code and Antigravity from powerful-but-unstructured
AI tools into systematic, production-grade engineering partners. MindForge wraps
any software project with: structured lifecycle management (plan → execute → verify
→ ship), wave-based parallel execution, a three-tier skills system, enterprise
integrations (Jira, Confluence, Slack, GitHub), three-tier governance (Tier 1/2/3
approvals), and a complete intelligence layer (health engine, difficulty scorer,
anti-pattern detector, quality metrics, team profiling).

---

## WHAT WAS BUILT — DAY BY DAY

### — Foundation (`feat/mindforge-core-scaffold` → v0.1.0)

**Branch:** `feat/mindforge-core-scaffold`
**Output files:** `DAY1-IMPLEMENT.md`, `DAY1-REVIEW.md`, `DAY1-HARDEN.md`

Built the entire structural foundation:

- **`.claude/CLAUDE.md`** — The agent entry point. Session start protocol, plan-first rule, quality gates, security auto-trigger, state artifact table. Mirrored identically to `.agent/CLAUDE.md` (Antigravity runtime).
- **32 agent persona files** in `.mindforge/personas/`:
  - `advisor-researcher.md`, `analyst.md`, `architect.md`, `assumptions-analyzer-extend.md`, `assumptions-analyzer.md`, `codebase-mapper-extend.md`, `codebase-mapper.md`, `coverage-specialist.md`, `debug-specialist.md`, `debugger.md`, `decision-architect.md`, `developer.md`, `executor.md`, `integration-checker.md`, `nyquist-auditor.md`, `phase-researcher.md`, `plan-checker.md`, `planner.md`, `project-researcher.md`, `qa-engineer.md`, `release-manager.md`, `research-agent.md`, `research-synthesizer.md`, `roadmapper-extend.md`, `roadmapper.md`, `security-reviewer.md`, `tech-writer.md`, `ui-auditor.md`, `ui-checker.md`, `ui-researcher.md`, `user-profiler.md`, `verifier.md`
- **5 initial core skill packs** in `.mindforge/skills/`:
  - `security-review/SKILL.md` — 29 trigger keywords, OWASP A01-A10
  - `code-quality/SKILL.md` — Complexity, naming, error handling
  - `api-design/SKILL.md` — REST conventions, versioning, error schemas
  - `testing-standards/SKILL.md` — Coverage, test patterns, TDD
  - `documentation/SKILL.md` — README, ADRs, changelogs
- **6 slash commands** (Days 1 baseline):
  - `/mindforge:help` — Show all commands
  - `/mindforge:init-project` — Guided project setup
  - `/mindforge:plan-phase [N]` — Research and decompose into PLAN files
  - `/mindforge:execute-phase [N]` — Wave-based parallel execution
  - `/mindforge:verify-phase [N]` — Automated + UAT testing pipeline
  - `/mindforge:ship [N]` — Create PR, release notes, push
- **Org context templates:** `ORG.md`, `CONVENTIONS.md`, `SECURITY.md`, `TOOLS.md`
- **Project state templates:** `PROJECT.md`, `STATE.md`, `HANDOFF.json` (schema_version, _warning field, context_refs)
- **`bin/install.js`** — npx installer skeleton
- **`package.json`** — `name: "mindforge-cc"`, version 0.1.0
- **`tests/install.test.js`** — Structural integrity tests

**Key ADRs established:** ADR-001 (HANDOFF.json), ADR-002 (Markdown commands), ADR-003 (keyword trigger model)

---

### — Wave Execution Engine (`feat/mindforge-wave-engine` → v0.2.0)

**Branch:** `feat/mindforge-wave-engine`
**Output files:** `DAY2-IMPLEMENT.md`, `DAY2-REVIEW.md`, `DAY2-HARDEN.md`

Built the execution engine that makes plans actually run:

- **`.mindforge/engine/`** — 5 engine files:
  - `dependency-parser.md` — Parses PLAN XML into a DAG, circular dependency detection, file conflict detection
  - `wave-executor.md` — Kahn's topological sort for wave grouping, parallel within waves, sequential between waves, `WAVE-REPORT-N.md` output format
  - `context-injector.md` — Minimum-context principle per subagent (30K token budget), path traversal guard, SECURITY.md placeholder validation
  - `compaction-protocol.md` — 6-step compaction at 70% context: WIP commit, STATE.md update, HANDOFF.json write, AUDIT entry, compact and continue
  - `verification-pipeline.md` — 4-stage pipeline: automated tests → requirement traceability → type/lint → security regression
- **AUDIT.jsonl system** — Append-only audit log at `.planning/AUDIT.jsonl`, 12 event types (task_started, task_completed, task_failed, security_finding, quality_gate_failed, context_compaction, phase_completed, decision_recorded, etc.), universal schema: id (UUID v4), timestamp (ISO-8601), event, agent, phase, session_id
- **`.planning/HANDOFF.json`** schema expanded with: recent_commits, recent_files, agent_notes, in_progress object, updated_at
- **4 new commands** (total: 10):
  - `/mindforge:next` — Auto-detect next workflow step with full decision tree
  - `/mindforge:quick [--flags]` — Ad-hoc task execution outside phases
  - `/mindforge:status` — Rich project dashboard with phase progress bars
  - `/mindforge:debug` — Full Debug Specialist persona, 4-question intake, 10-step RCA, `DEBUG-timestamp.md` output
- **3 new test suites:** `tests/wave-engine.test.js` (parseDependencies, Kahn's algorithm, circular detection, file conflicts), `tests/audit.test.js` (schema validation, JSONL integrity), `tests/compaction.test.js` (HANDOFF schema, 85% emergency threshold)

**Key ADRs:** ADR-004 (wave parallelism), ADR-005 (append-only JSONL audit log)

---

### — Skills Platform (`feat/mindforge-skills-platform` → v0.3.0)

**Branch:** `feat/mindforge-skills-platform`
**Output files:** `DAY3-IMPLEMENT.md`, `DAY3-REVIEW.md`, `DAY3-HARDEN.md`

Built the skills distribution and intelligence engine:

- **`.mindforge/engine/skills/`** — 4 engine files:
  - `registry.md` — MANIFEST.md format, three-tier registry (Core T1 → Org T2 → Project T3), tier priority (Project > Org > Core), health check protocol
  - `loader.md` — 5-step JIT loading (trigger index → text matching → file-path matching → **file-name matching** → conflict resolution → load), context budget (summarise skills 4+ at max 150 words each), injection guard, skills loading report format
  - `versioning.md` — Semver for skills, frontmatter with name/version/status/triggers/breaking_changes/changelog, compatibility check protocol, upgrade protocol
  - `conflict-resolver.md` — 4 conflict types: same trigger different skills (load both), same skill name different tiers (higher tier wins), trigger subset (more specific as primary), mutual exclusion (match count tiebreak)
- **5 new core skill packs** (total: 10):
  - `performance/SKILL.md` — Core Web Vitals (LCP/INP/CLS targets), bundle budgets, N+1 detection, caching TTL tables, p50/p95/p99 targets
  - `accessibility/SKILL.md` — WCAG 2.1 AA + WCAG 2.2 new criteria, ARIA patterns, keyboard testing, `@media (prefers-reduced-motion)`
  - `data-privacy/SKILL.md` — GDPR/CCPA/PIPEDA, consent withdrawal rule, PII forbidden patterns with code examples, lawful basis documentation
  - `incident-response/SKILL.md` — P0-P3 classification, runbook template, blameless postmortem template, monitoring standards per feature
  - `database-patterns/SKILL.md` — **Compound cursor pagination** (BLOCKING bug fix: `(created_at, id)` not just `created_at`), UUIDv7 guidance, N+1 detection, transaction isolation, index strategy
- **`.mindforge/org/skills/MANIFEST.md`** — All 10 skills registered in three-tier table format with paths
- **Persona customisation system:** `.mindforge/personas/overrides/` with additive/override/remove directives, phase-level overrides at `.planning/phases/[N]/persona-overrides/`
- **5 new commands** (total: 15):
  - `/mindforge:skills` — Full CLI: list/info/search/validate/add/update
  - `/mindforge:review` — Code review using code-quality + security personas, `CODE-REVIEW-timestamp.md` output, BLOCKING/MAJOR/MINOR/SUGGESTION findings
  - `/mindforge:security-scan` — OWASP A01-A10, secret detection, dependency CVE audit, `SECURITY-SCAN-timestamp.md` output, CRITICAL finding blocking with bold warning
  - `/mindforge:map-codebase` — 4 parallel subagents (stack analyst, architecture analyst, conventions analyst, quality baseline analyst), brownfield onboarding, CONVENTIONS.md marked [DRAFT]
  - `/mindforge:discuss-phase` — Pre-planning interview (3 templates: Visual/UI, API/Backend, Data/Database, Integration), CONTEXT.md output, `--batch` and `--auto` flags
- **`docs/skills-authoring-guide.md`** — Complete guide for creating Tier 2/3 skills
- **1 new test suite:** `tests/skills-platform.test.js` (frontmatter validation, trigger counts, mandatory actions, MANIFEST.md path resolution)

**Critical fixes in hardening:**
- Cursor pagination corrected to compound `(created_at, id)` cursor
- Gate 4 GDPR made independent of data-privacy skill loading
- `plan-phase.md` updated to read CONTEXT.md from discuss-phase

**Key ADRs:** ADR-006 (three-tier skills), ADR-007 (trigger model at scale), ADR-008 (JIT loading)

---

### — Enterprise Integrations + Governance (`feat/mindforge-enterprise-integrations` → v0.4.0)

**Branch:** `feat/mindforge-enterprise-integrations`
**Output files:** `DAY4-IMPLEMENT.md`, `DAY4-REVIEW.md`, `DAY4-HARDEN.md`

Built the enterprise integration and governance layer:

- **`.mindforge/integrations/`** — 6 files:
  - `connection-manager.md` — Credential safety (env vars only, never in files), 5 availability states (available/unconfigured/invalid_credentials/unreachable/rate_limited), circuit breaker pattern (3 failures → circuit open), retry policy (exponential backoff × 3), 10s timeout on all calls, **shell credential hygiene** (no `set -x`, no `curl -v` with auth headers), credential unset after use
  - `jira.md` — REST API v3, **dynamic transition ID lookup** (not hardcoded IDs), Epic/Story/Bug creation, jira-sync.json state file, conflict handling (no destructive overwrites of manual Jira changes)
  - `confluence.md` — API v2, Markdown→Confluence Wiki conversion, idempotent page creation (update not duplicate), confluence-sync.json state file
  - `slack.md` — Block Kit templates (phase complete, CRITICAL finding, approval request), thread management, slack-threads.json, graceful degradation when unconfigured, CRITICAL findings written to STATE.md "Undelivered alerts" when Slack unconfigured
  - `github.md` — PR creation with template, reviewer assignment, branch protection pre-flight, PR template at `.github/pull_request_template.md`, release tag creation
  - `gitlab.md` — Equivalent MR workflow
- **`.mindforge/governance/`** — 4 files:
  - `change-classifier.md` — **Three signals for Tier 3**: (A) file path patterns (`auth/`, `payment/`, `login.ts`, etc.), (B) **code content patterns** (`jwt.sign`, `bcrypt`, `stripe.` in the actual diff), (C) audit history (recent security findings elevate to Tier 3). Tier 1/2 classification. `change_classified` AUDIT event with `signal_triggered` and `pattern_matched` fields
  - `approval-workflow.md` — PENDING→APPROVED/REJECTED/EXPIRED lifecycle, `.planning/approvals/APPROVAL-[uuid].json` schema, blocking execution until resolved, emergency override with `EMERGENCY_APPROVERS` list, post-incident review auto-task
  - `compliance-gates.md` — **5 non-bypassable gates**: Gate 1 (no CRITICAL findings), Gate 2 (tests passing), Gate 3 (no secrets — override: NOT POSSIBLE), Gate 4 (GDPR retention — **independent of skill loading**, PII field detection via diff scanning), Gate 5 (dependency CVEs). `GATE-RESULTS-[N].md` output
  - `GOVERNANCE-CONFIG.md` — TIER2_APPROVERS, TIER3_APPROVERS, EMERGENCY_APPROVERS, SLA hours, escalation contact
- **`.mindforge/team/`** — Multi-developer HANDOFF:
  - `multi-handoff.md` — Per-developer files at `.planning/handoffs/HANDOFF-[dev-id].json`, dev-id from `git config user.email`, shared team HANDOFF.json (phase-level), active_developers field with last_seen, stale detection (> 4 hours), conflict detection (same plan → same files)
  - `session-merger.md` — Post-session artifact reconciliation
- **AUDIT.jsonl archiving** — Archive at 10,000 lines to `.planning/audit-archive/`, archive marker entry, continue with fresh AUDIT.jsonl
- **6 new commands** (total: 21):
  - `/mindforge:audit` — Filter by phase/event/date/severity, `--export`, `--verify` (integrity check), `--include-archived`, `--summary`
  - `/mindforge:milestone` — create/status/list, MILESTONE-[name].md
  - `/mindforge:complete-milestone` — Security scan + report + CHANGELOG + Confluence publish + release tag + GitHub release + Slack notification + **scoped archive** (only milestone phases, not all)
  - `/mindforge:approve` — List pending, approve, reject, emergency override (EMERGENCY_APPROVERS validated), expiry processing
  - `/mindforge:sync-jira` — Bidirectional sync with `--dry-run` and `--force`
  - `/mindforge:sync-confluence` — Publish architecture/ADRs/phase docs with `--page all`
- **`.mindforge/org/integrations/INTEGRATIONS-CONFIG.md`** — All integration non-credential config
- **2 new test suites:** `tests/integrations.test.js`, `tests/governance.test.js` (change classifier simulation, approval schema validation, compliance gate checks)

**Key ADRs:** ADR-009 (env-var credentials), ADR-010 (gates non-bypassable, approvals allow emergency), ADR-011 (integrations non-blocking), ADR-012 wait — actually ADR-009/010/011

---

### — Intelligence Layer (`feat/mindforge-intelligence-layer` → v0.5.0)

**Branch:** `feat/mindforge-intelligence-layer`
**Output files:** `DAY5-IMPLEMENT.md`, `DAY5-REVIEW.md`, `DAY5-HARDEN.md`

Built the framework's self-awareness and self-improvement systems:

- **`.mindforge/intelligence/`** — 5 files:
  - `health-engine.md` — 7 categories: (1) installation integrity (47+ required files, CLAUDE.md parity, command parity), (2) context file health (PROJECT.md placeholder detection, HANDOFF.json secret scan, STATE.md staleness), (3) skills registry health, (4) persona system health (override injection guard), (5) state consistency (phase status vs. artifact presence), (6) integration connectivity (live health checks), (7) security configuration (.gitignore completeness, SECURITY.md placeholder detection). Auto-repair for 7 issue types. AUDIT.jsonl quarantine-not-deletion for corrupt lines
  - `difficulty-scorer.md` — 4-dimension scoring: Technical × 0.35 + Risk × 0.30 + Ambiguity × 0.20 + Dependencies × 0.15. Composite → recommended task count (Easy: 2-3, Moderate: 4-6, Challenging: 6-10, Hard: 10-15). `DIFFICULTY-SCORE-[N].md` output with risk flags
  - `antipattern-detector.md` — 5 categories, 13 patterns. Architecture (A01 God Object with executable-line-count, A02 Circular Deps, A03 Distributed Monolith, A04 Hardcoded Config). Database (B01 SELECT*, B02 Missing FK indexes, B03 Unbounded queries with **cursor pagination exemption**). Security (C01 auth type coercion with **test-file exclusion**, C02 Missing auth middleware, C03 PII in URLs). Code Quality (D01 over 500 exec lines, D02 Magic strings, D03 Swallowed errors). Testing (E01 implementation testing, E02 flaky test indicators)
  - `skill-gap-analyser.md` — Maps work categories to required/recommended skills, checks MANIFEST.md availability, reports gaps with options (create skill / proceed without / update existing)
  - `smart-compaction.md` — **3 compaction levels**: Level 1 (lightweight 70-79%), Level 2 (structured extraction 80-89% — 5 blocks: decisions made with rationale + what ruled out, discoveries, current task state, implicit knowledge, quality signals), Level 3 (emergency 90%+). Level 2 HANDOFF.json has richer schema with decisions_made/discoveries/implicit_knowledge/quality_signals arrays. Session restart reads implicit knowledge before PLAN files
- **`.mindforge/team/`** expanded:
  - `TEAM-PROFILE.md` — Tech stack preferences, working patterns (session length, compaction frequency), quality patterns (verify pass rate, common failure types), personalisation rules, **metrics ethics policy** (per ADR-014: metrics are NOT developer performance evaluation)
  - `profiles/README.md` — Per-developer PROFILE-[dev-id].md template
- **`.mindforge/metrics/`** — 2 files:
  - `METRICS-SCHEMA.md` — 4 JSONL files: `session-quality.jsonl` (score formula: base 100, -15/task_failed, -30/CRITICAL, clamped 0-100, +5 bonuses), `phase-metrics.jsonl`, `skill-usage.jsonl`, `compaction-quality.jsonl`
  - `quality-tracker.md` — 5 trend metrics, early warning signals, **automatic behaviour adjustments** (verify rate < 75% → agent adds step validation, task failure > 20% → halve scope estimate, compactions > 2/session → proactive summarisation, security findings increasing → load security-review for ALL tasks)
- **`MINDFORGE.md`** — Project constitution file in project root. 25+ configurable settings: model preferences (PLANNER_MODEL, EXECUTOR_MODEL, etc.), execution behaviour (WAVE_CONFIRMATION_REQUIRED, COMPACTION_THRESHOLD_PCT, MAX_TASKS_PER_PHASE), quality standards (MIN_TEST_COVERAGE_PCT, MAX_FUNCTION_LINES), skills behaviour (ALWAYS_LOAD_SKILLS, DISABLED_SKILLS), git conventions (COMMIT_FORMAT, BRANCHING_STRATEGY), CI/CD settings. **NON-OVERRIDABLE rules section**: SECURITY_AUTOTRIGGER, SECRET_DETECTION, PLAN_FIRST, AUDIT_WRITING cannot be disabled
- **`.mindforge/MINDFORGE-SCHEMA.json`** — JSON Schema with type validation, min/max bounds, `nonOverridable: true` markers. `bin/validate-config.js` validates MINDFORGE.md against schema
- **Interactive setup wizard** — `bin/wizard/setup-wizard.js` (7-step guided install), `environment-detector.js` (detects runtimes, project type, package manager, existing MindForge), `config-generator.js` (writes INTEGRATIONS-CONFIG.md, GOVERNANCE-CONFIG.md from wizard input)
- **4 new commands** (total: 25):
  - `/mindforge:health [--repair] [--category] [--verbose]`
  - `/mindforge:retrospective [phase|milestone] [--template agile|4ls|starfish]` — Quantitative data from AUDIT.jsonl + qualitative discussion, RETROSPECTIVE-[N].md output, **feeds back to MINDFORGE.md** with specific setting changes mapped to retrospective findings
  - `/mindforge:profile-team [--refresh] [--developer] [--questionnaire]`
  - `/mindforge:metrics [--window short|medium|long] [--export]`
- **2 new test suites:** `tests/intelligence.test.js` (difficulty scorer, antipattern detector, smart compaction, MINDFORGE.md validation), `tests/metrics.test.js` (session quality score formula, phase quality score formula, metrics schema)

**Feedback loops sealed:**
1. Retrospective → MINDFORGE.md (explicit setting change suggestions)
2. Difficulty score → task granularity (planner reads DIFFICULTY-SCORE file before creating plans)
3. Quality metrics → automatic session behaviour adjustments

**Key ADRs:** ADR-012 (intelligence feedback loops), ADR-013 (MINDFORGE.md constitution with non-overridable primitives), ADR-014 (metrics as system signals, not developer evaluation)

---

### — Distribution Platform (`feat/mindforge-distribution-platform` → v0.6.0)

**Branch:** `feat/mindforge-distribution-platform`
**Output files:** `DAY6-COMPLETE.md` (all three prompts in one file)

Built the public distribution, CI/CD, SDK, and monorepo layers:

- **`.mindforge/distribution/`** — 4 files:
  - `registry-schema.md` — npm-based registry, `mindforge-skill-[category]-[name]` naming, `package.json mindforge` field, quality standards (5 requirements), private registry support via INTEGRATIONS-CONFIG.md
  - `registry-client.md` — Installation flow: resolve name → check installed → fetch (npm pack) → **TOCTOU-safe temp dir (chmod 700 + tarball size check)** → validate (Level 1+2, Level 3 for public registry) → injection guard → install to tier directory → register in MANIFEST.md → AUDIT entry. Update and uninstall protocols
  - `skill-validator.md` — Level 1 (schema), Level 2 (content), Level 3 (quality). Validation output format
  - `registry-client.md` also covers update (check latest vs installed, auto MINOR/PATCH, confirm MAJOR) and uninstall
- **`.mindforge/ci/`** — 4 files:
  - `ci-mode.md` — Auto-activates on `CI=true` or `MINDFORGE_CI=true` or `stdin.isTTY === false`. Tier 3 ALWAYS fails CI (cannot be configured away). **Exit code 0 for timeout** (soft stop, saves state, next run resumes via HANDOFF.json). Exit code 1 for gate failures. JSON and GitHub Annotations output formats. MINDFORGE.md CI settings: `CI_AUTO_APPROVE_TIER2`, `CI_SECURITY_SCAN`, `CI_MIN_COVERAGE_PCT`, `CI_OUTPUT_FORMAT`
  - `github-actions-adapter.md` — 4-job workflow: mindforge-health, mindforge-security (secret detection + npm audit), mindforge-quality (tsc + eslint + tests + coverage), mindforge-ai-review (PR reviews). **Tier 3 governance block** with clear error message and resolution steps. GitHub step summary for timeout state
  - `gitlab-ci-adapter.md` — Equivalent GitLab CI pipeline
  - `ci-config-schema.md` — CI configuration reference
- **`.mindforge/pr-review/`** — 3 files:
  - `ai-reviewer.md` — Claude API integration (`claude-sonnet-4-6`), context loading from PROJECT.md + ARCHITECTURE.md + CONVENTIONS.md, **file-based diff truncation** (top 20 most-changed files, not character truncation), **robust daily limit** (parse-error tolerant, creates file if missing), rate limiting (50/day configurable via `AI_REVIEW_DAILY_LIMIT`), cache by commit SHA (60 min TTL), graceful skip when `ANTHROPIC_API_KEY` unset
  - `review-prompt-templates.md` — 3 specialised templates: security (OWASP checklist mode), database migration (rollback, non-blocking, NOT NULL checks), API breaking change (versioning, deprecation, migration guide)
  - `finding-formatter.md` — GitHub-flavoured markdown PR comment format
- **`.mindforge/monorepo/`** — 3 files:
  - `workspace-detector.md` — Detects: npm workspaces, pnpm workspaces, Nx, Turborepo, Lerna. `WORKSPACE-MANIFEST.json` at `.planning/`. Package metadata extraction
  - `cross-package-planner.md` — Topological sort for package execution order. Per-package PLAN files with `<package>` and `<working-dir>` fields. **Affected package detection uses WORKSPACE-MANIFEST.json paths** (not depth assumption — handles `libs/shared/utils/` deep nesting). Transitive dependency detection
  - `dependency-graph-builder.md` — Cross-package DAG construction
- **`@mindforge/sdk`** at `sdk/src/`:
  - `types.ts` — Full TypeScript type definitions: MindForgeConfig, PhaseResult, TaskResult, SecurityFinding, GateResult, HealthReport, MindForgeEvent union type
  - `client.ts` — MindForgeClient: isInitialised(), readState(), readHandoff(), health(), readAuditLog(filter), readSessionMetrics(limit), validateConfig()
  - `events.ts` — MindForgeEventStream SSE server: **localhost-only binding (127.0.0.1)**, non-localhost connection rejection (403), exact CORS origin matching, **Linux inotify fallback** (`ENOSPC` → polling at 2s interval), AUDIT.jsonl file watching and broadcast
  - `commands.ts` — Command string builders: health(), planPhase(), executePhase(), securityScan(), audit(), prReview()
  - `index.ts` — Public API exports + VERSION constant
- **6 new commands** (total: 31):
  - `/mindforge:init-org` — 8-question org setup, generates all org templates, creates `@[org]/mindforge-config` npm package scaffold
  - `/mindforge:install-skill [name] [--tier] [--registry]` — Full registry client protocol
  - `/mindforge:publish-skill [dir] [--dry-run]` — Level 1+2+3 validation, npm publish with verification
  - `/mindforge:pr-review [--diff] [--sha] [--output github|json|markdown]`
  - `/mindforge:workspace [detect|list|plan|test]` — Monorepo management
  - `/mindforge:benchmark [--skill] [--compare]` — Skill effectiveness benchmarking from AUDIT.jsonl
- **GitHub Actions workflow:** `.github/workflows/mindforge-ci.yml`
- **3 new test suites:** `tests/distribution.test.js`, `tests/ci-mode.test.js`, `tests/sdk.test.js`

**Key ADRs:** ADR-015 (npm as skills registry), ADR-016 (CI timeout = exit 0, soft stop), ADR-017 (SDK SSE localhost-only)

---

### — Production Hardening & v1.0.0 Release (`feat/mindforge-production-release` → v1.0.0)

**Branch:** `feat/mindforge-production-release`
**Output files:** `DAY7-PRODUCTION-FINAL.md` (all three prompts in one file, 174KB)

Made MindForge production-ready and shipped v1.0.0:

- **`bin/install.js`** (complete rewrite) — All flags: `--version`, `--help`, `--all`, `--global/-g`, `--local/-l`, `--install`, `--update`, `--uninstall`, `--check`, `--dry-run`, `--force`, `--verbose`, `--skip-wizard`. Node.js ≥18 gate. CI mode detection (`CI=true` or `stdin.isTTY === false`). Routes to wizard or core installer
- **`bin/installer-core.js`** (complete implementation) — RUNTIMES config map (claude + antigravity), **SENSITIVE_EXCLUDE with correct regex** (`/\.key$/` not `'*.key'` — glob bug fixed), **self-install detection** (`package.json.name === 'mindforge-cc'` → skip framework file copy), safeCopyClaude with large-file warning, copyDir with excludePatterns, verifyInstall checks 6 critical files, uninstall preserves `.planning/` and `.mindforge/` (user data), graceful output at each step
- **`bin/updater/`** — Complete self-update system:
  - `version-comparator.js` — `compareSemver()`, `upgradeType()` (major/minor/patch/none), `fetchLatestVersion()` (5s timeout, npm registry, graceful null on failure)
  - `changelog-fetcher.js` — `fetchChangelog(from, to)` (8s timeout, GitHub raw, `extractEntries()` version range parser), handles `## [1.0.0]`, `## v1.0.0`, `## 1.0.0` header formats
  - `self-update.js` — `checkAndUpdate()`: version check → changelog display → **scope detection** (`detectInstallScope()` checks local before global per ADR-019) → **reads schema_version from HANDOFF.json BEFORE update** (not after) → apply update with detected scope → run migration with pre-update schema_version
- **`bin/migrations/`** — Complete version migration engine:
  - `migrate.js` — `runMigrations(from, to)`: backup creation with **abort if backup fails**, backup integrity verification (file count + non-empty), execute migrations, restore on failure, **CI auto-deletes backup**, HANDOFF.json schema_version update. **Correct filter logic**: `compareSemver(m.toVersion, fromVersion) > 0 AND compareSemver(m.toVersion, toVersion) <= 0` (handles intermediate versions like v0.3.0)
  - `schema-versions.js` — Complete history of all schema changes v0.1.0 → v1.0.0
  - `0.1.0-to-0.5.0.js` — Adds intelligence layer fields
  - `0.5.0-to-0.6.0.js` — Adds distribution platform fields
  - `0.6.0-to-1.0.0.js` — Adds plugin_api_version, backfills session_id, converts VERIFY_PASS_RATE_WARNING_THRESHOLD (percent → decimal, only values >1)
- **`.mindforge/plugins/`** — Complete plugin system:
  - `plugin-schema.md` — `mindforge-plugin-[category]-[name]` naming, `plugin.json` manifest with `mindforge.provides` (commands/skills/personas/hooks) and `mindforge.permissions` (read_audit_log/write_audit_log/read_state/write_state/network_access/file_system_write), advisory permission model explanation, 7 lifecycle hooks, reserved 36 command names
  - `plugin-loader.md` — Discovery → validation (plugin_api_version, injection guard, skill Level 1+2) → load components (**dynamic reserved-name detection** via `ls .claude/commands/mindforge/` not hardcoded list) → report → AUDIT entry. Multiple plugins same hook: MANIFEST order, independent execution
  - `PLUGINS-MANIFEST.md` — Ready for first plugin installation
- **`.mindforge/production/`** — 4 production hardening files:
  - `token-optimiser.md` — Token consumption model table, efficiency formula (`useful_output_tokens / total_tokens_consumed`, target >35%), 5 strategies (lean PLAN actions with before/after examples showing 580-token saving, JIT file reading, selective STATE.md loading, code line ranges, skill summarisation at 4+), `token-usage.jsonl` schema, MINDFORGE.md token settings
  - `migration-engine.md` — Engine specification
  - `compatibility-layer.md` — Cross-version graceful degradation spec
  - `production-checklist.md` — **50-point checklist** in 5 sections (A: Installation 10, B: Commands 10, C: Governance gates 10, D: Documentation 10, E: Test coverage 10), each item has verification step + verifier + date fields. Release gate procedure
- **Complete documentation hierarchy** at `docs/`:
  - `docs/reference/commands.md` — All 36 commands documented
  - `docs/security/SECURITY.md` — Supported versions, responsible disclosure (security@mindforge.dev, 24h ack, 90-day disclosure)
  - `docs/security/threat-model.md` — 7 threat actors with controls and residual risk ratings
  - `docs/architecture/decision-records-index.md` — All 20 ADRs indexed
  - `docs/contributing/CONTRIBUTING.md`, `skill-authoring.md`, `plugin-authoring.md`
- **5 new commands** (total: 36):
  - `/mindforge:update [--apply] [--force] [--check]` — Full self-update with changelog
  - `/mindforge:migrate [--from] [--to] [--dry-run] [--force]` — Schema migration
  - `/mindforge:plugins [list|install|uninstall|info|validate|create]` — Plugin management
  - `/mindforge:tokens [--optimise]` — Token usage dashboard + recommendations
  - `/mindforge:release [--version] [--dry-run]` — 8-stage release pipeline (core team command)
- **3 new test suites:** `tests/production.test.js` (installer, updater, migration engine, plugin system, all 36 commands), `tests/migration.test.js` (full chain v0.1.0→v1.0.0, HANDOFF migration, AUDIT backfill, MINDFORGE.md conversion, migration chain filter logic), `tests/e2e.test.js` (complete greenfield workflow in temp dir, brownfield map-codebase path, security gate scenarios, all AUDIT.jsonl entries validated)

**Key ADRs:** ADR-018 (self-install detection), ADR-019 (update scope preservation), ADR-020 (v1.0.0 stable interface contract — 36 commands, HANDOFF schema, AUDIT events, SDK types, plugin.json format are all stable in 1.x.x)

---

### — Autonomous SRE Layer (`feat/mindforge-sre` → v8.2.0)

**Branch:** `feat/mindforge-sre`
**Pillars:** XX, XXI, XXII, XXIII

Built the framework's self-healing and production reliability layer:

- **`bin/sre/`** — 4 core SRE engines:
  - `sentinel.js` — Observability engine for audit-stream anomaly detection.
  - `shadow-mirror.js` — Hybrid isolation (Level 1: Git, Level 2: Docker) for deterministic replication.
  - `adversarial-debate.js` — Three-way consensus protocol (Proposer, Chaos Hunter, Auditor).
  - `sli-verifier.js` — Metric-gated verification loop for remediation waves.
- **Model Hardening** — Locked SRE-Auditor persona strictly to **Claude 4.5 Opus** to ensure 100% reasoning fidelity in production-healing decisions.
- **Framework Synchronization** — Updated `package.json`, `installer-core.js`, `learning-manager.js`, and `theme.js` to align with the v1.x → v8.x paradigm shift.
- **Integrated Observability** — Injected `checkSRESignals()` into the core `AutoRunner` loop.

**Key ADRs:** ADR-021 (Autonomous SRE Sovereignty), ADR-022 (Hybrid Replication Isolation), ADR-023 (Adversarial Consensus Gating)

---

## CURRENT SYSTEM ARCHITECTURE

```
mindforge-cc/                         ← npm package root
│
├── bin/
│   ├── install.js                    ← Entry point (npx mindforge-cc@latest)
│   ├── installer-core.js             ← Non-interactive installer core
│   ├── validate-config.js            ← MINDFORGE.md validator
│   ├── updater/
│   │   ├── version-comparator.js
│   │   ├── changelog-fetcher.js
│   │   └── self-update.js
│   ├── migrations/
│   │   ├── migrate.js                ← Migration runner
│   │   ├── schema-versions.js
│   │   ├── 0.1.0-to-0.5.0.js
│   │   ├── 0.5.0-to-0.6.0.js
│   │   └── 0.6.0-to-1.0.0.js
│   └── wizard/
│       ├── setup-wizard.js           ← Interactive setup
│       ├── environment-detector.js
│       └── config-generator.js
│
├── .claude/
│   ├── CLAUDE.md                     ← Agent entry point (Claude Code)
│   └── commands/mindforge/           ← 36 slash command definitions
│       └── [36 .md command files]
│
├── .agent/
│   ├── CLAUDE.md                     ← Agent entry point (Antigravity)
│   └── mindforge/                    ← Mirror of .claude/commands/mindforge/
│       └── [36 .md command files]
│
├── .mindforge/
│   ├── personas/                     ← 32 persona definitions + overrides/
│   ├── skills/                       ← 10 core skill packs (SKILL.md each)
│   ├── engine/
│   │   ├── wave-executor.md          ← Kahn's topological sort, parallel waves
│   │   ├── dependency-parser.md      ← DAG builder from PLAN XML
│   │   ├── context-injector.md       ← Minimum-context subagent injection
│   │   ├── compaction-protocol.md    ← Smart 3-level compaction
│   │   ├── verification-pipeline.md  ← 4-stage verify
│   │   └── skills/                   ← Registry, loader, versioning, conflict resolver
│   ├── integrations/                 ← Jira, Confluence, Slack, GitHub, GitLab, connection-manager
│   ├── governance/                   ← change-classifier, approval-workflow, compliance-gates, GOVERNANCE-CONFIG
│   ├── intelligence/                 ← health-engine, difficulty-scorer, antipattern-detector, skill-gap-analyser, smart-compaction
│   ├── metrics/                      ← METRICS-SCHEMA.md, quality-tracker.md
│   ├── team/                         ← TEAM-PROFILE.md, profiles/, multi-handoff, session-merger
│   ├── production/                   ← token-optimiser, migration-engine, compatibility-layer, production-checklist
│   ├── plugins/                      ← plugin-schema, plugin-loader, PLUGINS-MANIFEST.md
│   ├── distribution/                 ← registry-schema, registry-client, skill-validator
│   ├── ci/                           ← ci-mode, github-actions-adapter, gitlab-ci-adapter
│   ├── pr-review/                    ← ai-reviewer, review-prompt-templates, finding-formatter
│   ├── monorepo/                     ← workspace-detector, cross-package-planner, dependency-graph-builder
│   ├── org/
│   │   ├── ORG.md
│   │   ├── CONVENTIONS.md
│   │   ├── SECURITY.md
│   │   ├── TOOLS.md
│   │   ├── skills/
│   │   │   └── MANIFEST.md           ← All 10 skills registered
│   │   └── integrations/
│   │       └── INTEGRATIONS-CONFIG.md
│   ├── audit/
│   │   └── AUDIT-SCHEMA.md           ← AUDIT.jsonl schema + archiving protocol
│   └── MINDFORGE-SCHEMA.json         ← JSON Schema for MINDFORGE.md
│
├── .planning/                        ← Project state (created per project)
│   ├── PROJECT.md
│   ├── REQUIREMENTS.md
│   ├── ARCHITECTURE.md
│   ├── ROADMAP.md
│   ├── STATE.md
│   ├── HANDOFF.json                  ← Schema v1.0.0 (plugin_api_version, decisions_made, etc.)
│   ├── AUDIT.jsonl                   ← Append-only, session_id required in v1.0.0
│   ├── audit-archive/
│   ├── approvals/
│   ├── handoffs/                     ← Per-developer HANDOFF-[dev-id].json files
│   ├── milestones/
│   ├── decisions/                    ← ADR-001 through ADR-020
│   └── phases/
│       └── [N]/
│           ├── PLAN-N-MM.md          ← XML task plans
│           ├── DEPENDENCY-GRAPH-N.md
│           ├── DIFFICULTY-SCORE-N.md
│           ├── CONTEXT.md            ← From /mindforge:discuss-phase
│           ├── SUMMARY-N-MM.md       ← Post-execution summaries
│           ├── WAVE-REPORT-N.md
│           ├── SECURITY-REVIEW-N.md
│           ├── GATE-RESULTS-N.md
│           ├── VERIFICATION-N.md
│           └── UAT-N.md
│
├── MINDFORGE.md                      ← Project constitution (project root)
├── CHANGELOG.md                      ← v0.1.0 → v1.0.0 history
├── SECURITY.md                       ← Security policy
├── package.json                      ← version: "1.0.0"
│
├── sdk/
│   ├── src/
│   │   ├── index.ts                  ← Public API exports
│   │   ├── types.ts                  ← TypeScript type definitions
│   │   ├── client.ts                 ← MindForgeClient
│   │   ├── events.ts                 ← MindForgeEventStream (SSE)
│   │   └── commands.ts               ← Command string builders
│   └── package.json                  ← @mindforge/sdk v0.6.0
│
├── tests/                            ← 15 test suites
│   ├── install.test.js               ← Day 1
│   ├── wave-engine.test.js           ← Day 2
│   ├── audit.test.js                 ← Day 2
│   ├── compaction.test.js            ← Day 2
│   ├── skills-platform.test.js       ← Day 3
│   ├── integrations.test.js          ← Day 4
│   ├── governance.test.js            ← Day 4
│   ├── intelligence.test.js          ← Day 5
│   ├── metrics.test.js               ← Day 5
│   ├── distribution.test.js          ← Day 6
│   ├── ci-mode.test.js               ← Day 6
│   ├── sdk.test.js                   ← Day 6
│   ├── production.test.js            ← Day 7
│   ├── migration.test.js             ← Day 7
│   └── e2e.test.js                   ← Day 7
│
├── docs/
│   ├── reference/                    ← commands.md, skills-api.md, sdk-api.md, config-reference.md, audit-events.md
│   ├── architecture/                 ← README.md, decision-records-index.md
│   ├── contributing/                 ← CONTRIBUTING.md, skill-authoring.md, plugin-authoring.md
│   └── security/                     ← SECURITY.md, threat-model.md, penetration-test-results.md
│
└── .github/
    └── workflows/
        └── mindforge-ci.yml          ← 4-job CI pipeline
```

---

## ALL IMPLEMENTED FEATURES (complete inventory)

### 36 Slash Commands

| # | Command | Category | Day |
|---|---|---|---|
| 1 | `/mindforge:help` | Lifecycle | 1 |
| 2 | `/mindforge:init-project` | Lifecycle | 1 |
| 3 | `/mindforge:plan-phase [N]` | Lifecycle | 1 |
| 4 | `/mindforge:execute-phase [N]` | Lifecycle | 1 |
| 5 | `/mindforge:verify-phase [N]` | Lifecycle | 1 |
| 6 | `/mindforge:ship [N]` | Lifecycle | 1 |
| 7 | `/mindforge:next` | Management | 2 |
| 8 | `/mindforge:quick` | Management | 2 |
| 9 | `/mindforge:status` | Management | 2 |
| 10 | `/mindforge:debug` | Management | 2 |
| 11 | `/mindforge:skills` | Skills | 3 |
| 12 | `/mindforge:review` | Review | 3 |
| 13 | `/mindforge:security-scan` | Review | 3 |
| 14 | `/mindforge:map-codebase` | Setup | 3 |
| 15 | `/mindforge:discuss-phase` | Planning | 3 |
| 16 | `/mindforge:audit` | Governance | 4 |
| 17 | `/mindforge:milestone` | Milestone | 4 |
| 18 | `/mindforge:complete-milestone` | Milestone | 4 |
| 19 | `/mindforge:approve` | Governance | 4 |
| 20 | `/mindforge:sync-jira` | Integration | 4 |
| 21 | `/mindforge:sync-confluence` | Integration | 4 |
| 22 | `/mindforge:health` | Intelligence | 5 |
| 23 | `/mindforge:retrospective` | Intelligence | 5 |
| 24 | `/mindforge:profile-team` | Intelligence | 5 |
| 25 | `/mindforge:metrics` | Intelligence | 5 |
| 26 | `/mindforge:init-org` | Setup | 6 |
| 27 | `/mindforge:install-skill` | Distribution | 6 |
| 28 | `/mindforge:publish-skill` | Distribution | 6 |
| 29 | `/mindforge:pr-review` | Review | 6 |
| 30 | `/mindforge:workspace` | Monorepo | 6 |
| 31 | `/mindforge:benchmark` | Intelligence | 6 |
| 32 | `/mindforge:update` | Framework | 7 |
| 33 | `/mindforge:migrate` | Framework | 7 |
| 34 | `/mindforge:plugins` | Framework | 7 |
| 35 | `/mindforge:tokens` | Intelligence | 7 |
| 36 | `/mindforge:release` | Framework | 7 |

### 10 Core Skill Packs (all with JIT loading, frontmatter, triggers, checklists)

1. `security-review` — OWASP A01-A10, 29 triggers
2. `code-quality` — Complexity, naming, patterns
3. `api-design` — REST, versioning, error schemas
4. `testing-standards` — Coverage, TDD, patterns
5. `documentation` — README, ADRs, changelogs
6. `performance` — Core Web Vitals, N+1, caching
7. `accessibility` — WCAG 2.1+2.2 AA, ARIA, keyboard
8. `data-privacy` — GDPR/CCPA, consent, PII patterns
9. `incident-response` — P0-P3, runbooks, postmortems
10. `database-patterns` — Compound cursor, UUIDv7, indexes

### 32 Agent Personas

advisor-researcher, analyst, architect, assumptions-analyzer-extend, assumptions-analyzer, codebase-mapper-extend, codebase-mapper, coverage-specialist, debug-specialist, debugger, decision-architect, developer, executor, integration-checker, nyquist-auditor, phase-researcher, plan-checker, planner, project-researcher, qa-engineer, release-manager, research-agent, research-synthesizer, roadmapper-extend, roadmapper, security-reviewer, tech-writer, ui-auditor, ui-checker, ui-researcher, user-profiler, verifier

### 20 Architecture Decision Records

ADR-001 through ADR-020 covering: HANDOFF.json, Markdown commands, keyword triggers, wave parallelism, append-only audit, three-tier skills, JIT loading, env-var credentials, compliance gate bypass rules, non-blocking integrations, intelligence feedback loops, MINDFORGE.md constitution, metrics ethics policy, npm registry, CI timeout exit code, localhost SDK, self-install detection, update scope preservation, v1.0.0 stable interface contract

### 15 Test Suites (all in `tests/`)

install, wave-engine, audit, compaction, skills-platform, integrations, governance, intelligence, metrics, distribution, ci-mode, sdk, production, migration, e2e

### Governance System

- **5 non-bypassable compliance gates**: secret detection (Gate 3 is absolute), CRITICAL security findings, test suite, dependency CVEs, GDPR retention (independent of skill loading)
- **3-tier approval**: Tier 1 auto, Tier 2 peer (24h SLA), Tier 3 compliance (4h SLA)
- **3-signal Tier 3 detection**: file path + code content (`jwt.sign` anywhere) + audit history
- **Emergency override**: only EMERGENCY_APPROVERS list, post-incident review auto-created, audit logged

---

## KEY TECHNICAL DECISIONS

| Decision | Choice | Rationale |
|---|---|---|
| Command format | Markdown `.md` files | Human-readable, git-diffable, no compilation |
| Skill loading | JIT keyword triggers | Deterministic, reproducible across sessions |
| Audit log | Append-only JSONL | Immutable record, simple tooling, git-friendly |
| Cross-session state | HANDOFF.json | Structured, versioned, migration-safe |
| Credentials | Env vars only | Never in files — git history is permanent |
| Skills registry | npm ecosystem | Free infrastructure, existing tooling |
| CI timeout | Exit code 0 | Timeout ≠ failure, state preserved, resume next run |
| SSE server | localhost 127.0.0.1 | Project state is sensitive, no network exposure |
| Plugin permissions | Advisory model | Enforced through agent governance, not OS |
| Migration filter | toVersion range check | Handles intermediate versions correctly |
| Compaction | Level 1/2/3 structured | Preserves decisions/discoveries/implicit knowledge |
| Metrics | System signals only | Never developer performance evaluation (ADR-014) |

---

## KNOWN ISSUES AND GAPS (going into Day 8)

### Not yet implemented (deferred)
1. **GUI/Web dashboard** — All outputs are currently Markdown + terminal. No web interface for status, metrics, or approvals
2. **Real-time multi-developer coordination** — Multi-HANDOFF system is documented but has no conflict resolution beyond warnings
3. **True `npx mindforge-skills` CLI** — The skills install/publish commands are agent commands, not a standalone npm binary
4. **SDK TypeScript compilation** — `sdk/` has `.ts` source files but no build output (`dist/`) yet; needs `tsc` build step
5. **`docs/security/penetration-test-results.md`** — Scaffolded but not filled in
6. **`docs/contributing/CONTRIBUTING.md`** and `plugin-authoring.md` — Scaffolded but content minimal
7. **Line-range file reading** (`src/auth/login.ts:40-65`) — Noted in token-optimiser as v1.1.0 feature
8. **Lazy file reading enforcement** — Token optimiser Strategy 2 is advisory; execution engine still reads all files upfront
9. **`npx mindforge-plugins` standalone binary** — Plugin management only via `/mindforge:plugins` agent command
10. **Skill auto-update notifications** — No proactive notification when skills have updates

### Known edge cases in current implementation
1. **Windows path handling** — Installer uses `path.join()` which uses backslashes on Windows; not validated on Windows
2. **Simultaneous session conflicts** — Two developers updating shared HANDOFF.json simultaneously → last write wins (acknowledged, no lock mechanism)
3. **Large project STATE.md** — No automatic pruning; can grow very large in long-lived projects
4. **`npm audit` rate limits** — Dependency scanning in CI may hit npm rate limits for large projects
5. **ANTHROPIC_API_KEY absence** — AI PR review gracefully skips but there's no fallback static analysis beyond what MindForge already runs
6. **Jira Classic vs Next-gen project type** — Dynamic detection recommended but not fully specified; field `customfield_10014` varies

### Architectural debt
1. **PLAN XML format** — XML in Markdown is fragile. A migration to structured YAML front-matter would be cleaner but is a MAJOR breaking change
2. **AUDIT.jsonl grows without limit** — Archiving at 10K lines is reactive; proactive compaction scheduling not implemented
3. **`0.1.0-to-0.5.0.js` and `0.5.0-to-0.6.0.js` migrations** — Written as stubs (correct fields, minimal content); need expanding to cover all edge cases
4. **SDK version** — `sdk/package.json` shows `v0.6.0` but should be `v1.0.0` to match the framework version at release
5. **MINDFORGE.md parser** — Current k=v parsing is regex-based, not a real parser; triple-quote multi-line values are documented but parsing is fragile

---

## WHAT DAY 8 SHOULD FOCUS ON

Day 8's theme: **Multi-Runtime Expansion + Real-Time Collaboration + Public Launch Readiness**

### Primary objectives

**1. Multi-runtime expansion — Cursor AI + Windsurf + Codex**
MindForge currently targets Claude Code (`.claude/`) and Antigravity (`.agent/`).
Day 8 should add:
- Cursor AI adapter: `.cursor/rules/` directory structure
- Windsurf adapter: `.windsurf/` directory structure
- OpenAI Codex adapter: `.codex/` directory
Each adapter requires: runtime detection in installer, correct entry point file format, command mirroring, and testing

**2. Real-time web dashboard (basic)**
Build a simple Node.js/Express server (`bin/dashboard.js`) that:
- Serves a single-page HTML/JS dashboard
- Reads AUDIT.jsonl, STATE.md, HANDOFF.json, metrics JSONL files
- Streams live updates via the existing SDK `MindForgeEventStream`
- Shows: current phase/task, AUDIT event feed, quality scores, pending approvals
- No authentication required (localhost-only, same security model as SSE)
- This is the missing observability layer for teams who don't want CLI-only visibility

**3. SDK compilation and npm publish**
- Complete `sdk/tsconfig.json` for proper compilation
- Build `sdk/dist/index.js` and `sdk/dist/index.d.ts`
- Publish `@mindforge/sdk` to npm separately from `mindforge-cc`
- Update SDK README with working installation and example code
- Add SDK version sync (SDK version = framework version)

**4. `npx mindforge-skills` standalone binary**
Add to `package.json.bin`:
```json
{ "mindforge-cc": "bin/install.js", "mindforge-skills": "bin/skills-cli.js" }
```
`bin/skills-cli.js` provides: `mindforge-skills install [name]`, `mindforge-skills search [query]`, `mindforge-skills list`, `mindforge-skills publish [dir]`

**5. Complete CONTRIBUTING.md and plugin-authoring guide**
These are scaffolded but empty — essential for community growth post-v1.0.0 launch

### Secondary objectives

**6. MINDFORGE.md parser hardening**
Replace regex k=v parsing with a proper line-by-line parser that correctly handles triple-quote multi-line values, inline comments, and section headers. Add more test coverage.

**7. SDK version alignment**
Sync `sdk/package.json` version to match `mindforge-cc` version at release time. Add a pre-publish check.

**8. Migration edge case completion**
Expand `0.1.0-to-0.5.0.js` and `0.5.0-to-0.6.0.js` stub migrations with full field coverage and edge case handling (matching the completeness of `0.6.0-to-1.0.0.js`)

**9. Windows compatibility verification**
Test all installer code paths on Windows. Fix path separator issues where found. Add Windows-specific tests to `tests/install.test.js`.

**10. Public launch materials**
- Announcement blog post draft
- Getting started video script (5-minute demo: install → init-project → plan → execute → verify)
- Community Discord/Slack setup
- `mindforge.dev` landing page content

### branch and version

**Branch:** `feat/mindforge-multi-runtime-dashboard`
**Target version:** v1.1.0 (stable minor — no breaking changes)

---

## PROMPTING APPROACH THAT WORKED

All 7 days followed the same 3-prompt structure per day:
1. **Implementation prompt** — Detailed task-by-task build instructions with exact code
2. **Review prompt** — Adversarial multi-pass review with persona activation
3. **Hardening prompt** — Fixes + ADRs + test additions + final verification

Days 1-5 delivered 3 separate .md files. Days 6-7 consolidated into a single file with clear PART 1/2/3 separators (more efficient for long context).

Each prompt used:
- `git add . && git commit -m "..."` between every task (never batch commits)
- Exact shell verification commands at the end of each task
- Personas activated explicitly (`architect.md + security-reviewer.md + qa-engineer.md`)
- Test-driven: every feature had a test in the same task or the next task
- Explicit "do not implement" sections to prevent scope creep

---

## OUTPUT FILE INVENTORY

All prompt files are in `/mnt/user-data/outputs/`:

| File | Day | Size | Content |
|---|---|---|---|
| `DAY1-IMPLEMENT.md` | 1 | 78KB | Foundation implementation |
| `DAY1-REVIEW.md` | 1 | 12KB | Foundation review |
| `DAY1-HARDEN.md` | 1 | 27KB | Foundation hardening |
| `DAY2-IMPLEMENT.md` | 2 | 73KB | Wave engine implementation |
| `DAY2-REVIEW.md` | 2 | 20KB | Wave engine review |
| `DAY2-HARDEN.md` | 2 | 33KB | Wave engine hardening |
| `DAY3-IMPLEMENT.md` | 3 | 99KB | Skills platform implementation |
| `DAY3-REVIEW.md` | 3 | 24KB | Skills platform review |
| `DAY3-HARDEN.md` | 3 | 29KB | Skills platform hardening |
| `DAY4-IMPLEMENT.md` | 4 | 93KB | Enterprise integrations implementation |
| `DAY4-REVIEW.md` | 4 | 18KB | Enterprise integrations review |
| `DAY4-HARDEN.md` | 4 | 37KB | Enterprise integrations hardening |
| `DAY5-IMPLEMENT.md` | 5 | 108KB | Intelligence layer implementation |
| `DAY5-REVIEW.md` | 5 | 16KB | Intelligence layer review |
| `DAY5-HARDEN.md` | 5 | 38KB | Intelligence layer hardening |
| `DAY6-COMPLETE.md` | 6 | 129KB | Distribution platform (impl+review+harden) |
| `DAY7-COMPLETE.md` | 7 | 122KB | Production release v1 (impl+review+harden) |
| `DAY7-PRODUCTION-FINAL.md` | 7 | 174KB | Production release final (complete, definitive) |

**Total prompt content generated: ~1.1MB across 18 files, ~32,000 lines**

---

## QUICK REFERENCE: KEY FILE PATHS

| What | Path |
|---|---|
| Agent entry point (Claude Code) | `.claude/CLAUDE.md` |
| Agent entry point (Antigravity) | `.agent/CLAUDE.md` |
| All 36 commands | `.claude/commands/mindforge/*.md` |
| Skills manifest | `.mindforge/org/skills/MANIFEST.md` |
| Governance config | `.mindforge/governance/GOVERNANCE-CONFIG.md` |
| Integrations config | `.mindforge/org/integrations/INTEGRATIONS-CONFIG.md` |
| Project constitution | `MINDFORGE.md` (project root) |
| Schema validator | `.mindforge/MINDFORGE-SCHEMA.json` |
| Project state | `.planning/STATE.md` |
| Cross-session state | `.planning/HANDOFF.json` |
| Audit log | `.planning/AUDIT.jsonl` |
| Current phase plans | `.planning/phases/[N]/PLAN-[N]-[MM].md` |
| ADRs | `.planning/decisions/ADR-001 through ADR-020.md` |
| Plugin manifest | `.mindforge/plugins/PLUGINS-MANIFEST.md` |
| Team profile | `.mindforge/team/TEAM-PROFILE.md` |
| Metrics | `.mindforge/metrics/session-quality.jsonl` |

---

*State file generated at completion. MindForge v8.2.0 — 36 commands · 10 skills · 34 personas · 23 ADRs · 16 test suites.*
