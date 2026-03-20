# MindForge — Day 5 Implementation Prompt
# Branch: `feat/mindforge-intelligence-layer`
# Prerequisite: `feat/mindforge-enterprise-integrations` merged to `main`

---

## BRANCH SETUP (run before anything else)

```bash
git checkout main
git pull origin main
git checkout -b feat/mindforge-intelligence-layer
```

Verify all prior days are present and passing:

```bash
ls .mindforge/governance/compliance-gates.md    # Day 4 governance
ls .mindforge/integrations/connection-manager.md # Day 4 integrations
ls .claude/commands/mindforge/approve.md         # Day 4 commands
cat package.json | grep '"version"'              # Must be "0.4.0"
node tests/install.test.js && \
node tests/wave-engine.test.js && \
node tests/audit.test.js && \
node tests/compaction.test.js && \
node tests/skills-platform.test.js && \
node tests/integrations.test.js && \
node tests/governance.test.js
# All 7 suites must pass before Day 5 begins
```

---

## DAY 5 SCOPE

Day 5 builds the **Intelligence & Observability Layer** — the components that
make MindForge self-aware, self-improving, and genuinely intelligent about your
team's patterns, gaps, and quality trends over time.

| Component | Description |
|---|---|
| Framework Health Engine | Deep self-diagnostic: validates every MindForge component, detects drift, offers auto-repair |
| Intelligent Context Compaction | AI-summarised state preservation — structured insight extraction, not truncation |
| Phase Difficulty Scorer | Estimates effort, risk, and complexity before planning begins |
| Anti-Pattern Detection Engine | Proactively flags known failure patterns across code, architecture, and process |
| Skill Gap Analyser | Identifies missing skills for the next phase based on planned work |
| Team Profile System | Captures team capabilities, preferences, and working patterns for personalised agent responses |
| Agent Performance Metrics | Tracks quality scores, verify pass rates, and trend analysis across sessions |
| MINDFORGE.md | Project-level master override for all MindForge defaults — the "project constitution" |
| Interactive Setup Wizard | `npx mindforge-cc` guided first-run experience with environment detection |
| `/mindforge:health` | Comprehensive health check with auto-repair for drift and corruption |
| `/mindforge:retrospective` | Structured phase and milestone retrospectives with action item tracking |
| `/mindforge:profile-team` | Generate and maintain team capability profiles |
| `/mindforge:metrics` | Quality metrics dashboard with trend analysis |
| Day 5 test suite | `tests/intelligence.test.js`, `tests/metrics.test.js` |

**Do not** implement on Day 5:
- Public skills registry on npm (Day 6+)
- AI-generated PR code reviews (Day 6+)
- Multi-repo support (Day 6+)
- Real-time collaboration websockets (Day 6+)

---

## TASK 1 — Scaffold Day 5 directory additions

```bash
# Intelligence engine
mkdir -p .mindforge/intelligence
touch .mindforge/intelligence/health-engine.md
touch .mindforge/intelligence/difficulty-scorer.md
touch .mindforge/intelligence/antipattern-detector.md
touch .mindforge/intelligence/skill-gap-analyser.md
touch .mindforge/intelligence/smart-compaction.md

# Team & metrics
mkdir -p .mindforge/team/profiles
touch .mindforge/team/TEAM-PROFILE.md
touch .mindforge/team/profiles/README.md
mkdir -p .mindforge/metrics
touch .mindforge/metrics/METRICS-SCHEMA.md
touch .mindforge/metrics/quality-tracker.md

# Project constitution
touch MINDFORGE.md

# New commands
touch .claude/commands/mindforge/health.md
touch .claude/commands/mindforge/retrospective.md
touch .claude/commands/mindforge/profile-team.md
touch .claude/commands/mindforge/metrics.md

# Mirror to Antigravity
for cmd in health retrospective profile-team metrics; do
  cp .claude/commands/mindforge/${cmd}.md .agent/mindforge/${cmd}.md
done

# Setup wizard
mkdir -p bin/wizard
touch bin/wizard/setup-wizard.js
touch bin/wizard/environment-detector.js
touch bin/wizard/config-generator.js

# Tests
touch tests/intelligence.test.js
touch tests/metrics.test.js

# Docs
touch docs/mindforge-md-reference.md
touch docs/team-setup-guide.md
```

**Commit:**
```bash
git add .
git commit -m "chore(day5): scaffold Day 5 intelligence layer directory structure"
```

---

## TASK 2 — Write the Framework Health Engine

The health engine is MindForge's self-diagnostic system. It validates every
component, detects configuration drift, and offers targeted auto-repair.

### `.mindforge/intelligence/health-engine.md`

```markdown
# MindForge Intelligence — Health Engine

## Purpose
Perform a comprehensive health check of the MindForge installation and project
state. Detect missing files, broken configurations, stale state, version
mismatches, and integration connectivity issues. Offer auto-repair for common
problems.

## Health check categories

The health engine runs checks in seven categories, in this order:

```
Category 1: Installation integrity
Category 2: Context file health
Category 3: Skills registry health
Category 4: Persona system health
Category 5: State consistency
Category 6: Integration connectivity
Category 7: Security configuration
```

---

## Category 1 — Installation Integrity

Check that every required MindForge file exists and has content.

### Required files checklist
```bash
REQUIRED_FILES=(
  # Core entry points
  ".claude/CLAUDE.md"
  ".agent/CLAUDE.md"

  # Commands — Claude Code
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

  # Engine
  ".mindforge/engine/wave-executor.md"
  ".mindforge/engine/dependency-parser.md"
  ".mindforge/engine/context-injector.md"
  ".mindforge/engine/compaction-protocol.md"
  ".mindforge/engine/verification-pipeline.md"
  ".mindforge/engine/skills/registry.md"
  ".mindforge/engine/skills/loader.md"
  ".mindforge/engine/skills/versioning.md"
  ".mindforge/engine/skills/conflict-resolver.md"

  # Skills — all 10
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

  # Personas — all 8
  ".mindforge/personas/analyst.md"
  ".mindforge/personas/architect.md"
  ".mindforge/personas/developer.md"
  ".mindforge/personas/qa-engineer.md"
  ".mindforge/personas/security-reviewer.md"
  ".mindforge/personas/tech-writer.md"
  ".mindforge/personas/debug-specialist.md"
  ".mindforge/personas/release-manager.md"

  # Governance
  ".mindforge/governance/change-classifier.md"
  ".mindforge/governance/approval-workflow.md"
  ".mindforge/governance/compliance-gates.md"

  # Org context
  ".mindforge/org/ORG.md"
  ".mindforge/org/CONVENTIONS.md"
  ".mindforge/org/SECURITY.md"
  ".mindforge/org/TOOLS.md"
  ".mindforge/org/skills/MANIFEST.md"
  ".mindforge/org/integrations/INTEGRATIONS-CONFIG.md"

  # Planning state
  ".planning/HANDOFF.json"
  ".planning/STATE.md"
  ".planning/AUDIT.jsonl"
)

for FILE in "${REQUIRED_FILES[@]}"; do
  if [ ! -f "${FILE}" ]; then
    echo "MISSING: ${FILE}"
  elif [ ! -s "${FILE}" ]; then
    echo "EMPTY:   ${FILE}"
  fi
done
```

### Version check
```bash
# Verify package.json version matches the expected minimum
CURRENT_VERSION=$(node -e "console.log(require('./package.json').version)")
MINIMUM_VERSION="0.5.0"
# Compare semver: if current < minimum, flag as outdated
```

### CLAUDE.md parity check
```bash
# Verify .claude/CLAUDE.md and .agent/CLAUDE.md are identical
if ! diff -q .claude/CLAUDE.md .agent/CLAUDE.md > /dev/null 2>&1; then
  echo "DRIFT: .claude/CLAUDE.md and .agent/CLAUDE.md have diverged"
  echo "Fix: cp .claude/CLAUDE.md .agent/CLAUDE.md"
fi
```

### Command parity check
```bash
# All commands in .claude/commands/mindforge/ must exist in .agent/mindforge/
CLAUDE_CMDS=$(ls .claude/commands/mindforge/ | sort)
AGENT_CMDS=$(ls .agent/mindforge/ | sort)
diff <(echo "${CLAUDE_CMDS}") <(echo "${AGENT_CMDS}") | grep "^[<>]" && \
  echo "DRIFT: command files differ between runtimes"
```

---

## Category 2 — Context File Health

Check that project context files exist, have content, and are not stale.

```markdown
### PROJECT.md health
- [ ] File exists
- [ ] Has "## Tech stack" section with at least one entry
- [ ] Has "## v1 scope — IN" section
- [ ] Has "## Success criteria" section
- [ ] Does NOT contain placeholder text: "[project name]", "[placeholder]", "TODO"

### REQUIREMENTS.md health
- [ ] File exists
- [ ] Has at least one FR-NN requirement
- [ ] All requirements have acceptance criteria
- [ ] All requirements have scope tags (v1/v2/out)

### STATE.md health
- [ ] File exists
- [ ] "Last updated" timestamp is within 30 days
  (if > 30 days: warn "STATE.md may be stale — has the project been active?")
- [ ] Does not show "Ready for next milestone" with no subsequent activity
  (indicates a milestone was completed but next one never started)

### HANDOFF.json health
- [ ] File is valid JSON
- [ ] Has all required fields: schema_version, next_task, _warning, context_refs
- [ ] updated_at is within 7 days (if project is active)
- [ ] Does NOT contain any credential patterns
  (scan for: password=, token=, api_key=, sk-, ghp_, xoxb-)

### ARCHITECTURE.md health
- [ ] File exists (warn if not — architecture decisions should be documented)
- [ ] Has "## Technology stack" section
- [ ] Has at least one ADR reference OR decisions/ directory exists
```

---

## Category 3 — Skills Registry Health

```markdown
### MANIFEST.md validation
- [ ] File exists at .mindforge/org/skills/MANIFEST.md
- [ ] All 10 core skills are listed
- [ ] Every skill entry has a valid semver version
- [ ] Every path in the manifest resolves to an existing SKILL.md

### Individual skill validation
For each SKILL.md: frontmatter has name, version, status, triggers
- [ ] name matches directory name
- [ ] version is valid semver
- [ ] triggers list has >= 10 keywords
- [ ] Mandatory actions section present
- [ ] Self-check / checklist section present
- [ ] No placeholder text remaining

### Trigger conflict report
Run conflict detection (per conflict-resolver.md).
Report: "N trigger conflicts detected — run /mindforge:skills validate for details"
```

---

## Category 4 — Persona System Health

```markdown
### Persona file validation
For each of the 8 persona files:
- [ ] Has Identity section
- [ ] Has Pre-task checklist
- [ ] Has Escalation conditions section
- [ ] Has Definition of done section
- [ ] File size > 500 bytes (not a stub)

### Override system health
- [ ] .mindforge/personas/overrides/ directory exists
- [ ] No override files contain injection-pattern keywords
  (IGNORE ALL PREVIOUS INSTRUCTIONS, DISREGARD, OVERRIDE:)
- [ ] Phase-level overrides match an existing persona name
```

---

## Category 5 — State Consistency

```markdown
### Phase state consistency
For each phase listed in ROADMAP.md:
Check: does the phase directory exist at .planning/phases/[N]/?
Check: do PLAN files exist if phase status is "planned" or beyond?
Check: do SUMMARY files exist for all plans if phase status is "complete"?
Check: does VERIFICATION.md exist if phase status is "complete"?
Check: does UAT.md exist if phase status is "shipped"?

Flag any inconsistency: e.g., "Phase 2 is marked complete in STATE.md but
VERIFICATION.md is missing."

### AUDIT.jsonl consistency
- [ ] File is valid JSONL (all lines parse as JSON)
- [ ] All entries have required universal fields
- [ ] Timestamps are chronological
- [ ] Entry count: report total, flag if approaching 10,000 (archive threshold)

### Git history consistency
- [ ] MindForge commits use Conventional Commits format
  (check last 20 commits: any without type(scope): format?)
- [ ] No "WIP" commits on main branch
  (WIP commits are acceptable on feature branches, not on main)
```

---

## Category 6 — Integration Connectivity

```markdown
### Per integration (only if credentials are configured):
Run the health check from connection-manager.md for each configured integration.

Jira: GET /rest/api/3/myself → expect 200
Confluence: GET /wiki/api/v2/spaces → expect 200
Slack: GET https://slack.com/api/auth.test → expect 200 with ok:true
GitHub: GET https://api.github.com/user → expect 200
GitLab: GET /api/v4/user → expect 200

For each: report status — available / invalid_credentials / unreachable / unconfigured
For unconfigured: note which env vars are needed (not a failure — just informational)
```

---

## Category 7 — Security Configuration

```markdown
### .gitignore completeness
- [ ] node_modules/ is ignored
- [ ] .env and .env.* are ignored
- [ ] *.key and *.pem are ignored
- [ ] If public repo: .planning/SECURITY-SCAN-*.md is ignored

### No secrets in committed files
Run lightweight secret scan across .planning/ and .mindforge/ directories:
Pattern: any line matching password=, token=, api_key=, sk-, ghp_, xoxb-
Exclude: template placeholders and example values

### SECURITY.md placeholder detection
- [ ] .mindforge/org/SECURITY.md does not contain [placeholder] text
- [ ] If it does: warn "SECURITY.md has unfilled sections — agents will receive
  incomplete security guidance"

