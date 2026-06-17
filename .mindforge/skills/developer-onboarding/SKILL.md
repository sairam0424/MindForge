---
name: developer-onboarding
version: 1.0.0
min_mindforge_version: 10.0.8
status: stable
triggers: developer onboarding, first day script, time to first commit, starter task, onboarding checklist, readme driven, local setup, onboarding buddy, knowledge transfer, ramp up plan, new hire guide, dev environment setup
---

# Developer Onboarding

## When this skill activates

This skill activates when creating or improving developer onboarding processes, writing setup scripts, curating starter tasks, designing ramp-up plans, or reducing time-to-first-commit for new team members. It applies to both new hire onboarding and existing developers joining a new project.

## Mandatory actions when this skill is active

### Before

1. Identify the target developer profile (junior/senior, frontend/backend/fullstack, intern/FTE).
2. Measure current time-to-first-commit (if unknown, estimate from last onboarding).
3. Inventory existing onboarding materials (README, wiki, setup scripts, recorded sessions).
4. Identify the most common setup failures (from Slack history, onboarding feedback).
5. Determine who will act as onboarding buddy for new joiners.

### During

**North Star Metric: Time-to-First-Commit**
- Target: < 4 hours from laptop opening to merged PR.
- Measure: first commit to main branch (not just local setup complete).
- Track this metric for every new joiner. If it degrades, fix the onboarding immediately.
- This metric reveals every broken doc, missing tool, and outdated step.

**First-Day Setup Script:**
- One command should set up everything: `make setup` or `./scripts/setup.sh`.
- Script must handle: dependency installation, environment variables, database setup, seed data, test run.
- Script must be idempotent (safe to run multiple times).
- Script must detect and report issues clearly (missing tool versions, port conflicts).
- Script must work on all team platforms (macOS, Linux; Windows via WSL if needed).
- Include a final verification step: "Setup complete. Running tests... All 47 tests passed."

**README-Driven Development:**
- If it is not in the README, it does not exist for new developers.
- README must answer: How do I run it? How do I test it? How do I deploy it? Where do I ask questions?
- Keep setup instructions in the README (not a wiki that gets stale).
- Test the README quarterly: have someone follow it literally on a fresh machine.
- Mark prerequisites explicitly: Node 20+, Docker, PostgreSQL 15, etc.

**Starter Tasks (Good First Issues):**
- Label issues explicitly: `good-first-issue`, `starter-task`, `onboarding`.
- Scope: achievable in 2-4 hours, touches 1-3 files, has clear acceptance criteria.
- Include: link to relevant code, example of similar completed work, who to ask.
- Types that work well: fix a typo in UI, add a missing validation, write a test for uncovered code, update a dependency.
- Avoid: tasks requiring deep domain knowledge, cross-service changes, or ambiguous requirements.

**Onboarding Buddy System:**
- Assign a buddy for the first 2 weeks (not the manager, a peer).
- Buddy responsibilities: pair on first PR, answer "dumb" questions, review first 3 PRs same-day.
- Buddy should proactively check in (don't wait for the new dev to ask).
- Rotate buddy duty across team (prevents knowledge silos, spreads empathy).

**Knowledge Transfer:**
- Record short Loom videos of key workflows (deploy process, debugging common issues, release flow).
- Keep recordings under 10 minutes (people don't watch long videos).
- Store in a discoverable location (project wiki, onboarding channel pinned messages).
- Update when workflows change (stale videos are worse than no videos).
- Architecture diagram: one page showing services, databases, and data flow.

**Ramp-Up Plan (4-Week Template):**
- **Week 1**: Environment setup, explore codebase, first starter task merged, meet team.
- **Week 2**: First bug fix (real issue from backlog), attend architecture walkthrough, pair with buddy.
- **Week 3**: Small feature (scoped, designed by senior, implemented independently), first code review given.
- **Week 4**: Independent work on medium-scoped task, contribute to team process (improve a doc, fix flaky test).
- Checkpoint at end of each week: buddy + manager assess progress, adjust plan if needed.

**Common Pitfalls to Prevent:**
- Setup docs reference tools that are no longer used.
- Env vars documented in one place but actual required set has grown.
- "Ask Bob" for access — Bob is on vacation. Document the process instead.
- Tests pass on CI but fail locally due to missing env vars or services.
- New dev changes something they shouldn't because boundaries aren't documented.

### After

1. New developer has a merged PR within the target timeframe.
2. Setup script runs without manual intervention on a fresh machine.
3. All blockers encountered are fixed in the onboarding materials immediately.
4. Feedback collected from new developer (what was confusing, what was missing).
5. Onboarding materials updated based on feedback.

## Self-check before task completion

- [ ] Setup script is one command and runs successfully on a clean machine.
- [ ] README contains all information needed to run, test, and deploy locally.
- [ ] At least 3 starter tasks are labeled and ready for the next new joiner.
- [ ] Ramp-up plan exists with weekly milestones and checkpoints.
- [ ] Onboarding buddy is assigned and knows their responsibilities.
- [ ] Architecture diagram is current and accessible.
- [ ] Time-to-first-commit metric is tracked and below the 4-hour target.
- [ ] Feedback loop exists: every new joiner improves the process for the next one.
