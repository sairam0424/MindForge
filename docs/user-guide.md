# MindForge User Guide (v2.1.1)

This guide gets you from install to productive, with the minimum needed to run MindForge in a real project. It assumes Node.js 18+.

## 1. Install

### Claude Code (global)

```bash
npx mindforge-cc@latest --claude --global
```

### Claude Code (local, per project)

```bash
npx mindforge-cc@latest --claude --local
```

### Antigravity

```bash
npx mindforge-cc@latest --antigravity --local
```

### Specific Runtime (Universal)

```bash
npx mindforge-cc@latest --runtime <name>
```

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

## 5. Unified Workflow

MindForge v2.1.1 uses a unified 4-pillar workflow for predictable delivery:

```bash
/mindforge:plan-phase [N]     # discuss → research → plan
/mindforge:execute-phase [N]  # parallel execution of task plans
/mindforge:verify-phase [N]   # UAT + automated validation
/mindforge:ship [N]           # generate changelog + create PR
```

---

## 6. High-Performance Personas

MindForge v2.1.1 introduces 32+ specialized personas. Each persona is optimized for a specific stage of the lifecycle.

- **Planner**: Orchestrates complex multi-file architectural changes.
- **Executor**: Focused on pixel-perfect implementation and coding standards.
- **Debugger**: Systematic root-cause analysis and verification.
- **Researcher**: Deep codebase and dependency analysis via Context7.

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

---

## 9. Persistent Knowledge & Memory

MindForge captures architectural decisions and bug patterns across sessions.

```bash
/mindforge:note "Add to memory: Always use functional components for UI"
/mindforge:remember --search "auth patterns"
```

---

## 10. Self-Building Skills

Extend MindForge by learning from documentation or community sources.

```bash
/mindforge:learn https://docs.nextjs.org "nextjs-mastery"
```

---

## 11. Git & PR Integration

MindForge v2.1.1 features automated PR creation and commit management.

```bash
/mindforge:pr-branch "feature/auth-refactor"
/mindforge:ship --auto-pr
```

---

## 12. Update & Maintenance

Keep your framework current with the latest personas and library updates:

```bash
/mindforge:update --apply
```

---

## 13. Reference & Support

- **Commands**: `docs/commands-reference.md`
- **Personas**: `docs/PERSONAS.md`
- **Troubleshooting**: `docs/troubleshooting.md`
- **Discord**: `/mindforge:join-discord`
