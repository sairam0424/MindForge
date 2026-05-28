# MindForge Codebase Map (v11.0.0 — "Sovereign Stability")

> Generated: 2026-05-28 | Total: ~19.1K LOC across 350 published files

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                        USER / CLAUDE CODE CLI                        │
│  /mindforge:* commands → .claude/commands/mindforge/*.md (71 cmds)  │
└─────────────────────────┬───────────────────────────────────────────┘
                          │
┌─────────────────────────▼───────────────────────────────────────────┐
│                    .agent/ ORCHESTRATION LAYER                        │
│  hooks/ (6)  │  skills/ (73)  │  workflows/ (130)  │  bin/ (20)    │
└─────────────────────────┬───────────────────────────────────────────┘
                          │
┌─────────────────────────▼───────────────────────────────────────────┐
│                   .mindforge/ ENGINE LAYER                            │
│  engine/ (25 specs)  │  skills/ (20)  │  personas/ (117)  │ config │
└─────────────────────────┬───────────────────────────────────────────┘
                          │
┌─────────────────────────▼───────────────────────────────────────────┐
│                      bin/ EXECUTION LAYER                             │
│  autonomous/ │ engine/ │ memory/ │ governance/ │ models/ │ dashboard │
│  (13 files)  │(18 files)│(16 files)│ (10 files) │(10 files)│(8 files)│
└─────────────────────────┬───────────────────────────────────────────┘
                          │
┌─────────────────────────▼───────────────────────────────────────────┐
│                    PERSISTENCE LAYER                                  │
│  .planning/ (STATE.md, HANDOFF.json, AUDIT.jsonl, history/)          │
│  sql.js (WASM SQLite) │ JSONL stores │ Knowledge Graph              │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Directory Structure (3 Levels)

```
MindForge/
├── .agent/                    # Agent orchestration (hooks, skills, workflows)
│   ├── bin/                   # Runtime engine (mindforge-tools.cjs + 19 lib modules)
│   ├── hooks/                 # 6 JS hooks (SessionStart, PostToolUse, PreToolUse)
│   ├── mindforge/             # 69 command mirrors (local execution contexts)
│   ├── skills/                # 73 agent-level skills (mindforge-* pattern)
│   └── workflows/             # 130 executable task pipelines
├── .claude/                   # Claude Code interface layer
│   ├── commands/mindforge/    # 71 slash commands (/mindforge:*)
│   ├── commands/forge/        # 3 bootstrap commands (/forge:*)
│   ├── skills/                # Symlinked external skills
│   └── settings.local.json   # Permission allowlist
├── .mindforge/                # Framework core (published in npm package)
│   ├── engine/                # 25 specification docs (the "brain")
│   │   ├── autonomous/       # Auto-executor, stuck-detector, bridge
│   │   ├── skills/           # Loader, registry, composition, conflict-resolver
│   │   ├── council/          # Protocol, synthesis, templates
│   │   ├── cost-tracking/    # Router, budget-enforcer, token-ledger
│   │   └── instincts/        # Schema, capture-engine, promotion-engine
│   ├── skills/                # 20 core skills (Tier 1, SKILL.md format)
│   ├── personas/              # 117 specialist personas + swarm-templates.json
│   ├── org/                   # Organization config (MANIFEST.md, conventions)
│   └── config.json           # Runtime configuration (7 sections)
├── .planning/                 # Execution state (partially gitignored)
│   ├── STATE.md              # Current project state (tracked)
│   ├── HANDOFF.json          # Resumable execution state (tracked)
│   ├── AUDIT.jsonl           # Merkle-chained audit log (gitignored)
│   ├── history/              # Timestamped planning snapshots
│   ├── decisions/            # Council verdict outputs
│   └── phases/               # Phase execution plans
├── agents/                    # 6 specialist agent identities
│   ├── executor/IDENTITY.md  # VIV pattern (Verify-Implement-Verify)
│   ├── planner/IDENTITY.md   # Goal-backward decomposition
│   ├── reviewer/IDENTITY.md  # 6-pillar adversarial audit
│   ├── researcher/IDENTITY.md # Evidence-weighted research
│   ├── memory/IDENTITY.md    # Knowledge graph architect
│   └── tool/IDENTITY.md      # Least-privilege execution
├── bin/                       # 60+ Node.js runtime scripts
│   ├── autonomous/            # Wave-based task execution (13 files)
│   ├── engine/                # Intelligence core (18 files)
│   ├── memory/                # RAG + knowledge graph (16 files)
│   ├── governance/            # Policy engine + RBAC (10 files)
│   ├── models/                # Multi-cloud model routing (10 files)
│   ├── dashboard/             # Express server + SSE (8 files)
│   ├── browser/               # Playwright QA daemon (10 files)
│   ├── skills-builder/        # Skill generation + marketplace (8 files)
│   ├── migrations/            # Schema evolution (8 files)
│   ├── wizard/                # First-run setup (4 files)
│   ├── review/                # Multi-model code review (5 files)
│   ├── sre/                   # Reliability engineering (4 files)
│   ├── research/              # Research automation (1 file)
│   ├── revops/                # Revenue ops analytics (6 files)
│   ├── updater/               # Self-update mechanism (3 files)
│   └── utils/                 # Shared utilities (4 files)
├── sdk/                       # TypeScript SDK (@mindforge/sdk)
│   ├── src/index.ts           # Exports: MindForgeClient, commands, types
│   ├── src/client.ts          # Main API: health(), readState(), readHandoff()
│   └── tests/                 # SDK-specific tests
├── docs/                      # Documentation (43 items)
│   ├── architecture/          # 9 version docs (V3-V9)
│   ├── Templates/             # 10 template categories
│   ├── adr/                   # 4 Architecture Decision Records
│   └── [guides]              # getting-started, user-guide, sdk-reference, etc.
├── examples/                  # Starter projects
├── tests/                     # 43 test files (Node.js assert, no framework)
└── [root files]              # package.json, MINDFORGE.md, CHANGELOG.md, etc.
```

---

## Data Flow: Task Lifecycle

```
INPUT (user command or autonomous plan)
  │
  ▼
PRE-FLIGHT CHECK ──── Schema version, git clean, phase files exist
  │
  ▼
SKILL LOADER ─────── Match triggers (text + file paths) → Load SKILL.md
  │                   Resolve compose: deps → Conflict resolution (tier priority)
  ▼
CONTEXT INJECTOR ─── Persona + Skills + PLAN + ADRs + RAG context
  │                   Budget: max 60K tokens; decompose if exceeded
  ▼
COST ROUTER ──────── Difficulty score → Model tier selection
  │                   simple(Haiku) / standard(Sonnet) / complex(Opus) / research(Gemini)
  ▼
SUBAGENT EXECUTION── Fresh context per task; implement → self-verify → commit
  │
  ▼
VERIFICATION ─────── Build → Type Check → Lint → Test → Security → Diff Review
  │
  ▼
STUCK DETECTION ──── 5 failure patterns monitored async; ESCALATE or REPAIR
  │
  ▼
INSTINCT CAPTURE ─── Auto-observe patterns → confidence score → promote if mature
  │
  ▼
COMPLIANCE GATES ─── Secret scan, arch alignment, coverage, doc completeness
  │
  ▼
HANDOFF ──────────── Write state to HANDOFF.json + AUDIT.jsonl + SHARED_TASK_NOTES.md
```

---

## Key Subsystems

### 1. Autonomous Engine (`bin/autonomous/`)

| File | LOC | Role |
|------|-----|------|
| auto-runner.js | 449 | Main orchestrator — wave scheduling, task dispatch |
| wave-executor.js | 169 | Execute work units within a wave |
| task-dispatcher.js | 120 | Route tasks to correct handlers |
| state-manager.js | 115 | Persist/resume execution state |
| repair-operator.js | 213 | Self-repair failed tasks (RETRY → DECOMPOSE → ESCALATE) |
| stuck-monitor.js | 120 | Detect deadlocks via AUDIT pattern analysis |
| intent-harvester.js | 80 | Proactive semantic intent extraction |
| mesh-self-healer.js | 70 | Detect/repair reasoning drift |
| audit-writer.js | 75 | Buffered Merkle-chained JSONL writes (LRUMap + AuditRotator) |
| progress-stream.js | 65 | Real-time status to dashboard SSE |
| semaphore.js | 45 | Semaphore-based concurrency limiter for batch execution |

### 2. Memory System (`bin/memory/`)

| File | LOC | Role |
|------|-----|------|
| knowledge-graph.js | 609 | Graph with typed edges, BFS traversal, edge decay |
| knowledge-store.js | 393 | Append-only JSONL storage |
| knowledge-capture.js | 442 | Extract learnings from sessions |
| vector-hub.js | 486 | Vector storage + similarity search |
| embedding-engine.js | 326 | Chunking + embedding pipeline |
| semantic-hub.js | 207 | Semantic search via dot product |
| federated-sync.js | 293 | Cross-team memory federation |
| auto-shadow.js | 274 | Auto-capture patterns passively |
| session-memory-loader.js | 137 | Bootstrap session context |

### 3. Governance (`bin/governance/`)

| File | LOC | Role |
|------|-----|------|
| policy-engine.js | 210 | 3-tier enforcement (auto/manual/crypto) |
| ztai-manager.js | 239 | Zero-trust access identity |
| quantum-crypto.js | 119 | Post-quantum signatures (Dilithium-5) |
| impact-analyzer.js | 143 | Change blast radius analysis |
| rbac-manager.js | 100 | Role-based access per skill tier |

### 4. Model Routing (`bin/models/`)

| File | LOC | Role |
|------|-----|------|
| model-router.js | 95 | Route to correct provider |
| model-broker.js | 132 | Load balancing across providers |
| cloud-broker.js | 162 | Multi-cloud abstraction |
| cost-tracker.js | 100 | Token + cost tracking per call |
| anthropic-provider.js | 70 | Claude API integration |
| openai-provider.js | 70 | GPT-4o integration |
| gemini-provider.js | 70 | Gemini integration |

---

## Skills System (20 Core Skills)

| # | Skill | Triggers (abbreviated) | Composes |
|---|-------|----------------------|----------|
| 1 | security-review | auth, JWT, payment, PII, GDPR | — |
| 2 | code-quality | refactor, lint, review | — |
| 3 | api-design | API, endpoint, REST, GraphQL | — |
| 4 | testing-standards | test, spec, coverage | — |
| 5 | documentation | README, docs, changelog | — |
| 6 | performance | latency, cache, optimization | — |
| 7 | accessibility | a11y, WCAG, screen reader | — |
| 8 | data-privacy | GDPR, consent, PII | — |
| 9 | incident-response | incident, outage, postmortem | — |
| 10 | database-patterns | query, index, migration, N+1 | — |
| 11 | agent-loops | loop, circuit breaker, retry, fallback | — |
| 12 | multi-llm-consult | second opinion, cross-model, gemini | — |
| 13 | continuous-learning | instinct, pattern detection, evolve | — |
| 14 | council | multi-voice, decision debate, ADR | — |
| 15 | verification-loop | quality gate, build check, pre-merge | security-review |
| 16 | threat-modeling | STRIDE, attack tree, DREAD | security-review |
| 17 | autonomous-loops | autonomous mode, DAG, RFC-driven | agent-loops |
| 18 | agent-introspection-debugging | agent failure, self-debug, stuck | — |
| 19 | cost-aware-routing | token budget, model routing, cost | — |
| 20 | doc-health-audit | stale docs, claim validation, doc coverage | documentation |

**Skill format:** YAML frontmatter (`name`, `version`, `min_mindforge_version`, `status`, `triggers`, optional `compose`) + markdown body with "When this skill activates", "Mandatory actions", "Self-check before task completion" sections.

**Loading:** Trigger-matched → Tier-prioritized (Project > Org > Core) → Composition resolved → Injection-guarded → Context-budgeted (top 3 full, rest summarized).

---

## Persona Architecture (117 Total)

**6 Core Agent Identities** (`agents/*/IDENTITY.md`):
- Planner (goal-backward decomposition)
- Executor (VIV: Verify-Implement-Verify)
- Reviewer (6-pillar adversarial audit)
- Researcher (evidence-weighted, multi-source)
- Memory (knowledge graph architect)
- Tool (least-privilege, audit-logged)

**Persona Categories:**
- Architecture & Design (12): architect, cloud-architect, api-gateway-architect, microservices, event-driven, frontend, etc.
- Security & Compliance (8): security-reviewer, authentication-architect, compliance-auditor, threat-modeler, data-privacy-engineer
- Council Voices (4): council-architect, council-skeptic, council-pragmatist, council-critic
- Language Specialists (8): typescript-wizard, react-specialist, python, rust, go, java, graphql, tailwind
- DevOps & Infra (8): devops-engineer, kubernetes-debugger, cloud-architect, observability-engineer
- Performance (6): performance-optimizer, caching-strategist, build-optimizer, chaos-engineer
- Quality & Testing (6): qa-engineer, contract-tester, test-data-engineer, coverage-specialist
- Intelligence (4): cost-optimizer, instinct-curator, multi-model-bridge, ml-engineer
- Documentation (3): tech-writer, doc-auditor, onboarding-guide
- Operations (58+): domain-modeler, release-manager, product-manager, debug-specialist, etc.

**21 Swarm Templates** (multi-agent clusters):
UISwarm, BackendSwarm, SecuritySwarm, AIEngineeringSwarm, DeveloperExperienceSwarm, DataMeshSwarm, IdentityTrustSwarm, GrowthAnalyticsSwarm, IncidentResponseSwarm, ComplianceSwarm, QualityAssuranceSwarm, FullStackSwarm, ArchitectureSwarm, PerformanceSwarm, InfrastructureSwarm, AccessibilitySwarm, ReviewSwarm, MigrationSwarm, **CouncilSwarm**, **VerificationSwarm**, **LearningSwarm**

---

## Command System (71 Commands)

**Lifecycle:**
- `init-project`, `plan-phase`, `execute-phase`, `verify-phase`, `validate-phase`, `ship`

**Intelligence:**
- `council`, `consult`, `introspect`, `cost-report`, `threat-model`

**Learning:**
- `learn`, `learn-instinct`, `evolve-skills`, `record-learning`, `learning`

**Operations:**
- `auto`, `next`, `do`, `quick`, `debug`, `review`, `qa`, `browse`

**Governance:**
- `audit`, `security-scan`, `approve`, `verify-loop`

**State:**
- `status`, `health`, `metrics`, `tokens`, `dashboard`, `session-report`

**Collaboration:**
- `cross-review`, `pr-review`, `steer`, `discuss-phase`

---

## Hooks (Event-Driven)

| Hook | Event | Purpose |
|------|-------|---------|
| mindforge-session-init_extended.js | SessionStart | Inject neural-orchestrator skill + MINDFORGE.md check |
| mindforge-context-monitor.js | PostToolUse | Warn at 35% context remaining, CRITICAL at 25% |
| mindforge-workflow-guard.js | PreToolUse | Detect edits outside workflow context |
| mindforge-statusline.js | Continuous | Write context metrics to temp file |
| mindforge-prompt-guard.js | Pre-execution | Validate prompt integrity |
| mindforge-check-update.js | Startup | Check framework version |

---

## Configuration (`config.json`)

| Section | Key Settings |
|---------|-------------|
| `governance` | drift_threshold: 0.75, critical: 0.5, active DID |
| `revops` | 7 models in market_registry (costs + benchmarks), baseline: sonnet-4-6 |
| `security` | PQAS enabled, enclave tier 2, simulated-lattice |
| `instincts` | auto-capture, max 100/project, promote at 0.85 confidence + 5 applications |
| `council` | 4 voices, 2 rounds max, 0.75 consensus threshold, 200 words/voice |
| `cost_routing` | 5 tiers, session budget $5 warn / $20 hard, weekly $50 / $200 |
| `temporal` | max_snapshots: 50, max_age_days: 30 |
| `rate_limiting` | dashboard_rpm: 120 |
| `session` | token_expiry_hours: 24 |
| `wave_execution` | max_concurrency: 6 |

---

## SDK API (`@mindforge/sdk`)

```typescript
import { MindForgeClient, WebSocketEventStream } from 'mindforge-sdk';

