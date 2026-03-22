# MindForge — Day 1 Review Prompt
# Branch: `feat/mindforge-core-scaffold`
# Run this AFTER DAY1-IMPLEMENT.md is complete

---

## CONTEXT

You are performing a **Day 1 Code & Architecture Review** of the MindForge enterprise
agentic framework foundation. This is not a quick scan. This is a thorough, adversarial
review that catches problems before they become load-bearing architectural mistakes.

Activate the **`architect.md` + `qa-engineer.md` + `security-reviewer.md`** personas
simultaneously for this review. Think as all three at once.

---

## REVIEW SCOPE

Every file created in Day 1:

```
.claude/CLAUDE.md
.agent/CLAUDE.md
.claude/commands/mindforge/*.md   (6 files)
.agent/mindforge/*.md             (6 files)
.mindforge/personas/*.md          (8 files)
.mindforge/skills/*/SKILL.md      (5 files)
.mindforge/org/*.md               (4 files)
.planning/STATE.md
.planning/HANDOFF.json
bin/install.js
package.json
README.md
```

---

## REVIEW PASS 1 — Structural Integrity

Answer every question. If the answer is "no" or "unclear", flag it as a finding.

### Directory structure
- [ ] Does every directory from the scaffold exist exactly as specified?
- [ ] Are `.claude/commands/mindforge/` and `.agent/mindforge/` identical in content?
- [ ] Is `.planning/` structured so it will not be accidentally committed with sensitive data?
- [ ] Are all 8 persona files present in `.mindforge/personas/`?
- [ ] Are all 5 skill packs present with `SKILL.md` files in `.mindforge/skills/`?

### CLAUDE.md — agent entry point
Read `.claude/CLAUDE.md` completely. Verify:
- [ ] **Session start protocol** lists exactly the right files in the right order
- [ ] **Skills discovery** section explains how trigger matching works
- [ ] **Persona activation table** covers all 8 personas with no gaps
- [ ] **Plan-first rule** is unambiguous — is there any path to skip it?
- [ ] **Execution rules** are numbered and actionable (not vague)
- [ ] **Context window management** explains the 70% threshold clearly
- [ ] **Quality gates** are checkboxes that agents can verify mechanically
- [ ] **Security auto-trigger** list is comprehensive (does it miss any sensitive category?)
- [ ] **State artifacts table** maps every artifact to its update condition precisely
- [ ] The file reads as a system prompt, not as documentation — is the voice directive?

Flag any sentence that is ambiguous. An agent must be able to follow every
instruction without asking for clarification.

### Persona files
Read all 8 persona files. For each, verify:
- [ ] **Identity** — clear, specific role with domain expertise stated
- [ ] **Cognitive mode** — does it meaningfully differentiate from default AI behaviour?
- [ ] **Pre-task checklist** — are all items actually checkable before starting?
- [ ] **Execution standards** — are these specific enough to enforce? (No "good quality" vagueness)
- [ ] **Primary outputs** — are file paths specified precisely?
- [ ] **Definition of done** — is it binary? (Pass/fail, not "mostly done")
- [ ] **Escalation conditions** — does the persona know when to stop vs. continue?

Specific checks:
- `developer.md`: Does it forbid scope expansion explicitly?
- `security-reviewer.md`: Does the OWASP checklist cover all 10 categories?
- `debug-specialist.md`: Is the debug protocol linear enough to follow without judgment calls?
- `release-manager.md`: Does it block releases with open CRITICAL findings?

### Skill pack files
Read all 5 `SKILL.md` files. For each, verify:
- [ ] Frontmatter has `name:`, `version:`, and `triggers:` fields
- [ ] Trigger keywords are comprehensive (would they catch the common invocations?)
- [ ] The skill's mandatory actions are step-by-step, not principles-only
- [ ] Code examples in skills are syntactically correct
- [ ] Skills do not contradict each other (e.g., two skills giving conflicting guidance)

