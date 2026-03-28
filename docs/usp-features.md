# MindForge v5.6.0 — Unique Selling Points, Features, and Best Practices (v5.6.0)

This document summarizes what makes MindForge v5.6.0 distinct, what features
are included in the official release, and how to use them effectively.

---

## Unique Selling Points (USPs)

1. **File‑driven governance, not magic**
   - MindForge defines behavior through Markdown and JSON schemas, so teams can
     audit, review, and version everything like normal code.

2. **Wave‑based parallel execution**
   - Plans run in dependency‑ordered “waves,” delivering speed without chaos.

3. **Non‑bypassable compliance gates**
   - Security, secrets, and test gates are enforced by design, not optional.

4. **Session compaction with continuity**
   - When context fills, MindForge writes machine‑readable handoffs that preserve
     state, decisions, and next steps.

5. **Production‑ready installer + updater**
   - Full install/update/uninstall support for both Claude Code and Antigravity,
     plus scoped updates and schema migrations.

6. **Built‑in audit trail**
   - `AUDIT.jsonl` provides a complete, append‑only history of actions and results.

7. **Extensible with plugins and skills**
   - Plugins add commands and skills without changing core files, keeping upgrades safe.

8. **Autonomous “Walk-Away” Execution (v2)**
   - `/mindforge:auto` allows for full phase/milestone completion with intelligent stuck detection and node repair (RETRY → DECOMPOSE → ESCALATE).

9. **Persistent Visual QA (v2)**
   - Headful/headless browser runtime with named session persistence and systematic visual diff verification.

10. **Multi-Model Intelligence Layer (v2)**
    - Dynamic routing between Anthropic, OpenAI, and Gemini based on task persona and security tier. Adversarial code reviews ensure maximum coverage.

11. **Persistent Knowledge Graph (RAG 2.0)**
    - Captures and ranks engineering context (decisions, bug patterns, preferences) with **Automatic Semantic Shadowing** — background pattern retrieval without manual prompts.

12. **Real-time Observability Dashboard (v3)**
    - High-fidelity web interface for live audit streams, metrics visualization, and **Temporal History Scrubbing** with zero performance overhead.

13. **Self-Building Skills Platform (v3)**
    - Automatically capture and score engineering patterns from docs, npm, or session history into high-quality `SKILL.md` files with non-bypassable quality gates.

14. **Context Sharding (v3)**
    - 40% reduction in token waste via **Semantic Relevance Density (SRD)** management of Hot/Warm/Cold context tiers.

15. **Adversarial Decision Synthesis (v3)**
    - Zero architectural drift through Red-Team/Blue-Team debate loops and automated synthesis scoring.

16. **Temporal Vision (v3)**
    - Full-fidelity history navigation, hindsight injection, and automated state repair across the execution wave.

17. **Dynamic Swarm Orchestration (v4)**
    - Parallel "Agentic Mesh" with shared state (`SWARM-STATE.json`) and leader-led synthesis of specialist outcomes.

18. **Zero-Trust Agentic Identity "Beast Mode" (v4.2)**
    - Non-repudiable audit trails signed by unique Decentralized Identifiers (DIDs) for every swarm action. Tier 3 agents use simulated **Secure Enclave (HSM)** signing.

19. **MindForge Sentinel: Binary Runtime Attestation (v5.6)**
    - Cryptographically ensure skill integrity before execution. Every `SKILL.md` is JIT-verified against ZTAI-signed signatures, preventing supply-chain attacks and unauthorized logic injection.

20. **Predictive Agentic Reliability: Reasoning Entropy (v5.5)**
    - Proactively detect and break agentic reasoning loops. Using RES (Reasoning Entropy Scoring), the system interrupts semantic stagnation and injects Steering Vectors to recover lost autonomy.

---

## Feature Set (v2.0.0)

### 1. Installation & Distribution
**What it does:** Production‑grade installer with update, uninstall, and CI support.

**How to use:**
```bash
npx mindforge-cc@latest --claude --global
npx mindforge-cc@latest --claude --local
npx mindforge-cc@latest --antigravity --global
```

---

### 2. Core Workflow Engine
**What it does:** End‑to‑end lifecycle for planning, execution, verification, and shipping.

**How to use:**
```
/mindforge:init-project
/mindforge:plan-phase 1
/mindforge:execute-phase 1
/mindforge:verify-phase 1
/mindforge:ship 1
```

---

### 3. Wave Execution
**What it does:** Runs independent plans in parallel waves based on dependencies.

**How to use:**
- Create a phase plan with dependencies
- Run `/mindforge:execute-phase N`
- MindForge groups tasks into waves automatically

---

### 4. Governance & Compliance Gates
**What it does:** Enforces secret scanning, CRITICAL security findings, tests,
CVE checks, and GDPR retention.

**How to use:**
```
/mindforge:security-scan --deep --secrets --deps
/mindforge:verify-phase 1
```

---

### 5. Intelligence Layer
**What it does:** Health checks, difficulty scoring, anti‑pattern detection,
team profiling, and metrics.

**How to use:**
```
/mindforge:health
/mindforge:metrics
/mindforge:profile-team
```

---

### 6. Skills Platform
**What it does:** Loads skill packs on keyword triggers (Core/Org/Project tiers).

**How to use:**
```
/mindforge:skills list
/mindforge:skills validate
```

---

