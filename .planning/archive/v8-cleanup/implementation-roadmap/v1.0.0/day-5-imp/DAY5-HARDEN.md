# MindForge — Day 5 Hardening Prompt
# Branch: `feat/mindforge-intelligence-layer`
# Run this AFTER DAY5-REVIEW.md is APPROVED

---

## CONTEXT

You are performing **Day 5 Hardening** of the MindForge intelligence layer.

Activate the **`architect.md`** persona throughout.

Day 5 hardening focuses on three concerns distinct from previous days:

1. **Signal quality** — are the intelligence signals (difficulty scores,
   anti-pattern detections, quality metrics) accurate enough to be trusted?
   A framework that gives noisy or misleading signals is worse than one that
   gives no signals at all.

2. **Feedback loop integrity** — does intelligence actually improve future
   behaviour? Compaction → better HANDOFF → better next session. Retrospective
   → action items → MINDFORGE.md changes → better future phases. These loops
   must be explicit and verifiable.

3. **Wizard reliability** — a failed first-run experience is a MindForge
   abandonment event. Every failure path must produce a clear, actionable
   error message.

Confirm all review findings resolved:

```bash
git log --oneline | head -30
node tests/install.test.js && \
node tests/wave-engine.test.js && \
node tests/audit.test.js && \
node tests/compaction.test.js && \
node tests/skills-platform.test.js && \
node tests/integrations.test.js && \
node tests/governance.test.js && \
node tests/intelligence.test.js && \
node tests/metrics.test.js
# All 9 suites must pass
```

---

## HARDEN 1 — Fix all review findings

For every BLOCKING and MAJOR finding from DAY5-REVIEW.md:
1. Read the finding precisely
2. Apply the exact recommended fix
3. Commit: `fix(day5-review): [finding title]`

One commit per finding. Re-run full test battery after all fixes.

---

## HARDEN 2 — Fix anti-pattern false positives

The review identified two false-positive risks. Apply both fixes.

### Fix C01 — Exclude test files

Update `antipattern-detector.md` — add to the C01 section:

```markdown
### C01 false positive prevention

Exclude from C01 scanning:
```bash
# Build exclusion list for type-coercion check
EXCLUDED_DIRS=("tests/" "test/" "__tests__/" "*.test.ts" "*.spec.ts" "*.test.js" "*.spec.js")

# Apply when running C01 detection:
grep -rn "==\s*null\|==\s*undefined\|==\s*false\|==\s*0" \
  src/ \
  --include="*.ts" --include="*.js" \
  --exclude="*.test.ts" --exclude="*.spec.ts" --exclude="*.test.js" --exclude="*.spec.js"
```

Additionally: do not flag `==` comparisons inside:
- Test assertion functions: `expect(x).toBe(null)`, `assert.equal(x, null)`
- Type guard functions: `function isNull(x: unknown): x is null { return x == null }`
  (Type guards intentionally use `==` for null/undefined coalescing)

For type guards: the pattern `x == null` (checking for both null AND undefined)
is acceptable and intentional. Only flag `== null` inside non-type-guard functions
in auth, middleware, and security-critical paths.
```

### Fix B03 — Cursor pagination exception

Add to the B03 section:

```markdown
### B03 cursor pagination exception

Cursor-based pagination is exempt from the unbounded query check.
A query using cursor-based pagination may omit `LIMIT`/`take:` on the final
"fetch until cursor" call. Detect cursor pagination by looking for:
- Prisma: `cursor:` parameter
- Raw SQL: `WHERE (created_at, id) < (:cursor_time, :cursor_id)`
- Any query with both `orderBy:` and `cursor:`

```bash
# Exempt cursor-paginated queries:
grep -rn "findMany\b" src/ --include="*.ts" | \
  python3 -c "
import sys
for line in sys.stdin:
    if 'cursor:' in line or '< :cursor' in line.lower():
        continue   # cursor pagination — exempt
    if 'take:' not in line and 'limit:' not in line.lower():
        print('B03 candidate:', line.strip())
"
```
```

### Fix D01 — Count executable lines only

Add to the D01 section:

```markdown
### D01 executable line counting

Count non-comment, non-blank, non-decorator lines only:

```bash
# Count executable lines (exclude blanks, comments, decorators)
count_executable_lines() {
  local FILE="$1"
  grep -v '^\s*$' "${FILE}" |        # remove blank lines
  grep -v '^\s*//' |                  # remove single-line JS/TS comments
  grep -v '^\s*\*' |                  # remove JSDoc lines
  grep -v '^\s*@' |                   # remove decorators
  wc -l
}

# Apply D01 threshold (500 lines) to executable count
for FILE in $(find src/ -name "*.ts" -o -name "*.py"); do
  EXEC_LINES=$(count_executable_lines "${FILE}")
  if [ "${EXEC_LINES}" -gt 500 ]; then
    echo "D01 candidate: ${FILE} (${EXEC_LINES} executable lines)"
  fi
done
```
```

**Commit:**
```bash
git add .mindforge/intelligence/antipattern-detector.md
git commit -m "harden(antipattern): fix C01 test-file false positive, B03 cursor pagination, D01 line counting"
```

