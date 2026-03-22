MindForge
Repository navigation
Code
Issues
Pull requests
1
 (1)
Actions
Projects
Security
Insights
Settings
Back to pull request #19
docs(v2): finalize v2.0.0-alpha.2 documentation and roadmaps #27
All jobs
Run details
Annotations
8 errors and 1 warning
Code Quality Gates
failed 28 minutes ago in 12s
Search logs
1s
1s
1s
5s
1s
1s
1s
Run npm test -- --coverage

> mindforge-cc@2.0.0-alpha.2 test
> node tests/install.test.js --coverage


MindForge Day 1 — Structural Integrity Tests

Directories:
  ✅ .claude/commands/mindforge
  ✅ .agent/mindforge
  ✅ .mindforge/personas
  ✅ .mindforge/integrations
  ✅ .mindforge/governance
  ✅ .mindforge/team
  ✅ .mindforge/org/integrations
  ✅ .mindforge/skills/security-review
  ✅ .mindforge/skills/code-quality
  ✅ .mindforge/skills/api-design
  ✅ .mindforge/skills/testing-standards
  ✅ .mindforge/skills/documentation
  ✅ .mindforge/org
  ✅ .planning/decisions
  ✅ bin
  ✅ docs
  ✅ tests
  ✅ .planning/audit-archive
  ✅ .planning/approvals
  ✅ .planning/milestones

Required files:
  ✅ .claude/CLAUDE.md
  ✅ .agent/CLAUDE.md
  ✅ .claude/commands/mindforge/help.md
  ✅ .claude/commands/mindforge/init-project.md
  ✅ .claude/commands/mindforge/plan-phase.md
  ✅ .claude/commands/mindforge/execute-phase.md
  ✅ .claude/commands/mindforge/verify-phase.md
  ✅ .claude/commands/mindforge/ship.md
  ✅ .claude/commands/mindforge/audit.md
  ✅ .claude/commands/mindforge/milestone.md
  ✅ .claude/commands/mindforge/complete-milestone.md
  ✅ .claude/commands/mindforge/approve.md
  ✅ .claude/commands/mindforge/sync-jira.md
  ✅ .claude/commands/mindforge/sync-confluence.md
  ✅ .mindforge/personas/analyst.md
  ✅ .mindforge/personas/architect.md
  ✅ .mindforge/personas/developer.md
  ✅ .mindforge/personas/qa-engineer.md
  ✅ .mindforge/personas/security-reviewer.md
  ✅ .mindforge/personas/tech-writer.md
  ✅ .mindforge/personas/debug-specialist.md
  ✅ .mindforge/personas/release-manager.md
  ✅ .mindforge/skills/security-review/SKILL.md
  ✅ .mindforge/skills/code-quality/SKILL.md
  ✅ .mindforge/skills/api-design/SKILL.md
  ✅ .mindforge/skills/testing-standards/SKILL.md
  ✅ .mindforge/skills/documentation/SKILL.md
  ✅ .mindforge/org/ORG.md
  ✅ .mindforge/org/CONVENTIONS.md
  ✅ .mindforge/org/SECURITY.md
  ✅ .mindforge/org/TOOLS.md
  ✅ .mindforge/integrations/connection-manager.md
  ✅ .mindforge/integrations/jira.md
  ✅ .mindforge/integrations/confluence.md
  ✅ .mindforge/integrations/slack.md
  ✅ .mindforge/integrations/github.md
  ✅ .mindforge/integrations/gitlab.md
  ✅ .mindforge/governance/change-classifier.md
  ✅ .mindforge/governance/approval-workflow.md
  ✅ .mindforge/governance/compliance-gates.md
  ✅ .mindforge/governance/GOVERNANCE-CONFIG.md
  ✅ .mindforge/team/multi-handoff.md
  ✅ .mindforge/team/session-merger.md
  ✅ .mindforge/org/integrations/INTEGRATIONS-CONFIG.md
  ✅ .planning/STATE.md
  ✅ .planning/HANDOFF.json
  ✅ .planning/jira-sync.json
  ✅ .planning/slack-threads.json
  ✅ bin/install.js
  ✅ package.json
  ✅ README.md
  ✅ docs/enterprise-setup.md
  ✅ docs/governance-guide.md

