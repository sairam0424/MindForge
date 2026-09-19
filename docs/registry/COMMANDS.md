# MindForge — Command Registry (v11.9.5)

> **This is a curated subset, not the exhaustive list of all 221 commands.** For the complete,
> verified reference, see [docs/commands-reference.md](../commands-reference.md). Entries below
> were checked against the live `.claude/commands/mindforge/` directory; any command previously
> listed here with no backing file has been removed (see "not implemented" note at the bottom).

This registry catalogs a curated subset of the strategic, operational, and governance commands
available in the MindForge ecosystem.

## 🛡️ Strategic & Governance Commands

| Command | Description | Invocation | Outcome Goal |
| :--- | :--- | :--- | :--- |
| `/mindforge:status` | Real-time project status snapshot. | `/mindforge:status` | Verified project state. |
| `/mindforge:security-scan` | OWASP Top 10 + dependency/secret audit. | `/mindforge:security-scan` | Hardened codebase. |
| `/mindforge:health` | Diagnostic of framework/installation integrity. | `/mindforge:health` | Health report, `--repair` fixes what it can. |
| `/mindforge:approve` | Governance sign-off for gated changes. | `/mindforge:approve` | Unlocked high-risk commits. |
| `/mindforge:audit` | Query the AUDIT.jsonl hash-chained log. | `/mindforge:audit` | Traceability and audit trail. |
| `/mindforge:tokens` | Token consumption and cost profiling. | `/mindforge:tokens` | Cost-usage visibility. |
| `/mindforge:metrics` | Velocity and quality metric aggregation. | `/mindforge:metrics` | Performance trends and KPIs. |

## 📐 Project & Lifecycle Management

| Command | Description | Invocation | Outcome Goal |
| :--- | :--- | :--- | :--- |
| `/mindforge:init-project` | Initialize a new project with the framework. | `/mindforge:init-project` | Initialized workspace. |
| `/mindforge:init-org` | Set up organization-level policy standards. | `/mindforge:init-org` | Standardized org config. |
| `/mindforge:milestone` | Define and track high-level milestones. | `/mindforge:milestone` | Recorded project roadmap. |
| `/mindforge:discuss-phase` | Adaptive requirement gathering and discovery. | `/mindforge:discuss-phase` | Approved PLAN.md. |
| `/mindforge:plan-phase` | Execution plan generation. | `/mindforge:plan-phase` | Atomic task blueprint. |
| `/mindforge:system-design` | Domain modeling and system design orchestration. | `/mindforge:system-design` | Architecture design doc. |
| `/mindforge:next` | Auto-detect and route the next logical action. | `/mindforge:next` | Zero-friction dev workflow. |
| `/mindforge:retro` | Performance-driven milestone retrospective. | `/mindforge:retro` | Identified growth areas. |
| `/mindforge:complete-milestone` | Milestone archival and next cycle preparation. | `/mindforge:complete-milestone` | Clean project state for next. |

## 🚀 Execution & Implementation

| Command | Description | Invocation | Outcome Goal |
| :--- | :--- | :--- | :--- |
| `/mindforge:execute-phase` | Wave-based parallel implementation. | `/mindforge:execute-phase` | Completed feature phase. |
| `/mindforge:auto` | Autonomous execution mode (walk-away). | `/mindforge:auto` | Unattended bulk task completion. |
| `/mindforge:do` | Natural-language intent dispatching. | `/mindforge:do "[intent]"` | Smart task routing. |
| `/mindforge:steer` | Mid-execution instruction for a running autonomous session. | `/mindforge:steer "[guide]"` | Redirected autonomous engine. |
| `/mindforge:quick` | Atomic task execution with validation. | `/mindforge:quick` | Fast, safe bugfixes and tweaks. |
| `/mindforge:tdd` | Red-Green-Refactor development loop. | `/mindforge:tdd` | Tested implementation. |
| `/mindforge:debug` | RCA investigation and systematic repair. | `/mindforge:debug` | Resolved root-cause defects. |
| `/mindforge:workstreams` | Parallel feature track isolation and management. | `/mindforge:workstreams` | Isolated, concurrent development. |

## ✅ Verification & Quality

| Command | Description | Invocation | Outcome Goal |
| :--- | :--- | :--- | :--- |
| `/mindforge:verify-phase` | Human acceptance testing for a completed phase. | `/mindforge:verify-phase` | UAT sign-off. |
| `/mindforge:verify-loop` | Automated gate pipeline (build/lint/test/audit). | `/mindforge:verify-loop` | Pass/fail per-stage report. |
| `/mindforge:validate-phase` | Requirement-coverage gap analysis. | `/mindforge:validate-phase` | Quality-certified phase. |
| `/mindforge:pr-review` | AI-driven pull request review engine. | `/mindforge:pr-review` | Approved code and PR summary. |
| `/mindforge:ui-review` | Retroactive visual audit against DESIGN_SYSTEM.md. | `/mindforge:ui-review` | Visual/accessibility findings. |
| `/mindforge:benchmark` | Measure skill and agent effectiveness over time. | `/mindforge:benchmark` | Effectiveness trend report. |

## 🧠 Knowledge & AI Intelligence

| Command | Description | Invocation | Outcome Goal |
| :--- | :--- | :--- | :--- |
| `/mindforge:learn` | Convert raw knowledge into a SKILL.md. | `/mindforge:learn` | New framework capability. |
| `/mindforge:remember` | Manage the long-term knowledge graph. | `/mindforge:remember` | Evolving framework knowledge base. |
| `/mindforge:research` | Deep research using a large context window. | `/mindforge:research` | Comprehensive context reports. |

Time-travel/rollback of `.planning/` state is reachable via the `mindforge temporal <status|cleanup|inject>`
**CLI subcommand** (not a slash command) — see `node bin/mindforge-cli.js temporal --help`.

## 📦 Skill & Asset Management

| Command | Description | Invocation | Outcome Goal |
| :--- | :--- | :--- | :--- |
| `/mindforge:install-skill` | Install a skill to the designated tier. | `/mindforge:install-skill` | Deployed capability. |
| `/mindforge:publish-skill` | Publish a skill to the npm/private registry. | `/mindforge:publish-skill` | Published skill package. |
| `/mindforge:create-skill` | Author a new skill from a template. | `/mindforge:create-skill` | New SKILL.md scaffold. |
| `/mindforge:marketplace` | Discover and install community skills. | `/mindforge:marketplace` | Ecosystem expansion. |
| `/mindforge:plugins` | Manage and audit installed framework plugins. | `/mindforge:plugins` | Plugin inventory/validation. |

Direct persona invocation is via `node bin/mindforge-cli.js spawn <persona>` — the project's own
root `CLAUDE.md` documents this CLI verb as **a v1.0 stub**; use `/mindforge:agent <persona>` for
the real, working equivalent (loads a persona as an in-session role overlay).

---
*For the complete, verified command list, see [docs/commands-reference.md](../commands-reference.md).*
