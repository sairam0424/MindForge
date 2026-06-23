# MindForge Dynamic Workflow Registry

Dynamic workflows are multi-agent JS orchestration scripts that run via Claude Code's `Workflow` tool. They use `parallel()`, `pipeline()`, `phase()`, and `agent()` primitives to fan out work across multiple concurrent subagents and synthesize results.

**Trigger:** Use `/mindforge:wf-catalog` to browse interactively, or invoke any `/mindforge:wf-<name>` command directly.

**Discovery:** `node bin/mindforge-cli.js workflow list`

---

## Research Tier — Fan-out search, adversarial verification, cited output

| Name | Command | Description | Phases |
|------|---------|-------------|--------|
| `deep-research` | `/mindforge:wf-deep-research` | Fan-out web research with adversarial claim verification and cited synthesis | Scope → Search → Fetch → Verify → Synthesize |
| `competitive-analysis` | `/mindforge:wf-competitive-analysis` | Multi-angle competitive research producing a SWOT and positioning summary | Scope → Research → SWOT → Position |
| `tech-evaluation` | `/mindforge:wf-tech-evaluation` | Scored technology evaluation across DX, performance, security, ecosystem, community | Scope → Evaluate → Score → Recommend |

## Dev Tier — Coding-assistant power workflows

| Name | Command | Description | Phases |
|------|---------|-------------|--------|
| `code-audit` | `/mindforge:wf-code-audit` | Parallel security + quality + performance audit with adversarial finding verification | Scope → Audit → Verify → Report |
| `feature-planner` | `/mindforge:wf-feature-planner` | Sequential pipeline: brief → PRD → architecture → user stories | Brief → PRD → Arch → Stories |
| `pr-review` | `/mindforge:wf-pr-review` | 4-dimensional parallel PR review: correctness, security, performance, style → verdict | Scope → Review → Consensus → Verdict |
| `tdd-sprint` | `/mindforge:wf-tdd-sprint` | Strict Red-Green-Refactor TDD loop with spec-first discipline | Spec → Red → Green → Refactor |
| `refactor-plan` | `/mindforge:wf-refactor-plan` | Debt scan → risk-sorted sequence → safe refactor implementation plan | Scan → Prioritize → Sequence → Plan |

## Ops Tier — Infrastructure and release workflows

| Name | Command | Description | Phases |
|------|---------|-------------|--------|
| `incident-response` | `/mindforge:wf-incident-response` | Parallel investigation: logs/metrics/traces/code → mitigation → RCA → postmortem | Alert → Investigate → Mitigate → RCA |
| `release-prep` | `/mindforge:wf-release-prep` | Automated release pipeline: tests → changelog → version bump → PR → announcement | Check → Changelog → Bump → PR |

## Intelligence Tier — Deep analysis and optimization

| Name | Command | Description | Phases |
|------|---------|-------------|--------|
| `onboard-codebase` | `/mindforge:wf-onboard-codebase` | Map structure → domain analysis → architecture → guided tour and onboarding docs | Map → Domain → Arch → Tour |
| `perf-optimize` | `/mindforge:wf-perf-optimize` | Profile → parallel bottleneck hunt (DB/network/CPU/memory) → prioritized fix plan | Profile → Identify → Plan → Benchmark |

---

## Schema

Each workflow script at `.mindforge/dynamic-workflows/scripts/<name>.js` exports:

```javascript
export const meta = {
  name: '<name>',          // matches filename (without .js)
  description: '<string>', // shown in this catalog
  whenToUse: '<string>',   // trigger conditions
  phases: [{ title, detail }],
}
```

Scripts use the Claude Code `Workflow` tool primitives: `agent()`, `parallel()`, `pipeline()`, `phase()`, `log()`, `args`, `budget`.

## Adding a workflow

1. Write `.mindforge/dynamic-workflows/scripts/<name>.js` with a valid `meta` export
2. Add an entry to `index.json`
3. Add paired command files to `.agent/mindforge/wf-<name>.md` and `.claude/commands/mindforge/wf-<name>.md`
4. Run `npm test` — `tests/workflow-registry.test.js` validates all three steps
