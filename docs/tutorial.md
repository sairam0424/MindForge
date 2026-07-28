# MindForge v11.9.0 — Full Tutorial (Install → Advanced Usage)

This tutorial walks a new user from installation to advanced usage. It is written for engineers who want to adopt MindForge in a real codebase.

---

## What's New in v11.9.0

v11.9.0 is the **first fully audited stable release** — validated by an IQ200 deep-audit across 258 checks:
- `node bin/mindforge-cli.js --version` now works correctly (prints `11.9.0`)
- All 35 workflow scripts pass runtime load validation
- 0 CVEs, 0 ESLint errors, 0 TypeScript errors in SDK
- Skill routing is deterministic (12 duplicate triggers resolved)
- `mesh.node_id` correctly set to `"auto"` for clean multi-node deployments
- Health score: **258/258 IQ200 checks passing**

---

## 1. Install MindForge

### Claude Code (local, per repo)

```bash
npx mindforge-cc@latest --claude --local
```

### Antigravity

```bash
npx mindforge-cc@latest --antigravity --local
```

### Specific Runtime (Universal)

```bash
npx mindforge-cc@latest --runtime <name>
```

---

## 2. Verify Installation

Open your agentic runtime (Claude Code, Antigravity, etc.) in your repo and run:

```bash
/mindforge:health
```

If anything is wrong, run the repair command:

```bash
/mindforge:health --repair
```

---

## 3. Create a New Project

```bash
/mindforge:init-project
```

This command scaffolds the framework in `.agent/` and initializes project planning:

- `.planning/PROJECT.md`: High-level vision and roadmap.
- `.planning/REQUIREMENTS.md`: Functional and technical specs.
- `.planning/STATE.md`: Real-time project health and milestone status.

---

## 4. Onboarding an Existing Codebase

```bash
/mindforge:map-codebase
```

This command generates architectural insights:

- `.planning/ARCHITECTURE.md`: Module relationships and data flow.
- `.planning/CONVENTIONS.md`: Inferred coding styles and patterns.

---

## 5. Unified Workflow (Phase 1)

MindForge uses a 4-pillar iterative cycle:

```bash
/mindforge:plan-phase 1     # discuss → research → plan
/mindforge:execute-phase 1  # parallel execution of task plans
/mindforge:verify-phase 1   # UAT + automated validation
/mindforge:ship 1           # generate release output + PR
```

---

## 6. High-Performance Personas

MindForge v11.9.0 ships 211 specialized personas. Each is a "digital twin" of a senior role.

- To list all personas: `/mindforge:personas --list`
- To switch persona: `/mindforge:personas --set executor`

---

## 7. Real-time Dashboard

Observable engineering is core to MindForge. Start the dashboard to see live agent activity:

```bash
/mindforge:dashboard --start --open
```

Visit `http://localhost:7339` for the premium web interface.

---

## 8. Knowledge & Memory Management

MindForge records architectural decisions to prevent regression.

- Capture a note: `/mindforge:note "Preference: Use absolute imports for shared libs"`
- Search memory: `/mindforge:remember --search "api patterns"`

---

## 9. Self-Building Skills

Learn new capabilities from documentation URL or local files:

```bash
/mindforge:learn https://docs.nextjs.org "nextjs-best-practices"
```

---

## 10. Security & Governance

MindForge enforces strict compliance gates.

```bash
/mindforge:security-scan --deep
```

This checks for secrets, dependency vulnerabilities, and architectural drift.

---

## 11. CI/CD Integration

MindForge is designed for non-interactive execution in CI environments.

- Set `CI=true` in your environment.
- Use `/mindforge:ship --auto-pr` for automated delivery.

See `docs/ci-cd-integration.md` for full pipeline examples.

---

## 12. Troubleshooting

If you hit issues, consult these specialized guides:

- `docs/troubleshooting.md`: Common technical fixes.
- `docs/faq.md`: Frequent questions and architectural patterns.
- `docs/upgrade.md`: Migration guides between versions.

---

## 13. Using Dynamic Workflows

MindForge v11.9.0 ships 35 pre-built multi-agent workflows. Browse them with `/mindforge:wf-catalog`.

### Quick start — run a workflow

```
/mindforge:wf-competitive-analysis What are the best practices for API versioning?
/mindforge:wf-code-audit current git diff
/mindforge:wf-security-hardening src/auth/
/mindforge:wf-debug-detective Login form submits but users report being logged out immediately
```

Each workflow fans out multiple parallel agents, verifies findings adversarially, and synthesizes a structured report.

### Beast tier workflows

The Beast tier runs 5-phase compound workflows with 8+ agents and adversarial verification — suitable for security reviews, accessibility compliance, and threat modeling:

- `/mindforge:wf-security-hardening` — Full OWASP scan with STRIDE threat model
- `/mindforge:wf-accessibility-audit` — WCAG 2.2 compliance with 3-vote verification
- `/mindforge:wf-security-threat-model` — STRIDE threat enumeration + CVSS scoring

---

## Running Dynamic Workflows

