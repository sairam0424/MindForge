# MindForge — Day 1 Hardening Prompt
# Branch: `feat/mindforge-core-scaffold`
# Run this AFTER DAY1-REVIEW.md is complete and APPROVED

---

## CONTEXT

You are performing **Day 1 Hardening** of the MindForge framework foundation.
Hardening is distinct from implementation and review:

- **Implementation** — build it correctly
- **Review** — find what is wrong
- **Hardening** — make it robust, resilient, and production-ready

Activate the **`architect.md`** persona. Think about failure modes, edge cases,
and long-term maintainability — not feature completeness.

All review findings (BLOCKING and MAJOR) from DAY1-REVIEW.md must be resolved
before hardening begins. Run `git log --oneline` and confirm the review fix
commits are present.

---

## HARDEN 1 — Fix all review findings

Read `.planning/phases/day1/SECURITY-REVIEW-DAY1.md` and the review output.

For each BLOCKING and MAJOR finding:
1. Read the finding's recommendation precisely
2. Make the exact change described
3. Commit: `fix(day1): [finding title]`

Do not deviate from the recommended fix without creating an ADR explaining why.

After all fixes:
```bash
git log --oneline   # verify fix commits are present
```

---

## HARDEN 2 — CLAUDE.md: close every ambiguity

This is the most critical hardening step. CLAUDE.md is executed by an AI agent
that will find every gap and fill it with its own judgment — which may be wrong.

Work through CLAUDE.md line by line. For every instruction, ask:
**"Can this instruction be followed in more than one reasonable way?"**
If yes: make it more specific until the answer is no.

### Required additions (add these if not already present)

**Session start — missing file handling:**
Add after the session start protocol:
```markdown
### If context files are missing
- If `.planning/PROJECT.md` is missing: do not proceed. Tell the user:
  "PROJECT.md not found. Run /mindforge:init-project first."
- If `.planning/STATE.md` is missing: create it using the template from
  `.planning/STATE.md` with status "Unknown — rebuilt from directory scan."
- If `.planning/HANDOFF.json` is missing: continue normally.
  This is expected on the first session.
```

**Plan file validation:**
Add to the Plan-First Rule section:
```markdown
### Before executing any plan
Validate the plan file:
- Does it contain a `<task>` element?
- Does it have `<n>`, `<files>`, `<action>`, `<verify>`, and `<done>` elements?
- Does the `<verify>` element contain a runnable command (not "check manually")?
- Do all files listed in `<files>` exist in the repository?
  If a file does not exist yet: that is expected only if the action creates it.
  If it should exist but does not: stop and flag to the user.
If validation fails: stop. Tell the user which field is missing or invalid.
```

**Context compaction — exact procedure:**
Replace the context window management section with this exact procedure:
```markdown
## Context window management — compaction procedure

Monitor context usage. When approaching 70% capacity:

**Step 1:** Write the current session state.
Update `.planning/STATE.md` — add any decisions made this session.
Update `.planning/HANDOFF.json` with:
- Current phase and plan number
- Last completed task (with git SHA)
- Next task to begin
- Any blockers or questions for the user
- List of the 5 most recently modified files

**Step 2:** Compact the context.
Summarise the last 20 tool calls into one paragraph in HANDOFF.json `agent_notes`.
Discard the tool call history from your working context.

**Step 3:** Continue with a fresh context load.
Re-read: ORG.md + PROJECT.md + STATE.md + HANDOFF.json + current PLAN file.
Do not re-read files not relevant to the current task.

**Never** continue past 85% context without compacting first.
```

