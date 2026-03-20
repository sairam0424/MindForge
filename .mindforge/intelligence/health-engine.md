# MindForge Intelligence — Health Engine

## Purpose
Run a comprehensive health check across installation, context, skills, personas,
state, integrations, and security. Detect drift and provide safe auto-repair.

## Categories
1. Installation integrity
2. Context file health
3. Skills registry health
4. Persona system health
5. State consistency
6. Integration connectivity
7. Security configuration

## Category 1 — Installation integrity

### Required files checklist
```bash
REQUIRED_FILES=(
  ".claude/CLAUDE.md"
  ".agent/CLAUDE.md"

  ".claude/commands/mindforge/help.md"
  ".claude/commands/mindforge/init-project.md"
  ".claude/commands/mindforge/plan-phase.md"
  ".claude/commands/mindforge/execute-phase.md"
  ".claude/commands/mindforge/verify-phase.md"
  ".claude/commands/mindforge/ship.md"
  ".claude/commands/mindforge/next.md"
  ".claude/commands/mindforge/quick.md"
  ".claude/commands/mindforge/status.md"
  ".claude/commands/mindforge/debug.md"
  ".claude/commands/mindforge/skills.md"
  ".claude/commands/mindforge/review.md"
  ".claude/commands/mindforge/security-scan.md"
  ".claude/commands/mindforge/map-codebase.md"
  ".claude/commands/mindforge/discuss-phase.md"
  ".claude/commands/mindforge/audit.md"
  ".claude/commands/mindforge/milestone.md"
  ".claude/commands/mindforge/complete-milestone.md"
  ".claude/commands/mindforge/approve.md"
  ".claude/commands/mindforge/sync-jira.md"
  ".claude/commands/mindforge/sync-confluence.md"
  ".claude/commands/mindforge/health.md"
  ".claude/commands/mindforge/retrospective.md"
  ".claude/commands/mindforge/profile-team.md"
  ".claude/commands/mindforge/metrics.md"

  ".mindforge/engine/wave-executor.md"
  ".mindforge/engine/dependency-parser.md"
  ".mindforge/engine/context-injector.md"
  ".mindforge/engine/compaction-protocol.md"
  ".mindforge/engine/verification-pipeline.md"
  ".mindforge/engine/skills/registry.md"
  ".mindforge/engine/skills/loader.md"
  ".mindforge/engine/skills/versioning.md"
  ".mindforge/engine/skills/conflict-resolver.md"

  ".mindforge/skills/security-review/SKILL.md"
  ".mindforge/skills/code-quality/SKILL.md"
  ".mindforge/skills/api-design/SKILL.md"
  ".mindforge/skills/testing-standards/SKILL.md"
  ".mindforge/skills/documentation/SKILL.md"
  ".mindforge/skills/performance/SKILL.md"
  ".mindforge/skills/accessibility/SKILL.md"
  ".mindforge/skills/data-privacy/SKILL.md"
  ".mindforge/skills/incident-response/SKILL.md"
  ".mindforge/skills/database-patterns/SKILL.md"

  ".mindforge/personas/analyst.md"
  ".mindforge/personas/architect.md"
  ".mindforge/personas/developer.md"
  ".mindforge/personas/qa-engineer.md"
  ".mindforge/personas/security-reviewer.md"
  ".mindforge/personas/tech-writer.md"
  ".mindforge/personas/debug-specialist.md"
  ".mindforge/personas/release-manager.md"

  ".mindforge/intelligence/health-engine.md"
  ".mindforge/intelligence/difficulty-scorer.md"
  ".mindforge/intelligence/antipattern-detector.md"
  ".mindforge/intelligence/skill-gap-analyser.md"
  ".mindforge/intelligence/smart-compaction.md"

  ".mindforge/governance/change-classifier.md"
  ".mindforge/governance/approval-workflow.md"
  ".mindforge/governance/compliance-gates.md"

  ".mindforge/org/ORG.md"
  ".mindforge/org/CONVENTIONS.md"
  ".mindforge/org/SECURITY.md"
  ".mindforge/org/TOOLS.md"
  ".mindforge/org/skills/MANIFEST.md"
  ".mindforge/org/integrations/INTEGRATIONS-CONFIG.md"

  ".planning/HANDOFF.json"
  ".planning/STATE.md"
  ".planning/AUDIT.jsonl"
)
```

