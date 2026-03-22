# MindForge v2.0.0 — Complete Commands Reference

## All 40+ commands

### Lifecycle commands (core workflow)

| Command | Usage | Description | Added |
|---|---|---|---|
| `/mindforge:init-project` | `init-project` | Guided project setup — creates all `.planning/` files | Day 1 |
| `/mindforge:discuss-phase` | `discuss-phase [N] [--batch|--auto]` | Pre-planning interview to capture implementation decisions | Day 3 |
| `/mindforge:plan-phase` | `plan-phase [N]` | Research, decompose, and create atomic task plans | Day 1 |
| `/mindforge:execute-phase` | `execute-phase [N]` | Wave-based parallel execution of all phase plans | Day 1+2 |
| `/mindforge:verify-phase` | `verify-phase [N]` | Automated + human acceptance testing pipeline | Day 1 |
| `/mindforge:ship` | `ship [N]` | Create PR, write release notes, push to remote | Day 1 |
| `/mindforge:auto` | `auto [--phase N] [--milestone M]` | Walk-away autonomous execution with stuck detection | Day 8 |
| `/mindforge:steer` | `steer "instruction"` | Inject guidance into a running autonomous session | Day 8 |
| `/mindforge:next` | `next` | Auto-detect and execute the correct next workflow step | Day 2 |
| `/mindforge:cross-review` | `cross-review` | Adversarial multi-model code review and synthesis | Day 10 |
| `/mindforge:research` | `research "query"` | Deep research using Gemini 1.5 Pro 1M context | Day 10 |
| `/mindforge:remember` | `remember [--add X|--search Y|--promote ID|--stats]` | Persistent knowledge graph management | Day 11 |

### Project setup & discovery

| Command | Usage | Description | Added |
|---|---|---|---|
| `/mindforge:map-codebase` | `map-codebase` | Brownfield onboarding: infer stack and seed docs | Day 6 |
| `/mindforge:quick` | `quick` | Run a small, single-task plan without a full phase | Day 2 |
| `/mindforge:status` | `status` | Show current phase, plan status, and next action | Day 2 |
| `/mindforge:health` | `health [--repair]` | Validate installation and repair drift | Day 2 |
| `/mindforge:review` | `review [N]` | Run a structured review pass for a phase | Day 5 |
| `/mindforge:debug` | `debug [plan-id]` | Debug a failed plan with root-cause workflow | Day 5 |

### Governance & compliance

| Command | Usage | Description | Added |
|---|---|---|---|
| `/mindforge:approve` | `approve [--tier 2|3]` | Process approvals and emergency overrides | Day 4 |
| `/mindforge:audit` | `audit [--phase N] [--event X] [--since DATE]` | Query `AUDIT.jsonl` history | Day 2 |
| `/mindforge:security-scan` | `security-scan [--deep] [--secrets] [--deps]` | Security scan with OWASP classification | Day 2 |
| `/mindforge:milestone` | `milestone [name]` | Create or update milestone definitions | Day 4 |
| `/mindforge:complete-milestone` | `complete-milestone [name]` | Archive milestone and generate release report | Day 4 |
| `/mindforge:retrospective` | `retrospective [N]` | Phase retrospective and improvement actions | Day 5 |

### Skills & plugins

| Command | Usage | Description | Added |
|---|---|---|---|
| `/mindforge:skills` | `skills [list|validate|refresh]` | Manage core/org/project skills | Day 3 |
| `/mindforge:install-skill` | `install-skill <name> [--version]` | Install skill from registry | Day 6 |
| `/mindforge:publish-skill` | `publish-skill <path>` | Publish a skill to the registry | Day 6 |
| `/mindforge:plugins` | `plugins [list|install|uninstall|validate]` | Manage plugin lifecycle | Day 7 |

### Intelligence & metrics

| Command | Usage | Description | Added |
|---|---|---|---|
| `/mindforge:metrics` | `metrics [--phase N]` | Compute quality and throughput metrics | Day 5 |
| `/mindforge:profile-team` | `profile-team` | Generate team skill and ownership profile | Day 5 |
| `/mindforge:benchmark` | `benchmark [--skill X]` | Measure skill effectiveness | Day 6 |
| `/mindforge:tokens` | `tokens [--profile] [--summary]` | Token usage profiling and optimisation | Day 7 |

### Integrations & distribution

| Command | Usage | Description | Added |
|---|---|---|---|
| `/mindforge:init-org` | `init-org` | Org-wide MindForge setup | Day 6 |
| `/mindforge:sync-jira` | `sync-jira [--project KEY]` | Sync phases and plans to Jira | Day 4 |
| `/mindforge:sync-confluence` | `sync-confluence [--page ...]` | Publish docs to Confluence | Day 4 |
| `/mindforge:pr-review` | `pr-review [--range A..B]` | AI PR review with context | Day 6 |
| `/mindforge:workspace` | `workspace [detect|plan|test]` | Monorepo workspace management | Day 6 |
| `/mindforge:browse` | `browse [--navigate URL] [--command]` | Control persistent browser daemon and sessions | Day 9 |
| `/mindforge:qa` | `qa [--diff] [--all]` | Run systematic visual QA and regression tests | Day 9 |

### Release & maintenance

| Command | Usage | Description | Added |
|---|---|---|---|
| `/mindforge:update` | `update [--apply] [--force] [--check]` | Check for and apply framework updates | Day 7 |
| `/mindforge:migrate` | `migrate [--from vX] [--to vY] [--dry-run]` | Run schema migrations | Day 7 |
| `/mindforge:release` | `release [--tag vX]` | Framework release pipeline (core team) | Day 7 |

### Utility

| Command | Usage | Description | Added |
|---|---|---|---|
| `/mindforge:help` | `help` | Show all available commands and current project status | Day 1 |

## Command interface contract (v1.0.0 stable)

As of v1.0.0, the following are part of the stable interface:
- All 36 command names (new commands require MINOR bump)
- All flags documented here (new flags require MINOR, removed flags require MAJOR)
- HANDOFF.json and AUDIT.jsonl schemas (additions: MINOR, removals: MAJOR)
- All 10 core skill `name:` values and trigger lists
- SDK exported types and functions

See ADR-020 for the complete stability contract.