### Slash command files
Read all 6 command files. For each, verify:
- [ ] Every command has a pre-check that prevents execution in the wrong state
- [ ] Commands produce artefacts (files) — not just output to the terminal
- [ ] `init-project` creates all required `.planning/` files
- [ ] `plan-phase` creates properly-structured XML plan files
- [ ] `execute-phase` handles the case where plans have dependencies
- [ ] `verify-phase` has an explicit path for handling failures (not just happy path)
- [ ] `ship` runs actual quality gates and stops if any fail
- [ ] Every command updates `STATE.md` as its final step

**Specific gap check for `execute-phase`:**
Does it handle these edge cases?
- [ ] What happens if a plan's `<verify>` step fails midway through a phase?
- [ ] What happens if a plan file has malformed XML?
- [ ] What happens if the test suite does not exist yet?

---

## REVIEW PASS 2 — Content Quality

### CLAUDE.md — instruction quality audit
Read every instruction in CLAUDE.md and flag any that are:

**Too vague** (cannot be mechanically followed):
- Example of vague: "Write high quality code"
- Example of specific: "Functions must be ≤ 40 lines. Extract sub-functions if longer."

**Conflicting** (two instructions that can produce different behaviour):
- Check: does the "plan-first rule" conflict with the `quick` command flow?
- Check: does "context compaction at 70%" conflict with any other session management rule?

**Missing** (a scenario an agent will encounter that no instruction covers):
- What does the agent do if HANDOFF.json is corrupt or unreadable?
- What does the agent do if a PLAN file references a file that does not exist?
- What does the agent do if the user asks it to skip a quality gate?

### Persona coherence check
For each persona, ask: "Would two different AI agents reading this persona file
behave the same way on the same task?"

If the answer is "probably not", the persona is underspecified. Flag it with
specific lines that need more precision.

### Org template completeness
Read `.mindforge/org/ORG.md`, `CONVENTIONS.md`, `SECURITY.md`, `TOOLS.md`.

- [ ] Are placeholder comments clear enough that a new team could fill them in 30 minutes?
- [ ] Does `SECURITY.md` cover all the categories that `security-reviewer.md` checks against?
- [ ] Does `CONVENTIONS.md` forbid patterns that `developer.md` promises to forbid?
- [ ] Does `TOOLS.md` reference the same libraries used in skill pack examples?

If there is a mismatch between any persona/skill and the org templates — flag it.
These files must be internally consistent.

---

## REVIEW PASS 3 — Security Review

Activate `security-reviewer.md` persona fully for this pass.

### CLAUDE.md security review
- [ ] Does the security auto-trigger list include all OWASP A01-A10 relevant categories?
- [ ] Does the quality gate list include secret detection explicitly?
- [ ] Is there any instruction in CLAUDE.md that could be used to bypass a security check?
  (e.g., "skip verification if pressed for time" — this must not exist anywhere)

### `bin/install.js` security review
Read the installer code. Check:
- [ ] Does it validate that source paths exist before copying?
- [ ] Does it handle `process.env.HOME` being undefined (Windows)?
- [ ] Does it avoid `eval()`, `exec()`, or shell injection vectors?
- [ ] Does it print what it will do before doing it (no silent mutations)?
- [ ] Does it handle the case where the target directory has different permissions?
- [ ] Are there any path traversal risks? (e.g., if `--target` flag is added later)

### `HANDOFF.json` schema review
- [ ] Does the schema include a `schema_version` field for future migration?
- [ ] Are all fields typed clearly in the template?
- [ ] Could sensitive data (tokens, passwords) accidentally end up in this file?
  If yes: add an explicit note in the schema that secrets must never be written here.

### `.gitignore` review
- [ ] Does it exclude `.env` and `.env.*`?
- [ ] Does it exclude `node_modules/`?
- [ ] Does it exclude any `*.key` or `*.pem` patterns?
- [ ] Should `.planning/HANDOFF.json` be gitignored? (It may contain session-specific data)
  Decision needed: should HANDOFF.json be tracked (for team continuity) or gitignored
  (for privacy)? Recommend a position and add to `.planning/decisions/ADR-001-handoff-tracking.md`.