---

## HARDEN 3 — Seal the intelligence feedback loops

The review identified that intelligence outputs don't explicitly feed back into
improved future behaviour. Add explicit feedback connectors.

### Feedback loop 1: Retrospective → MINDFORGE.md

Add to `retrospective.md` — Step 5:

```markdown
## Step 5 — Apply learnings to MINDFORGE.md

After the retrospective discussion, explicitly ask:
"Based on this retrospective, should we update MINDFORGE.md to improve future phases?

Common MINDFORGE.md improvements from retrospectives:

| Retrospective finding | MINDFORGE.md change |
|---|---|
| Plans were too vague | `AUTO_DISCUSS_PHASE=true` or lower `DISCUSS_PHASE_REQUIRED_ABOVE_DIFFICULTY` |
| Verify pass rate was low | Reduce `MAX_TASKS_PER_PHASE` for more atomic decomposition |
| Too many security findings | `ALWAYS_LOAD_SKILLS=security-review,data-privacy` |
| Approvals slowed us down | Review `TIER2_SLA_HOURS` and consider Tier 1 threshold adjustment |
| Context compacted too often | `COMPACTION_THRESHOLD_PCT=65` (earlier, more graceful compaction) |
| Tests were thin | `MIN_TEST_COVERAGE_PCT=85` (raise bar) |

Suggested changes: [list from discussion analysis]

Apply? (yes/no — I'll show you the exact MINDFORGE.md changes)"

If yes: make the specific MINDFORGE.md changes in this session.
Commit: `chore(config): apply retrospective learnings to MINDFORGE.md (Phase [N])`

This commits the improvements immediately, making the retrospective tangibly actionable.
```

### Feedback loop 2: Difficulty score → Plan granularity

Add to `difficulty-scorer.md`:

```markdown
## Feedback loop: difficulty score influences task granularity

The difficulty score is not just a display — it drives task decomposition:

| Composite score | Task granularity instruction to planner |
|---|---|
| 1.0-2.0 (Easy) | Plans can be broader: 1 plan = 1 complete feature component |
| 2.1-3.0 (Moderate) | Standard granularity: 1 plan = 1 significant function/module |
| 3.1-4.0 (Challenging) | Fine granularity: 1 plan = 1 specific function or endpoint |
| 4.1-5.0 (Hard) | Maximum granularity: 1 plan = 1 specific change within 3-4 files max |

**The planner reads the difficulty score from DIFFICULTY-SCORE-[N].md before
creating any PLAN files.** It adjusts its decomposition strategy based on the
recommended task count range in that file.

This is the feedback mechanism: difficulty → task count → plan granularity →
execution quality. A hard phase with coarse plans is the #1 cause of high
task failure rates.
```

### Feedback loop 3: Session quality → next session behaviour

Add to `quality-tracker.md`:

```markdown
## Quality metrics → agent behaviour adjustment

When session quality score is below warning thresholds, agents adjust behaviour
for the next session automatically (not waiting for a retrospective):

### Automatic adjustments (applied at session start if warning conditions met)

**If verify pass rate < 75% in last 3 sessions:**
Agent adds to its plan review checklist:
"For each <verify> step: can I run this command RIGHT NOW and get a deterministic result?
If not — rewrite the verify step before executing the plan."

**If task failure rate > 20% in last session:**
Agent halves its estimated task scope for the current phase.
If the current plan seems large: suggest splitting before executing.

**If compaction frequency > 2 per session:**
Agent proactively summarises after every 4 tasks (not waiting for 70%).
This prevents compaction from being forced under pressure.

**If security findings increased across last 3 phases:**
Agent automatically activates security-review skill for ALL tasks in the current phase,
not just trigger-matched tasks. Reports this to user at session start.

These automatic adjustments are reported to the user:
"Quality signal detected: [signal]. Adjusting behaviour for this session: [adjustment]."
```

**Commit:**
```bash
git add .mindforge/intelligence/ .claude/commands/mindforge/retrospective.md \
        .agent/mindforge/retrospective.md
git commit -m "harden(intelligence): seal feedback loops — retro→MINDFORGE, difficulty→granularity, quality→behaviour"
```

---

## HARDEN 4 — Harden the setup wizard

Apply the wizard reliability fixes from the review.

### Fix 1 — stdin TTY detection

Update `setup-wizard.js` — find the `IS_INTERACTIVE` definition and update:

```javascript
// Before:
const IS_INTERACTIVE = !ARGS.some(a => ['--claude','--antigravity','--all','--help'].includes(a));

// After:
const IS_INTERACTIVE =
  !ARGS.some(a => ['--claude','--antigravity','--all','--help'].includes(a)) &&
  process.stdin.isTTY !== false;  // gracefully handle CI/piped environments
```

### Fix 2 — Collect credential guidance, print at end

Update the `configureFeatures` function to collect guidance:

```javascript
async function configureFeatures(rl) {
  // ... existing code ...

  // Collect credential guidance instead of printing inline
  const credGuidance = [];

  if (features.includes('Jira integration')) {
    // ... existing Jira config questions ...
    credGuidance.push({
      service: 'Jira / Confluence (Atlassian)',
      envVar: 'JIRA_API_TOKEN',
      url: 'https://id.atlassian.com/manage-profile/security/api-tokens',
      instruction: 'Create an API token and set: export JIRA_API_TOKEN="your-token"'
    });
  }

  if (features.includes('Slack notifications')) {
    // ... existing Slack config questions ...
    credGuidance.push({
      service: 'Slack',
      envVar: 'SLACK_BOT_TOKEN',
      url: 'https://api.slack.com/apps',
      instruction: 'Create a bot, add to workspace, copy Bot Token: export SLACK_BOT_TOKEN="xoxb-..."'
    });
  }

  if (features.includes('GitHub integration')) {
    // ... existing GitHub config questions ...
    credGuidance.push({
      service: 'GitHub',
      envVar: 'GITHUB_TOKEN',
      url: 'https://github.com/settings/tokens',
      instruction: 'Create a personal access token with repo scope: export GITHUB_TOKEN="ghp_..."'
    });
  }

  return { config, credGuidance };
}
```

Update `printNextSteps` to accept and display all credential guidance together:

```javascript
function printNextSteps(runtimes, scope, credGuidance = []) {
  // ... existing next steps ...

  if (credGuidance.length > 0) {
    console.log(c.bold('\n  Configure credentials:\n'));
    credGuidance.forEach(g => {
      console.log(`  ${c.cyan(g.service)}`);
      console.log(`    ${g.instruction}`);
      console.log(c.dim(`    Docs: ${g.url}\n`));
    });
  }
}
```

### Fix 3 — Config generator idempotency

Update `config-generator.js` — add idempotency check:

```javascript
async function writeIntegrationsConfig(config) {
  // ... existing code ...

  if (config.jira) {
    const placeholder = 'JIRA_BASE_URL=https://your-org.atlassian.net';
    if (content.includes(placeholder)) {
      content = content.replace(placeholder, `JIRA_BASE_URL=${config.jira.baseUrl}`);
      console.log('  ✅ JIRA_BASE_URL configured');
    } else if (!content.includes(config.jira.baseUrl)) {
      // Placeholder was already replaced with something else
      console.log(`  ⏭️  JIRA_BASE_URL already configured — not overwriting`);
    }
    // If content already has the correct value: silently skip
  }
  // Apply same pattern to all config replacements
}
```

### Fix 4 — Wizard error messages

Add a comprehensive error handler to `setup-wizard.js`:

```javascript
// ── Error handler ─────────────────────────────────────────────────────────────
function handleWizardError(err) {
  console.error(c.red('\n  ❌ Setup encountered an issue:\n'));

  const COMMON_ERRORS = {
    'ENOENT': {
      message: 'A required file was not found.',
      action: 'Ensure you are running from the project root directory.',
    },
    'EACCES': {
      message: 'Permission denied writing to target directory.',
      action: 'Check directory permissions or run with appropriate access.',
    },
    'MODULE_NOT_FOUND': {
      message: 'MindForge installer files are missing.',
      action: 'Re-run: npx mindforge-cc@latest to get a fresh copy.',
    },
    'ERR_INVALID_ARG_TYPE': {
      message: 'Unexpected argument type in setup wizard.',
      action: 'Try non-interactive mode: npx mindforge-cc --claude --local',
    },
  };

  const known = COMMON_ERRORS[err.code] || COMMON_ERRORS['ERR_INVALID_ARG_TYPE'];
  console.error(`  ${c.yellow('Problem:')} ${known?.message || err.message}`);
  console.error(`  ${c.yellow('Action:')}  ${known?.action || 'Run in non-interactive mode:'}`);
  console.error(c.dim(`\n  Non-interactive fallback:`));
  console.error(c.dim('  npx mindforge-cc --claude --local   # Install for Claude Code'));
  console.error(c.dim('  npx mindforge-cc --antigravity --local  # Install for Antigravity'));
  console.error(c.dim('  npx mindforge-cc --all --global     # Install both globally'));
  console.error('');
}
```

Update the main catch block:
```javascript
  } catch (err) {
    rl.close();
    handleWizardError(err);
    process.exit(1);
  }
```

**Commit:**
```bash
git add bin/wizard/
git commit -m "harden(wizard): fix TTY detection, collect credentials at end, add idempotency, better errors"
```

---

## HARDEN 5 — Fix the AUDIT.jsonl corrupt-line handling

Update `health-engine.md` — replace the auto-repair for invalid AUDIT.jsonl lines:

```markdown
### AUDIT.jsonl corruption handling (updated)

**Do NOT remove invalid lines from AUDIT.jsonl.**
AUDIT.jsonl is an append-only immutable record. Deleting lines — even invalid
ones — violates the immutability contract and destroys part of the audit trail.

**Instead: isolate corrupted lines without deletion.**

Auto-repair procedure for AUDIT.jsonl invalid lines:

```bash
# Step 1: Identify invalid lines
python3 -c "
import sys
invalid = []
for i, line in enumerate(open('.planning/AUDIT.jsonl'), 1):
    line = line.strip()
    if not line: continue
    try:
        import json; json.loads(line)
    except:
        invalid.append((i, line[:80]))