const client = new MindForgeClient({ projectRoot: '.' });
await client.health();            // Validate project structure
await client.readState();         // Parse .planning/STATE.md
await client.readHandoff();       // Read HANDOFF.json (schema-validated)
await client.streamExecution(1);  // AsyncIterable<StreamChunk> streaming
await client.batchExecute(reqs);  // Semaphore-based concurrent batch
client.validateRuntimeConfig();   // Startup config checking
client.isInitialised();           // Check if .planning/PROJECT.md exists
```

Exports: `MindForgeClient`, `MindForgeEventStream`, `WebSocketEventStream`, `MindForgeMemory`, `commands`, types (`PhaseResult`, `TaskResult`, `SecurityFinding`, `GateResult`, `HealthReport`, `StreamChunk`, `StreamingExecutionResult`, `BatchExecutionRequest`, `BatchExecutionResult`).

---

## Testing

- **Runner:** `tests/run-all.js` — discovers `*.test.js`, 60s timeout, sequential, exit-code propagation
- **Framework:** Node.js built-in `assert` (no Jest/Mocha)
- **Style:** `test(name, fn)` with manual harness, `✅ PASS` / `❌ FAIL` output
- **Count:** 43 files (41 pass, 2 env-dependent skips)
- **Coverage:** `npm run coverage` via c8
- **Pre-commit:** Husky runs `npm test` on every commit

---

## Build & Development

```bash
npm install              # Install deps (Node >= 18)
npm test                 # Run all 43 test files
npm run lint             # ESLint (single quotes, semis, ES2021)
npm run coverage         # c8 coverage report
npm run commit           # Commitizen conventional commits
cd sdk && npm run build  # TypeScript → sdk/dist/
```

---

## Key Design Principles

1. **Fresh context per task** — No context accumulation across autonomous iterations
2. **Durable resumption** — HANDOFF.json enables restart from any failure point
3. **Minimum necessary context** — Context injector loads only what's needed (60K max)
4. **Tier-based governance** — Tier 1 auto-approve, Tier 2 manual, Tier 3 cryptographic
5. **Cost awareness** — Every model call routed by difficulty, tracked in ledger
6. **Instinct evolution** — Patterns auto-promote to skills when proven
7. **Multi-voice decisions** — Council prevents single-perspective architectural mistakes
8. **Zero native deps** — sql.js (WASM) for portability across all platforms
9. **Append-only audit** — Merkle-chained JSONL for tamper-evident history
10. **Skill composition** — Skills build on skills without duplication

---

## File Counts

| Category | Files | LOC (est.) |
|----------|-------|-----------|
| bin/ (runtime) | 60+ | 18,200 |
| .mindforge/ (engine specs) | 25+ | 4,500 |
| .mindforge/personas/ | 117 | 8,000 |
| .mindforge/skills/ | 20 | 2,800 |
| .agent/ (orchestration) | 280+ | 12,000 |
| sdk/ | 5 | 800 |
| tests/ | 43 | 5,500 |
| docs/ | 43 | 4,000 |
| **Total** | **~600** | **~56,000** |