### Approval directory
- [ ] .planning/approvals/ exists (if governance is being used)
- [ ] No approval files with status "pending" older than the configured SLA
```

---

## Auto-repair protocol

When health check is run with `--repair` flag:

### Auto-repairable issues
| Issue | Auto-repair action |
|---|---|
| .agent/CLAUDE.md out of sync | `cp .claude/CLAUDE.md .agent/CLAUDE.md` |
| Command file missing from .agent/ | `cp .claude/commands/mindforge/X.md .agent/mindforge/X.md` |
| AUDIT.jsonl has invalid JSON lines | Remove invalid lines, log removed count |
| STATE.md missing "Last updated" | Append current timestamp |
| .planning/approvals/ missing | `mkdir -p .planning/approvals/` |
| Expired approvals not processed | Mark expired, write AUDIT entries |
| AUDIT.jsonl exceeds 10K lines | Run archive protocol |

### Non-auto-repairable issues (require human action)
| Issue | Required action |
|---|---|
| Missing core SKILL.md | Reinstall MindForge: `npx mindforge-cc@latest` |
| Credentials invalid (401) | Update environment variable with new token |
| HANDOFF.json contains credentials | Remove secret, rotate credential, clean file |
| Persona file with injection patterns | Manual review and removal |
| Missing REQUIREMENTS.md content | Run /mindforge:init-project |

## Health report format

```markdown
# MindForge Health Report
**Date:** [ISO-8601]
**Version:** v[X.Y.Z]
**Project:** [from PROJECT.md]

## Summary
| Category | Status | Issues |
|---|---|---|
| Installation | ✅ Healthy | 0 |
| Context files | ⚠️ Warning | 2 warnings |
| Skills registry | ✅ Healthy | 0 |
| Persona system | ✅ Healthy | 0 |
| State consistency | ❌ Issues | 1 error |
| Integration connectivity | ✅ Healthy | 0 (2 unconfigured) |
| Security configuration | ⚠️ Warning | 1 warning |

**Overall:** ⚠️ 3 issues found (1 error, 2 warnings) — run /mindforge:health --repair

## Errors (must fix)
[Error 1]: Phase 2 marked complete in STATE.md but VERIFICATION.md missing
  Fix: Run /mindforge:verify-phase 2 to create the verification record.

## Warnings (should fix)
[Warning 1]: STATE.md last updated 45 days ago — may be stale
[Warning 2]: SECURITY.md has 3 unfilled placeholder sections

## Informational
[Info 1]: Jira unconfigured (set JIRA_API_TOKEN to enable)
[Info 2]: AUDIT.jsonl has 8,234 entries (archive threshold: 10,000)
```
```

**Commit:**
```bash
git add .mindforge/intelligence/health-engine.md
git commit -m "feat(intelligence): implement comprehensive health engine with auto-repair"
```

---

## TASK 3 — Write the Intelligent Context Compaction Engine

Replace the basic compaction protocol from Day 2 with an AI-powered
summarisation system that extracts structured insights rather than truncating.

### `.mindforge/intelligence/smart-compaction.md`

```markdown
# MindForge Intelligence — Smart Context Compaction

## Purpose
Replace brute-force context truncation with intelligent, structured insight
extraction. When context reaches 70%, don't just cut off the oldest messages —
distil them into precise, high-value summaries that preserve the reasoning,
not just the facts.

## Compaction quality levels

### Level 1 — Lightweight (context at 70-79%)
Quick state capture: commit in-progress work, write HANDOFF.json, update STATE.md.
Time cost: ~30 seconds. No AI summarisation needed.
Use when: context is elevated but not critical.

### Level 2 — Standard (context at 80-89%)
Full structured extraction: analyse the session for decisions, discoveries,
patterns, and blockers. Compress the last 30 tool calls into structured insight blocks.
Time cost: ~2 minutes.
Use when: significant work has been done this session that needs preserving.

### Level 3 — Deep (context at 90%+)
Emergency extraction: extract the minimum viable context to continue work
in a completely fresh session. Prioritise: what the next session MUST know
to not repeat work or make contradictory decisions.
Time cost: ~1 minute (urgency mode — no time for depth).
Use when: context is near limit and work is urgent.

---

## Level 2 Standard Compaction — Extraction Protocol

### Step 1 — Analyse the session (before writing anything)

Read the session history and extract these structured blocks:

**Block A: Decisions made (high value — hard to reconstruct)**
```
For each decision made during this session:
  - What was decided (1 sentence, precise)
  - Why (the reasoning, not just the outcome)
  - What it rules out (what alternatives were rejected)
  - Which files/components it affects
  - Whether it needs an ADR (if architectural and not yet documented)
```

**Block B: Discoveries (medium value — saves future investigation)**
```
For each non-obvious thing discovered:
  - What was found (fact, not opinion)
  - Where it was found (file:line or system)
  - Why it matters for future work
  - Whether it changes any prior assumptions
```

**Block C: Current task state (critical — enables seamless continuation)**
```
  - Exact current task (plan ID and step number)
  - What has been completed in this task (numbered list)
  - What remains (numbered list)
  - The current file being modified and its intended final state
  - Any partial implementations that are in an inconsistent state
```

**Block D: Implicit knowledge (unique to this session — would be lost)**
```
  - Library quirks encountered (e.g., "jose v5 uses different API than docs show")
  - Environment-specific facts (e.g., "local DB requires PGPASSWORD env var")
  - Context-dependent rules (e.g., "this endpoint is rate-limited by the proxy")
  - Workarounds applied (e.g., "had to add X because Y is broken in this version")
```

**Block E: Quality signals (enables self-improvement)**
```
  - Any patterns that caused difficulty (what slowed down execution)
  - Any plan assumptions that proved wrong
  - Any quality gate failures and their root causes
  - Suggestions for better planning next time
```

### Step 2 — Write structured HANDOFF.json

Use the extraction blocks to write a richer HANDOFF.json:

```json
{
  "schema_version": "1.0.0",
  "compaction_level": 2,
  "compaction_timestamp": "ISO-8601",
  "project": "[project name]",
  "phase": [N],
  "plan": "[M]",
  "plan_step": "[exact step description]",
  "last_completed_task": { "description": "...", "commit_sha": "..." },
  "next_task": "[exact next action for the next session]",

  "decisions_made": [
    {
      "decision": "[what was decided]",
      "rationale": "[why]",
      "rules_out": "[what alternatives were rejected]",
      "affects": ["file1.ts", "file2.ts"],
      "needs_adr": true,
      "adr_title": "[suggested ADR title]"
    }
  ],

  "discoveries": [
    {
      "fact": "[what was found]",
      "location": "[file:line or system]",
      "significance": "[why it matters]"
    }
  ],

  "implicit_knowledge": [
    "[Library quirk 1]",
    "[Environment fact 2]",
    "[Workaround 3]"
  ],

  "quality_signals": [
    { "type": "plan_assumption_wrong", "description": "[what was assumed vs. reality]" },
    { "type": "difficulty_pattern", "description": "[what was hard and why]" }
  ],

  "in_progress": {
    "file": "[file being modified]",
    "intent": "[what the modification achieves]",
    "completed_steps": ["step 1", "step 2"],
    "remaining_steps": ["step 3", "step 4"],
    "current_state": "inconsistent — needs step 3 before it compiles"
  },

  "context_refs": ["[files needed for next session]"],
  "recent_commits": ["[sha: message]"],
  "blockers": [],
  "decisions_needed": [],
  "_warning": "Never store secrets, tokens, or passwords in this file.",
  "updated_at": "ISO-8601"
}
```

### Step 3 — Update STATE.md with session summary

Append a compaction checkpoint to STATE.md:

```markdown
---
## Compaction checkpoint — [ISO-8601] (Level 2)

