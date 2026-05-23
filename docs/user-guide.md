# MindForge User Guide (v10.0.0)

This guide gets you from install to productive, with the minimum needed to run MindForge in a real project.

## Prerequisites

- **Node.js 18+** (LTS recommended)
- No native build tools or compilation toolchain required (sql.js uses pure WASM)

## 1. Install

### Claude Code (global)

```bash
npx mindforge-cc --claude --global
```

### Claude Code (local, per project)

```bash
npx mindforge-cc --claude --local
```

### Antigravity

```bash
npx mindforge-cc --antigravity --local
```

### Specific Runtime (Universal)

```bash
npx mindforge-cc --runtime <name>
```

### Post-Install: The `mindforge` CLI

After installation, the `mindforge` binary is available for runtime commands:

```bash
mindforge health          # Verify project integrity
mindforge security-scan   # Run security checks
mindforge headless        # Run agent in non-interactive mode
mindforge --verbose ...   # Enable verbose output for debugging
```

Use `--verbose` (or `-v`) on any command for detailed diagnostic output.

---

## 2. Verify Installation

Open your agentic runtime (Claude Code, Antigravity, etc.) in your project directory and run:

```bash
/mindforge:health
```

If health reports issues, run:

```bash
/mindforge:health --repair
```

## 3. Initialize a New Project

```bash
/mindforge:init-project
```

This scaffolds the core framework in `.agent/` and creates project-specific planning artifacts in `.planning/`.

## 4. Onboarding an Existing Codebase

```bash
/mindforge:map-codebase
```

This analyzes your code, generating `.planning/ARCHITECTURE.md` and inferred development conventions.

---

## 5. Unified Workflow (Enabled by Protocol Mesh)

MindForge uses a unified 4-pillar workflow, hardened by the **Neural Protocol Mesh**. Every core command automatically activates **Protocol Step 0** for maximum tactical rigor.

```bash
/mindforge:plan-phase [N]     # discuss → research → plan (Step 0: brainstorming)
/mindforge:execute-phase [N]  # parallel execution of task plans (Step 0: swarm-execution)
/mindforge:verify-phase [N]   # UAT + automated validation (Step 0: verify-work)
/mindforge:ship [N]           # generate changelog + create PR (Step 0: ship)
```

---

## 6. High-Performance Personas

MindForge features 46+ specialized personas. Each persona is optimized for a specific stage of the lifecycle.

- **Neural Orchestrator**: Activates and manages the advanced protocol layer.
- **Brainstormer**: Expert in deep requirements discovery and behavioral ideation.
- **Swarm Pilot**: Orchestrates multiple independent implementation tasks.
- **TDD Master**: Enforces strict Test-Driven Development loops with adversarial rigor.

To switch personas or see the full list:

```bash
/mindforge:personas --list
```

---

## 7. Autonomous Execution

For complex tasks that require minimal intervention:

```bash
/mindforge:autonomous --phase [N]
```

Use the **Steer** command to guide logic without stopping execution:

```bash
/mindforge:steer "Prioritize the React component refactoring"
```

---

## 8. Real-time Dashboard

Observe your agent waves, token spend, and milestone progress in real-time.

```bash
/mindforge:dashboard --start --open
```

The dashboard provides a premium web interface at `http://localhost:7339`.

> **Authentication (v10.0.0+):** The dashboard now requires a bearer token for access. The token is printed to the console at startup. Pass it in the `Authorization` header or use the login prompt in the browser UI.

---

## 9. Persistent Knowledge & Memory

MindForge captures architectural decisions and bug patterns across sessions.

```bash
/mindforge:note "Add to memory: Always use functional components for UI"
/mindforge:remember --search "auth patterns"
```

---

## 10. Self-Building Skills & Protocol Creation

Extend MindForge by learning from documentation or authoring custom protocols.

```bash
/mindforge:learn https://docs.nextjs.org "nextjs-mastery"
/mindforge:skill-creation # Author a new high-fidelity protocol
```

---

## 11. Git & PR Integration

MindForge features automated PR creation and commit management.

```bash
/mindforge:pr-branch "feature/auth-refactor"
/mindforge:ship --auto-pr
```

---

## 12. Enterprise Resilience & Governance

MindForge provides mission-critical resilience and sovereign reasoning for enterprise engineering.

### Multi-Cloud Arbitrage
MindForge automatically hedges against provider outages and optimizes for cost/latency.
```bash
/mindforge:settings --cloud-arbitrage on
```

### Sovereign Reason Enclaves (SRE)
Tier 3 (Principal) agents execute reasoning in isolated enclaves to protect sensitive IP.
```bash
/mindforge:agent --tier 3 # Automatically triggers SRE
```

### Dynamic Human-Agent Handover & Temporal Steering (Pillar VII)
NEXUS enables sub-second state reconstruction and **Hindsight Injection**. When an agent drifts, roll back its logic via the Dashboard's **Temporal Slider** and inject a steering vector to re-orient the wave.
```bash
/mindforge:temporal status     # View active reasoning snapshots
/mindforge:temporal inject [ID] # Manual CLI-based hindsight
```

### Agentic Revenue Operations (AgRevOps) (Pillar VIII)
Treat compute as a financial asset. Monitor ROI ($100/hr value mapping) and Security Health directly.
```bash
/mindforge:costs --roi         # Detailed financial analysis
/mindforge:finops status       # View velocity and debt metrics
```

---

## 13. Neural Protocol Mesh (Enterprise Expansion)

The **Enterprise Expansion** introduces 14 hardened protocols from the Superpowers framework, integrated into the core MindForge engine.

- **Brainstorming**: Deep ideation before planning.
- **Parallel Mesh**: Orchestrates context across multiple agents.
- **Swarm Execution**: Parallel implementation for high-velocity waves.
- **Isolated Workspaces**: Environment protection via git worktrees.
- **Enhanced TDD/Debug**: Strict loops for zero-defect delivery.

Activate the mesh for any session:
```bash
/mindforge:neural-orchestrator
```

---

## 14. Update & Maintenance

Keep your framework current with the latest personas and library updates:

```bash
/mindforge:update --apply
```

---

---

## 16. Mastering the Nexus: Temporal Steering

MindForge allows you to "time-travel" through your agent's reasoning.

1.  **Launch the Dashboard**: `/mindforge:dashboard --start --open`
2.  **Navigate to 'Temporal'**: Use the horizontal slider to scrub through reasoning snapshots.
3.  **Inspect State**: View the exact memory, file diffs, and thought chain at that point in space-time.
4.  **Inject Hindsight**: If you see a logic error, use the **Hindsight Injector** form to roll back and provide a corrective "Steering Vector."

## 17. AgRevOps: Financial Health & ROI

Monitor your project's economic performance in real-time via the **RevOps Hub**.

- **ROI Pulse**: Tracks net value (Dev hours saved vs. Token cost).
- **Velocity Gauge**: Real-time forecasting of milestone completion dates.
- **Security Health Score (SHS)**: A 0-100 score that penalizes policy bypasses and critical findings. Maintain a score > 80 to ensure autonomous stability.

---

## 18. Reference & Support

- **Architecture**: `docs/architecture/V5-ENTERPRISE.md`
- **Governance**: `docs/governance-guide.md`
- **Dashboard**: `docs/feature-dashboard.md`
- **USP & Roadmap**: `docs/usp-features.md`
- **Commands**: `docs/commands-reference.md`
- **Troubleshooting**: `docs/troubleshooting.md`
- **Discord**: `/mindforge:join-discord`
