# MindForge v1.0.0 — Full Tutorial (Install → Advanced Usage)

This tutorial walks a new user from installation to advanced usage. It is
written for engineers who want to adopt MindForge in a real codebase.

---

## 1. Install MindForge

### Claude Code (global)
```bash
npx mindforge-cc@latest --claude --global
```

### Claude Code (local, per repo)
```bash
npx mindforge-cc@latest --claude --local
```

### Antigravity
```bash
npx mindforge-cc@latest --antigravity --global
```

---

## 2. Verify installation
Open Claude Code or Antigravity in your repo and run:
```
/mindforge:health
```
If anything is wrong:
```
/mindforge:health --repair
```

---

## 3. Create a new project
```
/mindforge:init-project
```
This creates:
- `.planning/PROJECT.md`
- `.planning/REQUIREMENTS.md`
- `.planning/STATE.md`
- `.planning/HANDOFF.json`
- `.planning/AUDIT.jsonl`

---

## 4. Brownfield onboarding (existing codebase)
```
/mindforge:map-codebase
```
This generates:
- `.planning/ARCHITECTURE.md`
- `.mindforge/org/CONVENTIONS.md`

---

## 5. Standard workflow (Phase 1)
```
/mindforge:plan-phase 1
/mindforge:execute-phase 1
/mindforge:verify-phase 1
/mindforge:ship 1
```

What each step does:
- **plan**: creates atomic task plans with dependencies
- **execute**: runs tasks in waves
- **verify**: runs automated + human gates
- **ship**: generates release output

---

## 6. Using skills
Skills load automatically by keyword triggers. You can also manage them:
```
/mindforge:skills list
/mindforge:skills validate
```

Best practice: keep `ALWAYS_LOAD_SKILLS` minimal to avoid token bloat.

---

## 7. Security & governance
MindForge enforces compliance gates by design.

Run a deep security scan:
```
/mindforge:security-scan --deep --secrets --deps
```

If Tier 3 compliance changes appear, approvals are required.

---

## 8. Plugins (advanced extension)
Plugins add commands, skills, personas, and hooks.

Install a plugin:
```
/mindforge:plugins install mindforge-plugin-<name>
```

Validate installed plugins:
```
/mindforge:plugins validate
```

---

## 9. Token usage profiling
```
/mindforge:tokens --profile
/mindforge:tokens --summary
```

Use this to reduce wasted tokens and improve session quality.

---

## 10. Updates and migrations
Check for updates:
```
/mindforge:update
```

Apply updates:
```
/mindforge:update --apply
```

Migrate schema:
```
/mindforge:migrate --from v0.6.0 --to v1.0.0
```

---

## 11. CI integration
In CI, MindForge is non‑interactive by default.

Set environment:
```bash
CI=true
MINDFORGE_CI=true
```

Run tests:
```bash
node tests/install.test.js
```

See `docs/ci-quickstart.md` for full pipelines.

---

## 12. SDK usage (advanced)
Use the SDK in tooling or CI:

```ts
import { MindForgeClient } from '@mindforge/sdk';

const client = new MindForgeClient({ projectRoot: '.' });
const report = await client.health();
console.log(report);
```

---

## 13. Best practices checklist
- Run `/mindforge:health` after install and upgrades
- Keep PLAN `<action>` fields lean (150–400 words)
- Use local install per repo for isolation
- Pin plugin versions in production workflows
- Review `.planning/AUDIT.jsonl` for traceability

---

## 14. Troubleshooting
If you hit issues, see:
- `docs/troubleshooting.md`
- `docs/faq.md`
- `docs/upgrade.md`

---

## 15. Next steps
- Add your org defaults in `.mindforge/org/ORG.md`
- Configure `MINDFORGE.md` for your team
- Start Phase 2 planning