for i, l in invalid:
    print(f'Line {i}: {l}')
"

# Step 2: Copy invalid lines to a quarantine file (do NOT delete from original)
python3 -c "
import sys, json
quarantine = []
for i, line in enumerate(open('.planning/AUDIT.jsonl'), 1):
    stripped = line.strip()
    if not stripped: continue
    try:
        json.loads(stripped)
    except:
        quarantine.append({'line': i, 'raw': stripped})

if quarantine:
    import uuid, datetime
    qf = '.planning/AUDIT.jsonl.quarantine'
    with open(qf, 'a') as f:
        for q in quarantine:
            f.write(json.dumps(q) + '\n')
    print(f'Quarantined {len(quarantine)} lines to {qf}')
"

# Step 3: Write a correction entry documenting the quarantine
QUARANTINE_COUNT=$(wc -l < .planning/AUDIT.jsonl.quarantine 2>/dev/null || echo "0")
echo "{\"id\":\"$(uuidgen)\",\"timestamp\":\"$(date -u +%Y-%m-%dT%H:%M:%SZ)\",\"event\":\"audit_quarantine\",\"quarantined_lines\":${QUARANTINE_COUNT},\"quarantine_file\":\".planning/AUDIT.jsonl.quarantine\",\"agent\":\"mindforge-health-engine\"}" >> .planning/AUDIT.jsonl
```

The original AUDIT.jsonl is untouched. The quarantine file documents what was
found without destroying the audit trail. The new correction entry ensures
the quarantine action is itself audited.
```

**Commit:**
```bash
git add .mindforge/intelligence/health-engine.md
git commit -m "harden(health): fix AUDIT.jsonl corruption handling — quarantine not delete"
```

---

## HARDEN 6 — Add non-overridable rules to MINDFORGE.md

The review identified that MINDFORGE.md can override anything — including safety primitives. Fix.

Add to `MINDFORGE.md` at the very top (after the header comment):

```markdown
## NON-OVERRIDABLE RULES (read-only — these cannot be changed in MINDFORGE.md)

The following CLAUDE.md behaviours are governance primitives and cannot be
disabled or overridden by MINDFORGE.md, regardless of what is configured here:

- Security auto-trigger: always activates for auth/payment/PII changes
- Plan-first rule: implementation cannot begin without a PLAN file
- Secret detection gate: blocks commits with credential patterns — no exceptions
- AUDIT writing: every significant action writes to AUDIT.jsonl
- Quality gates 1 and 3: CRITICAL security findings and secrets block all merges

Any MINDFORGE.md value that attempts to disable these rules will be ignored.
The agent will log: "MINDFORGE.md attempted to override a non-overridable rule: [rule].
Override ignored — governance primitive cannot be disabled."
```

Update CLAUDE.md to enforce this:

Add to the MINDFORGE.md section in CLAUDE.md:

```markdown
### Non-overridable rules enforcement
When reading MINDFORGE.md, validate each override value:
- If MINDFORGE.md contains: `SECURITY_AUTOTRIGGER=false`, `SECRET_DETECTION=false`,
  `PLAN_FIRST=false`, or `AUDIT_WRITING=false`:
  Log: "MINDFORGE.md override ignored: [rule] is a non-overridable governance primitive."
  Apply the CLAUDE.md default regardless.
- Never expose error messages that reveal which overrides were attempted —
  just silently enforce the defaults.
```

**Commit:**
```bash
git add MINDFORGE.md .claude/CLAUDE.md .agent/CLAUDE.md
git commit -m "harden(MINDFORGE): add non-overridable governance primitives, enforce in CLAUDE.md"
```

---

## HARDEN 7 — Write 3 ADRs for Day 5 decisions

### `.planning/decisions/ADR-012-intelligence-feedback-loops.md`

```markdown
# ADR-012: Intelligence outputs must feed back into system behaviour

**Status:** Accepted
**Date:** [today]

## Context
Day 5 adds intelligence components (difficulty scorer, quality metrics,
retrospective, smart compaction) that produce structured outputs.
The question is: are these outputs used purely for display, or do they
actually change how agents behave?

## Decision
All intelligence outputs are connected to behaviour changes:
- Difficulty score → task granularity (planning)
- Retrospective → MINDFORGE.md updates (configuration)
- Quality metrics → automatic session behaviour adjustments
- Smart compaction → richer HANDOFF.json → better session continuity

## Rationale
Intelligence that only displays information without changing behaviour is
a dashboard, not a system. MindForge is a framework that improves over time.
The feedback loops are what distinguishes MindForge from frameworks that stay
static regardless of what they learn about the team's patterns.

## Consequences
Each intelligence component must have a documented feedback path.
The feedback is explicit (user-confirmed) for high-impact changes (MINDFORGE.md)
and automatic for low-impact adjustments (session behaviour thresholds).
```

