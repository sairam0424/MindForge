# MindForge Engine — Swarm Controller

## Purpose

Determine when a task requires a "Swarm Cluster" instead of a single persona, and select the optimal cluster configuration.

## Trigger Logic

### 1. Complexity Threshold

- Evaluate the task's complexity via `difficulty-scorer.md`.
- **Trigger Swarm** if `compositeScore >= MINDFORGE.AUTO_SWARM_THRESHOLD` (default 7.0).

### 2. Multi-Disciplinary Detection

- Analyze the `files` and `taskName` for cross-stack markers:
  - `UI + API` → **FullStackSwarm**
  - `Auth + Database` → **SecuritySwarm**
  - `Performance + Infrastructure` → **OptimizationSwarm**

### 3. Impact Analysis

- **Trigger Swarm** for any task touching:
  - `.mindforge/governance/`
  - `src/auth/`
  - `src/payments/`
  - Core infrastructure config (`docker-compose.yml`, `ci.yml`).

## Cluster Selection

Once a swarm is triggered, select a template from `swarm-templates.json`:

| Task Category | Template | Core Personas |
| :--- | :--- | :--- |
| UI / Styling | `UISwarm` | `ui-auditor` (leader), `developer`, `accessibility` |
| API / Logic | `BackendSwarm` | `architect` (leader), `developer`, `security-reviewer` |
| Security | `SecuritySwarm` | `security-reviewer` (leader), `architect`, `developer` |
| Database | `MigrationSwarm` | `architect` (leader), `database-patterns`, `developer` |
| Optimization | `PerfSwarm` | `performance` (leader), `analyst`, `developer` |

## Swarm Initialization Protocol

1. **Nexus Trace:** Call `NexusTracer.startSpan('swarm_cluster_[Template]')`.
2. **Select Leader:** The designated leader persona is responsible for the final `SUMMARY` write.
3. **Generate Micro-Personas:** Call `persona-factory.md` for each member of the cluster.
4. **Establish Shared State:** Initialize `.planning/phases/[N]/SWARM-STATE-[M].json` for inter-agent communication.
5. **Nexus ART:** Record reasoning traces for each agent as they join the mesh.
6. **Context Injection:** Inject the base context + swarm-specific documentation (from Context7) into all agents.
7. **Enforce Trust Tier:** Validate that all agents in the cluster have the required `trust_tier` (ZTAI) for the task.

## Decision Gates & Governance

- **Decision Gate Mode:** If template `decision_gate === "hitl"`, the swarm leader MUST request user approval for Tier 3 actions.
- **Resource Management:** FinOps Hub monitors the `resource_budget`. If a `high` budget swarm exceeds 50% without a SUMMARY, alert the user.
- **Audit Signing:** All swarm actions are cryptographically signed with the agent's DID (see ZTAI protocol).
- **Consolidation:** The Swarm Leader must consolidate all member findings into the unified summary.
- **Emergency Halt:** If any member finds a **CRITICAL** issue (e.g., security vulnerability), the entire swarm must halt and report.
