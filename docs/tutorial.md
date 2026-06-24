# MindForge v11.8.0 — Full Tutorial (Install → Advanced Usage)

This tutorial walks a new user from installation to advanced usage. It is written for engineers who want to adopt MindForge in a real codebase.

---

## 1. Install MindForge

### Claude Code (local, per repo)

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

Open your agentic runtime (Claude Code, Antigravity, etc.) in your repo and run:

```bash
/mindforge:health
```

If anything is wrong, run the repair command:

```bash
/mindforge:health --repair
```

---

## 3. Create a New Project

```bash
/mindforge:init-project
```

This command scaffolds the framework in `.agent/` and initializes project planning:

- `.planning/PROJECT.md`: High-level vision and roadmap.
- `.planning/REQUIREMENTS.md`: Functional and technical specs.
- `.planning/STATE.md`: Real-time project health and milestone status.

---

## 4. Onboarding an Existing Codebase

```bash
/mindforge:map-codebase
```

This command generates architectural insights:

- `.planning/ARCHITECTURE.md`: Module relationships and data flow.
- `.planning/CONVENTIONS.md`: Inferred coding styles and patterns.

---

## 5. Unified Workflow (Phase 1)

MindForge uses a 4-pillar iterative cycle:

```bash
/mindforge:plan-phase 1     # discuss → research → plan
/mindforge:execute-phase 1  # parallel execution of task plans
/mindforge:verify-phase 1   # UAT + automated validation
/mindforge:ship 1           # generate release output + PR
```

---

## 6. High-Performance Personas

MindForge v11.8.0 ships 211 specialized personas. Each is a "digital twin" of a senior role.

- To list all personas: `/mindforge:personas --list`
- To switch persona: `/mindforge:personas --set executor`

---

## 7. Real-time Dashboard

Observable engineering is core to MindForge. Start the dashboard to see live agent activity:

```bash
/mindforge:dashboard --start --open
```

Visit `http://localhost:7339` for the premium web interface.

---

## 8. Knowledge & Memory Management

MindForge records architectural decisions to prevent regression.

- Capture a note: `/mindforge:note "Preference: Use absolute imports for shared libs"`
- Search memory: `/mindforge:remember --search "api patterns"`

---

## 9. Self-Building Skills

Learn new capabilities from documentation URL or local files:

```bash
/mindforge:learn https://docs.nextjs.org "nextjs-best-practices"
```

---

## 10. Security & Governance

MindForge enforces strict compliance gates.

```bash
/mindforge:security-scan --deep
```

This checks for secrets, dependency vulnerabilities, and architectural drift.

---

## 11. CI/CD Integration

MindForge is designed for non-interactive execution in CI environments.

- Set `CI=true` in your environment.
- Use `/mindforge:ship --auto-pr` for automated delivery.

See `docs/ci-cd-integration.md` for full pipeline examples.

---

## 12. Troubleshooting

If you hit issues, consult these specialized guides:

- `docs/troubleshooting.md`: Common technical fixes.
- `docs/faq.md`: Frequent questions and architectural patterns.
- `docs/upgrade.md`: Migration guides between versions.

---

## 13. Using Dynamic Workflows

MindForge v11.8.0 ships 33 pre-built multi-agent workflows. Browse them with `/mindforge:wf-catalog`.

### Quick start — run a workflow

```
/mindforge:wf-deep-research What are the best practices for API versioning?
/mindforge:wf-code-audit current git diff
/mindforge:wf-security-hardening src/auth/
/mindforge:wf-debug-detective Login form submits but users report being logged out immediately
```

Each workflow fans out multiple parallel agents, verifies findings adversarially, and synthesizes a structured report.

### Beast tier workflows

The Beast tier runs 5-phase compound workflows with 8+ agents and adversarial verification — suitable for security reviews, accessibility compliance, and threat modeling:

- `/mindforge:wf-security-hardening` — Full OWASP scan with STRIDE threat model
- `/mindforge:wf-accessibility-audit` — WCAG 2.2 compliance with 3-vote verification
- `/mindforge:wf-security-threat-model` — STRIDE threat enumeration + CVSS scoring

---

## 14. Next Steps

1. Configure your team preferences in `docs/Templates/Profile/user-profile.md`.
2. Start your first Phase 1 planning.
3. Join our community: `/mindforge:join-discord`.