Content validation:
  ✅ CLAUDE.md has session start protocol
  ❌ CLAUDE.md and .agent/CLAUDE.md are identical
     .claude/CLAUDE.md and .agent/CLAUDE.md differ
+ actual - expected ... Lines skipped

  '# MindForge — Enterprise Agentic Framework\n' +
    '# Agent Configuration File — Read this completely before doing anything.\n' +
...
    '5. On failure: apply RETRY → DECOMPOSE → PRUNE logic (node-repair.md).\n' +
    '6. Compliance Gate 3 (secrets) runs PRE-COMMIT on staged diffs.\n' +
+   '7. Visual Verification: runs <verify-visual> AFTER successful <verify> (unit tests).\n' +
+   '8. Governance: ESCALATE immediately on Tier 3 changes (Auth/Payment/PII).\n' +
+   '\n' +
+   '### Steering awareness\n' +
+   'Check `.planning/steering-queue.jsonl` at every task boundary.\n' +
+   'If guidance is present: inject it into the next PLAN file as the highest priority\n' +
+   'instruction. Standard governance gates still apply to steered changes.\n' +
+   '\n' +
+   '### Headless execution\n' +
+   'If `--headless` is used:\n' +
+   '- Disable all TTY-rich progress UI.\n' +
+   '- Structure all stdout as line-delimited JSON.\n' +
+   '- Handle SIGTERM by pausing execution and snapshotting HANDOFF.json.\n' +
+   '\n' +
+   '### New commands (Day 8)\n' +
+   '- /mindforge:auto — start/resume autonomous execution engine\n' +
+   '- /mindforge:steer — inject mid-execution guidance\n' +
+   '- /mindforge:browse — persistent browser control and actions\n' +
+   '- /mindforge:qa — systematic post-phase visual QA\n' +
+   '\n' +
+   '---\n' +
+   '\n' +
+   '## IDENTITY\n' +
+   '\n' +
...
-   '7. Governance: ESCALATE immediately on Tier 3 changes (Auth/Payment/PII).\n' +
-   '\n' +
-   '### Steering awareness\n' +
-   'Check `.planning/steering-queue.jsonl` at every task boundary.\n' +
-   'If guidance is present: inject it into the next PLAN file as the highest priority\n' +
-   'instruction. Standard governance gates still apply to steered changes.\n' +
-   '\n' +
-   '### Headless execution\n' +
-   'If `--headless` is used:\n' +
-   '- Disable all TTY-rich progress UI.\n' +
-   '- Structure all stdout as line-delimited JSON.\n' +
-   '- Handle SIGTERM by pausing execution and snapshotting HANDOFF.json.\n' +
-   '\n' +
-   '### New commands (Day 8)\n' +
-   '- /mindforge:auto — start/resume autonomous execution engine\n' +
-   '- /mindforge:steer — inject mid-execution guidance\n' +
-   '\n' +
-   '---\n' +
-   '\n' +
-   '## IDENTITY\n' +
-   '\n' +
-   'You are a senior AI engineering agent operating under the **MindForge framework**.\n' +
-   'You have the precision of a principal engineer, the strategic thinking of a product\n' +
-   'architect, and the quality standards of a staff-level code reviewer.\n' +
...
  ✅ All 6 commands mirrored to .agent/mindforge/
  ✅ HANDOFF.json is valid JSON
  ✅ package.json has bin field
  ✅ All skill packs have frontmatter triggers
  ✅ bin/install.js is executable and has no obvious syntax errors

  ✅ No secrets in any committed file
❌ 1 test(s) failed. Fix before pushing.


──────────────────────────────────────────────────
Results: 80 passed, 1 failed