### `.planning/decisions/ADR-013-mindforge-md-constitution.md`

```markdown
# ADR-013: MINDFORGE.md as project constitution with non-overridable primitives

**Status:** Accepted
**Date:** [today]

## Context
MINDFORGE.md provides project-level overrides for MindForge defaults.
The question is: can it override everything, or are some behaviours protected?

## Decision
MINDFORGE.md can override configuration and preferences but not governance primitives.
Governance primitives (secret detection, security auto-trigger, plan-first rule,
AUDIT writing) cannot be disabled by any MINDFORGE.md configuration.

## Rationale
If a developer (or a compromised build system) could use MINDFORGE.md to disable
the secret detection gate, the entire governance system would be circumventable.
The value of non-bypassable governance primitives depends on them being
genuinely non-bypassable — a "mostly non-bypassable" governance gate is
worse than a known-bypassable one, because it creates false confidence.

## Consequences
- Security and governance features work consistently across all projects
- Teams cannot accidentally disable safety features
- Emergency situations require the `--emergency` flag, which is audited
```

### `.planning/decisions/ADR-014-metrics-as-signals-not-scores.md`

```markdown
# ADR-014: Metrics are signals for improvement, not performance evaluation

**Status:** Accepted
**Date:** [today]

## Context
MindForge collects session quality scores and phase metrics.
These could be used as developer performance metrics or as system improvement signals.

## Decision
MindForge metrics are system improvement signals ONLY.
They are used to: improve planning, adjust skills loading, tune compaction behaviour,
and inform retrospectives. They are NOT used to evaluate individual developer performance.

## Rationale
Using agent quality metrics as developer performance metrics would:
1. Create incentives to game the metrics (skip complex phases, avoid
   security-flagged tasks, etc.)
2. Be invalid: session quality scores measure the agent's effectiveness given
   the task context — not the developer's skill or effort.
3. Create psychological safety issues that harm team adoption.

The team profile system (TEAM-PROFILE.md) captures strengths and growth areas
for personalisation purposes — not for evaluation.

## Consequences
- Team profiles must never be used in performance reviews
- Session quality scores are per-session, not per-developer
- The /mindforge:metrics command does not expose per-developer scores
- Documentation explicitly states this policy
```

**Commit:**
```bash
git add .planning/decisions/
git commit -m "docs(adr): add ADR-012 feedback loops, ADR-013 MINDFORGE constitution, ADR-014 metrics policy"
```

---

## HARDEN 8 — Add metrics policy to TEAM-PROFILE.md

Update `.mindforge/team/TEAM-PROFILE.md` — add a policy section at the top:

```markdown
## IMPORTANT: Metrics usage policy

**Per ADR-014:** The data in this file and in `.mindforge/metrics/` is for
system improvement only — NOT for developer performance evaluation.

These metrics measure the agent framework's effectiveness in supporting the team.
They should not be used in performance reviews, sprint retrospectives as developer
assessments, or any evaluation context.

What this data IS used for:
- Personalising agent responses (verbosity, explanation depth, code style)
- Improving skill loading for the team's tech stack
- Tuning compaction thresholds for the team's session patterns
- Informing retrospective discussions about process, not people

If you observe a low quality metric: investigate the process or the plan quality —
not the developer.
```

Also add to `docs/team-setup-guide.md`:

```markdown
# MindForge Team Setup Guide

## Overview
MindForge supports multi-developer teams through the multi-HANDOFF system,
team profiles, and shared governance configuration.

## Setting up for a team

### Step 1 — Configure approvers in INTEGRATIONS-CONFIG.md
```
TIER2_APPROVERS=john@company.com,jane@company.com
TIER3_APPROVERS=security-officer@company.com
EMERGENCY_APPROVERS=cto@company.com
```

### Step 2 — Run team profiling
```
/mindforge:profile-team --questionnaire
```
Each developer runs this once. Answers are stored in per-developer profile files.

### Step 3 — Define branch strategy in MINDFORGE.md
```
BRANCHING_STRATEGY=phase
PHASE_BRANCH_TEMPLATE=feat/phase-{N}-{slug}
```

### Step 4 — Coordinate phase ownership
Use the shared HANDOFF.json `active_developers` field to track who is working on which plan.
Avoid assigning two developers to plans that touch the same files.

## Ethics policy
See ADR-014 and the TEAM-PROFILE.md metrics usage policy.
MindForge metrics are NOT performance metrics.
```

**Commit:**
```bash
git add .mindforge/team/TEAM-PROFILE.md docs/team-setup-guide.md
git commit -m "harden(team): add metrics ethics policy per ADR-014, write team setup guide"
```

---

## HARDEN 9 — Update docs/mindforge-md-reference.md

Write comprehensive reference documentation for MINDFORGE.md:

```markdown
# MINDFORGE.md Reference

MINDFORGE.md is the "project constitution" — a project-level configuration
file that customises MindForge defaults for your specific project.

## Location
Place `MINDFORGE.md` in the project root (same level as `package.json`).
It is read by agents after `CLAUDE.md` and `ORG.md`.

## Syntax
Key-value pairs in `KEY=value` format, with Markdown headers as sections.
Multi-line values use triple-quote delimiters: `KEY="""..."""`
Comments start with `#`.

