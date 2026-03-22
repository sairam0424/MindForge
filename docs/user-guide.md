# MindForge User Guide (v2.0.0-alpha.7)

This guide gets you from install to productive, with the minimum needed to run
MindForge in a real project. It assumes Node.js 18+.

## 1. Install

### Claude Code (global)
```bash
npx mindforge-cc@latest --claude --global
```

### Claude Code (local, per project)
```bash
npx mindforge-cc@latest --claude --local
```

Optional utilities:
```bash
npx mindforge-cc@latest --claude --local --with-utils
```

Minimal scaffolding:
```bash
npx mindforge-cc@latest --claude --local --minimal
```

### Antigravity
```bash
npx mindforge-cc@latest --antigravity --global
# or
npx mindforge-cc@latest --antigravity --local
```

### Both runtimes
```bash
npx mindforge-cc@latest --all --global
```

## 2. Verify installation
Open Claude Code or Antigravity in your project directory and run:
```
/mindforge:health
```

If health reports issues, run:
```
/mindforge:health --repair
```

## 3. Initialize a new project
```
/mindforge:init-project
```
This creates the core planning artifacts in `.planning/`.

## 4. Brownfield onboarding (existing codebase)
```
/mindforge:map-codebase
```
This generates `.planning/ARCHITECTURE.md` and an inferred conventions file.

## 5. Standard workflow
```
/mindforge:plan-phase 1
/mindforge:execute-phase 1
/mindforge:verify-phase 1
/mindforge:ship 1
```

## 6. Autonomous Execution (v2)
For complex phases that require no human intervention, use the autonomous engine.

### Start autonomous phase
```bash
/mindforge:auto --phase 1
```

### Steering mid-execution
If you need to guide the agent while it is running in another terminal:
```bash
/mindforge:steer "Focus on bug fixes in the auth module"
```

---

## 7. Browser Runtime & Visual QA (v2)
MindForge can now control a persistent browser for visual verification and QA.

### Navigate and interact
```bash
/mindforge:browse --navigate https://example.com
/mindforge:browse --click "#login-btn"
```

### Run visual QA
To scan for UI bugs and generate regression tests:
```bash
/mindforge:qa --diff
```

---

## 8. Multi-Model Intelligence (v2)
MindForge v2 can route tasks between Claude, GPT, and Gemini for the best balance of context, cost, and quality.

### Cross-Model Review
To get an adversarial review from multiple high-tier models:
```bash
/mindforge:cross-review
```
This will aggregate findings, detect consensus, and generate a `CROSS-REVIEW-[N].md` report.

### Deep Research
To leverage Gemini 1.5 Pro's huge context window for codebase-wide research:
```bash
/mindforge:research "How does the governance layer handle emergency overrides?"
```

### Cost Tracking
Monitor your daily spend and model-specific usage:
```bash
/mindforge:costs --summary
```
MindForge will block further calls if `MODEL_COST_HARD_LIMIT_USD` is reached.

---

## 9. Persistent Knowledge Graph (v2)
MindForge now has long-term memory. It captures architectural decisions, bug patterns, and team preferences, making them available across project sessions.

### Manual Memory entry
To explicitly record a project-wide preference:
```bash
/mindforge:remember --add "preference: Use direct imports for internal modules" --tags "#nodejs"
```

### Search and retrieval
To find related knowledge manually:
```bash
/mindforge:remember --search "Tailwind best practices"
```

### Global Promotion
To make a specific project insight available across ALL your MindForge projects on this machine:
```bash
/mindforge:remember --promote [ENTRY_ID]
```

### Automatic Loading
Relevant memories are automatically loaded at the start of every session, providing context about past decisions and patterns.

---

## 10. Real-time Dashboard (v2)
MindForge provides a premium web-based dashboard for real-time observability of your agent waves, metrics, and team activity.

### Start the Dashboard
```bash
/mindforge:dashboard --start --open
```
This will start the Express-based SSE bridge and open `http://localhost:7339` in your default browser.

### Features
- **Live Activity**: Real-time stream of audit logs and agent status.
- **Metrics & Costs**: Live visualization of token spend and session quality.
- **Browser Governance**: Approve or reject Tier 2/3 changes directly from the UI.
- **Team Feed**: See what other agents are doing in a multi-agent environment.

### Stop the Dashboard
```bash
/mindforge:dashboard --stop
```

---

## 11. Update and migration
### Check for updates
```
/mindforge:update
```

### Apply updates
```
/mindforge:update --apply
```

### Run schema migrations manually
```
/mindforge:migrate --from v0.6.0 --to v1.0.0
```

## 11. Plugins
### List / validate
```
/mindforge:plugins list
/mindforge:plugins validate
```

### Install
```
/mindforge:plugins install mindforge-plugin-<name>
```

## 12. Skills
```
/mindforge:skills list
/mindforge:skills validate
```

To publish or install a skill, see `docs/skills-publishing-guide.md`.

## 13. Token usage profiling
```
/mindforge:tokens --profile
/mindforge:tokens --summary
```

Token optimization policies are defined in:
- `.mindforge/production/token-optimiser.md`

## 14. Configuration (MINDFORGE.md)
Key settings live in `MINDFORGE.md`. See:
- `docs/reference/config-reference.md`

Common settings:
- `PLANNER_MODEL`, `EXECUTOR_MODEL`, `REVIEWER_MODEL`
- `VERIFY_PASS_RATE_WARNING_THRESHOLD`
- `TOKEN_WARN_THRESHOLD`, `TOKEN_LEAN_MODE`
- `MINDFORGE_AUTO_CHECK_UPDATES`

## 15. Troubleshooting
- Health issues: run `/mindforge:health --repair`
- Schema drift: run `/mindforge:migrate --dry-run` then apply
- Installer issues: re-run with `--force`
- CI mode: set `CI=true` and check `.mindforge/ci/` docs

## 16. Security
MindForge never stores credentials in files. See:
- `docs/security/SECURITY.md`
- `docs/security/threat-model.md`

## 17. Reference docs
- Commands: `docs/reference/commands.md`
- SDK: `docs/reference/sdk-api.md`
- Skills: `docs/reference/skills-api.md`
- Audit events: `docs/reference/audit-events.md`
