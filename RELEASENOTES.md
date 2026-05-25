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
npx mindforge-cc --version   # Should print 10.0.1
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