MindForge ships 35 pre-built multi-agent workflows. Each runs via Claude Code's `Workflow` tool using `parallel()`, `pipeline()`, `phase()`, and `agent()` primitives.

### Discover available workflows
```bash
node bin/mindforge-cli.js workflow list
node bin/mindforge-cli.js workflow info code-audit
```

### Run via slash command
Open Claude Code and type any workflow command:
- `/mindforge:wf-code-audit` — parallel security + quality + performance audit
- `/mindforge:wf-debug-detective` — 4-hypothesis RCA for hard bugs
- `/mindforge:wf-onboard-codebase` — architecture tour of any codebase
- `/mindforge:wf-security-hardening` — Beast tier: OWASP scout + adversarial verify

### Run via Workflow tool
```javascript
Workflow({
  scriptPath: "/Users/sairamugge/Desktop/Not-Humans-World/MindForge/.mindforge/dynamic-workflows/scripts/code-audit.js",
  args: "review the auth module for security issues"
})
```

### Workflow tiers

| Tier | Count | Workflows |
|------|-------|-----------|
| Research | 5 | competitive-analysis, tech-evaluation, ai-model-eval, ux-heuristic-audit, competitive-teardown |
| Dev | 14 | code-audit, feature-planner, pr-review, tdd-sprint, refactor-plan, test-coverage-gap, api-contract-test, debug-detective, writer-reviewer, mutation-testing, code-explainer, design-system-audit, orchestrate-review, verification-loop |
| Ops | 6 | incident-response, release-prep, dependency-health, database-migration, multi-repo-sync, cost-analysis |
| Intelligence | 7 | onboard-codebase, perf-optimize, architecture-modernization, documentation-gen, api-migration, data-pipeline-validate, workflow-optimizer |
| Beast | 3 | security-hardening, accessibility-audit, security-threat-model |

---

## Full command walkthrough

The 4-pillar lifecycle (`plan-phase` → `execute-phase` → `verify-phase` → `ship`) covers the core loop. MindForge also ships a wider set of commands for day-to-day project work — this is the complete walkthrough, in the order you're likely to reach for them:

```bash
/mindforge:init-project
    → Requirements interview
    → Creates PROJECT.md, REQUIREMENTS.md, STATE.md

/mindforge:do <text>
    → Smart natural language dispatcher (v2)

/mindforge:note <text>
    → Zero-friction idea capture and todo promotion (v2)

/mindforge:ui-phase 1
    → Create UI design contract (UI-SPEC.md) (v2)

/mindforge:plan-phase 1 [--ads]
    → Discuss scope and decisions
    → Research domain (parallel)
    → Create atomic XML task plans
    → (Optional) Run Adversarial Decision Synthesis (ADS) loop

/mindforge:execute-phase 1
    → Wave-based parallel execution
    → One commit per task
    → Automated verification

/mindforge:ui-review 1
    → Retroactive 6-pillar visual audit (v2)

/mindforge:validate-phase 1
    → Requirement coverage and test gap audit (v2)

/mindforge:session-report
    → Automated post-session stakeholder summary (v2)

/mindforge:add-backlog <desc>
    → Park ideas in 999.x "parking lot" (v2)

/mindforge:review-backlog
    → Review and promote backlog items (v2)

/mindforge:plant-seed <idea>
    → Capture speculative ideas with triggers (v2)

/mindforge:workstreams
    → Parallel feature tracks with isolated state (v2)

/mindforge:verify-phase 1
    → Human acceptance testing
    → Debug agent on failures
    → UAT sign-off

/mindforge:ship 1
    → Changelog generation
    → Final quality gates
    → PR creation

/mindforge:auto --phase 1
    → Walk-away autonomous execution (v2)
    → Intelligent stuck detection and node repair
    → External steering via steering-queue

/mindforge:qa
    → Systematic visual verification of UI changes (v2)
    → Automated regression test generation
    → Persistent browser sessions and daemon

/mindforge:cross-review
    → Adversarial multi-model code review and synthesis (v2)
    → Consensus detection and severity normalization

/mindforge:research
    → Deep research using Gemini 1.5 Pro 1M context (v2)
    → Codebase-wide context packaging and SSRF protection

/mindforge:costs
    → Real-time token usage and cost profiling (v2)
    → Daily budget tracking across all providers

/mindforge:remember
    → Manual knowledge management and search (v2)
    → Persistent knowledge graph retrieval and promotion

/mindforge:dashboard
    → Real-time web observability and governance at localhost:7339 (v2)
    → Live audit logs, metrics, activity, and team feed

/mindforge:learn
    → Automatically capture skills from Docs, Sessions, or npm (v2)
    → 7-dimension quality scoring and injection protection

/mindforge:marketplace
    → Search, install, and publish community skills (v2)
    → Verified installation via npm-based registry

/mindforge:new-runtime
    → Scaffold custom runtime configurations for any AI agent (v2)
```

---

## 14. Next Steps

1. Configure your team preferences in `docs/Templates/Profile/user-profile.md`.
2. Start your first Phase 1 planning.
3. Join our community: `/mindforge:join-discord`.
