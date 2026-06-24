# Release Notes

## v11.8.0 — Workflow Forge II

**Released:** 2026-06-24

### What's New

MindForge v11.8.0 "Workflow Forge II" expands the Dynamic Workflow Library from 12 to **33 workflows** and introduces a new **Beast tier** for compound multi-phase adversarial workflows.

### Beast Tier (NEW)

Three compound workflows with 5 phases and 8+ agents each, featuring adversarial verification:

- `/mindforge:wf-security-hardening` — 5-angle OWASP parallel scout → 3-vote adversarial verification → STRIDE threat model → prioritized remediation roadmap
- `/mindforge:wf-accessibility-audit` — WCAG 2.2 parallel per-criterion audit → 3-vote adversarial verify → remediation spec with exact ARIA/HTML fixes
- `/mindforge:wf-security-threat-model` — Asset inventory → 6-parallel STRIDE threat agents → parallel mitigations → CVSS-style risk scoring matrix

### 18 Additional New Workflows

**Dev tier additions (7):** test-coverage-gap, api-contract-test, debug-detective, writer-reviewer, mutation-testing, code-explainer, design-system-audit

**Ops tier additions (4):** database-migration, dependency-health, multi-repo-sync, cost-analysis

**Intelligence tier additions (4):** architecture-modernization, documentation-gen, api-migration, data-pipeline-validate

**Research tier additions (3):** ai-model-eval, ux-heuristic-audit, competitive-teardown

### Stats

- Workflows: 12 → **33** (across 5 tiers)
- Commands: 198 → **219**
- All 21 new scripts fully null-guarded on every sequential agent() return
- workflow-runner.js CLI fixed for Node 24 compatibility
- 4-pass adversarial E2E sign-off (138 agents) before merge

---

## v11.7.0 — Workflow Forge

**Release Date**: 2026-06-23
**Type**: Minor — new dynamic workflow library, no breaking changes
**Upgrade Path**: `npx mindforge-cc@latest`

---

The first Dynamic Workflow Library for MindForge. Twelve pre-built multi-agent workflow scripts ship in the npm package and are immediately available to any user who installs MindForge. Each workflow runs via Claude Code's native `Workflow` tool for true parallel agent execution.

### Dynamic Workflow Library

12 workflows across 4 tiers, each backed by a full JS orchestration script in `.mindforge/dynamic-workflows/scripts/`:

**Research tier** — fan-out parallel searches, adversarial claim verification, cited synthesis:
- `deep-research` — Decompose → 5× parallel web search → fetch 15 sources → 3-vote verify → synthesize cited report
- `competitive-analysis` — 5× angles (product/pricing/reviews/community/roadmap) → SWOT → positioning
- `tech-evaluation` — 5× dimensions (DX/perf/security/ecosystem/community) → scored matrix → recommendation

**Dev tier** — coding-assistant power workflows:
- `code-audit` — 3× parallel auditors (security/quality/perf) → adversarial verify high-severity findings → risk report
- `feature-planner` — Brief → PRD → Architecture → User stories (sequential pipeline)
- `pr-review` — 4× parallel reviewers (correctness/security/perf/style) → consensus verdict
- `tdd-sprint` — Spec → RED (failing test) → GREEN (minimal impl) → REFACTOR (clean up) loop
- `refactor-plan` — Debt scan → risk-sort → sequence → safe implementation plan

**Ops tier**:
- `incident-response` — 4× parallel investigation (logs/metrics/traces/code) → mitigate → RCA → postmortem
- `release-prep` — Tests → changelog → semver bump → PR body → announcement draft

**Intelligence tier**:
- `onboard-codebase` — Map → domain analysis → architecture → guided tour + onboarding docs
- `perf-optimize` — Profile → 4× parallel bottleneck hunt (DB/network/CPU/memory) → prioritized fix plan → benchmarks

### 13 new commands

`/mindforge:wf-catalog` — browseable index of all 12 workflows grouped by tier
`/mindforge:wf-<name>` — one command per workflow, each with usage and phase descriptions

### CLI discovery