**Quality gate — enforcement mechanism:**
Strengthen the quality gates section:
```markdown
## Quality gates — enforcement

These gates are BLOCKING. If any gate fails, you must STOP and NOT commit.

When a gate fails:
1. State clearly which gate failed and why.
2. If the failure is fixable immediately: fix it, then re-run the gate.
3. If the failure requires a plan change: create a FIX-PLAN file and
   inform the user. Do not proceed with the original plan.
4. Never ask "should I skip this gate?" — the answer is always no.
5. Never commit with `--no-verify` or similar bypasses.

If the user instructs you to skip a quality gate:
- Acknowledge the instruction.
- Explain the specific risk of skipping this gate.
- Ask for explicit confirmation that they understand the risk.
- If confirmed: document the skip in STATE.md with the user's rationale.
- Still do not skip secret detection. Ever.
```

---

## HARDEN 3 — Persona files: precision pass

For each persona file, apply these specific hardening changes:

### All personas — add failure budget
Add to every persona's "Definition of done" section:
```markdown
## Escalation vs. self-resolution
Resolve yourself (document decision in SUMMARY.md):
- Ambiguity in implementation approach (not in requirements)
- Choice between two equivalent libraries
- Minor code structure decisions within the plan's scope

Escalate immediately to the user:
- Any change that requires modifying files outside the plan's `<files>` list
- Any decision that contradicts ARCHITECTURE.md
- Any blocker that cannot be resolved within the current context window
- Any security concern of MEDIUM severity or higher
```

### `developer.md` — add the 5 most common AI coding failures
Add a section "Common AI coding mistakes to avoid":
```markdown
## Common AI coding mistakes — actively avoid these

1. **Scope creep** — You noticed something to improve outside your task's files.
   Do not change it. Add it to `.planning/STATE.md` under "Future improvements."

2. **Optimistic verification** — Running verify and assuming it passed without
   reading the output. Read every line of verify output. A passing test suite
   with a suppressed error is a failing test suite.

3. **Confident hallucination** — Stating that a library works a certain way
   without checking. If unsure: check the library's documentation or source
   before writing code that depends on specific behaviour.

4. **Silent assumption resolution** — The plan is ambiguous. You pick one
   interpretation and proceed without noting it. Always note ambiguity
   resolution decisions in SUMMARY.md.

5. **Premature abstraction** — Writing a generic system when the plan calls
   for a specific feature. Implement exactly what the plan specifies.
   Generalisation happens in a later phase, after the specific case works.
```

### `security-reviewer.md` — add dependency hardening
Add after the OWASP checklist:
```markdown
## Dependency security review (run on every PR that adds or updates a dependency)

For every new or updated package:

1. **CVE check**
   ```bash
   npm audit
   # or
   pip-audit
   ```
   Any HIGH or CRITICAL vulnerability: block the PR. Find an alternative.

2. **Maintenance check**
   - Last commit: must be within 6 months (exceptions: intentionally stable libs)
   - Open issues/PRs: check for unaddressed security issues
   - Maintainer count: single-maintainer packages are higher risk

3. **Bundle impact** (for frontend packages)
   Check bundlephobia.com or `npm pack --dry-run` for size impact.
   Alert if a dependency adds > 50KB to the bundle.

4. **Licence check**
   Approved: MIT, Apache-2.0, BSD-2-Clause, BSD-3-Clause, ISC, 0BSD
   Requires legal review: GPL, LGPL, MPL, CDDL
   Blocked: AGPL, SSPL, BUSL, Commons Clause variants

5. **Typosquatting check**
   Search npm for packages with similar names.
   Verify the exact package name matches the intended library.
   (Common attack: `lodash` vs `1odash`, `express` vs `expres`)
```

---

## HARDEN 4 — Skill packs: add verification steps

Every skill pack should end with a self-verification step. Add this section
to the end of each `SKILL.md`:

```markdown
## Self-check before task completion

Before marking a task done when this skill was active:

- [ ] Did I read the full SKILL.md before starting? (Not just the triggers)
- [ ] Did I activate the corresponding persona file?
- [ ] Did I apply every mandatory action in this skill, not just the ones
  I remembered off the top of my head?
- [ ] If this skill produced an output file (review, security report, etc.),
  has that file been written to the correct path?
```

