# MindForge v2.0.0-alpha.10: In-Depth Testing Guide (Antigravity)

This document provides a step-by-step rigorous testing flow to validate the entire MindForge framework from a blank project state. It is designed to be shared and logged for architectural review.

## 🏁 Phase 0: Isolated Setup
1. Create a new empty directory (e.g., `Mind-Forge-Test`): `mkdir Mind-Forge-Test && cd Mind-Forge-Test`
2. **Linked Alpha Testing** (Simulated Live Publish):
   - Use the **Absolute Binary Path** to bypass shell PATH configuration issues:
     ```bash
     /Users/sairamugge/.vite-plus/js_runtime/node/24.14.0/bin/mindforge-cc --antigravity --local
     ```
   - *Confirmation*: Run the command with `--version`. It must show `v2.0.0-alpha.10`.
3. Verify the local binary exists: `ls agents/bin/install.js` (or `.agent/bin/install.js` if legacy)

## 🏗 Phase 1: Registry & Integrity
**Objective**: Verify that MindForge correctly registers the project and mirrors commands.

**Command**:
```bash
./mindforge:init-project
```

**Post-Init Verification**:
- Check `.claude/commands/mindforge/` and `.agent/commands/mindforge/`. They should be identical.
- Verify the project is in the global registry (optional):
  ```bash
  cat ~/.mindforge/registry.json
  ```
**Prompt to Agent**:
> "Initialize this project for me. I am building a simple 'Weather Proxy API' in Node.js. Please set up the `.planning/` directory and registry."

**Success Criteria**:
- `.planning/PROJECT.md` is created with the Weather Proxy brief.
- `.mindforge/` metadata directory is populated.

## 📝 Phase 2: Workflow & Planning
**Objective**: Test the planning engine and dependency mapping.

**Prompt to Agent**:
> "I need a plan to implement the weather service. Phase 1 should handle the API structure, Phase 2 should handle the weather fetching logic, and Phase 3 should add caching. Generate a detailed plan for Phase 1."

**Command**:
```bash
/mindforge:plan-phase 1
```

**Success Criteria**:
- `.planning/phases/phase-1/PLAN.md` is generated.
- Plan status is set to `[ ]` in `task.md`.

## 🤖 Phase 3: Autonomous Execution (The "Walk-Away" Test)
**Objective**: Test the `/mindforge:auto` engine and state management.

**Command**:
```bash
/mindforge:auto --phase 1
```

**Success Criteria**:
- MindForge iterates through tasks without human intervention.
- Code is written to the project (e.g., `index.js`, `routes/`).
- `.planning/AUDIT.jsonl` is logging every execution step.

## 📊 Phase 4: Observability (Dashboard)
**Objective**: Test the Real-time Dashboard and SSE Bridge.

**Command**:
```bash
/mindforge:dashboard --start --open
```

**Testing Steps**:
1. Keep the dashboard open at `http://localhost:7339`.
2. Run another command (e.g., `/mindforge:health`).
3. Verify that the "Activity Feed" in the browser updates instantly.
4. Check the "Metrics" tab for token spend data.

## 🧠 Phase 5: Persistent Memory
**Objective**: Test the Knowledge Graph retrieval.

**Command**:
```bash
/mindforge:remember --search "api structure"
```

**Success Criteria**:
- MindForge returns findings from the earlier `/mindforge:init-project` or `/mindforge:plan-phase` steps.

## ⚔️ Phase 6: Multi-Model Hardening
**Objective**: Test the adversarial cross-review system.

**Command**:
```bash
/mindforge:cross-review
```

**Success Criteria**:
- MindForge invokes secondary models (GPT/Gemini) to critique the code generated in Phase 3.
- Review results are logged in `review_results.md`.

## 🚢 Phase 7: Verification & Shipping
**Objective**: Test the quality gates and release automation.

**Commands**:
```bash
/mindforge:verify-phase 1
/mindforge:ship 1
```

**Success Criteria**:
- `CHANGELOG.md` is updated.
- A PR-ready diff is generated.

---

## 🛡 Phase 8: Framework Conflict Check
**Objective**: Ensure MindForge is isolated from other frameworks.

1. **Port Check**: Verify the dashboard is on `7339` and not conflicting with common framework ports (e.g., 8000, 8080).
2. **Directory Check**: Ensure no other framework is writing to `.planning/` or `.mindforge/`.
3. **Process Check**: Run `ps aux | grep mindforge` to ensure only one instance of the SSE bridge is active.

## 📂 Logging for Review
All Antigravity sessions are logged. To share your results for review, zip and send:
- `.planning/AUDIT.jsonl` (Full execution history)
- `CHANGELOG.md` (Outcome summary)
## 💡 Troubleshooting
- **Command not found**: Ensure you are using `./mindforge:command` or `/mindforge:command` within the agent.
- **Wrong Version**: Run `/mindforge:health` and check for "v2.0.0-alpha.10". If it shows "v1.0.5", your installation failed or you are using the global `npx` version.
- **Registry Error**: Check `~/.mindforge/registry.json` exists; it is now automatically created by the v2 installer.
