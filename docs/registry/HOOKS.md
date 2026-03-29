# MindForge — Hook Registry (v6.2.0-alpha)

This registry catalogs the automation and security lifecycle hooks available in the MindForge environment.

## 🛡️ Framework Governance Hooks

| Hook | Trigger Event | Primary Security Protocol |
| :--- | :--- | :--- |
| **mindforge-session-init_extended** | `Session Start` | "Enterprise-grade context restoration, workspace mounting, and security baseline verification." |
| **mindforge-workflow-guard** | `Command Invocation` | "Enforcement of phase-based logic, mandatory plan approval, and verification gating." |
| **mindforge-prompt-guard** | `Token Input` | "Persona integrity enforcement, safety filtering, and prompt injection prevention." |

## 📊 Operational Visibility & Health

| Hook | Trigger Event | Primary Security Protocol |
| :--- | :--- | :--- |
| **mindforge-statusline** | `Terminal Init / Loop` | "Real-time productivity indicators, token counts, and phase status rendering." |
| **mindforge-check-update** | `Startup / Interval` | "Automatic framework update detection, changelog retrieval, and version sync." |
| **mindforge-context-monitor** | `Context Shift` | "Dynamic token optimization, context window management, and memory prioritizing." |

## 🔗 Version Control & Git Hooks

| Hook | Trigger Event | Primary Security Protocol |
| :--- | :--- | :--- |
| **pre-commit-security** | `git commit` | "Run a `--secrets` scan on staged files before commit." |
| **post-merge-status** | `git merge` | "Re-verify Sovereign framework integrity after code updates." |
| **pre-push-validation** | `git push` | "Validate that all active plans have an 'Approved' status." |

## 🧠 Reasoning & Memory Hooks

| Hook | Trigger Event | Primary Security Protocol |
| :--- | :--- | :--- |
| **nexus-tracer-init** | `Async Start` | "Inject the ZTAI signing protocol into every reasoning cycle." |
| **memory-load-check** | `Session Start` | "Verify the knowledge graph's semantic integrity." |
| **intent-harvest-trigger** | `Idle Threshold` | "Activate the Sovereign Homing engine for idle task-claiming." |

---
*For more details, see the [MIND-FORGE-REFERENCE-V6.md](../MIND-FORGE-REFERENCE-V6.md).*