### Additional hardening for `security-review/SKILL.md`

Add this section:
```markdown
## When you find a vulnerability

Do not silently fix it and move on. For every vulnerability found:

1. **Stop the current task.**
2. **Classify it** using the severity model (CRITICAL / HIGH / MEDIUM / LOW).
3. **For CRITICAL or HIGH:** Write to `SECURITY-REVIEW-N.md` immediately.
   Tell the user. Do not proceed with ANY other work until acknowledged.
4. **For MEDIUM:** Write to `SECURITY-REVIEW-N.md`. Finish the current task.
   Flag at the end of the SUMMARY.md.
5. **For LOW:** Write to `SECURITY-REVIEW-N.md`. Note in SUMMARY.md.

The worst security outcome is a vulnerability that was found, noted mentally,
and then forgotten when context rolled over. Write it down. Always.
```

---

## HARDEN 5 — Installer: edge case hardening

Read `bin/install.js`. Add handling for these cases:

### Add version check
At the start of the installer, before any file operations:
```javascript
const nodeVersion = process.versions.node.split('.').map(Number);
if (nodeVersion[0] < 18) {
  console.error('❌ MindForge requires Node.js 18 or higher.');
  console.error(`   Current version: ${process.versions.node}`);
  console.error('   Install Node.js 18 LTS: https://nodejs.org');
  process.exit(1);
}
```

### Add existing CLAUDE.md detection
Before overwriting CLAUDE.md:
```javascript
function safeCopyClaude(src, dest) {
  if (fs.existsSync(dest)) {
    const existing = fs.readFileSync(dest, 'utf8');
    if (!existing.includes('MindForge')) {
      // Not a MindForge file — back it up
      const backup = dest + '.backup-' + Date.now();
      fs.copyFileSync(dest, backup);
      console.log(`  ⚠️  Existing CLAUDE.md backed up to ${backup}`);
    }
  }
  copyFile(src, dest);
}
```

### Add integrity check after install
After all files are copied:
```javascript
function verifyInstall(targetBase, commandsDir) {
  const requiredFiles = [
    path.join(targetBase, 'CLAUDE.md'),
    path.join(commandsDir, 'help.md'),
    path.join(commandsDir, 'init-project.md'),
    path.join(commandsDir, 'plan-phase.md'),
    path.join(commandsDir, 'execute-phase.md'),
    path.join(commandsDir, 'verify-phase.md'),
    path.join(commandsDir, 'ship.md'),
  ];

  const missing = requiredFiles.filter(f => !fs.existsSync(f));

  if (missing.length > 0) {
    console.error('\n❌ Install verification failed. Missing files:');
    missing.forEach(f => console.error(`   ${f}`));
    console.error('\nTry re-running the installer.');
    process.exit(1);
  }

  console.log('  ✅ Install verified — all required files present');
}
```

**Commit:**
```bash
git add bin/install.js
git commit -m "harden(installer): add node version check, CLAUDE.md backup, install verification"
```

---

## HARDEN 6 — `HANDOFF.json`: schema hardening

Update the HANDOFF.json template to include a checksum for integrity verification:

```json
{
  "schema_version": "1.0.0",
  "project": null,
  "phase": null,
  "plan": null,
  "last_completed_task": null,
  "next_task": "Run /mindforge:init-project",
  "blockers": [],
  "decisions_needed": [],
  "context_refs": [],
  "agent_notes": "",
  "session_summary": "",
  "recent_files": [],
  "recent_commits": [],
  "updated_at": null,
  "_warning": "Never store secrets, tokens, or passwords in this file. It is tracked in git."
}
```

Add the `_warning` field to make it impossible to accidentally forget that this
file is committed to the repository.

Update `.planning/STATE.md` to reference the warning:
```markdown
## IMPORTANT
HANDOFF.json is committed to git. Never write secrets or credentials into it.
Write "see .env" or "stored in secrets manager" if a note needs to reference credentials.
```