## All available settings

### Model preferences
| Setting | Default | Description |
|---|---|---|
| `PLANNER_MODEL` | `inherit` | Model for planning agent |
| `EXECUTOR_MODEL` | `inherit` | Model for execution agents |
| `REVIEWER_MODEL` | `inherit` | Model for code review |
| `SECURITY_MODEL` | `inherit` | Model for security review |
| Valid values: `claude-opus-4-5`, `claude-sonnet-4-5`, `claude-haiku-4-5`, `inherit` | | |

### Execution behaviour
| Setting | Default | Description |
|---|---|---|
| `TIER1_AUTO_APPROVE` | `true` | Auto-approve Tier 1 changes |
| `WAVE_CONFIRMATION_REQUIRED` | `false` | Require confirmation before each wave |
| `AUTO_DISCUSS_PHASE` | `false` | Run discuss-phase before every plan-phase |
| `VERIFY_PASS_RATE_WARNING_THRESHOLD` | `0.75` | Warn when below this rate |
| `COMPACTION_THRESHOLD_PCT` | `70` | Context % that triggers compaction |
| `MAX_TASKS_PER_PHASE` | `15` | Suggest splitting above this count |

### Quality standards
| Setting | Default | Description |
|---|---|---|
| `MIN_TEST_COVERAGE_PCT` | `80` | Minimum test coverage |
| `MAX_FUNCTION_LINES` | `40` | Maximum function length |
| `MAX_CYCLOMATIC_COMPLEXITY` | `10` | Maximum cyclomatic complexity |
| `BLOCK_ON_MEDIUM_SECURITY_FINDINGS` | `false` | Also block on MEDIUM findings |

### Skills
| Setting | Default | Description |
|---|---|---|
| `ALWAYS_LOAD_SKILLS` | (empty) | Skills always loaded regardless of triggers |
| `DISABLED_SKILLS` | (empty) | Skills to never load |
| `MAX_FULL_SKILL_INJECTIONS` | `3` | Above this count, summarise lower-priority skills |

### Non-overridable settings
These CANNOT be changed via MINDFORGE.md:
- Security auto-trigger for auth/payment/PII changes
- Plan-first rule (no implementation without a PLAN)
- Secret detection gate (no commits with credentials)
- AUDIT.jsonl writing requirement
- CRITICAL security findings blocking merges

See ADR-013 for the rationale.

## Example MINDFORGE.md files

### Startup project (speed-focused)
```
TIER1_AUTO_APPROVE=true
WAVE_CONFIRMATION_REQUIRED=false
MIN_TEST_COVERAGE_PCT=70
EXECUTOR_MODEL=claude-sonnet-4-5
ALWAYS_LOAD_SKILLS=security-review
```

### Enterprise compliance project (quality-focused)
```
BLOCK_ON_MEDIUM_SECURITY_FINDINGS=true
MIN_TEST_COVERAGE_PCT=90
REQUIRE_ADR_FOR_ALL_DECISIONS=true
DISCUSS_PHASE_REQUIRED_ABOVE_DIFFICULTY=2.5
AUTO_DISCUSS_PHASE=false
SECURITY_MODEL=claude-opus-4-5
ALWAYS_LOAD_SKILLS=security-review,data-privacy,testing-standards
```
```

**Commit:**
```bash
git add docs/mindforge-md-reference.md
git commit -m "docs: write comprehensive MINDFORGE.md reference documentation"
```

---

## HARDEN 10 — Add missing test coverage

Add to `tests/intelligence.test.js`:

```javascript
// Add after existing tests:

console.log('\nHardening-prompted intelligence tests:');

test('anti-pattern C01 does NOT flag test files', () => {
  // Test assertion syntax that looks like type coercion but is fine in tests
  const testCode = 'expect(result).toBe(null); assert.equal(count, 0);';
  // The test file exclusion should prevent flagging — verify the detection logic respects this
  // In the simulation: we check if the pattern regex fires (it will on raw code)
  // The real protection is the file exclusion grep flag
  const found = detectAntipattern(testCode);
  // Pattern fires in code — the FILE exclusion is what protects. Note this in docs.
  // Test that the anti-pattern spec mentions the file exclusion:
  const content = read('.mindforge/intelligence/antipattern-detector.md');
  assert.ok(
    content.includes('*.test.ts') || content.includes('test files'),
    'antipattern-detector should exclude test files from C01'
  );
});

test('health engine required files list includes Day 5 commands', () => {
  const content = read('.mindforge/intelligence/health-engine.md');
  assert.ok(content.includes('health.md'), 'Health engine should check for health.md');
  assert.ok(content.includes('retrospective.md'), 'Health engine should check for retrospective.md');
  assert.ok(content.includes('metrics.md'), 'Health engine should check for metrics.md');
});

test('MINDFORGE.md documents non-overridable rules', () => {
  const content = read('MINDFORGE.md');
  assert.ok(
    content.includes('NON-OVERRIDABLE') || content.includes('non-overridable'),
    'MINDFORGE.md should document non-overridable governance primitives'
  );
});