```bash
node bin/mindforge-cli.js workflow list          # print catalog
node bin/mindforge-cli.js workflow info <name>   # show phases and description
```

### Upgrade steps

1. `npx mindforge-cc@latest` — all 12 workflows and 13 commands install automatically
2. Run `/mindforge:wf-catalog` to browse the library
3. Try `/mindforge:wf-deep-research <your question>` for a first run

---

## v11.6.0 — Skill Forge

**Release Date**: 2026-06-17
**Type**: Minor — additive skill pack expansion, no breaking changes
**Upgrade Path**: `npx mindforge-cc@latest`

---

Largest single skill expansion in MindForge history. 80 new skills across 8 engineering domains — software development, GitHub workflows, DevOps orchestration, research intelligence, security, creative tooling, data-science, and note-taking. Zero breaking changes; fully backward-compatible.

### Engine-tier skills (auto-trigger)

30 skills in `.mindforge/skills/` now activate automatically when your task description matches their trigger phrases — no explicit invocation needed:

- **Systematic debugging** — 4-phase root-cause methodology. The iron rule: no fix without a root cause investigation first.
- **Test-driven development** — RED-GREEN-REFACTOR enforcement. Write the failing test first, always.
- **Plan mode** — implementation planning before coding. Saves the plan to a markdown file.
- **Kanban orchestration** — `kanban-orchestrator` decomposes work and routes to specialist agents; `kanban-worker` executes individual cards.
- **GitHub workflows** — PR review, PR lifecycle, issue management, codebase inspection.
- **OSINT investigation** — public-records cross-reference across SEC, OFAC, OpenCorporates, court records, Wayback Machine.
- **Web pentesting** — authorized web application penetration testing with hard scope guardrails.
- **Concept diagrams** — flat, minimal SVG educational diagrams with automatic dark mode.
- **Research paper writing** — academic paper authoring with citation workflow and reviewer guidelines.
- And 21 more across research, creative, security, data-science, and note-taking domains.

### Extended-tier skills (explicit activation)

50 skills in `.agent/skills/` for on-demand use: GitHub auth, docker management, DevOps watchers, 1Password CLI integration, debuggers (Node inspect, Python debugpy), creative tools (pixel art, video orchestration, comic creation), research tools (LLM wiki, polymarket, parallel CLI), and more.

### New slash commands

| Command | Purpose |
|---|---|
| `/mindforge:systematic-debug` | 4-phase root-cause debugging session |
| `/mindforge:skill-tdd` | Strict TDD RED-GREEN-REFACTOR cycle |
| `/mindforge:skills-index` | Browse all 153 skills by category |

### Skill counts

| Tier | Before | After |
|---|---|---|
| Engine tier (`.mindforge/skills/`) | 202 | 232 |
| Extended tier (`.agent/skills/`) | 73 | 123 |
| Slash commands | 174 | 177 |

### Upgrade

```bash
npx mindforge-cc@latest --claude --global
```

No migration steps required. All new skills are additive.

---

## v11.5.1 — Robustness + governance-gate patch

**Release Date**: 2026-06-11
**Type**: Patch (no API changes; one CI-gate behavior change)
**Upgrade Path**: `npx mindforge-cc@latest`

A fast-follow patch driven by a fresh adversarial audit of the shipped v11.5.0
tree. It hardens crash-prone JSON parsing in the autonomous/memory pipelines,
closes a governance-gate gap left by the v11.5.0 approval work, and tightens two
security surfaces. No features, no API changes.

### Robustness — no more crashes on a torn JSONL line

Three pipelines parsed JSON without guards, so one malformed/partially-written
line could crash them:

- `summarizePhase()` (pillar-health) parsed every `AUDIT.jsonl` line unguarded —
  it now skips bad lines and keeps the valid ones.
- `captureFromCompaction()` (knowledge-capture) now returns `[]` on a malformed
  `handoff.json` instead of throwing.
- `federated-sync` now tolerates a corrupted `sync-stats.json` in both
  `handleSyncFailure` and `resetFailures` (falls back to `{failures:0}`).

### Security & governance