**Commit:**
```bash
git add .planning/
git commit -m "harden(state): add anti-secret warning to HANDOFF.json schema"
```

---

## HARDEN 7 — Write the first ADR

Every framework decision that future contributors will wonder about needs an ADR.
Write these three ADRs now — they document Day 1 decisions.

### `.planning/decisions/ADR-001-handoff-tracking.md`

```markdown
# ADR-001: Track HANDOFF.json in git

**Status:** Accepted
**Date:** [today]
**Deciders:** MindForge core team

## Context
HANDOFF.json stores the current session state for agent continuity.
It needs to be readable by the next agent session. The question is whether
it should be committed to git (team-visible) or gitignored (local-only).

## Decision
Track HANDOFF.json in git.

## Options considered

### Option A — Track in git (chosen)
Pros:
- Any team member or new machine can pick up where the last session left off
- Git history shows the evolution of session state
- No risk of losing state on machine failure

Cons:
- File changes create noise in git history
- Risk of accidentally committing sensitive session data

Mitigations:
- Added `_warning` field to prevent accidental secret storage
- SUMMARY.md captures human-readable history; HANDOFF.json is machine state only

### Option B — Gitignore
Pros: No git noise, no secret exposure risk
Cons: State lost on machine switch or re-clone; breaks team continuity

## Rationale
Team continuity outweighs the git noise concern. The warning field and
documentation mitigate the secret exposure risk sufficiently.

## Consequences
Team must be educated to never write secrets into HANDOFF.json.
CI should include a secret-scanning step that checks HANDOFF.json.
```

### `.planning/decisions/ADR-002-markdown-commands.md`

```markdown
# ADR-002: Use Markdown files for slash commands (not TypeScript)

**Status:** Accepted
**Date:** [today]
**Deciders:** MindForge core team

## Context
MindForge slash commands could be implemented as:
A) Markdown instruction files (what we chose)
B) TypeScript/JavaScript executable scripts
C) A mix of both

## Decision
Markdown instruction files for all commands.

## Options considered

### Option A — Markdown instruction files (chosen)
Pros:
- Readable and editable without a build step
- Can be updated directly by modifying text — no recompile
- Agents can read and follow them natively
- Community can contribute without TypeScript knowledge
- Work identically across all runtimes (Claude Code, Antigravity, OpenCode)

Cons:
- No type safety for command logic
- Cannot run unit tests on individual steps
- Edge case handling is described in prose, not enforced in code

### Option B — TypeScript scripts
Pros: Type safety, unit testable, programmatic edge case handling
Cons: Build step required, runtime-specific, harder to contribute to,
      loses the "human-readable instructions" quality that makes them good agent prompts

### Option C — Mix
Assessed as worst of both: complexity of both without full benefit of either.

## Rationale
MindForge commands are agent prompts, not programs. Their primary consumer is
an AI agent reading natural language. Markdown is the best format for that use case.
Logic enforcement happens through agent quality gates, not code compilation.

## Consequences
Command edge cases must be described carefully in prose.
A future "command validator" tool could parse and verify command files statically.
```

### `.planning/decisions/ADR-003-skills-trigger-model.md`

```markdown
# ADR-003: Keyword-trigger model for skill discovery

**Status:** Accepted
**Date:** [today]
**Deciders:** MindForge core team

## Context
Skills need to be loaded by the agent at the right time. The question is
how the agent knows which skills are relevant for a given task.

## Decision
Keyword matching against a `triggers:` list in skill frontmatter.

## Options considered

### Option A — Keyword triggers in frontmatter (chosen)
Pros: Simple, transparent, editable by anyone, no dependency on AI judgment
Cons: Can miss contextual relevance; false positives on common words

### Option B — AI decides which skills to load
Pros: Contextually accurate matching
Cons: Non-deterministic; different sessions might load different skills
      for the same task; hard to debug; requires extra model call

### Option C — Explicit user invocation only
Pros: Precise control
Cons: Loses the "just-in-time" benefit; users forget to invoke skills

## Rationale
Determinism is more valuable than perfect accuracy for a framework.
Teams need to be able to predict what skills will activate. Keyword triggers
provide that predictability. False positives are acceptable — loading a skill
unnecessarily has low cost; missing a needed skill has high cost.

## Consequences
Trigger keyword lists must be maintained as skills evolve.
A skill with too-narrow triggers will be missed. Err on the side of more triggers.
```