---

## REVIEW PASS 4 — Installer Quality

Read `bin/install.js` end-to-end.

- [ ] Does it correctly identify global vs local install paths for both runtimes?
- [ ] Does it handle Windows paths correctly? (`path.join` should do this — verify)
- [ ] Does it mirror `.claude/commands/mindforge/` to `.agent/mindforge/` correctly?
- [ ] Does the uninstall path only remove MindForge files, not the user's existing config?
  (Check: it should only remove `CLAUDE.md` if it contains the MindForge marker)
- [ ] Does it print clear, actionable output so the user knows what happened?
- [ ] Does the "next steps" output match the actual first commands the user should run?

Test the installer mentally for these scenarios:
1. Fresh install on a machine with no `.claude/` directory
2. Install in a project that already has a `.claude/CLAUDE.md` from another framework
3. Re-install after already installed (should it overwrite? merge? skip?)
4. Uninstall when nothing is installed

For any scenario without a clear answer in the code: flag it.

---

## REVIEW PASS 5 — README and Docs

- [ ] Can a developer who has never heard of MindForge install and run it in under 5 minutes
  by following only the README?
- [ ] Does the README explain WHY MindForge exists (the problem), not just WHAT it does?
- [ ] Are all command examples in the README actually correct?
- [ ] Does the "How it works" section accurately reflect what the commands actually do?
- [ ] Is there a section covering how to configure `.mindforge/org/ORG.md`?
  (If not: this is a missing step — first-time users will not know to do this)

---

## REVIEW PASS 6 — Git History Quality

Run: `git log --oneline`

Verify:
- [ ] Every commit message follows Conventional Commits format
- [ ] Commit messages describe WHAT changed, not HOW ("add 8 persona files"
  not "created files in personas directory")
- [ ] There are no "WIP", "temp", "fix", or "update" commits
- [ ] The number of commits matches the number of tasks (roughly 1 commit per task)
- [ ] No commit contains changes to files from a different task's scope

---

## REVIEW OUTPUT FORMAT

For each finding, write it in this format:

```
## Finding [N] — [Severity]: [Short title]

**File:** [path/to/file.md line N]
**Category:** [Structural / Content / Security / Installer / Docs / Git]
**Severity:** BLOCKING | MAJOR | MINOR | SUGGESTION

**Issue:**
[What is wrong or missing. Be specific.]

**Impact:**
[What will break or go wrong if this is not fixed.]

**Recommendation:**
[Exact change to make. Be prescriptive.]
```

Severity definitions:
- **BLOCKING** — Must be fixed before any work continues. Framework will not function correctly.
- **MAJOR** — Must be fixed before Day 1 branch is merged. Significant quality or security issue.
- **MINOR** — Should be fixed in Day 1 or Day 2. Improvement but not blocking.
- **SUGGESTION** — Optional improvement. Flag for backlog.

---

## REVIEW SUMMARY

After all findings, write a summary table:

```
## Review Summary

| Category    | BLOCKING | MAJOR | MINOR | SUGGESTION |
|-------------|----------|-------|-------|------------|
| Structural  |          |       |       |            |
| Content     |          |       |       |            |
| Security    |          |       |       |            |
| Installer   |          |       |       |            |
| Docs        |          |       |       |            |
| Git History |          |       |       |            |
| **TOTAL**   |          |       |       |            |

## Verdict
[ ] ✅ APPROVED — No blocking or major findings. Proceed to DAY1-HARDEN.md.
[ ] ⚠️  APPROVED WITH CONDITIONS — [N] major findings. Fix before hardening.
[ ] ❌ NOT APPROVED — [N] blocking findings. Fix and re-review.

## Estimated fix time
[Realistic time estimate to resolve all BLOCKING and MAJOR findings]
```

---

**Branch:** `feat/mindforge-core-scaffold`
**After review is complete and all BLOCKING items resolved: proceed to DAY1-HARDEN.md.**