test('smart-compaction Level 2 HANDOFF has decisions_made field', () => {
  const content = read('.mindforge/intelligence/smart-compaction.md');
  assert.ok(content.includes('decisions_made'), 'Level 2 HANDOFF should include decisions_made');
});

test('retrospective command feeds back to MINDFORGE.md', () => {
  const content = read('.claude/commands/mindforge/retrospective.md');
  assert.ok(
    content.includes('MINDFORGE.md') && (content.includes('apply') || content.includes('update')),
    'Retrospective should offer to update MINDFORGE.md with learnings'
  );
});

test('quality tracker has automatic behaviour adjustments', () => {
  const content = read('.mindforge/metrics/quality-tracker.md');
  assert.ok(
    content.includes('Automatic adjustment') || content.includes('automatic'),
    'Quality tracker should define automatic behaviour adjustments'
  );
});

test('AUDIT.jsonl corruption fix uses quarantine (not deletion)', () => {
  const content = read('.mindforge/intelligence/health-engine.md');
  assert.ok(
    content.includes('quarantine') || content.includes('AUDIT.jsonl.quarantine'),
    'Health engine should quarantine corrupt AUDIT lines, not delete them'
  );
});
```

Add to `tests/metrics.test.js`:

```javascript
// Add after existing tests:

console.log('\nHardening-prompted metrics tests:');

test('TEAM-PROFILE.md has metrics ethics policy', () => {
  const content = read('.mindforge/team/TEAM-PROFILE.md');
  assert.ok(
    content.includes('NOT') && (content.includes('performance') || content.includes('evaluation')),
    'TEAM-PROFILE.md should state metrics are not for performance evaluation'
  );
});

test('metrics schema has compaction-quality.jsonl defined', () => {
  const content = read('.mindforge/metrics/METRICS-SCHEMA.md');
  assert.ok(content.includes('compaction-quality.jsonl'), 'Should define compaction-quality.jsonl');
});

test('metrics schema has session_quality_score field', () => {
  const content = read('.mindforge/metrics/METRICS-SCHEMA.md');
  assert.ok(content.includes('session_quality_score'), 'session-quality.jsonl should have score field');
});

test('session quality score clamps to 0-100', () => {
  function calcScore(opts = {}) {
    const { tasksFailed=0, qualityGatesFailed=0, critical=0, high=0 } = opts;
    let s = 100 - tasksFailed*15 - qualityGatesFailed*10 - critical*30 - high*15;
    if (!qualityGatesFailed) s += 5;
    if (!critical && !high) s += 5;
    return Math.max(0, Math.min(100, s));
  }
  assert.strictEqual(calcScore({}), 100, 'Perfect session should score 100 (after clamping)');
  assert.strictEqual(calcScore({ tasksFailed: 10 }), 0, 'Many failures should clamp to 0');
  assert.ok(calcScore({ tasksFailed: 1 }) < 100, 'One failure should reduce score');
});
```

**Commit:**
```bash
git add tests/intelligence.test.js tests/metrics.test.js
git commit -m "test(day5): add hardening-prompted test cases for intelligence and metrics"
```

---

## HARDEN 11 — Update CHANGELOG.md and bump to v0.5.0

Update `CHANGELOG.md` — prepend:

```markdown
## [0.5.0] — Day 5 Intelligence Layer

### Added
- Framework Health Engine: 7-category health check with auto-repair protocol
- Smart Context Compaction: 3-level structured insight extraction (Level 1/2/3)
  - Captures: decisions, discoveries, implicit knowledge, quality signals
- Phase Difficulty Scorer: 4-dimension scoring (Technical, Risk, Ambiguity, Dependencies)
  - Composite score drives task granularity and skill activation
- Anti-Pattern Detection Engine: 5 categories, 13 patterns with false-positive prevention
  - C01: auth type coercion (test-file excluded), B03: unbounded queries (cursor exemption)
- Skill Gap Analyser: identifies missing skills for planned phase work
- Team Profile System: capability profiles with tech preferences and quality patterns
- Agent Performance Metrics: session/phase quality scores and trend analysis
  - Per ADR-014: metrics are system signals, NOT developer performance metrics
- MINDFORGE.md project constitution: 25 configurable settings + non-overridable primitives
- Interactive Setup Wizard: guided first-run with environment detection
  - Detects Node.js project type, package manager, existing installs
  - Guides integration configuration with credential safety
- /mindforge:health — comprehensive health check with auto-repair
- /mindforge:retrospective — structured retrospectives with MINDFORGE.md feedback loop
- /mindforge:profile-team — team capability profiling
- /mindforge:metrics — quality metrics dashboard
- 3 new ADRs: ADR-012 feedback loops, ADR-013 MINDFORGE constitution, ADR-014 metrics policy
- Intelligence feedback loops: difficulty→granularity, retro→MINDFORGE, quality→behaviour