**Commit:**
```bash
git add .planning/decisions/
git commit -m "docs(adr): add ADR-001 HANDOFF tracking, ADR-002 markdown commands, ADR-003 skill triggers"
```

---

## HARDEN 8 — Add `tests/install.test.js`

Write a basic test that verifies the installer works correctly:

```javascript
/**
 * MindForge installer smoke tests
 * Run: node tests/install.test.js
 */

const fs = require('fs');
const path = require('path');
const assert = require('assert');

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`  ✅ ${name}`);
    passed++;
  } catch (err) {
    console.error(`  ❌ ${name}`);
    console.error(`     ${err.message}`);
    failed++;
  }
}

console.log('\nMindForge Day 1 — Structural Integrity Tests\n');

// ── Directory structure tests ─────────────────────────────────────────────────
console.log('Directories:');
const dirs = [
  '.claude/commands/mindforge',
  '.agent/mindforge',
  '.mindforge/personas',
  '.mindforge/skills/security-review',
  '.mindforge/skills/code-quality',
  '.mindforge/skills/api-design',
  '.mindforge/skills/testing-standards',
  '.mindforge/skills/documentation',
  '.mindforge/org',
  '.planning/decisions',
  'bin',
  'docs',
  'tests',
];
dirs.forEach(d => test(d, () => assert.ok(fs.existsSync(d), `Missing: ${d}`)));

// ── Required files tests ──────────────────────────────────────────────────────
console.log('\nRequired files:');
const files = [
  '.claude/CLAUDE.md',
  '.agent/CLAUDE.md',
  '.claude/commands/mindforge/help.md',
  '.claude/commands/mindforge/init-project.md',
  '.claude/commands/mindforge/plan-phase.md',
  '.claude/commands/mindforge/execute-phase.md',
  '.claude/commands/mindforge/verify-phase.md',
  '.claude/commands/mindforge/ship.md',
  '.mindforge/personas/analyst.md',
  '.mindforge/personas/architect.md',
  '.mindforge/personas/developer.md',
  '.mindforge/personas/qa-engineer.md',
  '.mindforge/personas/security-reviewer.md',
  '.mindforge/personas/tech-writer.md',
  '.mindforge/personas/debug-specialist.md',
  '.mindforge/personas/release-manager.md',
  '.mindforge/skills/security-review/SKILL.md',
  '.mindforge/skills/code-quality/SKILL.md',
  '.mindforge/skills/api-design/SKILL.md',
  '.mindforge/skills/testing-standards/SKILL.md',
  '.mindforge/skills/documentation/SKILL.md',
  '.mindforge/org/ORG.md',
  '.mindforge/org/CONVENTIONS.md',
  '.mindforge/org/SECURITY.md',
  '.mindforge/org/TOOLS.md',
  '.planning/STATE.md',
  '.planning/HANDOFF.json',
  'bin/install.js',
  'package.json',
  'README.md',
];
files.forEach(f => test(f, () => assert.ok(fs.existsSync(f), `Missing: ${f}`)));

// ── Content tests ─────────────────────────────────────────────────────────────
console.log('\nContent validation:');

test('CLAUDE.md has session start protocol', () => {
  const content = fs.readFileSync('.claude/CLAUDE.md', 'utf8');
  assert.ok(content.includes('SESSION START PROTOCOL'), 'Missing session start protocol');
  assert.ok(content.includes('PLAN-FIRST RULE'), 'Missing plan-first rule');
  assert.ok(content.includes('QUALITY GATES'), 'Missing quality gates');
  assert.ok(content.includes('SECURITY AUTO-TRIGGER'), 'Missing security auto-trigger');
});

test('CLAUDE.md and .agent/CLAUDE.md are identical', () => {
  const claude = fs.readFileSync('.claude/CLAUDE.md', 'utf8');
  const agent = fs.readFileSync('.agent/CLAUDE.md', 'utf8');
  assert.strictEqual(claude, agent, '.claude/CLAUDE.md and .agent/CLAUDE.md differ');
});

test('All 6 commands mirrored to .agent/mindforge/', () => {
  const claudeCommands = fs.readdirSync('.claude/commands/mindforge/').sort();
  const agentCommands = fs.readdirSync('.agent/mindforge/').sort();
  assert.deepStrictEqual(claudeCommands, agentCommands, 'Command files differ between runtimes');
});

test('HANDOFF.json is valid JSON', () => {
  const content = fs.readFileSync('.planning/HANDOFF.json', 'utf8');
  const parsed = JSON.parse(content); // throws if invalid
  assert.ok(parsed.schema_version, 'Missing schema_version field');
  assert.ok(parsed._warning, 'Missing _warning anti-secret field');
});

test('package.json has bin field', () => {
  const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  assert.ok(pkg.bin, 'Missing bin field');
  assert.ok(pkg.bin.mindforge, 'Missing bin.mindforge');
  assert.ok(pkg.engines, 'Missing engines field');
  assert.ok(pkg.engines.node, 'Missing engines.node');
});

test('All skill packs have frontmatter triggers', () => {
  const skillDirs = fs.readdirSync('.mindforge/skills/');
  skillDirs.forEach(dir => {
    const skillPath = `.mindforge/skills/${dir}/SKILL.md`;
    if (fs.existsSync(skillPath)) {
      const content = fs.readFileSync(skillPath, 'utf8');
      assert.ok(content.includes('triggers:'), `${skillPath} missing triggers frontmatter`);
      assert.ok(content.includes('name:'), `${skillPath} missing name frontmatter`);
    }
  });
});

test('bin/install.js is executable and has no obvious syntax errors', () => {
  const stat = fs.statSync('bin/install.js');
  // Check it is readable (full executable check needs Node child_process)
  assert.ok(stat.size > 1000, 'bin/install.js is suspiciously small');
  const content = fs.readFileSync('bin/install.js', 'utf8');
  assert.ok(content.includes('#!/usr/bin/env node'), 'Missing shebang line');
  assert.ok(content.includes('verifyInstall'), 'Missing install verification function');
});

test('No secrets in any committed file', () => {
  const secretPatterns = [
    /password\s*=\s*['"][^'"]{6,}/i,
    /api[_-]?key\s*=\s*['"][^'"]{10,}/i,
    /secret\s*=\s*['"][^'"]{8,}/i,
    /-----BEGIN (RSA |EC |PRIVATE )?KEY-----/,
    /sk-[a-zA-Z0-9]{20,}/,
  ];

  function scanDir(dir) {
    if (dir.includes('node_modules') || dir.includes('.git')) return;
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    entries.forEach(entry => {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        scanDir(full);
      } else if (entry.name.endsWith('.md') || entry.name.endsWith('.js') || entry.name.endsWith('.json')) {
        const content = fs.readFileSync(full, 'utf8');
        secretPatterns.forEach(pattern => {
          assert.ok(!pattern.test(content), `Potential secret in ${full}`);
        });
      }
    });
  }

  scanDir('.');
});

// ── Results ───────────────────────────────────────────────────────────────────
console.log(`\n${'─'.repeat(50)}`);
console.log(`Results: ${passed} passed, ${failed} failed`);

if (failed > 0) {
  console.error(`\n❌ ${failed} test(s) failed. Fix before pushing.\n`);
  process.exit(1);
} else {
  console.log(`\n✅ All tests passed. Day 1 foundation is solid.\n`);
}
```