`MINDFORGE.md` is optional and is not in required files.
If `MINDFORGE.md` exists, validate:
- no unknown skills (must exist in `.mindforge/org/skills/MANIFEST.md`)
- no invalid model names (fallback to `inherit` + warning)
- no attempted overrides of governance primitives

### Version check
- Validate `package.json` semver is `>= 0.5.0`.

### CLAUDE parity
- `.claude/CLAUDE.md` and `.agent/CLAUDE.md` must be identical.
- All commands under `.claude/commands/mindforge/` must exist in `.agent/mindforge/`.

## Category 2 — Context file health
- `PROJECT.md` has tech stack, v1 scope, success criteria, and no placeholders.
- `REQUIREMENTS.md` has FR entries with acceptance criteria and scope tags.
- `STATE.md` has recent `Last updated` timestamp and coherent status.
- `HANDOFF.json` is valid JSON with required fields and no secrets.
- `ARCHITECTURE.md` exists with stack and decision references.

## Category 3 — Skills registry health
- `MANIFEST.md` exists; all 10 core skills listed with valid semver.
- Every manifest skill path exists.
- Every `SKILL.md` includes frontmatter: `name`, `version`, `status`, `triggers`.
- Trigger conflict check runs and reports count.

## Category 4 — Persona system health
- Each persona has Identity, Pre-task checklist, Escalation, DoD.
- Persona files are non-stub (>500 bytes).
- Override files contain no prompt-injection markers.

## Category 5 — State consistency
- For every phase in ROADMAP: directory + required artifacts match phase status.
- Explicit check: if `STATE.md` marks phase complete and summaries exist but `VERIFICATION.md` is missing, flag as error.
- `AUDIT.jsonl` lines parse as JSONL and timestamps are chronological.
- Commit hygiene:
  - conventional commit format in recent history
  - on `main`, only flag commits whose subject starts with `wip` (case-insensitive)

## Category 6 — Integration connectivity
For configured integrations, run lightweight auth checks and report:
- `available`
- `invalid_credentials`
- `unreachable`
- `unconfigured` (informational only)

## Category 7 — Security configuration
- `.gitignore` covers env files and keys.
- Secret scan covers:
  - `.planning/`
  - `.mindforge/`
  - root-level `MINDFORGE.md`, `.env.example`, `*.config.js`
- `SECURITY.md` has no placeholders.
- Governance approval files are not stale beyond SLA.

## Auto-repair protocol

### Auto-repairable
- sync `.agent/CLAUDE.md` from `.claude/CLAUDE.md`
- mirror missing command files from `.claude` to `.agent`
- add missing `Last updated` in `STATE.md`
- create `.planning/approvals/` if missing
- mark expired approvals and audit them
- trigger AUDIT archive protocol when threshold exceeded

### AUDIT.jsonl corruption handling (updated)
**Never delete lines from `AUDIT.jsonl`.**

```bash
python3 - <<'PY'
import json
from pathlib import Path

audit = Path('.planning/AUDIT.jsonl')
if not audit.exists():
    raise SystemExit(0)

invalid = []
for i, raw in enumerate(audit.read_text().splitlines(), 1):
    s = raw.strip()
    if not s:
        continue
    try:
        json.loads(s)
    except Exception:
        invalid.append({"line": i, "raw": s})

if invalid:
    qf = Path('.planning/AUDIT.jsonl.quarantine')
    with qf.open('a', encoding='utf-8') as f:
        for row in invalid:
            f.write(json.dumps(row) + "\n")
    print(f"Quarantined {len(invalid)} invalid lines to {qf}")
PY

echo "{\"event\":\"audit_quarantine\",\"quarantine_file\":\".planning/AUDIT.jsonl.quarantine\"}" >> .planning/AUDIT.jsonl
```

### Non-auto-repairable
- missing core skill files
- invalid credentials
- secrets found in `HANDOFF.json`
- prompt-injection patterns in persona overrides

## Health report format
Provide summary by category with errors, warnings, info, and exact next fixes.