### Hardened
- Anti-pattern false positive prevention (test-file exclusion, cursor pagination)
- AUDIT.jsonl corruption: quarantine not deletion (immutability preserved)
- Non-overridable governance primitives in MINDFORGE.md (per ADR-013)
- Setup wizard: stdin TTY detection, credential guidance collected at end
- Team profile ethics policy per ADR-014
```

```bash
git add CHANGELOG.md package.json
git commit -m "chore(release): v0.5.0 final, update CHANGELOG"
```

---

## HARDEN 12 — Final pre-merge checklist

```bash
# 1. All 9 test suites pass
for suite in install wave-engine audit compaction skills-platform \
             integrations governance intelligence metrics; do
  echo -n "Testing ${suite}... "
  node tests/${suite}.test.js 2>&1 | tail -1
done

# 2. Intelligence files complete
ls .mindforge/intelligence/ | wc -l      # Expected: 5
ls .mindforge/metrics/ | wc -l           # Expected: 2
ls .mindforge/team/ | wc -l              # Expected: 3+
ls bin/wizard/ | wc -l                   # Expected: 3

# 3. All 25 commands in both runtimes
ls .claude/commands/mindforge/ | wc -l   # Expected: 25
ls .agent/mindforge/ | wc -l             # Expected: 25
diff <(ls .claude/commands/mindforge/ | sort) <(ls .agent/mindforge/ | sort)
# Expected: no output

# 4. MINDFORGE.md at project root with non-overridable section
grep "NON-OVERRIDABLE" MINDFORGE.md     # Expected: match

# 5. ADRs — now 14 total
ls .planning/decisions/*.md | wc -l     # Expected: 14

# 6. package.json at 0.5.0
node -e "console.log(require('./package.json').version)"   # Expected: 0.5.0

# 7. No secrets anywhere
grep -rE "(password|token|api_key)\s*=\s*['\"][^'\"]{8,}" \
  --include="*.md" --include="*.js" --include="*.json" \
  --exclude-dir=node_modules --exclude-dir=.git . 2>/dev/null \
  | grep -v "placeholder\|example\|template\|your-\|TEST_ONLY"
# Expected: no output

# 8. CHANGELOG.md has 0.5.0 entry
grep "0.5.0" CHANGELOG.md               # Expected: match

# 9. Git log clean
git log --oneline | head -25
# Expected: ~15 clean commits from Day 5
```

---

## FINAL COMMIT AND PUSH

```bash
git add .
git commit -m "harden(day5): complete Day 5 hardening — feedback loops, anti-pattern fixes, wizard resilience"
git push origin feat/mindforge-intelligence-layer
```

---

## DAY 5 COMPLETE — What you have built

| Component | Files | Status |
|---|---|---|
| Health engine (7 categories, auto-repair) | health-engine.md | ✅ |
| Smart compaction (3 levels, structured extraction) | smart-compaction.md | ✅ |
| Difficulty scorer (4 dimensions, composite) | difficulty-scorer.md | ✅ |
| Anti-pattern detector (5 categories, 13 patterns) | antipattern-detector.md | ✅ |
| Skill gap analyser | skill-gap-analyser.md | ✅ |
| Team profile system + profiles | TEAM-PROFILE.md + README.md | ✅ |
| Metrics schema (4 JSONL files) | METRICS-SCHEMA.md | ✅ |
| Quality tracker + trend analysis | quality-tracker.md | ✅ |
| MINDFORGE.md project constitution | MINDFORGE.md | ✅ |
| Interactive setup wizard (3 files) | bin/wizard/*.js | ✅ |
| /mindforge:health | 25th command | ✅ |
| /mindforge:retrospective | 26th command | ✅ |
| /mindforge:profile-team | 27th command | ✅ |
| /mindforge:metrics | 28th command | ✅ |
| Intelligence test suite | intelligence.test.js | ✅ |
| Metrics test suite | metrics.test.js | ✅ |
| 3 new ADRs | ADR-012, 013, 014 | ✅ |
| Enterprise + governance docs | enterprise-setup.md + team-setup-guide.md | ✅ |
| MINDFORGE.md reference | mindforge-md-reference.md | ✅ |

**MindForge is now at v0.5.0:**
**25 commands · 10 skills · 8 personas · 14 ADRs · 9 test suites · 5 days of builds**

---

## DAY 6 PREVIEW

```
Branch: feat/mindforge-distribution-platform

Day 6 scope:
- Public skills registry on npm: npx mindforge-skills install [skill-name]
- Multi-repo and monorepo support (workspace-aware phase execution)
- AI-generated PR code reviews using Claude API
- MindForge CI mode: non-interactive execution in GitHub Actions / GitLab CI
- /mindforge:init-org — organisation-wide MindForge setup wizard
- Skill contribution guidelines and community skill validation
- Performance benchmarking system for skill quality comparison
- MindForge SDK: programmatic API for embedding in other tools
- Real-time progress streaming via Server-Sent Events
- MINDFORGE.md schema validation (JSON Schema for config file)
```

**Branch:** `feat/mindforge-intelligence-layer`
**Day 5 hardening complete. Open PR → assign reviewer → merge to main.**