**Commit:**
```bash
git add tests/install.test.js
git commit -m "test(day1): add structural integrity test suite"
```

---

## HARDEN 9 — Run the full test suite and fix anything that fails

```bash
node tests/install.test.js
```

Every failure is a genuine problem. Fix them. Do not mark Day 1 complete
with failing tests.

If a test reveals a missing file or incorrect content:
1. Fix the file
2. Re-run the test
3. Commit the fix: `fix(day1): [description of what was wrong]`

---

## HARDEN 10 — Final pre-merge checklist

Run every item. Do not push to remote until all pass.

```bash
# 1. Tests pass
node tests/install.test.js
# Expected: "All tests passed"

# 2. CLAUDE.md line count (must be substantial)
wc -l .claude/CLAUDE.md
# Expected: > 80 lines

# 3. CLAUDE.md and .agent/CLAUDE.md are identical
diff .claude/CLAUDE.md .agent/CLAUDE.md
# Expected: no output (files identical)

# 4. All command files present in both runtimes
diff <(ls .claude/commands/mindforge/ | sort) <(ls .agent/mindforge/ | sort)
# Expected: no output

# 5. All 8 persona files present
ls .mindforge/personas/ | wc -l
# Expected: 8

# 6. All 5 skill packs present
ls .mindforge/skills/ | wc -l
# Expected: 5

# 7. HANDOFF.json is valid JSON
node -e "JSON.parse(require('fs').readFileSync('.planning/HANDOFF.json', 'utf8')); console.log('valid')"
# Expected: "valid"

# 8. bin/install.js runs without error
node bin/install.js 2>&1 | head -5
# Expected: MindForge installer output

# 9. Git log is clean (no WIP commits)
git log --oneline | grep -iE "wip|temp|fix it|oops|update|stuff"
# Expected: no output

# 10. No merge conflicts remaining
git diff --check
# Expected: no output

# 11. ADRs present
ls .planning/decisions/*.md | wc -l
# Expected: 3 or more
```