- **The CI Tier-3 gate now actually validates approvals.** Previously it only
  counted approval files; a hand-committed empty file would pass. It now requires
  each approval to carry a signature and be EITHER GPG-verified
  (`verified: true`) OR an explicitly opted-in unverified approval
  (`unverified_ack`, minted by `approve.js` under
  `MINDFORGE_ALLOW_UNVERIFIED_APPROVAL=1` for repos without GPG infra). Bare or
  stale `verified:false` files are still rejected — completing the v11.5.0
  fail-closed `approve.js` work.
- **Dashboard approvals can't forge an identity.** `POST /api/approve/:id` no
  longer records a client-supplied `approver` into the audit trail; it attributes
  the action to a fixed authenticated actor. (The dashboard is already
  localhost-bound and Bearer-token gated, so this is attribution hardening.)
- **The destructive-command guard now blocks Unix `truncate -s`.** In-place file
  zeroing (`truncate -s 0 <path>`) was missed by the SQL-only pattern; it is now
  gated, with benign uses unaffected.
- **A shipped module that couldn't load is fixed.** `bin/review/ads-engine.js`
  required the uninstalled `uuid` package — so it (and the `federated-sync` that
  imports it) threw on load in a clean install. Swapped to the built-in
  `crypto.randomUUID()`; no new dependency.

## v11.5.0 — Governance hardening + autonomous-engine repair

**Release Date**: 2026-06-11
**Type**: Minor (one behavior change — see "Heads-up" below)
**Upgrade Path**: `npx mindforge-cc@latest`

This release consolidates four waves of work into a single minor: new orchestration and
learning primitives, a broad governance/security hardening pass, and — most importantly —
a repair that takes the autonomous engine from "crashes on every wave" to actually
functional. Some new pieces ship deliberately **inert** (present but not wired in); those
are called out so you know not to expect new behavior from them yet.

### Heads-up — Tier-3 approvals now fail closed (the one behavior change)

`bin/governance/approve.js` no longer rubber-stamps approvals. Tier-3 approvals now
**require GPG verification** and will **fail before writing any record** if no GPG key is
configured. If you relied on the old, unverified path, you have two choices:

- Configure a GPG key (recommended), or
- Set `MINDFORGE_ALLOW_UNVERIFIED_APPROVAL=1` to keep the old behavior — in which case the
  approval record is written with `verified: false` so the gap is auditable.

This is the only item in v11.5.0 that can change an existing workflow's outcome.

### The autonomous engine is functional again

`/mindforge:auto` was effectively broken. Three fixes in `bin/autonomous/auto-runner.js`
bring it back:

- **No more per-wave crash.** The runner was calling a non-existent `getIdentity()` on the
  ZTAI singleton and dying on every wave. It now establishes identity through the real
  `registerAgent` API (`_getRunnerIdentity()`).
- **The policy gate actually enforces now.** The async policy verdict was never `await`ed,
  so the gate silently allowed everything. It now awaits `policyEngine.evaluate(intent)` on
  every wave.
- **It fails closed.** If runner identity can't be established, the gate now **denies and
  audits** (`auto_mode_denied`) rather than running ungoverned.

### Security & governance hardening

- **SSRF guard hardened (twice).** The import-URL guard now closes an IPv6 link-local
  bypass and a symlink path-traversal bypass via numeric bitmask + canonical-path checks.
  Separately, remote instinct imports now enforce a port allowlist (`443`/none only), so an
  attacker can no longer pivot through an allowed public host to reach internal services
  like Redis (`:6379`) or Mongo (`:27017`).
- **Persona supply-chain scan.** Persona asset validation now flags dangerous invisible
  unicode (zero-width, bidi overrides, Unicode tags) across `.mindforge/personas`, closing
  an ASCII-smuggling injection vector.
- **Destructive-command detector closed an evasion.** Quoted-hash tricks like
  `rm "#" -rf /` are now caught.
- **Federated memory sync works again.** `eis-client`'s `getAuthHeader` was throwing on
  every call; it now correctly registers a node identity and signs requests, so sync to
  non-localhost EIS endpoints functions.