### 7. Plugin System
**What it does:** Extends MindForge with new commands, skills, personas, and hooks.

**How to use:**
```
/mindforge:plugins list
/mindforge:plugins install mindforge-plugin-<name>
/mindforge:plugins validate
```

---

### 8. Migration Engine
**What it does:** Safely upgrades `.planning/` schemas across versions with backups.

**How to use:**
```
/mindforge:migrate --from v0.6.0 --to v1.0.0
```

---

### 9. Self‑Update System
**What it does:** Checks for updates, shows changelog diff, applies updates while
preserving scope (local vs global).

**How to use:**
```
/mindforge:update
/mindforge:update --apply
```

---

### 11. Autonomous Execution (v2)
**What it does:** Enables handoff-free execution of complex phases and milestones.

**How to use:**
```bash
/mindforge:auto --phase 1
/mindforge:steer "Focus on security hardening next"
```

---

### 12. Browser Runtime & Visual QA (v2)
**What it does:** Playwright-powered browser control with session persistence and automated UI bug detection.

**How to use:**
```bash
/mindforge:browse --navigate https://example.com
/mindforge:qa --diff
```

---

### 13. Multi-Model Intelligence (v2)
**What it does:** Unified API client for Anthropic, OpenAI, and Gemini with persona-based routing and automated cost tracking.

**How to use:**
```bash
/mindforge:cross-review # Adversarial multi-model review
/mindforge:research "Deep search query" # 1M context research
/mindforge:costs # Usage and budget summary
```

---

### 14. Persistent Knowledge Graph (v2)
**What it does:** Long-term memory system that ensures architectural decisions and bug patterns are never forgotten. Supports TF-IDF search, confidence scoring, and global promotion.

**How to use:**
```bash
/mindforge:remember --add "insight" # Manual capture
/mindforge:remember --search "query" # Manual retrieval
/mindforge:remember --promote [ID] # Promote to machine-wide global store
/mindforge:remember --stats # View memory health
```

---

### 18. Adversarial Decision Synthesis (v3)
**What it does:** Ensures architectural integrity by debating every major decision through competing model personas.

**How to use:**
```bash
/mindforge:cross-review --ads # Triggers heavy synthesis mode
```

---

### 19. Temporal Vision & Hindsight (v3)
**What it does:** Provides the "Temporal Slider" for the Dashboard and the `hindsight-injector` for automated state repair.

**How to use:**
```bash
/mindforge:temporal status
/mindforge:temporal inject [AUDIT_ID]
```

---

### 20. Context Sharding Manager (v3)
**What it does:** Dramatically improves session longevity by sharding context based on sematic relevance.

**How to use:**
```bash
/mindforge:memory shard
/mindforge:memory status --srd
```

---

### 21. Dynamic Swarm Mesh (v4)
**What it does:** Orchestrates parallel specialist clusters (e.g., Security, UI, Data) with automated state coordination.

**How to use:**
```bash
/mindforge:swarm spawn --template [NAME]
/mindforge:swarm status --mesh
```

---

### 22. ZTAI Governance & Beast Mode (v4.2)
**What it does:** Enforces cryptographic signing and trust-tier validation for all autonomous agent actions. Tier 3 agents utilize simulated Secure Enclaves for principal-level non-repudiation.

**How to use:**
```bash
/mindforge:identity verify [AGENT_ID]
/mindforge:identity sign --did
/mindforge:identity audit --manifest # Generates Merkle-root integrity proof
```

---

### 23. Global Intelligence Mesh (v4.2)
**What it does:** Synchronizes local repo memory with a global organizational store. Includes Ghost Pattern Detection to flag architectural anti-patterns from past failures.

**How to use:**
```bash
/mindforge:memory sync --global
/mindforge:memory status --mesh
/mindforge:plan-phase --detect-ghosts # Automated during planning
```
---

### 24. Autonomous FinOps Hub (v4.3)
**What it does:** Enterprise-grade economics engine that treats compute as a first-class resource. The `ModelBroker` utilizes a **Confidence-to-Cost (C2C)** engine to dynamically route tasks based on complexity and trust tier.

**How to use:**
```bash
/mindforge:finops status # View consumption and budget profile
/mindforge:costs --roi # Detailed Agentic ROI analysis
/mindforge:finops budget 500 # Set project-level budget ($500)
```

---

### 26. Sentinel Execution Center (v5.6)
**What it does:** Centralizes security and reliability policy monitoring. Enforces JIT attestation and reasoning entropy guardrails across the agentic mesh.

**How to use:**
- Automated: Every skill load and reasoning step is monitored by the Sentinel layer.
- Manual: `mindforge-cc sign <skill-name>` to authorize a new skill for production use.

---

## Best Practices for v5.6.0

1. **Sign Your Skills**: In Enterprise mode, unsigned skills are blocked. Always run the `sign` command before deploying new logic.
2. **Monitor RES Heatmaps**: Use the Dashboard to identify which specialists are prone to circular reasoning and refine their `IDENTITY.md` accordingly.
3. **Always run health after install**: `/mindforge:health --repair` fixes drift immediately.

---

## Summary
MindForge v5.6.0 "Sentinel Execution" combines governance, observability, and autonomous execution rigor with **Zero-Trust Skill Integrity** and **Predictive Reliability**. Its core value is providing a non-repudiable, cost-optimized, and resilient AI development engine for the most demanding software projects.
