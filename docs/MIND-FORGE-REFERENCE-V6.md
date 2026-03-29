# MindForge v6.2.0-alpha — Comprehensive Reference Guide

This is the definitive "Beast Mode" manual for the MindForge ecosystem. It details every command, persona, skill, workflow, and automation hook available in the v6.2.0-alpha distribution.

---

## 🛠 Chapter 1: Command Suite (64+ Core Commands)
Commands can be invoked directly via the Agent or via the `node bin/mindforge-cli.js` router.

### 🛡️ Strategic & Governance Commands
| Command | Description | Invocation | How to Test |
| :--- | :--- | :--- | :--- |
| `/mindforge:security-scan` | OWASP Top 10 + Sovereign Integrity check. | `/mindforge:security-scan [path] --deep` | Create a test file with an API key and run the scan. |
| `/mindforge:status` | Real-time project and Sovereign engine health. | `/mindforge:status` | Verify the status reports "Sovereign: Manifested". |
| `/mindforge:approve` | Generate cryptographic signature for Tier 3 gates. | `/mindforge:approve` | Run on a change with >95 impact score. |
| `/mindforge:audit` | Query historical reasoning and compliance logs. | `/mindforge:audit --phase 1` | Check `AUDIT.jsonl` for the output. |
| `/mindforge:health` | 7-pillar diagnostic of framework integrity. | `/mindforge:health` | Verify all modules report as "HEALTHY". |
| `/mindforge:tokens` | Analyze model usage costs and efficiency. | `/mindforge:tokens --report` | Check for the ROI calculation in the output. |

### 🚀 Operational & Execution Commands
| Command | Description | Invocation | How to Test |
| :--- | :--- | :--- | :--- |
| `/mindforge:auto` | Autonomous execution engine (Wave mode). | `/mindforge:auto` | Run on a planned phase with 3+ independent tasks. |
| `/mindforge:steer` | Inject mid-execution guidance into the swarm. | `/mindforge:steer [instruction]` | Use during a long-running `/mindforge:auto` session. |
| `/mindforge:headless` | Run MindForge in background/daemon mode. | `/mindforge:headless` | Check `bin/autonomous/headless.js` pid. |
| `/mindforge:ship` | Multi-adapter release and PR pipeline. | `/mindforge:ship` | Run after a phase is verified (UAT pass). |

---

## 👤 Chapter 2: Specialized Personas (25+ Essence Profiles)
Personas are located in `.mindforge/personas/` and are loaded via the `mf-identity` protocol.

### 🧠 Core Reason Enclaves
- **mf-planner**: Strategic architect. Focuses on minimal complexity and high-fidelity roadmapping.
- **mf-executor**: Implementation pilot. Expert in "Beast Mode" styling and robust logic.
- **mf-reviewer**: Quality auditor. Enforces OWASP, performance, and clean code standards.
- **security-reviewer**: Focused on PQAS integrity and threat modeling.
- **debug-specialist**: RCA (Root Cause Analysis) expert with persistent state tracking.

**Invocation**: `node bin/spawn-agent.js identity [persona-name]`
**Testing**: Load a persona and ask for its "Primary Directive" to verify identity lock.

---

## 📚 Chapter 3: SkillStacks (10+ Subject Matter Skills)
Skills are located in `.mindforge/skills/` and provide specialized domain knowledge.

- **agency-senior-developer**: Expert implementation of modern web stacks.
- **agency-software-architect**: System design and architectural patterns.
- **agency-security-engineer**: Threat detection and post-quantum hardening.
- **agency-ai-engineer**: ML model optimization and agentic steering.
- **agency-ux-architect**: Fluid animations and premium interface design.

**Invocation**: Automatic via the Neural Orchestrator when relevant tasks are detected.
**Testing**: Ask for a specific domain task (e.g., "Review this SQL for injection") and verify the correct skill triggers.

---

## 🔄 Chapter 4: Logic Workflows (50+ Interaction Flows)
Workflows are located in `.agent/workflows/` and define multi-step reasoning patterns.

- **mindforge:discuss-phase**: Requirement gathering -> Assumption analysis -> Planning.
- **mindforge:execute-phase**: Plan reading -> Wave parallelization -> Self-healing.
- **mindforge:verify-work**: UAT criteria -> Browser testing -> Evidence capture.
- **mindforge:ship**: PR creation -> Documentation update -> Version bump.

**Invocation**: Triggered by slash commands or phase transitions.
**Testing**: Run `/mindforge:next` and verify the agent follows the correct workflow state.

---

## 🔗 Chapter 5: Automation Hooks (6+ Lifecycle Guards)
Hooks are located in `.agent/hooks/` and enforce framework integrity.

- **mindforge-prompt-guard**: Prevents prompt injection and jailbreak attempts.
- **mindforge-workflow-guard**: Ensures commands are only run in the correct phase state.
- **mindforge-statusline**: Provides real-time status telemetry to the terminal.
- **pre-commit-security**: Runs a `--secrets` scan before every git commit.

**Testing**: Try to commit a file with a dummy API key (should be blocked).

---

## ✨ Chapter 6: Sovereign Intelligence Matrix (v6.2.0-alpha)
The peak of MindForge architectural pillars (IX-XII).

### 🛡️ Post-Quantum Agentic Security (PQAS)
- **Quantum-Crypto**: Core engine for lattice-based verification.
- **Test**: `node bin/governance/quantum-crypto.js --verify .mindforge/engine/`.

### 🏠 Proactive Semantic Homing
- **Intent-Harvester**: Proactive idle-task claiming engine.
- **Test**: `node bin/autonomous/intent-harvester.js --status`.

---
*MindForge v6.2.0-alpha "Beast Mode" — Absolute Sovereignty. Absolute Performance.*