- **RBAC fails safe.** Tier elevation no longer throws for unregistered agents and resolves
  tiers through the correct ZTAI API.
- **Fail-closed contracts are now tested.** New `trust-verifier` and `rbac-manager` test
  suites lock in identity-verification and tier-authorization behavior so future governance
  changes can't quietly regress them.

### Learning & cost routing

- **New instinct CLI** — `/mindforge:instinct` manages the JSONL instinct store
  deterministically (no LLM spawn): `list`, `export`, `import`, `promote-candidates`, and
  `prune`.
- **Instinct store schema** gains `project_id` (stable scoping) and a `source` field
  (`auto-capture`/`manual`/`imported`/`observer`), with origin-weighted confidence —
  auto-captured instincts start at `0.3`, manually added ones at `0.7`.
- **Cost-routing shadow mode is now real.** Arbitrage steering respects
  `cost_routing.shadow_mode` (default on); in observe-only mode, selections are returned as
  `authoritative: false` and logged as SHADOW, so you can watch the router's
  recommendations without it taking the wheel.

### Shipped inert (no behavior change yet)

These landed as scaffolding and are **not** wired into any live path — they do nothing
until a follow-up enables them:

- **Manifest-driven install resolver** (`install-manifests.js`) — profile-to-module
  expansion and dependency detection are implemented, but the adapter into the installer's
  live `install()` path is deferred.
- **GAN-style harness personas** (`gan-evaluator`, `gan-generator`, `gan-planner`) — fully
  scoped and documented, not yet attached to any command or workflow.
- **Typed Inter-Agent Message Protocol** (`handoff-schema.js`) — an internal orchestration
  primitive (five message kinds, four priority levels, validation) for upcoming
  agent-handoff work.

## v11.3.1 — Packaging hotfix

**Release Date**: 2026-06-05
**Type**: Patch (no API changes)
**Upgrade Path**: `npm install -g mindforge-cc@latest` (or `npx mindforge-cc@latest`)

Fixes a critical packaging regression in v11.3.0, where a too-narrow npm `files`
allowlist silently dropped most of the product from the published tarball. Users who
installed v11.3.0 received only hooks, personas, subagents, and three `.mindforge/`
folders — **no slash commands, no skills, and an incomplete framework** — with no error,
because the installer skips any source absent from the tarball.

- **Restored payload** — every install now delivers all **174 slash commands**, **73 skills**,
  **154 subagents**, the entry `CLAUDE.md`, and the full `.mindforge/` framework
  (`governance`, `integrations`, `intelligence`, `memory`, `metrics`, `models`, `org`,
  `plugins`, `team`). Runtime state (`celestial.db`, telemetry `.jsonl`) is explicitly excluded.
- **`.planning/` scaffolding** now ships from a clean generic source (never the framework's
  own dev state) so the autonomous engine has its templates.
- **docs/References + docs/Templates** case-sensitivity fixed (worked on macOS, silently
  missed on Linux/npm — they now install correctly).
- **Regression test** (`tests/packaging-allowlist.test.js`) packs the real tarball and
  asserts the full payload ships — proven to fail under the broken v11.3.0 allowlist.

> v11.3.0 is deprecated on npm. Upgrade to v11.3.1.

## v11.3.0 — "Legion" (154-subagent expansion)

**Release Date**: 2026-06-04
**Type**: Minor (additive, backward-compatible)

Imports 154 specialized Claude-Code-native subagents across 10 categories
(`01-core-development` … `10-research-analysis`) into `.claude/agents/`, fully rebranded
and collision-safe (16 names that clashed with existing personas were suffixed `-cc`).
Adds `bin/spawn-agent.js subagent <name>` with a hardened name allowlist and path-traversal
guards, plus a generated `.mindforge/imported-agents.jsonl` index. No existing persona,
skill, or command changed behavior.

> Note: the v11.3.0 npm artifact was affected by the packaging regression fixed in v11.3.1.
> Install v11.3.1 to get the subagents and the rest of the payload.

---

