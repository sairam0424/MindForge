# MindForge — Common Commands Quick Reference

This page is a curated subset for quick lookup, not an exhaustive list. MindForge ships
221 slash commands total — see [docs/commands-reference.md](../commands-reference.md) for
the complete, verified list.

## Commonly used commands

### Lifecycle commands (core workflow)

| Command | Usage | Description | Added |
|---|---|---|---|
| `/mindforge:init-project` | `init-project` | Guided project setup — creates all `.planning/` files | |
| `/mindforge:discuss-phase` | `discuss-phase [N] [--batch|--auto]` | Pre-planning interview to capture implementation decisions | |
| `/mindforge:ui-phase` | `ui-phase [N]` | Generate UI design contract (UI-SPEC.md) | v2.0.0 |
| `/mindforge:plan-phase` | `plan-phase [N]` | Research, decompose, and create atomic task plans | |
| `/mindforge:execute-phase` | `execute-phase [N]` | Wave-based parallel execution of all phase plans | Day 1+2 |
| `/mindforge:ui-review` | `ui-review [N]` | Retroactive 6-pillar visual audit | v2.0.0 |
| `/mindforge:verify-phase` | `verify-phase [N]` | Automated + human acceptance testing pipeline | |
| `/mindforge:validate-phase` | `validate-phase [N]` | Requirement coverage and test gap audit | v2.0.0 |
| `/mindforge:ship` | `ship [N]` | Create PR, write release notes, push to remote | |
| `/mindforge:auto` | `auto [--phase N] [--milestone M]` | Walk-away autonomous execution with stuck detection | |
| `/mindforge:steer` | `steer "instruction"` | Inject guidance into a running autonomous session | |
| `/mindforge:next` | `next` | Auto-detect and execute the correct next workflow step | |
| `/mindforge:cross-review` | `cross-review` | Adversarial multi-model code review and synthesis | |
| `/mindforge:research` | `research "query"` | Deep research using Gemini 1.5 Pro 1M context | |
| `/mindforge:remember` | `remember [--add X|--search Y|--promote ID|--stats]` | Persistent knowledge graph management | |
| `/mindforge:workstreams` | `workstreams [list|create|switch|status|complete]` | Manage parallel feature tracks with isolated state | v2.0.0 |

### Project setup & discovery

| Command | Usage | Description | Added |
|---|---|---|---|
| `/mindforge:map-codebase` | `map-codebase` | Brownfield onboarding: infer stack and seed docs | |
| `/mindforge:do` | `do <text>` | Smart dispatcher for natural language intent | v2.0.0 |
| `/mindforge:note` | `note <text> [list|promote N]` | Zero-friction idea capture and todo promotion | v2.0.0 |
| `/mindforge:quick` | `quick` | Run a small, single-task plan without a full phase | |
| `/mindforge:status` | `status` | Show current phase, plan status, and next action | |
| `/mindforge:health` | `health` | Validate installation. `--repair` is documented but not wired into the CLI backing path — it's silently ignored, byte-identical to plain `health`. | |
| `/mindforge:review` | `review [N]` | Run a structured review pass for a phase | |
| `/mindforge:debug` | `debug [plan-id]` | Debug a failed plan with root-cause workflow | |
| `/mindforge:add-backlog` | `add-backlog <desc>` | Park ideas in 999.x "parking lot" | v2.0.0 |
| `/mindforge:review-backlog` | `review-backlog` | Review and promote backlog items to active phases | v2.0.0 |
| `/mindforge:plant-seed` | `plant-seed <idea>` | Capture speculative ideas with triggers | v2.0.0 |

### Governance & compliance

| Command | Usage | Description | Added |
|---|---|---|---|
| `/mindforge:approve` | `approve [--tier 2|3]` | Process approvals and emergency overrides | |
| `/mindforge:audit` | `audit [--phase N] [--event X] [--since DATE]` | Query `AUDIT.jsonl` history | |
| `/mindforge:security-scan` | `security-scan [--deep] [--secrets] [--deps]` | Security scan with OWASP classification | |
| `/mindforge:milestone` | `milestone [name]` | Create or update milestone definitions | |
| `/mindforge:complete-milestone` | `complete-milestone [name]` | Archive milestone and generate release report | |
| `/mindforge:retrospective` | `retrospective [N]` | Phase retrospective and improvement actions | |

### Skills & plugins

| Command | Usage | Description | Added |
|---|---|---|---|
| `/mindforge:skills` | `skills [list|validate|refresh]` | Manage core/org/project skills | |
| `/mindforge:install-skill` | `install-skill <name> [--version]` | Install skill from registry | |
| `/mindforge:publish-skill` | `publish-skill <path>` | Publish a skill to the registry | |
| `/mindforge:plugins` | `plugins [list|install|uninstall|validate]` | Manage plugin lifecycle | |

### Intelligence & metrics

| Command | Usage | Description | Added |
|---|---|---|---|
| `/mindforge:metrics` | `metrics [--phase N]` | Compute quality and throughput metrics | |
| `/mindforge:profile-team` | `profile-team` | Generate team skill and ownership profile | |
| `/mindforge:benchmark` | `benchmark [--skill X]` | Measure skill effectiveness | |
| `/mindforge:tokens` | `tokens [--phase N] [--session ID] [--window short\|medium\|long] [--optimise]` | Token usage profiling and optimisation (`--profile`/`--summary` don't exist) | |

### Integrations & distribution

| Command | Usage | Description | Added |
|---|---|---|---|
| `/mindforge:init-org` | `init-org` | Org-wide MindForge setup | |
| `/mindforge:sync-jira` | `sync-jira [--project KEY]` | Sync phases and plans to Jira | |
| `/mindforge:sync-confluence` | `sync-confluence [--page ...]` | Publish docs to Confluence | |
| `/mindforge:pr-review` | `pr-review [--range A..B]` | AI PR review with context | |
| `/mindforge:workspace` | `workspace [detect|plan|test]` | Monorepo workspace management | |
| `/mindforge:browse` | `browse [--navigate URL] [--command]` | Control persistent browser daemon and sessions | |
| `/mindforge:qa` | `qa [--diff] [--all]` | Run systematic visual QA and regression tests | |

### Release & maintenance

| Command | Usage | Description | Added |
|---|---|---|---|
| `/mindforge:update` | `update [--apply] [--force] [--check]` | Check for and apply framework updates | |
| `/mindforge:migrate` | `migrate [--from vX] [--to vY] [--dry-run]` | Run schema migrations | |
| `/mindforge:session-report` | `session-report` | Generate post-session summary and resource profiling | v2.0.0 |
| `/mindforge:release` | `release [--tag vX]` | Framework release pipeline (core team) | |

### Utility

| Command | Usage | Description | Added |
|---|---|---|---|
| `/mindforge:help` | `help` | Show all available commands and current project status | |

## Command interface contract

The following are part of the stable interface:
- Existing command names are not renamed without a MAJOR bump; new commands may land in any release
- Documented flags are not removed without a MAJOR bump
- HANDOFF.json and AUDIT.jsonl schemas (additions: MINOR, removals: MAJOR)
- SDK exported types and functions

Note: `.planning/decisions/ADR-020.md` (previously cited here as the stability contract source)
is a content-free placeholder stub as of this writing — treat this page, not that ADR, as the
source of truth for the interface contract until a real ADR replaces it.
