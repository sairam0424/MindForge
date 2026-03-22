# MindForge v2.0.0 — Unique Selling Points, Features, and Best Practices (v2.0.0-alpha.6)

This document summarizes what makes MindForge v2.0.0 distinct, what features
are included in the latest alpha release, and how to use them effectively.

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

11. **Persistent Knowledge Graph (v2)**
    - Captures and ranks engineering context (decisions, bug patterns, preferences) across project sessions using TF-IDF and confidence reinforcement.

12. **Real-time Observability Dashboard (v2)**
    - High-fidelity web interface for live audit streams, metrics visualization, and browser-based governance with zero performance overhead.

---

## Feature Set (v1.0.0)

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

### 16. Real-time Dashboard (v2)
**What it does:** Web-based control plane for observing agent waves, costs, and quality metrics in real-time.

**How to use:**
```bash
/mindforge:dashboard --start --open
```
Access at `http://localhost:7339` (Localhost-only for security).

---

### 15. SDK (TypeScript)
**What it does:** Programmatic access to health, audit log, event stream, and commands.

**How to use:**
```ts
import { MindForgeClient } from '@mindforge/sdk';
const client = new MindForgeClient({ projectRoot: '.' });
const report = await client.health();
```

---

## Best Practices for v1.0.0

1. **Always run health after install**
   - `/mindforge:health --repair` fixes drift immediately.

2. **Keep PLAN files lean**
   - Focus on *what*, not *how* (150–400 words).

3. **Use local installs for repos**
   - Local installs are safer and prevent cross‑project drift.

4. **Run migrations explicitly**
   - Don’t rely on auto‑inference when upgrading older state files.

5. **Treat plugins like production dependencies**
   - Validate plugins and prefer pinned versions.

6. **Use the audit log as ground truth**
   - Query `.planning/AUDIT.jsonl` for accountability and traceability.

7. **Gate Tier 3 changes through approvals**
   - CI will block Tier 3 changes without explicit approval.

8. **Keep secrets out of files**
   - Use environment variables only. MindForge enforces this.

---

## Using MindForge for Your Requirements

### If you need strict governance
- Run full workflow (`plan → execute → verify → ship`)
- Enable security scans and approvals

### If you need fast iteration
- Use `/mindforge:quick` for single tasks
- Keep local install with minimal setup

### If you need team scale
- Use milestones, approvals, and `/mindforge:profile-team`
- Enable CI mode for consistent enforcement

---

## Summary
MindForge v1.0.0 combines governance, observability, and execution rigor into a
single workflow engine that works across Claude Code and Antigravity. Its core
value is consistent, repeatable quality in long‑running AI development sessions.