# v11.0.0 "Sovereign Stability"

**Release Date**: 2026-05-28  
**Type**: Major (breaking changes)  
**Upgrade Path**: Run `node bin/migrations/10.7.0-to-11.0.0.js`

## Highlights

MindForge v11.0.0 is a production-hardening release that addresses systemic stability, intelligence, security, and SDK capabilities. It eliminates memory leaks, adds crash-safe writes, upgrades semantic search from TF-IDF to BM25, completes previously-stubbed subsystems, and introduces true parallel execution.

## What's New

### Foundation Hardening
- **Bounded caches** — LRUMap prevents unbounded memory growth in drift detector, entropy cache, and failure tracking
- **Atomic writes** — State files use write-to-temp → fsync → rename (crash-safe)
- **Log rotation** — AUDIT.jsonl auto-archives beyond 5000 lines with gzip compression
- **Schema validation** — HANDOFF.json validated on load (fail-open with warnings)
- **Snapshot GC** — Temporal history auto-cleaned (retain 50, expire > 7 days)

### Intelligence Upgrades
- **BM25 scoring** — Document-length-normalized search replacing raw TF-IDF
- **Persistent caching** — Index and adjacency caches eliminate O(n) rebuilds
- **Complete remediation** — All three strategies fully implemented (no more stubs)
- **Adaptive systems** — Intelligence tier, context window, and stuck detection all auto-tune

### Security Hardening
- **Ephemeral enclave keys** — No more hardcoded secrets in source
- **Structured crypto boundaries** — Simulated vs real clearly marked
- **Session isolation** — RBAC elevation with TTL, session-scoped identity
- **Dashboard security** — Token expiration, rate limiting, refresh endpoint

### Observability
- **System metrics** — `/api/v1/system` with heap monitoring and alerts
- **P95 latency tracking** — Real measurements replace hardcoded values
- **Effectiveness tracking** — Remediations measured for closed-loop improvement
- **Dynamic config reload** — Model router refreshes on MINDFORGE.md changes

### SDK & Distributed
- **True parallelism** — Wave tasks execute concurrently via semaphore
- **WebSocket streaming** — Real-time event delivery with auto-reconnect
- **Batch execution** — Execute multiple tasks with concurrency control
- **Model streaming** — Anthropic, OpenAI, and Gemini streaming support

## Breaking Changes

| Change | Impact | Migration |
|--------|--------|-----------|
| `verifyZKProof()` returns structured result | Code catching throws will miss denials | Check `result.verified` instead |
| `signPQ()` returns object | Code using return value as string will break | Destructure `{ signature }` from result |
| Wave execution non-deterministic | Task order within waves no longer guaranteed | Do not rely on execution order |
| `captureState()`/`rollbackTo()` now async | Callers must await these methods | Add `await` at all call sites |
| Dashboard tokens expire after 24h | Long-lived tokens stop working | Use `/api/v1/auth/refresh` endpoint |
| SDK bumped to 11.0.0 | New exports, removed deprecated paths | Update `mindforge-sdk@11.0.0` |

See upgrade guide at `docs/upgrade.md` for full migration steps.

## Migration

```bash
node bin/migrations/10.7.0-to-11.0.0.js
```

The migration script:
1. Backs up `.mindforge/config.json`
2. Adds new config sections (temporal, rate_limiting, session, wave_execution)
3. Archives old AUDIT.jsonl entries if > 5000 lines
4. Runs temporal snapshot GC
5. Bumps schema versions

---

## Previous Releases