---

## HARDEN 11 — Final commit and push

```bash
git add .
git commit -m "harden(day1): complete Day 1 hardening — tests, ADRs, edge cases, security"
git push origin feat/mindforge-core-scaffold
```

---

## DAY 1 COMPLETE — What you have built

After completing all three prompts (IMPLEMENT → REVIEW → HARDEN), you have:

| Component                    | Files | Status  |
|------------------------------|-------|---------|
| Agent entry point            | 2     | ✅ Done |
| Slash commands               | 12    | ✅ Done |
| Agent personas               | 8     | ✅ Done |
| Core skill packs             | 5     | ✅ Done |
| Org context templates        | 4     | ✅ Done |
| Project context templates    | 4     | ✅ Done |
| npm installer                | 1     | ✅ Done |
| Structural tests             | 1     | ✅ Done |
| Architecture Decision Records| 3     | ✅ Done |
| **Total files**              | **40+** | ✅ Done |

---

## DAY 2 PREVIEW — What comes next

```
Branch: feat/mindforge-wave-execution

Day 2 scope:
- Wave-based parallel execution engine in execute-phase command
- Dependency graph parser for PLAN files
- Subagent spawning with isolated context packages
- Phase-level verification with automated test running
- /mindforge:next command (auto-detect next step)
- /mindforge:quick command (ad-hoc tasks without full lifecycle)
- Context compaction automation (triggered at 70% threshold)
- AUDIT.jsonl logging foundation
```

**Branch:** `feat/mindforge-core-scaffold`
**Day 1 hardening complete. Open a PR. Assign a reviewer. Ship it.**