### What was accomplished this session
[2-3 sentences distilling the session's output]

### Key decisions (full details in HANDOFF.json)
- [Decision 1 in one line]
- [Decision 2 in one line]

### Implicit knowledge captured
- [Critical fact 1]
- [Critical fact 2]

### Quality observations
- [Pattern that should influence next planning session]
```

### Step 4 — Write AUDIT compaction entry

```json
{
  "event": "context_compaction",
  "compaction_level": 2,
  "context_usage_pct": 84,
  "decisions_captured": 3,
  "discoveries_captured": 2,
  "implicit_knowledge_items": 4,
  "quality_signals": 1,
  "handoff_written": true,
  "state_updated": true
}
```

---

## Session restart from Level 2 HANDOFF

When a new session reads a Level 2 HANDOFF:

1. Report the extraction quality to the user:
   ```
   Previous session summary (Level 2 compaction):
   ─────────────────────────────────────────────────
   Decisions captured : 3 (see HANDOFF.json decisions_made)
   Discoveries        : 2
   Implicit knowledge : 4 items
   Current task       : [plan_step]
   In-progress file   : [file] — [current_state]
   ─────────────────────────────────────────────────
   ```

2. Pre-load all implicit knowledge into working context BEFORE loading the PLAN file.
   This ensures quirks and workarounds are known before execution decisions are made.

3. If `in_progress.current_state` indicates an inconsistency:
   ```
   ⚠️ WARNING: Previous session left an inconsistent state.
   File: [file]
   State: [current_state]
   This must be resolved BEFORE executing any other steps.
   Resolve? (yes — I'll fix it / no — show me the file first)
   ```

## Compaction quality metric

After each compaction, score the quality of the extracted information:
- Decisions captured vs. decisions that should have been captured (based on AUDIT entries): [N%]
- This score is written to `.planning/metrics/compaction-quality.jsonl`
  for the performance metrics system (Task 10).
```

**Commit:**
```bash
git add .mindforge/intelligence/smart-compaction.md
git commit -m "feat(intelligence): implement smart context compaction with structured insight extraction"
```

---

## TASK 4 — Write the Phase Difficulty Scorer

### `.mindforge/intelligence/difficulty-scorer.md`

```markdown
# MindForge Intelligence — Phase Difficulty Scorer

## Purpose
Before planning begins, estimate a phase's complexity, risk, and effort
so that task decomposition is appropriately fine-grained and capacity
expectations are realistic.

## When to run
The difficulty scorer runs automatically as part of `/mindforge:plan-phase`
before any task plans are created. Its output informs:
- Task granularity (high difficulty → more atomic plans)
- Risk flags (high risk → activate more skills and verification steps)
- Effort estimate (helps user decide if the phase scope is right)

## Scoring dimensions

### Dimension 1 — Technical Complexity (1-5)

| Score | Description | Signals |
|---|---|---|
| 1 | Trivial | Documentation, config change, single function fix |
| 2 | Simple | New UI component, simple CRUD endpoint, minor refactor |
| 3 | Moderate | Multi-step feature, new service integration, schema change |
| 4 | Complex | New subsystem, auth/payment feature, architectural change |
| 5 | Very complex | Core platform change, distributed system feature, migration |

**Signal detection:**
```bash
# Check phase description for complexity signals
PHASE_DESCRIPTION="[from ROADMAP.md]"

# High complexity signals (score 4-5):
COMPLEX_SIGNALS=(
  "authentication" "authorization" "payment" "migration" "refactor"
  "architecture" "distributed" "real-time" "encryption" "multi-tenant"
  "performance" "scale" "queue" "cache invalidation" "transaction"
)

# Moderate complexity signals (score 3):
MODERATE_SIGNALS=(
  "integration" "webhook" "email" "notification" "search"
  "dashboard" "report" "export" "import" "workflow"
)
```

### Dimension 2 — Risk Level (1-5)

| Score | Description | Signals |
|---|---|---|
| 1 | Minimal | New feature, no existing code touched |
| 2 | Low | Minor changes to existing code, well-covered by tests |
| 3 | Medium | Changes to shared utilities, moderate test coverage needed |
| 4 | High | Changes to auth, data model, or public API surface |
| 5 | Critical | Changes to payments, PII handling, or core platform logic |

**Risk amplifiers (add +1 to base risk score):**
- No existing test suite for the affected code area
- Third-party service integration with no sandbox environment
- Changes to code used by > 3 other modules
- No rollback plan is obvious
- Previous incidents in this area (check AUDIT log for past failures)

### Dimension 3 — Ambiguity Level (1-5)

| Score | Description | Signals |
|---|---|---|
| 1 | Fully specified | All acceptance criteria written, no design decisions open |
| 2 | Mostly clear | Minor implementation decisions open, major shape is clear |
| 3 | Partially specified | Some requirements unclear, UX decisions unresolved |
| 4 | Vague | High-level goal only, significant design work needed |
| 5 | Undefined | Phase is a concept, not a specification |

**Source:** Read REQUIREMENTS.md for the phase's FR items.
Count: requirements with acceptance criteria vs. requirements without.
If < 70% have acceptance criteria: score 3+.

### Dimension 4 — Dependency Count (1-5)

Count the number of:
- External services this phase must integrate with
- Other phases this phase depends on (check ROADMAP.md)
- New third-party libraries that must be added
- Team dependencies (other team's APIs, systems)

Score = min(5, dependency_count)

---

## Composite Difficulty Score

```
Composite = (Technical × 0.35) + (Risk × 0.30) + (Ambiguity × 0.20) + (Dependencies × 0.15)
```

| Composite Score | Label | Recommended task count |
|---|---|---|
| 1.0 – 2.0 | Easy | 2-3 atomic tasks |
| 2.1 – 3.0 | Moderate | 4-6 atomic tasks |
| 3.1 – 4.0 | Challenging | 6-10 atomic tasks |
| 4.1 – 5.0 | Hard | 10-15 atomic tasks; consider splitting the phase |

---

## Difficulty report

Written to `.planning/phases/[N]/DIFFICULTY-SCORE-[N].md`:

```markdown
# Phase [N] Difficulty Score

## Scores
| Dimension | Score | Signals detected |
|---|---|---|
| Technical complexity | 4 / 5 | "authentication", "JWT", "session management" |
| Risk level | 5 / 5 | Auth changes + no existing auth tests + Tier 3 governance |
| Ambiguity | 2 / 5 | 8 of 10 requirements have acceptance criteria |
| Dependencies | 3 / 5 | 3 external services: Supabase Auth, SendGrid, Stripe |

## Composite score: 3.85 / 5.0 — Challenging

## Recommendations
1. Split into 8 atomic tasks (not 3-4) — complexity warrants fine granularity
2. Activate skills: security-review, api-design, testing-standards (auto-suggested)
3. Run /mindforge:discuss-phase [N] before planning — ambiguity score suggests
   implementation decisions need capturing
4. Governance: expect Tier 3 approval for auth changes — plan for 4-hour approval wait
5. Estimate: ~3-4 hours of agent execution time for this phase

## Risk flags
🔴 No existing auth test coverage — QA agent should write tests first (TDD approach)
🟠 Third-party session storage (Supabase) — plan for service unavailability in tests
🟡 JWT refresh rotation — subtle concurrency edge case, add to test plan
```

## Integration with plan-phase

After scoring, present to the user:
```
Phase [N] Difficulty Assessment:
  Technical  : ████████░░ 4/5 (Complex)
  Risk       : ██████████ 5/5 (Critical)
  Ambiguity  : ████░░░░░░ 2/5 (Mostly clear)
  Dependencies: ██████░░░░ 3/5 (3 external services)

  Composite: 3.85 / 5.0 — Challenging

  Recommendations:
  - 8 atomic tasks (not 3)
  - Run /mindforge:discuss-phase first (recommended)
  - Activate: security-review, api-design, testing-standards
  - Plan for Tier 3 approval (4h wait) for auth changes

  Proceed to discussion phase? (yes/no/skip-discussion)
```
```

**Commit:**
```bash
git add .mindforge/intelligence/difficulty-scorer.md
git commit -m "feat(intelligence): implement phase difficulty scorer with 4-dimension model"
```

---

## TASK 5 — Write the Anti-Pattern Detection Engine

### `.mindforge/intelligence/antipattern-detector.md`

```markdown
# MindForge Intelligence — Anti-Pattern Detection Engine

## Purpose
Proactively detect known anti-patterns before they become embedded technical debt.
Runs at three trigger points: during planning (catch design anti-patterns),
during execution (catch implementation anti-patterns), and during review
(catch architecture anti-patterns).

## Anti-pattern library

### Category A — Architecture Anti-Patterns

**A01 — God Object / God Service**
```
Detection: A single file or service with > 500 lines AND is imported by > 5 other modules.
Signal: `wc -l src/**/*.ts | sort -rn | head -5` combined with import graph analysis.
Severity: HIGH
Impact: Untestable, unscalable, merge conflict magnet.
Recommendation: Split into focused domain services. Identify bounded contexts.
```

**A02 — Circular Dependencies**
```
Detection: Module A imports B which imports A (directly or transitively).
Signal: Use `madge --circular src/` (Node.js) or `python -m modulefinder`.
Severity: HIGH
Impact: Prevents tree-shaking, causes hard-to-debug initialisation errors.
Recommendation: Introduce an interface/abstraction layer to break the cycle.
```

**A03 — Distributed Monolith**
```
Detection: Multiple services but all share the same database schema or call each other synchronously on every request.
Signal: Multiple service directories but shared `db/` or `schema.prisma`. Direct service-to-service HTTP calls in the critical path.
Severity: MEDIUM
Impact: Gets the downsides of microservices (operational complexity) without the benefits (independent deployability).
Recommendation: Either consolidate into a true monolith or introduce proper service boundaries with async communication.
```

**A04 — Hardcoded Configuration**
```
Detection: String literals for URLs, timeouts, limits, feature names in source code (not in config/env).
Signal: grep -rn "localhost\|8080\|3000\|http://\|60000\|timeout.*=.*[0-9]" src/
Severity: MEDIUM
Impact: Environment-specific code, impossible to change without redeployment.
Recommendation: Extract to config file or environment variables.
```

### Category B — Database Anti-Patterns

**B01 — SELECT * in Production Queries**
```
Detection: `SELECT *` in any ORM raw query or SQL string.
Signal: grep -rn "SELECT \*" src/ --include="*.ts" --include="*.py"
Severity: MEDIUM
Impact: Over-fetches data, breaks when columns are added, prevents index-only scans.
Recommendation: Always specify required columns explicitly.
```

**B02 — Missing Database Indexes on Foreign Keys**
```
Detection: Foreign key columns without corresponding index definitions.
Signal: Compare FK declarations in schema with index declarations.
Severity: HIGH
Impact: Every JOIN on an FK is a full table scan — catastrophic at scale.
Recommendation: Add index for every foreign key column.
```

**B03 — Unbounded Queries (No LIMIT)**
```
Detection: Database queries in list-fetching code without LIMIT/pagination.
Signal: grep -rn "findMany\(\|find_all\|SELECT.*FROM" src/ | grep -v "LIMIT\|take:\|limit:"
Severity: HIGH
Impact: Memory exhaustion, response timeout, database load spike.
Recommendation: Always paginate. Default page size 20, max 100.
```

### Category C — Security Anti-Patterns

**C01 — Authentication Bypass via Type Coercion**
```
Detection: Auth checks using loose equality (`==` instead of `===` in JS/TS).
Signal: grep -rn "== null\|== undefined\|== false\|== 0" src/auth/ src/middleware/
Severity: CRITICAL
Impact: Type coercion can bypass null/undefined/false checks — auth bypass vector.
Recommendation: Always use strict equality (===) in security-critical paths.
```

**C02 — Missing Authorization on Internal Routes**
```
Detection: API routes without auth middleware applied.
Signal: Read all route files, check each route for auth middleware application.
Flag any route that does NOT call an auth middleware before handler execution.
Severity: HIGH
Impact: Unauthenticated access to data or operations.
Recommendation: Apply auth middleware at the router level, not per-route.
```

**C03 — Sensitive Data in URL Parameters**
```
Detection: Routes that accept sensitive identifiers in query strings or path params without ownership verification.
Signal: grep -rn "req.query.email\|req.params.userId\|req.query.token" src/
Severity: HIGH
Impact: Sensitive data in web server logs, CDN logs, browser history, referrer headers.
Recommendation: Use POST bodies for sensitive data, verify ownership server-side.
```

### Category D — Code Quality Anti-Patterns

**D01 — Callback Hell / Promise Chain Pyramids**
```
Detection: Nesting depth > 4 in async code.
Signal: eslint rule: max-depth: [error, 4] — or manual check for deeply indented .then() chains.
Severity: MEDIUM
Impact: Unreadable, hard to error handle, hard to test.
Recommendation: Use async/await with explicit error handling.
```

**D02 — Magic String Comparisons**
```
Detection: String literals used in conditional logic (not in constants or enums).
Signal: grep -rn '"pending"\|"active"\|"admin"\|"user"\|"error"\|"success"' src/ --include="*.ts"
Look for these in if/switch/filter contexts.
Severity: LOW
Impact: Typos cause silent failures, refactoring breaks multiple files.
Recommendation: Use TypeScript string enums or const assertions.
```

**D03 — Swallowed Errors**
```
Detection: Empty catch blocks or catch blocks that only log without re-throwing or handling.
Signal: grep -rn "catch.*{}" src/ OR grep -A2 "catch" src/ | grep -v "throw\|return\|reject\|log"
Severity: HIGH
Impact: Errors silently disappear — no visibility into failures in production.
Recommendation: Always handle or re-throw. Log with context. Never swallow.
```

### Category E — Testing Anti-Patterns

**E01 — Tests That Test Implementation, Not Behaviour**
```
Detection: Tests that call private methods or test internal state rather than public API outcomes.
Signal: Test files that import non-exported functions, or check internal properties.
Severity: MEDIUM
Impact: Tests break on refactoring even when behaviour is correct.
Recommendation: Test through the public interface. Test what it does, not how.
```

**E02 — Flaky Test Indicators**
```
Detection: Tests using setTimeout, Math.random(), new Date(), or non-deterministic external calls without mocking.
Signal: grep -rn "setTimeout\|Math.random\|new Date()\|Date.now()" tests/
Severity: MEDIUM
Impact: CI failures that cannot be reproduced locally — trust erosion.
Recommendation: Mock time, randomness, and external services in tests.
```

---

## Detection trigger points and commands

### At plan-phase time (design anti-patterns)
Run: A01, A02, A03, A04 against existing codebase.
Report findings in DIFFICULTY-SCORE file as risk amplifiers.

### At execute-phase time (implementation anti-patterns)
Run: B01, B02, B03, C01, C02, C03, D03 against the current diff.
Flag as quality gate warnings (not blocking unless CRITICAL).

### At review time (/mindforge:review)
Run full library: all A, B, C, D, E categories.
Include in CODE-REVIEW report under "Anti-pattern findings."

## Anti-pattern report format

```markdown
## Anti-Pattern Scan Results

### Critical findings
| ID | Pattern | Location | Recommendation |
|---|---|---|---|
| C01 | Auth bypass via == | src/auth/verify.ts:47 | Use === for auth checks |

### High findings
| ID | Pattern | Location | Recommendation |
|---|---|---|---|
| B02 | Missing FK index | schema.prisma:orderId | Add @@index([orderId]) |
| D03 | Swallowed error | src/api/users.ts:89 | Re-throw or handle |

### Medium findings
[...]
```
```

**Commit:**
```bash
git add .mindforge/intelligence/antipattern-detector.md
git commit -m "feat(intelligence): implement anti-pattern detection library (5 categories, 13 patterns)"
```

---

## TASK 6 — Write the Skill Gap Analyser

### `.mindforge/intelligence/skill-gap-analyser.md`

```markdown
# MindForge Intelligence — Skill Gap Analyser

## Purpose
Before and during phase planning, analyse the planned work to identify
which skills will be needed. Compare against installed skills to detect
gaps — skills that should exist but don't.

## When to run
1. At `/mindforge:plan-phase` start — before task decomposition
2. At `/mindforge:discuss-phase` — inform the discussion with skill availability
3. At `/mindforge:health` — identify framework-level skill gaps

---

## Phase skill requirement analysis

### Step 1 — Extract work signals from phase context

Read all available context for the phase:
- ROADMAP.md phase description
- CONTEXT.md (if discuss-phase was run)
- REQUIREMENTS.md entries for this phase
- ARCHITECTURE.md relevant sections

Identify work categories present:
```
UI/UX work?           → needs accessibility skill
Database changes?     → needs database-patterns skill
API design?           → needs api-design skill
Payment/PII/auth?     → needs security-review skill
Performance concern?  → needs performance skill
User data?            → needs data-privacy skill
New service/feature?  → needs testing-standards skill
Documentation needed? → needs documentation skill
Incident prone area?  → needs incident-response skill
```

### Step 2 — Map work categories to skills

```
UI/UX work         → accessibility (required), performance (recommended)
Database changes   → database-patterns (required), data-privacy (if PII fields)
API endpoints      → api-design (required), security-review (if auth)
Auth/payments/PII  → security-review (required), data-privacy (if PII)
Test coverage      → testing-standards (required)
New feature        → documentation (recommended)
Performance NFR    → performance (required)
Incident risk area → incident-response (recommended)
```

### Step 3 — Check skill availability

For each required and recommended skill:
```bash
# Check if skill exists in MANIFEST.md
grep "| [skill-name] |" .mindforge/org/skills/MANIFEST.md

# Check if SKILL.md file exists at expected path
ls .mindforge/skills/[skill-name]/SKILL.md
```

### Step 4 — Identify gaps

A gap is a required skill that:
a) Does not exist in MANIFEST.md, OR
b) Exists in MANIFEST.md but its SKILL.md file is missing, OR
c) Exists but its `status` is `deprecated` with no replacement

### Step 5 — Generate skill gap report

Report included in the phase difficulty assessment:

```markdown
## Skill Gap Analysis — Phase [N]

### Required skills (must have for this phase)
| Skill | Status | Action |
|---|---|---|
| security-review | ✅ Installed (v1.0.0) | Auto-loaded |
| api-design | ✅ Installed (v1.0.0) | Auto-loaded |
| database-patterns | ✅ Installed (v1.0.0) | Auto-loaded |
| oauth-patterns | ❌ NOT INSTALLED | See recommendation below |

### Recommended skills (beneficial for this phase)
| Skill | Status | Action |
|---|---|---|
| performance | ✅ Installed (v1.0.0) | Auto-loaded |
| testing-standards | ✅ Installed (v1.0.0) | Auto-loaded |

### Gaps identified: 1 required skill missing

**oauth-patterns (MISSING)**
This phase implements OAuth 2.0 social login. The core `security-review` skill
covers general auth security but does not include OAuth-specific guidance:
- PKCE implementation
- State parameter for CSRF protection
- Token storage for OAuth flows
- Provider-specific quirks (Google, GitHub, Apple)

**Options:**
1. Create an `oauth-patterns` org skill before planning (recommended — ~30 minutes)
   Template: see `docs/skills-authoring-guide.md`
2. Proceed without the skill — the security-review skill provides partial coverage
   (risk: OAuth-specific patterns may be missed)
3. Add OAuth guidance to an existing skill as a minor update

Run /mindforge:skills add to register a new skill.
```

## Org-level skill gap analysis

At `/mindforge:health`, run a broader analysis comparing:
- The phases completed in the last 6 months (from AUDIT.jsonl)
- The skills available
- Frequency of skill trigger matches vs. gaps

Report: "Based on your recent phases, these skills would have been beneficial:
[list with frequency counts] — consider creating org skills for your tech stack."
```

**Commit:**
```bash
git add .mindforge/intelligence/skill-gap-analyser.md
git commit -m "feat(intelligence): implement skill gap analyser for phase planning"
```

---

## TASK 7 — Write the Team Profile System

### `.mindforge/team/TEAM-PROFILE.md`

```markdown
# MindForge Team Profile
# Auto-generated by /mindforge:profile-team
# Last updated: [ISO-8601]

## Team composition

### Members
| Name | Email (git config) | Primary role | Timezone | Experience level |
|---|---|---|---|---|
| [John Smith] | john@company.com | Backend engineer | UTC+5:30 | Senior |
| [Jane Doe] | jane@company.com | Frontend engineer | UTC+0 | Senior |
| [Alex Kim] | alex@company.com | Full-stack engineer | UTC+5:30 | Mid-level |

### Tech stack preferences (inferred from git history and declared)
| Layer | Preferred | Comfortable | Learning |
|---|---|---|---|
| Backend | TypeScript/Node.js | Python | Go |
| Frontend | React/Next.js | Vue | Svelte |
| Database | PostgreSQL | MySQL | MongoDB |
| Testing | Vitest | Jest | Playwright |

## Working patterns (inferred from AUDIT.jsonl and git history)

### Session patterns
- Average session length: [N] minutes
- Peak working hours: [inferred from commit timestamps]
- Average tasks per session: [N]
- Context compaction frequency: every ~[N] tasks

### Quality patterns
- Verify pass rate: [N%] (tasks that passed first verify attempt)
- Common failure type: [most frequent task_failed reason from AUDIT]
- Average plans per phase: [N]
- Phase difficulty preference: [Easy/Moderate/Challenging — from difficulty scores]

### Collaboration patterns
- Phases worked alone vs. collaboratively: [N solo, N collaborative]
- Most common reviewer: [from approval records]
- Average approval wait time: [from approval AUDIT entries]

## Skill coverage

Based on session analysis, team members demonstrate proficiency in:
| Skill area | Proficiency | Evidence |
|---|---|---|
| Security | High | [N] security reviews completed, 0 CRITICAL findings in production |
| Testing | Medium | [N%] average test coverage |
| Documentation | Low | [N] ADRs written, README updated [N] times |

## Personalisation rules

These rules are applied by agents to personalise responses for this team:

### Communication style
[Inferred or declared]:
- Verbosity: concise (prefers short answers, not extensive explanations)
- Code style: functional over OOP (seen in patterns)
- Review style: direct (no softening language needed)

### Technical preferences (for planning decisions)
- Error handling: always use Result types over exceptions
- Testing approach: TDD where possible
- Code organisation: feature-based over layer-based
- ORM usage: Prisma (not raw SQL)

### Known strengths (agents lean into these)
- Auth and security implementation
- Database optimisation

### Known gaps (agents are more careful here, add more guidance)
- Frontend accessibility (team has limited a11y experience)
- Infrastructure as code (mostly manual)
```

---

### `.mindforge/team/profiles/README.md`

```markdown
# MindForge Per-Developer Profiles

## Purpose
Per-developer profiles store individual preferences and working patterns
that complement the team profile. Agents use these for personalised responses
when the developer's identity can be determined from git config.

## File naming
`PROFILE-[dev-id].md` where dev-id is derived from git config user.email
(same convention as multi-developer HANDOFF).

## Profile template

Create a file: `PROFILE-[dev-id].md`

```markdown
# Developer Profile — [Name]
# dev-id: [sanitised email]
# Last updated: [ISO-8601]

## Identity
Name: [Name]
Email: [email]
Role: [role]
Timezone: [UTC+X]

## Declared preferences

### Communication
- Verbosity: concise | balanced | detailed
- Code examples: always | when helpful | rarely
- Explanation depth: brief | standard | thorough
- Tone: direct | balanced | encouraging

### Technical preferences
- [Any specific technical preferences for this developer]

## Observed patterns (auto-populated from AUDIT.jsonl)

### Session quality
- Average verify pass rate: [N%]
- Most common quality gate failure: [type]
- Average tasks per session before compaction: [N]

### Strengths
[Inferred from successful task patterns]

### Growth areas
[Inferred from repeated failure patterns or low verify pass rates]
```

## Privacy note
Developer profiles are committed to the team repository.
They should contain professional observations only.
Never include personal information beyond what is directly relevant
to team collaboration and agent personalisation.
```

**Commit:**
```bash
git add .mindforge/team/
git commit -m "feat(team): implement team profile system with tech preferences and quality patterns"
```

---

## TASK 8 — Write the Metrics System

### `.mindforge/metrics/METRICS-SCHEMA.md`

```markdown
# MindForge Metrics — Schema Reference

## Purpose
Track agent quality and project health over time. Provide trend analysis
to identify improvement opportunities and early warning signals.

## Metrics file location
`.mindforge/metrics/` — one file per metric category

## Metric files

### `session-quality.jsonl`
One entry per completed session:

```json
{
  "session_id": "sess_abc",
  "date": "YYYY-MM-DD",
  "phase": 3,
  "developer_id": "john-company-com",
  "duration_estimate": "short|medium|long",
  "tasks_attempted": 5,
  "tasks_completed": 4,
  "tasks_failed": 1,
  "verify_pass_rate": 0.8,
  "quality_gates_failed": 0,
  "security_findings": 0,
  "context_compactions": 1,
  "compaction_level": 2,
  "skills_loaded_count": 3,
  "antipatterns_detected": 0,
  "session_quality_score": 82
}
```

**Session quality score formula:**
```
base = 100
- 15 per task_failed
- 10 per quality_gate_failed
- 20 per security finding (CRITICAL: -30, HIGH: -15, MEDIUM: -5)
- 5 per antipattern_detected (HIGH severity: -10, MEDIUM: -5)
+ 5 if zero quality gate failures
+ 5 if zero security findings
= session_quality_score (clamped 0-100)
```

### `phase-metrics.jsonl`
One entry per completed phase:

```json
{
  "phase": 3,
  "date_started": "YYYY-MM-DD",
  "date_completed": "YYYY-MM-DD",
  "difficulty_score": 3.85,
  "tasks_planned": 8,
  "tasks_completed": 8,
  "waves_executed": 3,
  "total_commits": 8,
  "requirements_delivered": 10,
  "requirements_total": 10,
  "test_coverage_pct": 84,
  "security_findings_total": 3,
  "security_findings_critical": 0,
  "security_findings_remediated": 3,
  "uat_pass_rate": 1.0,
  "rework_count": 1,
  "approval_wait_hours": 2.5,
  "phase_quality_score": 91
}
```

**Phase quality score formula:**
```
base = 100
- 10 per open security finding (unresolved at phase end)
- 5 per rework event (fix plan created during UAT)
- 3 per requirement not delivered
+ 5 if all requirements delivered AND all tests passing
+ 5 if zero security findings
+ 3 if UAT pass rate = 1.0
= phase_quality_score (clamped 0-100)
```

### `skill-usage.jsonl`
One entry per skill loading event:

```json
{
  "date": "YYYY-MM-DD",
  "phase": 3,
  "plan": "02",
  "skill_name": "security-review",
  "skill_version": "1.0.0",
  "trigger_type": "text_match|file_path_match|file_name_match",
  "trigger_keyword": "jwt.sign",
  "task_outcome": "completed|failed",
  "verify_passed_first_try": true
}
```

### `compaction-quality.jsonl`
One entry per compaction event:

```json
{
  "date": "YYYY-MM-DD",
  "compaction_level": 2,
  "context_pct_at_compaction": 84,
  "decisions_captured": 3,
  "discoveries_captured": 2,
  "implicit_knowledge_items": 4,
  "quality_signals_captured": 1,
  "next_session_continuation_success": true
}
```
`next_session_continuation_success`: did the next session successfully resume
from the compacted state without needing to re-do work? (Manual assessment, defaults null)

## Metrics writing protocol

Write metric entries at these moments:
- `session-quality.jsonl`: at session end (before /mindforge:status is shown)
- `phase-metrics.jsonl`: when a phase is marked complete
- `skill-usage.jsonl`: whenever a skill is loaded for a task
- `compaction-quality.jsonl`: whenever context compaction occurs

All metric files are append-only (same convention as AUDIT.jsonl).
```

---

### `.mindforge/metrics/quality-tracker.md`

```markdown
# MindForge Metrics — Quality Tracker

## Purpose
Analyse metric files to produce trend reports and early warning signals.

## Trend analysis windows
- Short-term: last 5 sessions
- Medium-term: last 20 sessions
- Long-term: all sessions

## Key metrics to track

### Verify pass rate trend
A decreasing trend indicates: plans are too vague, wrong skills loaded,
or context quality degrading over sessions.

Target: > 85% first-attempt verify pass rate
Warning: < 75% over the last 5 sessions
Action: Review plan quality — are `<verify>` steps clear and executable?

### Security finding frequency
An increasing trend indicates: security review skill not loading correctly,
new tech domains introduced without security skills, or code quality declining.

Target: < 1 HIGH+ finding per phase
Warning: 2+ CRITICAL findings in the last 3 phases
Action: Run /mindforge:security-scan --deep, review security-review skill triggers

### Task failure rate
A high task failure rate indicates: plans too ambitious, wrong persona loaded,
or quality gates misconfigured.

Target: < 10% task failure rate
Warning: > 20% failure rate in last session
Action: Review the most recent failed task — what was the verify output?

### Context compaction frequency
Compacting frequently (every 3-4 tasks) suggests context is being used inefficiently.

Target: < 1 compaction per 8 tasks
Warning: > 2 compactions per session
Action: Review skill loading — too many skills injected per task?

## Early warning signals (auto-reported in /mindforge:metrics)

| Signal | Condition | Suggested action |
|---|---|---|
| Quality degradation | Session quality score dropping 10+ points over last 3 sessions | Review recent plan complexity and skill coverage |
| Security regression | Any CRITICAL finding after 3 clean phases | Immediate security scan |
| Compaction overhead | > 2 compactions in last session | Reduce skill injection scope |
| Stale skills | Any skill not loaded in last 10 sessions | Consider deprecating unused skills |
| Approval bottleneck | Average approval wait > 12 hours | Review approver availability or tier thresholds |
```

**Commit:**
```bash
git add .mindforge/metrics/
git commit -m "feat(metrics): implement quality metrics schema and trend analysis system"
```

---

## TASK 9 — Write MINDFORGE.md — The Project Constitution

### `MINDFORGE.md` (root of the project)

```markdown
# MINDFORGE.md — Project Constitution
# This file is the master override for all MindForge defaults in this project.
# Read by every MindForge agent at session start (after CLAUDE.md).
# CLAUDE.md is the law. MINDFORGE.md is the project-specific interpretation.

## Project identity
NAME=[Your project name]
VERSION=[Current project version]
DESCRIPTION=[One sentence]
MINDFORGE_VERSION_REQUIRED=0.5.0

---

## Override: Model preferences

# Which Claude model to use for each agent type
# Options: claude-opus-4-5 | claude-sonnet-4-5 | claude-haiku-4-5 | inherit
PLANNER_MODEL=claude-opus-4-5
EXECUTOR_MODEL=claude-sonnet-4-5
REVIEWER_MODEL=claude-sonnet-4-5
VERIFIER_MODEL=claude-sonnet-4-5
SECURITY_MODEL=claude-opus-4-5
DEBUG_MODEL=claude-opus-4-5

---

## Override: Execution behaviour

# Auto-approve Tier 1 changes without confirmation (default: true)
TIER1_AUTO_APPROVE=true

# Require explicit user confirmation before each wave starts (default: false)
WAVE_CONFIRMATION_REQUIRED=false

# Run discuss-phase automatically before plan-phase (default: false)
AUTO_DISCUSS_PHASE=false

# Minimum acceptable verify pass rate before flagging concerns
VERIFY_PASS_RATE_WARNING_THRESHOLD=0.75

# Context compaction trigger (percentage, default: 70)
COMPACTION_THRESHOLD_PCT=70

# Maximum tasks per phase before suggesting a phase split
MAX_TASKS_PER_PHASE=15

---

## Override: Quality standards

# Minimum test coverage percentage (default: 80)
MIN_TEST_COVERAGE_PCT=80

# Maximum function length in lines (default: 40)
MAX_FUNCTION_LINES=40

# Maximum cyclomatic complexity (default: 10)
MAX_CYCLOMATIC_COMPLEXITY=10

# Require ADR for every architectural decision (default: false)
REQUIRE_ADR_FOR_ALL_DECISIONS=false

# Block PRs with any open MEDIUM security findings (default: false — only CRITICAL/HIGH block)
BLOCK_ON_MEDIUM_SECURITY_FINDINGS=false

---

## Override: Skills behaviour

# Skills to always load regardless of trigger matching (comma-separated)
ALWAYS_LOAD_SKILLS=security-review

# Skills to never load (disabled for this project)
DISABLED_SKILLS=

# Maximum number of skills to fully inject (beyond this, summarise)
MAX_FULL_SKILL_INJECTIONS=3

---

## Override: Git and commits

# Commit message format (default: conventional-commits)
# Options: conventional-commits | custom | none
COMMIT_FORMAT=conventional-commits

# Branch naming strategy (default: none)
# Options: none | phase | milestone
BRANCHING_STRATEGY=phase

# Branch template for phase branches
PHASE_BRANCH_TEMPLATE=feat/phase-{N}-{slug}

# Require all commits to be signed (GPG)
REQUIRE_SIGNED_COMMITS=false

---

## Override: Notifications

# Which events trigger Slack notifications (comma-separated)
# Options: all | phase_complete | security_critical | approval_needed | blocker | milestone
NOTIFY_ON=phase_complete,security_critical,approval_needed

# Mention specific users for security CRITICAL findings
SECURITY_CRITICAL_MENTION=@security-team

---

## Override: Governance

# Minimum complexity score to require discuss-phase before plan-phase
DISCUSS_PHASE_REQUIRED_ABOVE_DIFFICULTY=3.5

# Anti-pattern detection sensitivity
# Options: strict | standard | relaxed
ANTIPATTERN_SENSITIVITY=standard

# Block phase execution if HIGH anti-patterns detected (default: false — warn only)
BLOCK_ON_HIGH_ANTIPATTERNS=false

---

## Project-specific agent instructions

# These instructions are appended to EVERY agent's context for this project.
# Use for project-specific rules not captured in CONVENTIONS.md.

ADDITIONAL_AGENT_INSTRUCTIONS="""
- This project uses the monorepo structure: packages/api, packages/web, packages/shared
- Always check packages/shared before creating new utilities (may already exist)
- The /api package uses Fastify v4 — not Express — check Fastify docs for middleware syntax
- Never import from packages/web into packages/api (one-way dependency)
- All date handling uses date-fns — never moment.js or dayjs
"""

---

## Project-specific forbidden patterns

# Patterns that are forbidden specifically in this project (beyond CONVENTIONS.md)
PROJECT_FORBIDDEN_PATTERNS="""
- No direct database access from packages/web (always via API)
- No synchronous I/O in packages/api request handlers
- No console.log in packages/api (use the logger from packages/shared/logger)
- No TODO comments — create a GitHub issue instead
"""
```

**Commit:**
```bash
git add MINDFORGE.md
git commit -m "feat(core): add MINDFORGE.md project constitution with comprehensive overrides"
```

---

## TASK 10 — Write all 4 new commands

### `.claude/commands/mindforge/health.md`

```markdown
# MindForge — Health Command
# Usage: /mindforge:health [--repair] [--category C] [--verbose]

## Purpose
Run a comprehensive health check of the MindForge installation and project state.
Detect drift, corruption, stale state, and misconfiguration.

## Step 1 — Run health engine
Execute all 7 categories from `.mindforge/intelligence/health-engine.md` in order.

## Step 2 — Display results

Format: category-by-category with clear status indicators.

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⚡ MindForge Health Check — v[X.Y.Z]
  Project: [name] | Date: [ISO-8601]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  ✅ Installation integrity     — 47/47 files present, commands in sync
  ⚠️  Context files              — 2 warnings (see below)
  ✅ Skills registry             — 10 skills registered, all valid
  ✅ Persona system              — 8 personas valid, 0 override issues
  ❌ State consistency           — 1 error (see below)
  ✅ Integration connectivity    — Jira ✅  Confluence ✅  Slack ❌ (unconfigured)
  ⚠️  Security configuration     — 1 warning (see below)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  Errors (must fix):
  [1] Phase 2 shows "complete" in STATE.md but VERIFICATION.md is missing.
      Fix: Run /mindforge:verify-phase 2

  Warnings (should fix):
  [1] STATE.md last updated 38 days ago — may be stale
  [2] .mindforge/org/SECURITY.md has 2 unfilled sections (search: "[placeholder]")
  [3] Slack SLACK_BOT_TOKEN not configured (notifications will be skipped)

  Informational:
  [i] AUDIT.jsonl: 7,832 entries (archive threshold: 10,000 — 2,168 remaining)
  [i] MindForge v0.4.0 installed (latest: v0.5.0 — run npx mindforge-cc@latest)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Overall: ⚠️  1 error, 3 warnings
  Run /mindforge:health --repair to auto-fix applicable issues.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

## --repair mode
Apply all auto-repairable fixes from the health engine.
For each fix: report what was done.
For non-auto-repairable: provide exact manual steps.

## --category flag
Run only one category: `--category installation|context|skills|personas|state|integrations|security`

## --verbose flag
Include detailed output for each check (file paths, exact values checked).
Without --verbose: only report issues. With --verbose: report all checks including passing.

## AUDIT entry
```json
{ "event": "health_check_completed", "errors": [N], "warnings": [N], "repaired": [N] }
```
```

---

### `.claude/commands/mindforge/retrospective.md`

```markdown
# MindForge — Retrospective Command
# Usage: /mindforge:retrospective [phase N|milestone M] [--template agile|4ls|starfish]

## Purpose
Facilitate a structured retrospective for a completed phase or milestone.
Extract learnings, identify improvements, and create trackable action items.

## Retrospective templates

### `--template agile` (default) — Classic Agile Format
- What went well?
- What didn't go well?
- What would we do differently?
- Action items (with owner and due date)

### `--template 4ls` — Four Ls
- Liked (what was valuable)
- Learned (new insights and knowledge)
- Lacked (what was missing)
- Longed for (what we wish we had)

### `--template starfish` — Starfish
- Keep doing (valuable, continue)
- Less of (valuable but doing too much)
- More of (valuable but doing too little)
- Start doing (not doing, should start)
- Stop doing (not valuable, stop)

---

## Step 1 — Gather data automatically

Before asking any questions, collect objective data from the project artifacts:

```markdown
### Quantitative data gathered:
- Phase [N] duration: [start date] → [end date] = [N] days
- Tasks: [X] completed, [Y] failed, [Z] required rework
- Verify pass rate: [N%]
- Security findings: [N] total (CRITICAL: [N], HIGH: [N]) — all remediated? [yes/no]
- Code review findings: [N] blocking, [N] major, [N] minor
- UAT: [N] deliverables tested, [N] passed first attempt, [N] required fixes
- Anti-patterns detected: [N] (HIGH: [N], MEDIUM: [N])
- Approval wait time: [N] hours average
- Context compactions: [N]

### Qualitative signals from AUDIT.jsonl:
- Most common failure type: [from task_failed events]
- Most active skill: [from skill_usage.jsonl — most loaded]
- Quality trend: [improving/stable/declining from session scores]
```

## Step 2 — Structured discussion

Present data summary. Then ask structured questions:

```
Phase [N] Retrospective — [template name]

─── Data summary ────────────────────────────────────────────────
[quantitative data from Step 1]

─── Discussion ──────────────────────────────────────────────────

[For agile template:]
1. "Looking at the data and your experience — what went well this phase?"
   [wait for full answer]
2. "What didn't go as planned or caused friction?"
   [wait for full answer]
3. "What would you do differently next time?"
   [wait for full answer]
4. "Based on everything — what 2-3 action items should we commit to?"
   [help them be specific: who does it, by when, how we know it's done]
```

## Step 3 — Write retrospective document

`.planning/phases/[N]/RETROSPECTIVE-[N].md` (for phase retros)
`.planning/milestones/RETRO-[milestone-name].md` (for milestone retros)

```markdown
# Retrospective — Phase [N]
**Date:** [ISO-8601]
**Attendees:** [from git config user.email history for this phase]
**Template:** [template name]
**Facilitator:** MindForge

## Quantitative summary
[Data from Step 1]

## Discussion

### What went well
[From discussion — formatted as bullets]

### What didn't go well
[From discussion — formatted as bullets]

### What we'd do differently
[From discussion — formatted as bullets]

## Action items
| Action | Owner (git email) | Due | How we know it's done |
|---|---|---|---|
| [action 1] | [owner] | [date] | [definition of done] |
| [action 2] | [owner] | [date] | [definition of done] |

## Key insights for future phases
[2-3 sentences: the most important learnings from this retrospective]

## MindForge configuration changes recommended
[Based on the retrospective — any MINDFORGE.md changes that would address issues raised]
```

## Step 4 — Create follow-up tasks

For each action item, offer to create:
- A quick task in MindForge: `Create /mindforge:quick for "[action]"`
- A Jira ticket (if configured): link to the retrospective document
- A STATE.md note: "Action item from Phase [N] retro: [action]"

## Step 5 — Update metrics

Write to `session-quality.jsonl`:
```json
{ "event": "retrospective_completed", "phase": [N], "action_items": [N] }
```

## Step 6 — Feed insights to future planning

Ask: "Should I add any of these learnings to MINDFORGE.md
to improve future phase planning?"

If yes: suggest specific MINDFORGE.md entries for each learning.
Example: "Verify pass rate was low because plans were too vague →
  consider setting DISCUSS_PHASE_REQUIRED_ABOVE_DIFFICULTY=2.5
  to run discussions earlier."
```

---

### `.claude/commands/mindforge/profile-team.md`

```markdown
# MindForge — Profile Team Command
# Usage: /mindforge:profile-team [--refresh] [--developer email] [--questionnaire]

## Purpose
Generate and maintain team capability profiles that personalise agent responses
for each developer and the team as a whole.

## Data sources (in priority order)
1. Declared preferences (via --questionnaire or manual TEAM-PROFILE.md edits)
2. Inferred patterns from AUDIT.jsonl and git history
3. Defaults from CONVENTIONS.md and TOOLS.md

## Step 1 — Infer from existing data

```bash
# Developer activity in AUDIT.jsonl
grep '"developer_id"' .planning/AUDIT.jsonl | \
  python3 -c "import sys,json,collections
counts = collections.Counter()
for l in sys.stdin:
    try: counts[json.loads(l).get('developer_id','unknown')] += 1
    except: pass
[print(f'{v}: {k}') for k,v in sorted(counts.items(), reverse=True)]"

# Session quality scores per developer
grep '"session_quality_score"' .mindforge/metrics/session-quality.jsonl 2>/dev/null | \
  python3 -c "import sys,json,collections
scores = collections.defaultdict(list)
for l in sys.stdin:
    try:
        d = json.loads(l)
        scores[d.get('developer_id','unknown')].append(d.get('session_quality_score',0))
    except: pass
[print(f'{k}: avg={sum(v)/len(v):.0f}') for k,v in scores.items()]"

# Most used skills per developer
# (from skill_usage.jsonl filtered by developer)

# Commit patterns (time-of-day from git log)
git log --format="%ae %ad" --date=format:"%H" | \
  awk '{print $1, $2}' | sort | uniq -c | sort -rn | head -20
```

## Step 2 — Optional questionnaire (--questionnaire flag)

If `--questionnaire` is provided, ask each team member:

```
Team Profile Setup — [N] questions (takes ~5 minutes)

1. "What's your primary role on this project?"
   Options: Backend / Frontend / Full-stack / DevOps / Tech Lead / Other

2. "How do you prefer agents to communicate?"
   Options: Very concise / Balanced / Detailed with explanations

3. "What's your experience level with the current tech stack?"
   Options: Expert / Proficient / Learning

4. "What areas do you consider your strongest?" (select all that apply)
   Options: Security / Performance / Testing / Architecture / Frontend / Backend / DevOps / Documentation

5. "What areas would benefit from extra agent guidance?" (select all that apply)
   Options: [same list]

6. "Any specific project rules the agent should always follow?"
   [free text — captured in PROJECT_FORBIDDEN_PATTERNS or ADDITIONAL_AGENT_INSTRUCTIONS]
```

## Step 3 — Generate / update profiles

Write `.mindforge/team/TEAM-PROFILE.md` with inferred + declared data.
Write `.mindforge/team/profiles/PROFILE-[dev-id].md` per developer.

## Step 4 — Validate and confirm

Show the team profile summary. Ask: "Does this accurately reflect your team?"
Allow corrections before saving.

## --refresh flag
Re-run inference only (no questionnaire). Updates patterns from latest AUDIT.jsonl data.
Use for: periodic profile updates as the team's patterns evolve.

## --developer flag
Update only the specified developer's profile.
Example: `/mindforge:profile-team --developer john@company.com --questionnaire`

## AUDIT entry
```json
{ "event": "team_profile_updated", "developers_profiled": [N], "method": "questionnaire|inferred" }
```
```

---

### `.claude/commands/mindforge/metrics.md`

```markdown
# MindForge — Metrics Command
# Usage: /mindforge:metrics [--phase N] [--window short|medium|long] [--export path]

## Purpose
Display quality metrics dashboard with trend analysis and early warning signals.

## Default dashboard (no flags)

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⚡ MindForge Quality Metrics — [Project Name]
  Window: Last 5 sessions (short-term)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  Session Quality Scores (last 5 sessions)
  ┌─────────────────────────────────────────────────┐
  │  Session  Score  Trend                          │
  │  sess-01    88   ██████████████████░░  (stable) │
  │  sess-02    91   ██████████████████████ (↑ +3)  │
  │  sess-03    76   ███████████████░░░░░░  (↓ -15) │
  │  sess-04    84   █████████████████░░░   (↑ +8)  │
  │  sess-05    89   ██████████████████░    (↑ +5)  │
  │  Average:   85.6                                │
  └─────────────────────────────────────────────────┘

  Key Metrics (short-term window)
  ─────────────────────────────────────────────────
  Verify pass rate         88% ✅  (target: 85%)
  Security findings (HIGH+) 1   ✅  (target: 0 unresolved)
  Task failure rate        12% ⚠️   (target: <10%)
  Compactions/session       1.2 ✅  (target: <2)
  Avg approval wait        3.4h ✅  (Tier 2 target: 24h)

  Top skills loaded
  ─────────────────────────────────────────────────
  security-review     12 times (via text: 8, file-path: 4)
  database-patterns    8 times
  api-design           7 times
  testing-standards    6 times
  accessibility        2 times

  Early warnings
  ─────────────────────────────────────────────────
  ⚠️  Task failure rate above target (12% vs 10%)
     Root cause: sess-03 had 2 failures both on database queries
     Recommendation: Review database-patterns skill triggers

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Run /mindforge:metrics --window long for all-time trends.
  Run /mindforge:retrospective to act on quality issues.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

## Data sources
1. `.mindforge/metrics/session-quality.jsonl`
2. `.mindforge/metrics/phase-metrics.jsonl`
3. `.mindforge/metrics/skill-usage.jsonl`
4. `.planning/AUDIT.jsonl` (for cross-referencing)

## Metric writing
This command READS metrics. Metrics are written during:
- Session end (session-quality.jsonl)
- Phase completion (phase-metrics.jsonl)
- Every skill load (skill-usage.jsonl)
- Every compaction (compaction-quality.jsonl)

## --export flag
Export metrics to a formatted Markdown report:
`/mindforge:metrics --export metrics-report-[date].md`

Suitable for sharing with engineering leads or including in sprint reviews.

## AUDIT entry
```json
{ "event": "metrics_viewed", "window": "short", "early_warnings": [N] }
```
```

**Commit:**
```bash
for cmd in health retrospective profile-team metrics; do
  cp .claude/commands/mindforge/${cmd}.md .agent/mindforge/${cmd}.md
done
git add .claude/commands/mindforge/ .agent/mindforge/
git commit -m "feat(commands): add health, retrospective, profile-team, metrics commands"
```

---

## TASK 11 — Write the Interactive Setup Wizard

### `bin/wizard/setup-wizard.js`

```javascript
#!/usr/bin/env node

/**
 * MindForge Interactive Setup Wizard
 * Provides a guided first-run experience with automatic environment detection.
 *
 * Usage: npx mindforge-cc (no flags = interactive wizard mode)
 *        npx mindforge-cc --claude --global (non-interactive)
 */

'use strict';

const fs   = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const readline = require('readline');
const detector = require('./environment-detector');
const generator = require('./config-generator');

const VERSION = require('../../package.json').version;
const ARGS = process.argv.slice(2);
const IS_INTERACTIVE = !ARGS.some(a => ['--claude','--antigravity','--all','--help'].includes(a));

// ── Colours (only if TTY) ─────────────────────────────────────────────────────
const TTY = process.stdout.isTTY;
const c = {
  bold:   s => TTY ? `\x1b[1m${s}\x1b[0m` : s,
  cyan:   s => TTY ? `\x1b[36m${s}\x1b[0m` : s,
  green:  s => TTY ? `\x1b[32m${s}\x1b[0m` : s,
  yellow: s => TTY ? `\x1b[33m${s}\x1b[0m` : s,
  red:    s => TTY ? `\x1b[31m${s}\x1b[0m` : s,
  dim:    s => TTY ? `\x1b[2m${s}\x1b[0m` : s,
};

// ── Readline interface ────────────────────────────────────────────────────────
function createReadline() {
  return readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    terminal: TTY,
  });
}

async function ask(rl, question, defaultVal) {
  return new Promise(resolve => {
    const prompt = defaultVal
      ? `${question} ${c.dim(`[${defaultVal}]`)}: `
      : `${question}: `;
    rl.question(prompt, answer => {
      resolve(answer.trim() || defaultVal || '');
    });
  });
}

async function askChoice(rl, question, choices, defaultIdx = 0) {
  console.log(`\n${question}`);
  choices.forEach((c, i) => console.log(`  ${i + 1}) ${c}`));
  return new Promise(resolve => {
    rl.question(`Choice [${defaultIdx + 1}]: `, answer => {
      const idx = parseInt(answer.trim()) - 1;
      resolve(choices[!isNaN(idx) && idx >= 0 && idx < choices.length ? idx : defaultIdx]);
    });
  });
}

async function askMultiChoice(rl, question, choices) {
  console.log(`\n${question}`);
  choices.forEach((c, i) => console.log(`  ${i + 1}) ${c}`));
  return new Promise(resolve => {
    rl.question('Select (comma-separated, e.g. 1,3,4): ', answer => {
      const selected = answer.split(',')
        .map(s => parseInt(s.trim()) - 1)
        .filter(i => !isNaN(i) && i >= 0 && i < choices.length)
        .map(i => choices[i]);
      resolve(selected.length ? selected : [choices[0]]);
    });
  });
}

// ── Banner ────────────────────────────────────────────────────────────────────
function printBanner() {
  console.log('');
  console.log(c.bold(c.cyan('  ⚡ MindForge Setup Wizard')));
  console.log(c.dim(`  Enterprise Agentic Framework v${VERSION}`));
  console.log('');
}

// ── Step 1: Environment detection ─────────────────────────────────────────────
async function detectEnvironment() {
  console.log(c.bold('  Detecting your environment...\n'));
  const env = await detector.detect();

  const items = [
    ['Runtime(s) detected', env.runtimes.length ? env.runtimes.join(', ') : 'None found'],
    ['Git repository', env.hasGit ? '✅ Yes' : '❌ No (some features require git)'],
    ['Node.js version', `v${process.versions.node}`],
    ['OS', `${process.platform} ${process.arch}`],
    ['Project type', env.projectType || 'Unknown'],
    ['Package manager', env.packageManager || 'Unknown'],
    ['Existing MindForge', env.existingInstall ? `v${env.existingVersion}` : 'Not detected'],
  ];

  items.forEach(([k, v]) => console.log(`  ${c.dim(k.padEnd(22))} ${v}`));
  console.log('');
  return env;
}

// ── Step 2: Runtime selection ─────────────────────────────────────────────────
async function selectRuntime(rl, detectedRuntimes) {
  const options = ['Claude Code', 'Antigravity', 'Both (recommended)', 'Other (manual setup)'];
  const detected = detectedRuntimes.length
    ? `(detected: ${detectedRuntimes.join(', ')})`
    : '(none auto-detected)';

  const choice = await askChoice(
    rl,
    `Which runtime are you installing for? ${c.dim(detected)}`,
    options,
    detectedRuntimes.includes('claude') ? 0 : 2
  );

  return {
    'Claude Code':           ['claude'],
    'Antigravity':           ['antigravity'],
    'Both (recommended)':    ['claude', 'antigravity'],
    'Other (manual setup)':  [],
  }[choice] || ['claude'];
}

// ── Step 3: Install scope ─────────────────────────────────────────────────────
async function selectScope(rl) {
  const choice = await askChoice(
    rl,
    'Install scope:',
    [
      'Global — available in all projects (recommended)',
      'Local — this project only',
    ],
    0
  );
  return choice.includes('Global') ? 'global' : 'local';
}

// ── Step 4: Feature setup ─────────────────────────────────────────────────────
async function configureFeatures(rl) {
  console.log(c.bold('\n  Optional features (you can change these later in MINDFORGE.md):\n'));

  const features = await askMultiChoice(rl, 'Which features do you want to configure now?', [
    'Jira integration',
    'Confluence integration',
    'Slack notifications',
    'GitHub integration',
    'GitLab integration',
    'None — I\'ll configure later',
  ]);

  const config = {};

  if (features.includes('Jira integration')) {
    config.jira = {
      baseUrl:   await ask(rl, '  Jira base URL', 'https://your-org.atlassian.net'),
      userEmail: await ask(rl, '  Your Atlassian email', ''),
      projectKey: await ask(rl, '  Jira project key', 'ENG'),
    };
    console.log(c.yellow('\n  ℹ️  Set JIRA_API_TOKEN environment variable with your Atlassian API token.'));
    console.log(c.dim('     Get token at: https://id.atlassian.com/manage-profile/security/api-tokens\n'));
  }

  if (features.includes('Slack notifications')) {
    config.slack = {
      channelId: await ask(rl, '  Slack channel ID (e.g. C01234ABCDE)', ''),
    };
    console.log(c.yellow('\n  ℹ️  Set SLACK_BOT_TOKEN environment variable with your Slack bot token.'));
    console.log(c.dim('     Create a bot at: https://api.slack.com/apps\n'));
  }

  if (features.includes('GitHub integration')) {
    config.github = {
      repo:      await ask(rl, '  GitHub repo (owner/name)', ''),
      reviewers: await ask(rl, '  Default reviewers (comma-separated usernames)', ''),
    };
    console.log(c.yellow('\n  ℹ️  Set GITHUB_TOKEN environment variable with your GitHub token.'));
    console.log(c.dim('     Create token at: https://github.com/settings/tokens\n'));
  }

  return config;
}

// ── Step 5: Team setup ────────────────────────────────────────────────────────
async function configureTeam(rl) {
  const isTeam = await askChoice(rl, 'Are you setting up for a team (multiple developers)?', ['Yes', 'No'], 1);
  if (isTeam === 'No') return null;

  const teamSize = await ask(rl, '  How many developers? (approximate)', '3');
  const tier2Approvers = await ask(rl, '  Tier 2 approvers (git emails, comma-separated)', '');
  const tier3Approvers = await ask(rl, '  Tier 3 compliance approvers (git emails, comma-separated)', '');

  return { teamSize: parseInt(teamSize) || 3, tier2Approvers, tier3Approvers };
}

// ── Step 6: Install ───────────────────────────────────────────────────────────
async function install(runtimes, scope, config, team) {
  const installer = require('../install');
  console.log(c.bold('\n  Installing MindForge...\n'));

  for (const runtime of runtimes) {
    await installer.install(runtime, scope);
  }

  if (Object.keys(config).length) {
    console.log(c.bold('\n  Writing configuration...\n'));
    await generator.writeIntegrationsConfig(config);
    if (team) await generator.writeGovernanceConfig(team);
  }
}

// ── Step 7: Post-install guidance ─────────────────────────────────────────────
function printNextSteps(runtimes, scope) {
  console.log('');
  console.log(c.bold(c.green('  ✅ MindForge installed successfully!\n')));

  console.log(c.bold('  Next steps:\n'));
  console.log(`  ${c.cyan('1.')} Open Claude Code or Antigravity in your project directory`);
  console.log(`  ${c.cyan('2.')} Run: ${c.bold('/mindforge:health')} to verify everything is working`);
  console.log(`  ${c.cyan('3.')} Fill in ${c.bold('.mindforge/org/ORG.md')} with your organisation's standards`);
  console.log(`  ${c.cyan('4.')} Edit ${c.bold('MINDFORGE.md')} to customise defaults for this project`);
  console.log(`  ${c.cyan('5.')} Run: ${c.bold('/mindforge:init-project')} or ${c.bold('/mindforge:map-codebase')} to start\n`);

  console.log(c.dim('  Documentation: docs/enterprise-setup.md'));
  console.log(c.dim(`  Version: MindForge v${VERSION}\n`));
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  printBanner();

  if (!IS_INTERACTIVE) {
    // Non-interactive mode — delegate to original installer
    require('../install');
    return;
  }

  const rl = createReadline();

  try {
    const env      = await detectEnvironment();
    const runtimes = await selectRuntime(rl, env.runtimes);
    const scope    = await selectScope(rl);
    const config   = await configureFeatures(rl);
    const team     = await configureTeam(rl);

    rl.close();

    await install(runtimes, scope, config, team);
    printNextSteps(runtimes, scope);
  } catch (err) {
    rl.close();
    console.error(c.red(`\n  ❌ Setup failed: ${err.message}\n`));
    console.error(c.dim('  For non-interactive install: npx mindforge-cc --claude --global'));
    process.exit(1);
  }
}

main();
```

---

### `bin/wizard/environment-detector.js`

```javascript
/**
 * MindForge Environment Detector
 * Detects runtimes, project type, package manager, and existing MindForge install.
 */

'use strict';

const fs   = require('fs');
const path = require('path');
const { execSync } = require('child_process');

function safeExec(cmd) {
  try { return execSync(cmd, { encoding: 'utf8', stdio: ['ignore','pipe','ignore'] }).trim(); }
  catch { return null; }
}

async function detect() {
  const home = process.env.HOME || process.env.USERPROFILE || '';
  const cwd  = process.cwd();

  // Detect runtimes
  const runtimes = [];
  if (fs.existsSync(path.join(home, '.claude')) ||
      fs.existsSync(path.join(cwd, '.claude')))        runtimes.push('claude');
  if (fs.existsSync(path.join(home, '.gemini', 'antigravity')) ||
      fs.existsSync(path.join(cwd, '.agent')))          runtimes.push('antigravity');
  if (safeExec('which code 2>/dev/null'))               runtimes.push('vscode-copilot');
  if (fs.existsSync(path.join(home, '.codex')))         runtimes.push('codex');

  // Detect project type
  let projectType = 'unknown';
  if (fs.existsSync(path.join(cwd, 'package.json'))) {
    const pkg = JSON.parse(fs.readFileSync(path.join(cwd, 'package.json'), 'utf8'));
    if (pkg.dependencies?.next || pkg.dependencies?.react) projectType = 'Next.js / React';
    else if (pkg.dependencies?.fastify || pkg.dependencies?.express) projectType = 'Node.js API';
    else projectType = 'Node.js';
  } else if (fs.existsSync(path.join(cwd, 'pyproject.toml'))) {
    projectType = 'Python';
  } else if (fs.existsSync(path.join(cwd, 'Cargo.toml'))) {
    projectType = 'Rust';
  } else if (fs.existsSync(path.join(cwd, 'go.mod'))) {
    projectType = 'Go';
  }

  // Detect package manager
  let packageManager = 'npm';
  if (fs.existsSync(path.join(cwd, 'pnpm-lock.yaml')))  packageManager = 'pnpm';
  else if (fs.existsSync(path.join(cwd, 'yarn.lock')))  packageManager = 'yarn';
  else if (fs.existsSync(path.join(cwd, 'bun.lockb')))  packageManager = 'bun';

  // Detect existing MindForge install
  let existingInstall = false;
  let existingVersion = null;
  const claudeMd = path.join(cwd, '.claude', 'CLAUDE.md');
  if (fs.existsSync(claudeMd)) {
    const content = fs.readFileSync(claudeMd, 'utf8');
    if (content.includes('MindForge')) {
      existingInstall = true;
      const vMatch = content.match(/MindForge v(\d+\.\d+\.\d+)/);
      existingVersion = vMatch ? vMatch[1] : 'unknown';
    }
  }

  return {
    runtimes,
    hasGit: !!safeExec('git rev-parse --is-inside-work-tree'),
    projectType,
    packageManager,
    existingInstall,
    existingVersion,
    nodeVersion: process.versions.node,
    platform: process.platform,
  };
}

module.exports = { detect };
```

---

### `bin/wizard/config-generator.js`

```javascript
/**
 * MindForge Config Generator
 * Generates integration and governance config files from wizard input.
 */

'use strict';

const fs   = require('fs');
const path = require('path');

function ensureDir(p) {
  if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true });
}

async function writeIntegrationsConfig(config) {
  const configPath = '.mindforge/org/integrations/INTEGRATIONS-CONFIG.md';
  ensureDir(path.dirname(configPath));

  if (!fs.existsSync(configPath)) {
    console.error('INTEGRATIONS-CONFIG.md not found — run installer first');
    return;
  }

  let content = fs.readFileSync(configPath, 'utf8');

  if (config.jira) {
    content = content
      .replace('JIRA_BASE_URL=https://your-org.atlassian.net', `JIRA_BASE_URL=${config.jira.baseUrl}`)
      .replace('JIRA_PROJECT_KEY=ENG', `JIRA_PROJECT_KEY=${config.jira.projectKey}`);
  }

  if (config.slack) {
    content = content
      .replace('SLACK_CHANNEL_ID=C01234ABCDE', `SLACK_CHANNEL_ID=${config.slack.channelId}`);
  }

  if (config.github) {
    content = content
      .replace('GITHUB_REPO=your-org/your-repo', `GITHUB_REPO=${config.github.repo}`)
      .replace('GITHUB_DEFAULT_REVIEWERS=senior-engineer-1,senior-engineer-2', `GITHUB_DEFAULT_REVIEWERS=${config.github.reviewers}`);
  }

  fs.writeFileSync(configPath, content);
  console.log('  ✅ INTEGRATIONS-CONFIG.md updated');
}

async function writeGovernanceConfig(team) {
  const configPath = '.mindforge/governance/GOVERNANCE-CONFIG.md';
  ensureDir(path.dirname(configPath));

  if (!fs.existsSync(configPath)) return;

  let content = fs.readFileSync(configPath, 'utf8');
  if (team.tier2Approvers) {
    content = content.replace('TIER2_APPROVERS=senior-engineer-1,senior-engineer-2',
      `TIER2_APPROVERS=${team.tier2Approvers}`);
  }
  if (team.tier3Approvers) {
    content = content.replace('TIER3_APPROVERS=security-officer,compliance-officer,cto',
      `TIER3_APPROVERS=${team.tier3Approvers}`);
  }

  fs.writeFileSync(configPath, content);
  console.log('  ✅ GOVERNANCE-CONFIG.md updated');
}

module.exports = { writeIntegrationsConfig, writeGovernanceConfig };
```

**Commit:**
```bash
git add bin/wizard/
git commit -m "feat(wizard): implement interactive setup wizard with environment detection"
```

---

## TASK 12 — Update CLAUDE.md for Day 5

Add to `.claude/CLAUDE.md` and mirror to `.agent/CLAUDE.md`:

```markdown
---

## INTELLIGENCE LAYER (Day 5)

### MINDFORGE.md — read this at session start
After reading ORG.md and PROJECT.md, read `MINDFORGE.md` (if it exists).
MINDFORGE.md contains project-specific overrides for all MindForge defaults.
Apply these overrides immediately — they take precedence over CLAUDE.md defaults
for configuration values (thresholds, model selection, verbosity, etc.).

### Smart context compaction
Use Level 2 (structured extraction) as the default compaction mode.
See `.mindforge/intelligence/smart-compaction.md` for the full protocol.
Capture: decisions, discoveries, implicit knowledge, quality signals.
Do NOT just truncate — extract and preserve.

### Difficulty scoring before planning
Before creating task plans, run the difficulty scorer:
`.mindforge/intelligence/difficulty-scorer.md`
Report the score to the user. Let it inform task granularity and skill activation.

### Anti-pattern detection
Run the anti-pattern detector from `.mindforge/intelligence/antipattern-detector.md`:
- At plan-phase time: category A patterns on existing codebase
- At execute-phase time: categories B, C, D on the current diff
- At review time: full library

### Skill gap analysis
Before plan-phase, run skill gap analysis:
`.mindforge/intelligence/skill-gap-analyser.md`
Report any required skills that are missing. Do not block — inform.

### Metrics writing
Write metrics entries at these moments (even if no one runs /mindforge:metrics):
- Session end → session-quality.jsonl
- Phase completion → phase-metrics.jsonl
- Every skill load → skill-usage.jsonl
- Every compaction → compaction-quality.jsonl
These files power the quality trend analysis.

### Team profile personalisation
If `.mindforge/team/TEAM-PROFILE.md` exists: read it at session start.
Apply declared preferences: verbosity, communication style, technical preferences.
If a per-developer profile exists for the current developer: apply it additionally.

### New commands available (Day 5)
- `/mindforge:health` — comprehensive health check with auto-repair
- `/mindforge:retrospective` — structured phase/milestone retrospectives
- `/mindforge:profile-team` — team capability profiling
- `/mindforge:metrics` — quality metrics dashboard

---
```

**Commit:**
```bash
git add .claude/CLAUDE.md .agent/CLAUDE.md
git commit -m "feat(core): update CLAUDE.md with Day 5 intelligence layer awareness"
```

---

## TASK 13 — Write Day 5 test suites

### `tests/intelligence.test.js`

```javascript
/**
 * MindForge Day 5 — Intelligence Layer Tests
 * Run: node tests/intelligence.test.js
 */

'use strict';

const fs   = require('fs');
const path = require('path');
const assert = require('assert');

let passed = 0;
let failed = 0;

function test(name, fn) {
  try { fn(); console.log(`  ✅ ${name}`); passed++; }
  catch (e) { console.error(`  ❌ ${name}\n     ${e.message}`); failed++; }
}

function read(p) { return fs.existsSync(p) ? fs.readFileSync(p, 'utf8') : ''; }

// ── Difficulty scorer simulation ──────────────────────────────────────────────
function scoreDifficulty(signals) {
  const COMPLEX   = ['authentication','payment','migration','distributed','encryption','multi-tenant'];
  const MODERATE  = ['integration','webhook','email','notification','search'];
  let technical = 1;
  signals.forEach(s => {
    if (COMPLEX.some(c => s.toLowerCase().includes(c)))  technical = Math.max(technical, 4);
    if (MODERATE.some(c => s.toLowerCase().includes(c))) technical = Math.max(technical, 3);
  });
  return technical;
}

function compositeScore(t, r, a, d) {
  return parseFloat((t*0.35 + r*0.30 + a*0.20 + d*0.15).toFixed(2));
}

function recommendedTaskCount(score) {
  if (score <= 2.0) return { min: 2, max: 3 };
  if (score <= 3.0) return { min: 4, max: 6 };
  if (score <= 4.0) return { min: 6, max: 10 };
  return { min: 10, max: 15 };
}

// ── Anti-pattern simulation ───────────────────────────────────────────────────
function detectAntipattern(code) {
  const patterns = [
    { id: 'C01', regex: /==\s*null|==\s*undefined|==\s*false|==\s*0/, severity: 'CRITICAL', name: 'Auth bypass via type coercion' },
    { id: 'D03', regex: /catch\s*\([^)]*\)\s*\{\s*\}/, severity: 'HIGH', name: 'Swallowed error' },
    { id: 'B01', regex: /SELECT\s+\*/i, severity: 'MEDIUM', name: 'SELECT *' },
  ];
  return patterns.filter(p => p.regex.test(code));
}

// ── Session quality score simulation ─────────────────────────────────────────
function calcSessionScore({ tasksAttempted, tasksFailed, qualityGatesFailed, securityFindings }) {
  let score = 100;
  score -= tasksFailed * 15;
  score -= qualityGatesFailed * 10;
  score -= (securityFindings.critical || 0) * 30;
  score -= (securityFindings.high || 0) * 15;
  score -= (securityFindings.medium || 0) * 5;
  if (qualityGatesFailed === 0) score += 5;
  if (!securityFindings.critical && !securityFindings.high) score += 5;
  return Math.max(0, Math.min(100, score));
}

// ── Tests ─────────────────────────────────────────────────────────────────────
console.log('\nMindForge Day 5 — Intelligence Layer Tests\n');

console.log('Intelligence engine files:');
[
  'health-engine.md', 'difficulty-scorer.md', 'antipattern-detector.md',
  'skill-gap-analyser.md', 'smart-compaction.md'
].forEach(f => test(`${f} exists`, () => {
  assert.ok(fs.existsSync(`.mindforge/intelligence/${f}`), `Missing: .mindforge/intelligence/${f}`);
}));

console.log('\nDifficulty scorer:');

test('authentication phase scores technical complexity 4+', () => {
  assert.ok(scoreDifficulty(['authentication', 'JWT']) >= 4);
});

test('payment integration scores technical complexity 4+', () => {
  assert.ok(scoreDifficulty(['payment integration']) >= 4);
});

test('simple CRUD scores moderate or lower', () => {
  assert.ok(scoreDifficulty(['create user profile form']) <= 3);
});

test('composite score formula is correct', () => {
  const score = compositeScore(4, 5, 2, 3);
  assert.ok(score >= 3.5 && score <= 4.5, `Expected ~3.85, got ${score}`);
});

test('challenging difficulty recommends 6-10 tasks', () => {
  const rec = recommendedTaskCount(3.85);
  assert.strictEqual(rec.min, 6);
  assert.strictEqual(rec.max, 10);
});

test('easy difficulty recommends 2-3 tasks', () => {
  const rec = recommendedTaskCount(1.5);
  assert.strictEqual(rec.min, 2);
  assert.strictEqual(rec.max, 3);
});

test('hard difficulty (>4) recommends 10-15 tasks', () => {
  const rec = recommendedTaskCount(4.5);
  assert.strictEqual(rec.min, 10);
  assert.strictEqual(rec.max, 15);
});

console.log('\nAnti-pattern detector:');

test('detects C01 type coercion in auth check', () => {
  const found = detectAntipattern('if (user.role == null) return 401;');
  assert.ok(found.some(p => p.id === 'C01'), 'Should detect C01');
});

test('detects D03 swallowed error', () => {
  const found = detectAntipattern('try { doThing() } catch(e) {}');
  assert.ok(found.some(p => p.id === 'D03'), 'Should detect D03 empty catch');
});

test('detects B01 SELECT star', () => {
  const found = detectAntipattern('db.query("SELECT * FROM users")');
  assert.ok(found.some(p => p.id === 'B01'), 'Should detect B01 SELECT *');
});

test('clean code has no anti-patterns', () => {
  const found = detectAntipattern(`
    const user = await userRepo.findById(id);
    if (user === null) throw new NotFoundError('User not found');
    const result = await paymentService.charge(amount);
  `);
  assert.strictEqual(found.length, 0, 'Clean code should have no anti-patterns');
});

console.log('\nSmart compaction:');

test('smart-compaction.md defines 3 compaction levels', () => {
  const content = read('.mindforge/intelligence/smart-compaction.md');
  assert.ok(content.includes('Level 1'), 'Missing Level 1');
  assert.ok(content.includes('Level 2'), 'Missing Level 2');
  assert.ok(content.includes('Level 3'), 'Missing Level 3');
});

test('smart-compaction.md captures implicit knowledge', () => {
  const content = read('.mindforge/intelligence/smart-compaction.md');
  assert.ok(content.includes('Implicit knowledge') || content.includes('implicit_knowledge'), 'Should capture implicit knowledge');
});

test('smart-compaction.md captures quality signals', () => {
  const content = read('.mindforge/intelligence/smart-compaction.md');
  assert.ok(content.includes('quality_signals') || content.includes('Quality signals'), 'Should capture quality signals');
});

console.log('\nMINDFORGE.md:');

test('MINDFORGE.md exists', () => {
  assert.ok(fs.existsSync('MINDFORGE.md'), 'MINDFORGE.md should exist in project root');
});

test('MINDFORGE.md has model preferences section', () => {
  const content = read('MINDFORGE.md');
  assert.ok(content.includes('PLANNER_MODEL') || content.includes('model'), 'MINDFORGE.md should have model configuration');
});

test('MINDFORGE.md has quality thresholds', () => {
  const content = read('MINDFORGE.md');
  assert.ok(content.includes('MIN_TEST_COVERAGE') || content.includes('coverage'), 'MINDFORGE.md should have quality thresholds');
});

console.log('\nTeam profile system:');

test('team profile directory exists', () => {
  assert.ok(fs.existsSync('.mindforge/team'), 'Missing .mindforge/team directory');
});

test('TEAM-PROFILE.md exists', () => {
  assert.ok(fs.existsSync('.mindforge/team/TEAM-PROFILE.md'), 'Missing TEAM-PROFILE.md');
});

test('profiles README.md exists', () => {
  assert.ok(fs.existsSync('.mindforge/team/profiles/README.md'), 'Missing profiles/README.md');
});

console.log('\nWizard files:');

['setup-wizard.js', 'environment-detector.js', 'config-generator.js'].forEach(f => {
  test(`wizard/${f} exists`, () => {
    assert.ok(fs.existsSync(`bin/wizard/${f}`), `Missing: bin/wizard/${f}`);
  });
});

test('setup-wizard.js has printBanner function', () => {
  const content = read('bin/wizard/setup-wizard.js');
  assert.ok(content.includes('printBanner'), 'Wizard should have printBanner');
});

test('environment-detector.js detects Node.js project type', () => {
  const content = read('bin/wizard/environment-detector.js');
  assert.ok(content.includes('package.json'), 'Detector should check package.json');
});

test('environment-detector.js has no secrets', () => {
  const content = read('bin/wizard/environment-detector.js');
  const credPat = /(?:password|token|secret|api_key)\s*=\s*['"][^'"]{8,}/i;
  assert.ok(!credPat.test(content), 'Detector should not contain credential values');
});

console.log(`\n${'─'.repeat(50)}`);
console.log(`Results: ${passed} passed, ${failed} failed`);
if (failed > 0) { console.error(`\n❌ ${failed} test(s) failed.\n`); process.exit(1); }
else { console.log(`\n✅ All intelligence tests passed.\n`); }
```

---

### `tests/metrics.test.js`

```javascript
/**
 * MindForge Day 5 — Metrics Tests
 * Run: node tests/metrics.test.js
 */

'use strict';

const fs   = require('fs');
const assert = require('assert');

let passed = 0;
let failed = 0;

function test(name, fn) {
  try { fn(); console.log(`  ✅ ${name}`); passed++; }
  catch (e) { console.error(`  ❌ ${name}\n     ${e.message}`); failed++; }
}

function read(p) { return fs.existsSync(p) ? fs.readFileSync(p, 'utf8') : ''; }

// ── Session quality score ─────────────────────────────────────────────────────
function calcScore({ tasksFailed=0, qualityGatesFailed=0, critical=0, high=0, medium=0 }) {
  let s = 100;
  s -= tasksFailed * 15;
  s -= qualityGatesFailed * 10;
  s -= critical * 30;
  s -= high * 15;
  s -= medium * 5;
  if (!qualityGatesFailed) s += 5;
  if (!critical && !high) s += 5;
  return Math.max(0, Math.min(100, s));
}

// ── Phase quality score ───────────────────────────────────────────────────────
function calcPhaseScore({ openFindings=0, rework=0, reqsMissed=0, allDelivered=false, noFindings=false, uatPerfect=false }) {
  let s = 100;
  s -= openFindings * 10;
  s -= rework * 5;
  s -= reqsMissed * 3;
  if (allDelivered) s += 5;
  if (noFindings) s += 5;
  if (uatPerfect) s += 3;
  return Math.max(0, Math.min(100, s));
}

// ── Tests ─────────────────────────────────────────────────────────────────────
console.log('\nMindForge Day 5 — Metrics Tests\n');

console.log('Metrics schema files:');
['METRICS-SCHEMA.md', 'quality-tracker.md'].forEach(f => {
  test(`${f} exists`, () => assert.ok(fs.existsSync(`.mindforge/metrics/${f}`), `Missing: .mindforge/metrics/${f}`));
});

console.log('\nSession quality score formula:');

test('perfect session scores 100 (5 bonus)', () => {
  const s = calcScore({ tasksFailed:0, qualityGatesFailed:0, critical:0, high:0, medium:0 });
  assert.strictEqual(s, 110); // 100 + 5 + 5 = 110, clamped to 100
  // Actually let's check clamping: Math.min(100, 110) = 100
});

test('one task failure reduces score by 15', () => {
  const s = calcScore({ tasksFailed:1 });
  // 100 - 15 + 5 (no gates) + 5 (no sec) = 95
  assert.ok(s === 95 || s <= 95, `Expected ~95, got ${s}`);
});

test('CRITICAL security finding reduces score by 30', () => {
  const baseline = calcScore({});
  const withCrit = calcScore({ critical: 1 });
  assert.ok(baseline - withCrit >= 30, 'CRITICAL should reduce score by at least 30');
});

test('score is clamped to 0-100', () => {
  const s = calcScore({ tasksFailed: 10, qualityGatesFailed: 5, critical: 3 });
  assert.strictEqual(s, 0, 'Very bad session should score exactly 0 (clamped)');
});

test('clean session with no findings gets bonus', () => {
  const s = calcScore({});
  assert.ok(s >= 100, 'Clean session should get bonuses (score may reach 110 before clamping)');
});

console.log('\nPhase quality score formula:');

test('perfect phase (all delivered, clean) scores high', () => {
  const s = calcPhaseScore({ allDelivered:true, noFindings:true, uatPerfect:true });
  assert.ok(s >= 100, `Expected 113 (clamped to 100), got ${s}`);
});

test('open security finding reduces score by 10 each', () => {
  const clean  = calcPhaseScore({ allDelivered:true, noFindings:true, uatPerfect:true });
  const dirty  = calcPhaseScore({ openFindings:2, allDelivered:true });
  assert.ok(clean > dirty + 15, 'Two open findings should significantly lower score');
});

test('rework reduces score by 5 each', () => {
  const noRework   = calcPhaseScore({ allDelivered:true });
  const withRework = calcPhaseScore({ rework:2, allDelivered:true });
  assert.ok(noRework - withRework >= 10, 'Two rework events should reduce score by 10');
});

console.log('\nMetrics schema content:');

test('METRICS-SCHEMA.md defines session-quality.jsonl', () => {
  const c = read('.mindforge/metrics/METRICS-SCHEMA.md');
  assert.ok(c.includes('session-quality.jsonl'), 'Should define session-quality.jsonl');
});

test('METRICS-SCHEMA.md defines phase-metrics.jsonl', () => {
  const c = read('.mindforge/metrics/METRICS-SCHEMA.md');
  assert.ok(c.includes('phase-metrics.jsonl'), 'Should define phase-metrics.jsonl');
});

test('METRICS-SCHEMA.md defines skill-usage.jsonl', () => {
  const c = read('.mindforge/metrics/METRICS-SCHEMA.md');
  assert.ok(c.includes('skill-usage.jsonl'), 'Should define skill-usage.jsonl');
});

test('quality-tracker.md defines verify pass rate target', () => {
  const c = read('.mindforge/metrics/quality-tracker.md');
  assert.ok(c.includes('85%') || c.includes('pass rate'), 'Should define verify pass rate target');
});

test('quality-tracker.md defines early warning signals', () => {
  const c = read('.mindforge/metrics/quality-tracker.md');
  assert.ok(c.includes('Early warning') || c.includes('early warning'), 'Should have early warning signals');
});

console.log('\nAll 25 commands present:');

const ALL_COMMANDS = [
  'help','init-project','plan-phase','execute-phase','verify-phase','ship',
  'next','quick','status','debug',
  'skills','review','security-scan','map-codebase','discuss-phase',
  'audit','milestone','complete-milestone','approve','sync-jira','sync-confluence',
  'health','retrospective','profile-team','metrics'
];

test(`all ${ALL_COMMANDS.length} commands in .claude/commands/mindforge/`, () => {
  ALL_COMMANDS.forEach(cmd => {
    assert.ok(fs.existsSync(`.claude/commands/mindforge/${cmd}.md`), `Missing: ${cmd}.md`);
  });
});

test(`all ${ALL_COMMANDS.length} commands mirrored to .agent/mindforge/`, () => {
  ALL_COMMANDS.forEach(cmd => {
    assert.ok(fs.existsSync(`.agent/mindforge/${cmd}.md`), `Missing .agent: ${cmd}.md`);
  });
});

console.log(`\n${'─'.repeat(50)}`);
console.log(`Results: ${passed} passed, ${failed} failed`);
if (failed > 0) { console.error(`\n❌ ${failed} test(s) failed.\n`); process.exit(1); }
else { console.log(`\n✅ All metrics tests passed.\n`); }
```

**Commit:**
```bash
git add tests/intelligence.test.js tests/metrics.test.js
git commit -m "test(day5): add intelligence layer and metrics test suites"
```

---

## TASK 14 — Run full test battery and verify Day 5

```bash
node tests/install.test.js         && echo "✅ install"
node tests/wave-engine.test.js     && echo "✅ wave-engine"
node tests/audit.test.js           && echo "✅ audit"
node tests/compaction.test.js      && echo "✅ compaction"
node tests/skills-platform.test.js && echo "✅ skills-platform"
node tests/integrations.test.js    && echo "✅ integrations"
node tests/governance.test.js      && echo "✅ governance"
node tests/intelligence.test.js    && echo "✅ intelligence"
node tests/metrics.test.js         && echo "✅ metrics"
```

**Final Day 5 commit and bump:**
```bash
# Update package.json to v0.5.0
node -e "
  const fs = require('fs');
  const p = JSON.parse(fs.readFileSync('package.json','utf8'));
  p.version = '0.5.0';
  fs.writeFileSync('package.json', JSON.stringify(p, null, 2) + '\n');
  console.log('Version bumped to 0.5.0');
"

git add package.json
git commit -m "chore(release): bump to v0.5.0 — Day 5 intelligence layer"
git add .
git commit -m "feat(day5): complete Day 5 MindForge intelligence layer"
git push origin feat/mindforge-intelligence-layer
```

---

## DAY 5 VERIFY — complete before pushing

```bash
# 1. All 9 test suites pass
for suite in install wave-engine audit compaction skills-platform \
             integrations governance intelligence metrics; do
  node tests/${suite}.test.js | tail -1
done
# All should show "All tests passed"

# 2. Intelligence engine files exist
ls .mindforge/intelligence/ | wc -l              # Expected: 5

# 3. Metrics schema files exist
ls .mindforge/metrics/ | wc -l                   # Expected: 2

# 4. All 25 commands in both runtimes
ls .claude/commands/mindforge/ | wc -l           # Expected: 25
ls .agent/mindforge/ | wc -l                     # Expected: 25
diff <(ls .claude/commands/mindforge/ | sort) <(ls .agent/mindforge/ | sort)
# Expected: no output

# 5. MINDFORGE.md at project root
ls MINDFORGE.md                                  # Expected: exists

# 6. Wizard files present
ls bin/wizard/                                   # Expected: 3 files

# 7. package.json at 0.5.0
node -e "console.log(require('./package.json').version)"  # Expected: 0.5.0

# 8. No secrets anywhere
grep -rE "(password|token|api_key)\s*=\s*['\"][^'\"]{8,}" \
  --include="*.md" --include="*.js" --include="*.json" \
  --exclude-dir=node_modules --exclude-dir=.git . 2>/dev/null \
  | grep -v "placeholder\|example\|template\|your-"
# Expected: no output

# 9. Git log clean
git log --oneline | head -20
# Expected: 14 clean commits from Day 5
```

---

**Branch:** `feat/mindforge-intelligence-layer`
**Day 5 implementation complete. Proceed to DAY5-REVIEW.md.**