- [v10.0.3 — Council Awakens](https://github.com/sairam0424/MindForge/releases/tag/v10.0.3)
- [v10.0.1 — Bedrock Fortified](https://github.com/sairam0424/MindForge/releases/tag/v10.0.1)
- [v9.0.0 — Bedrock Meridian](https://github.com/sairam0424/MindForge/releases/tag/v9.0.0)

---
---

# Release Notes — v10.0.3 "Council Awakens"

**Release Date**: 2026-05-25  
**Tag**: `v10.0.3`  
**Status**: STABLE

## Executive Summary

MindForge v10.0.3 "Council Awakens" introduces multi-voice deliberation, self-evolving agent instincts, cost-aware routing, and rigorous verification loops. This release expands the framework's autonomous governance and reasoning capabilities with 10 new skills, 8 new commands, 9 new personas, 3 new swarm templates, and 5 engine subsystems.

---

## Highlights

### Council Framework
- **4-Voice Decision Council** (`/mindforge:council`) — Spawns Architect, Critic, Pragmatist, and Visionary voices for architectural deliberation with structured consensus synthesis.
- **Multi-LLM Consult** (`/mindforge:consult`) — Routes questions to parallel models (Claude, Gemini, GPT) and synthesizes agreement/disagreement into actionable recommendations.

### Instinct Engine
- **Learn Instinct** (`/mindforge:learn-instinct`) — Captures emergent behavioral patterns from session traces as lightweight instinct primitives.
- **Evolve Skills** (`/mindforge:evolve-skills`) — Promotes validated instincts through quality scoring into full reusable skills with automated testing.

### Cost-Aware Routing
- **Cost Report** (`/mindforge:cost-report`) — Per-provider token analytics with budget burn rate, daily/weekly trends, and cost-per-task attribution.
- **Dynamic model selection** based on task complexity vs. budget constraints.

### Verification Loop
- **6-Phase Verification Gates** (`/mindforge:verify-loop`) — Substance, Existence, Wiring, Integration, Regression, and Acceptance gates executed sequentially with fail-fast semantics.

### Threat Modeling
- **STRIDE/DREAD Analysis** (`/mindforge:threat-model`) — Automated attack surface enumeration with severity scoring and mitigation recommendations.

### Agent Introspection
- **Introspect** (`/mindforge:introspect`) — Structured trace analysis for debugging reasoning failures, detecting drift, and identifying optimization opportunities.

---

## Counts Update

| Category | Previous (v10.0.2) | New (v10.0.3) | Delta |
|----------|-------------------|---------------|-------|
| Core Skills | 10 | 20 | +10 |
| Commands | 63 | 71 | +8 |
| Personas | 108 | 117 | +9 |
| Swarm Templates | 18 | 21 | +3 |
| Engine Subsystems | — | +5 | +5 |

---

## What's Next

**v10.1.0** (planned):
- Coverage target raised to 60% with per-module enforcement
- OpenTelemetry export for NexusTracer spans (Jaeger/Zipkin compatible)
- Rate limiting on dashboard API endpoints

---

## Previous Releases

- [v10.0.1 — Bedrock Fortified](https://github.com/sairam0424/MindForge/releases/tag/v10.0.1)
- [v9.0.0 — Bedrock Meridian](https://github.com/sairam0424/MindForge/releases/tag/v9.0.0)

---
---

# Release Notes — v10.0.1 "Bedrock Fortified"

**Release Date**: 2026-05-21  
**Tag**: `v10.0.1`  
**Status**: STABLE (Production Hardened)

## Executive Summary

MindForge v10.0.1 "Bedrock Fortified" is a comprehensive 4-phase rewrite that transforms the framework from a feature-rich prototype into a production-hardened platform. This release closes 4 critical security vulnerabilities, replaces all native C++ dependencies with pure WASM equivalents, decomposes the monolithic auto-runner into focused modules, establishes CI with coverage enforcement, and reduces the published package by 72%. Every test passes. Every endpoint is authenticated. Every query is parameterized.

---

## Breaking Changes

You must address these before upgrading from v9.x:

| Change | Impact | Migration |
|--------|--------|-----------|
| `better-sqlite3` removed, replaced by `sql.js` | If you imported or extended VectorHub internals, the constructor API has changed | Use `createVectorHub()` factory function instead of `new VectorHub()` |
| VectorHub uses FTS4 (not FTS5) | FTS5-specific syntax (e.g., `BM25`) no longer available | Use standard FTS4 `MATCH` queries; ranking is handled internally |
| SDK `memory.ts` rewritten | If you imported memory utilities from `../../bin/` paths, those imports no longer resolve | Import from `@mindforge/sdk` directly — all public APIs are re-exported |
| Dashboard endpoints require auth | Unauthenticated requests to `/api/steering`, `/api/approve`, and SSE mutators now return 401 | Set `MINDFORGE_DASHBOARD_TOKEN` env var; pass as `Authorization: Bearer <token>` |
| `sync-jira` / `sync-confluence` CLI routes removed | These were stubs with no implementation | Remove any scripts that invoke these commands |
| Prompt injection blocklist removed | The regex-based `BLOCKED_PATTERNS` array no longer exists | Use the structured action allowlist in `bin/governance/action-allowlist.js` |

---

## Highlights

### Security (Phase 1)

- **Hardcoded npm token eliminated** — The `NPM_TOKEN` was previously embedded in the CI workflow file. It is now sourced exclusively from repository secrets with a startup assertion that fails the build if missing.
- **ZK-proof governance bypass closed** — `verifyZKProof()` returned `true` unconditionally, allowing any agent to bypass governance gates. It now throws `GovernanceViolationError` with fail-closed semantics.
- **Path traversal in temporal API fixed** — The `auditId` parameter accepted sequences like `../../etc/passwd`. Input is now validated against `[a-zA-Z0-9_-]` and checked for directory containment.
- **Command injection in change-classifier fixed** — User-influenced strings were passed through shell interpretation. Now uses argument-array invocation with no shell.
- **Bearer token auth on all mutating endpoints** — Dashboard steering, approval, and evaluation routes require authentication.
- **Browser daemon /evaluate locked down** — Previously allowed unauthenticated arbitrary JavaScript execution in the Playwright context.

### Architecture (Phase 2)

- **sql.js replaces better-sqlite3** — Pure WebAssembly database with zero native compilation requirements. Works on every platform without node-gyp, Python, or C++ toolchains.
- **VectorHub rewritten** — Lazy Proxy pattern defers connection until first query. Factory function replaces constructor. WAL mode enabled. All queries parameterized. FTS4 index for full-text search.
- **Auto-runner decomposed** — The 672-line monolith is now 367 lines backed by 4 focused modules: `task-dispatcher.js`, `wave-executor.js`, `state-manager.js`, and `audit-writer.js`.
- **Shared utilities** — `bin/utils/paths.js` (project root resolution), `file-io.js` (safe read/write with atomic rename), `errors.js` (typed error hierarchy).
- **AuditWriter with Merkle chaining** — Buffered async writes; each entry includes a SHA-256 hash of the previous entry, creating a tamper-evident chain.
- **NexusTracer + PolicyEngine async** — Tracing and governance no longer block the event loop.
- **SDK independently publishable** — Proper `exports` field, `files` whitelist, `prepublishOnly` build script. No internal path imports.
- **Real validateConfig()** — Enforces 5 required fields with type and range validation (replaces the previous no-op).

### Testing & Quality (Phase 3)

- **41/43 tests passing** — 0 failures, 2 properly skipped (require network). All 43 test files execute via the unified runner.
- **4 broken test files fixed** — `nexus-tracing`, `model-broker`, `feedback-loop`, and `security-audit` tests restored with updated mocks and fixtures.
- **CI pipeline** — GitHub Actions with Node 18/20/22 matrix, npm caching, `npm ci` for reproducible installs, c8 coverage enforcement at 30% threshold.
- **Dependabot enabled** — Weekly npm updates, monthly GitHub Actions version bumps.
- **CODEOWNERS** — Enforces review requirements for security-sensitive directories.
- **npm provenance** — SLSA Build Level 2 attestation on every published release.
- **Duplicate workflow deleted** — `release-plane.yml` removed; `release.yml` is the single canonical pipeline.
- **Observability workflow trigger fixed** — Name mismatch between `workflow_run.workflows` and the referenced workflow resolved.

### DevOps & Performance (Phase 4)

- **72% smaller package** — From 3.9 MB (866 files) to 1.1 MB (245 files). Runtime artifacts, test fixtures, planning state, and intelligence logs excluded via `.npmignore`.
- **Lazy module loading** — 12 heavy `require()` calls in auto-runner deferred to first use, reducing cold-start time.
- **SSE idle detection** — The dashboard stops polling file systems when no SSE clients are connected.
- **Metrics 5-second TTL cache** — Rapid dashboard refreshes served from memory instead of recomputing.
- **Smart mtime-based polling** — Watchers skip file re-reads when modification time has not changed.
- **Knowledge store O(1) index** — Stores with >100 entries use a hash-map index instead of linear scan.
- **CLI: "Did you mean?"** — Levenshtein distance suggestions for mistyped commands.
- **CLI: --verbose flag** — Full execution trace output for debugging.
- **CLI: mindforge binary** — Direct invocation after install without `npx` prefix.
- **Structured action allowlist** — Explicit permit list replaces the brittle regex blocklist. Easier to audit, fewer false positives.

---

## Migration Guide (v9 to v10)

### Step 1: Update your dependency

```bash
npm install mindforge-cc@10.0.1
```

### Step 2: Set the dashboard token (if using the dashboard)

```bash
export MINDFORGE_DASHBOARD_TOKEN="your-secret-token"
```

All mutating dashboard endpoints now require this token. Without it, steering and approval requests return 401.

### Step 3: Update VectorHub usage (if extending)

```javascript
// Before (v9)
const { VectorHub } = require('./bin/engine/vector-hub');
const hub = new VectorHub('/path/to/db');

// After (v10)
const { createVectorHub } = require('./bin/engine/vector-hub');
const hub = createVectorHub('/path/to/db');
```

The database file format is compatible. No data migration is required.

### Step 4: Update SDK imports (if using memory utilities)

```javascript
// Before (v9) — internal path imports
import { MemoryStore } from '../../bin/memory/store';

// After (v10) — public SDK exports
import { MemoryStore } from '@mindforge/sdk';
```

### Step 5: Remove references to deleted commands

If your scripts call `mindforge sync-jira` or `mindforge sync-confluence`, remove those calls. These were stubs with no implementation.

### Step 6: Verify

```bash
npx mindforge-cc --version   # Should print 11.0.0
npm test                      # All 41 tests should pass
```

---

## Verification Commands

Run these to confirm your installation is healthy:

```bash
# Version check
npx mindforge-cc --version

# Run the full test suite
node tests/run-all.js

# Verify VectorHub initialization (creates in-memory DB)
node -e "const {createVectorHub} = require('./bin/engine/vector-hub'); const h = createVectorHub(':memory:'); console.log('OK');"

# Check package size
npm pack --dry-run 2>&1 | tail -5

# Verify CI locally (requires act)
act -j test --matrix node-version:20
```

---

## What's Next

**v10.1.0** (planned):
- Coverage target raised to 60% with per-module enforcement
- OpenTelemetry export for NexusTracer spans (Jaeger/Zipkin compatible)
- Rate limiting on dashboard API endpoints

**v10.2.0** (planned):
- Plugin system v2 with sandboxed execution (vm2 replacement)
- Hot-reload for skills without restarting the auto-runner
- WebSocket upgrade for dashboard (replacing SSE)

**v11.0.0** (roadmap):
- Multi-tenant VectorHub with project isolation
- Remote agent mesh (cross-machine wave execution)
- Native ESM migration (dropping CommonJS)

---

## Acknowledgments

This release was a ground-up hardening effort across security, architecture, testing, DevOps, and developer experience. Every line of code that runs in production was reviewed for correctness, every endpoint for authentication, and every query for injection safety.

---

## Previous Releases

- [v9.0.0 — Bedrock Meridian](https://github.com/sairam0424/MindForge/releases/tag/v9.0.0)
- [v8.2.0 — Autonomous SRE Layer](https://github.com/sairam0424/MindForge/releases/tag/v8.2.0)
- [v8.0.0 — Celestial Orchestration](https://github.com/sairam0424/MindForge/releases/tag/v8.0.0)
- [v7.0.0 — Sovereign Intelligence](https://github.com/sairam0424/MindForge/releases/tag/v7.0.0)
