# MindForge — Day 3 Implementation Prompt
# Branch: `feat/mindforge-skills-platform`
# Prerequisite: `feat/mindforge-wave-engine` merged to `main`

---

## BRANCH SETUP (run before anything else)

```bash
git checkout main
git pull origin main
git checkout -b feat/mindforge-skills-platform
```

Verify Day 1 and Day 2 are fully present:

```bash
ls .mindforge/engine/wave-executor.md        # Day 2 engine
ls .mindforge/engine/compaction-protocol.md  # Day 2 compaction
ls .planning/AUDIT.jsonl                     # Day 2 audit
ls .claude/commands/mindforge/next.md        # Day 2 commands
node tests/install.test.js && \
node tests/wave-engine.test.js && \
node tests/audit.test.js && \
node tests/compaction.test.js
# All must pass before Day 3 begins
```

If any test fails — stop. Do not start Day 3 on a broken Day 2.

---

## DAY 3 SCOPE

Day 3 builds the **Skills & Intelligence Platform** — the layer that makes
MindForge's agents genuinely expert rather than generically capable.

| Component | Description |
|---|---|
| Skills distribution system | Tiered skill registry: Core → Org → Project |
| 5 new skill packs | performance, accessibility, data-privacy, incident-response, database-patterns |
| Skills versioning engine | Semver for skills, compatibility checks, upgrade path |
| `/mindforge:skills` command | Full CLI: list, add, update, validate, info |
| `/mindforge:review` command | Full code review using code-quality + security skill |
| `/mindforge:security-scan` command | Standalone security scan on any path or diff |
| `/mindforge:map-codebase` command | Brownfield project onboarding — analyse any codebase |
| `/mindforge:discuss-phase` command | Pre-planning discussion to capture implementation decisions |
| Persona customisation system | Override persona defaults per project or per phase |
| Skills auto-loader upgrade | Multi-skill loading, conflict resolution, priority ordering |
| `tests/skills-platform.test.js` | Full test suite for Day 3 components |

**Do not** implement on Day 3:
- Jira / Confluence / Slack integrations (Day 4)
- Team collaboration and multi-developer HANDOFF (Day 4)
- GUI dashboard (Day 5+)
- Public skills registry / npm-distributed skills (Day 5+)

---

## TASK 1 — Scaffold Day 3 directory additions

```bash
# Skills platform engine
mkdir -p .mindforge/engine/skills
touch .mindforge/engine/skills/registry.md
touch .mindforge/engine/skills/loader.md
touch .mindforge/engine/skills/versioning.md
touch .mindforge/engine/skills/conflict-resolver.md

# 5 new skill packs
mkdir -p .mindforge/skills/performance
mkdir -p .mindforge/skills/accessibility
mkdir -p .mindforge/skills/data-privacy
mkdir -p .mindforge/skills/incident-response
mkdir -p .mindforge/skills/database-patterns
touch .mindforge/skills/performance/SKILL.md
touch .mindforge/skills/accessibility/SKILL.md
touch .mindforge/skills/data-privacy/SKILL.md
touch .mindforge/skills/incident-response/SKILL.md
touch .mindforge/skills/database-patterns/SKILL.md

# Persona customisation system
mkdir -p .mindforge/personas/overrides
touch .mindforge/personas/overrides/README.md

# Org-level skill distribution
mkdir -p .mindforge/org/skills
touch .mindforge/org/skills/MANIFEST.md

# New commands
touch .claude/commands/mindforge/skills.md
touch .claude/commands/mindforge/review.md
touch .claude/commands/mindforge/security-scan.md
touch .claude/commands/mindforge/map-codebase.md
touch .claude/commands/mindforge/discuss-phase.md

# Mirror to Antigravity
for cmd in skills review security-scan map-codebase discuss-phase; do
  cp .claude/commands/mindforge/${cmd}.md .agent/mindforge/${cmd}.md
done

# Tests
touch tests/skills-platform.test.js

# Docs
touch docs/skills-authoring-guide.md
touch docs/persona-customisation.md
```

**Commit:**
```bash
git add .
git commit -m "chore(day3): scaffold Day 3 skills platform directory structure"
```

---

## TASK 2 — Write the Skills Registry and Distribution System

The registry is the source of truth for what skills exist, where they live,
and whether they are compatible with the current MindForge version.

---

### `.mindforge/engine/skills/registry.md`

```markdown
# MindForge Skills Engine — Registry

## Purpose
The skills registry tracks every available skill pack across all three tiers,
their versions, trigger keywords, compatibility requirements, and source locations.
The registry is the first thing the skills loader reads.

## Registry file location
`.mindforge/org/skills/MANIFEST.md` — org-level manifest (shared via git)

## Manifest format

The MANIFEST.md uses a structured table format readable by both humans and agents:

```markdown
# MindForge Skills Manifest
# Version: 1.0.0
# MindForge compatibility: >=0.1.0
# Last updated: [ISO-8601]

## Core Skills (Tier 1 — maintained by MindForge)

| Name | Version | Status | Min MindForge | Triggers (excerpt) |
|---|---|---|---|---|
| security-review | 1.0.0 | stable | 0.1.0 | auth, password, token, JWT |
| code-quality | 1.0.0 | stable | 0.1.0 | refactor, review, lint |
| api-design | 1.0.0 | stable | 0.1.0 | API, endpoint, REST |
| testing-standards | 1.0.0 | stable | 0.1.0 | test, spec, coverage |
| documentation | 1.0.0 | stable | 0.1.0 | README, docs, changelog |
| performance | 1.0.0 | stable | 0.3.0 | performance, latency, cache |
| accessibility | 1.0.0 | stable | 0.3.0 | a11y, aria, wcag, screen reader |
| data-privacy | 1.0.0 | stable | 0.3.0 | GDPR, PII, consent, retention |
| incident-response | 1.0.0 | stable | 0.3.0 | incident, outage, postmortem |
| database-patterns | 1.0.0 | stable | 0.3.0 | query, index, migration, N+1 |

## Org Skills (Tier 2 — maintained by your organisation)

| Name | Version | Status | Min MindForge | Triggers (excerpt) |
|---|---|---|---|---|
| [org-skill-name] | 1.0.0 | stable | 0.1.0 | [trigger keywords] |

## Project Skills (Tier 3 — maintained per project)

| Name | Version | Status | Min MindForge | Triggers (excerpt) |
|---|---|---|---|---|
| [project-skill-name] | 1.0.0 | stable | 0.1.0 | [trigger keywords] |
```

## Registry operations

### Scan and build registry (run at session start)
1. Read `.mindforge/org/skills/MANIFEST.md`
2. For each skill in the manifest, verify its SKILL.md file exists at the expected path
3. If a skill in the manifest has no corresponding file: mark as `missing`
4. If a SKILL.md file exists but is not in the manifest: mark as `unregistered`
5. Build the in-session registry: a flat list of all valid skills with their metadata

### Registry health check
Run as part of `/mindforge:health`:
- All manifest entries have corresponding SKILL.md files ✅ / ❌ missing
- All SKILL.md files have valid frontmatter (name, version, triggers) ✅ / ❌ invalid
- No trigger keyword conflicts between skills at the same tier ✅ / ⚠️ conflict
- All skill versions are valid semver strings ✅ / ❌ invalid

### Adding a skill to the registry
1. Create the skill directory and SKILL.md (content per the authoring guide)
2. Validate the SKILL.md frontmatter is complete and correct
3. Add an entry to MANIFEST.md in the correct tier section
4. Commit: `feat(skills): add [skill-name] v[version]`

### Removing a skill from the registry
1. Mark the skill as `deprecated` in MANIFEST.md (do not delete the entry)
2. Add a `deprecated_at` and `replacement` field to the SKILL.md frontmatter
3. After 2 sprints of deprecation: delete the skill directory and manifest entry
4. Never hard-delete a skill that might still be referenced in existing PLAN files

## Tier priority for conflict resolution
When two skills at different tiers have overlapping trigger keywords:
Priority order: Project (Tier 3) > Org (Tier 2) > Core (Tier 1)

The higher-priority tier's skill is loaded. The lower-priority skill is not loaded.
This allows org and project skills to override core skill behaviour intentionally.

When two skills at the SAME tier have conflicting trigger keywords:
See `conflict-resolver.md`.
```

---

### `.mindforge/engine/skills/loader.md`

```markdown
# MindForge Skills Engine — Loader

## Purpose
Discover, load, and inject the correct skill packs for any given task context.
The loader is invoked at the start of every task execution.

## Loading sequence

### Step 1 — Build the trigger index
At session start (or when skills are updated):
1. Read MANIFEST.md to get all registered skills
2. For each valid skill, read its frontmatter `triggers:` list
3. Build an in-memory trigger index:
   ```
   {
     "auth":           ["security-review"],
     "authentication": ["security-review"],
     "password":       ["security-review"],
     "refactor":       ["code-quality"],
     "performance":    ["performance"],
     "N+1":            ["database-patterns"],
     "GDPR":           ["data-privacy"],
     ...
   }
   ```
4. Where multiple skills share a trigger, record all of them (conflict resolution happens at load time)

### Step 2 — Match task to skills
Given a task description and the files in `<files>`:

**Text matching (primary):**
For every word and phrase in the task description `<n>`, `<action>`, and `<context>` fields:
- Exact keyword match against the trigger index
- Case-insensitive matching
- Multi-word trigger matching: "database migration" matches "migration" trigger
- Acronym expansion: "a11y" matches "accessibility" trigger

**File path matching (secondary):**
Examine the file paths in `<files>` for structural hints:
- `/auth/` or `/security/` in path → load security-review
- `/api/` or `/routes/` in path → load api-design
- `/tests/` or `.test.ts` in path → load testing-standards
- `/db/` or `/migrations/` in path → load database-patterns
- `/components/` or `.tsx` in path → load accessibility (UI components should be accessible)
- `privacy` or `consent` in path → load data-privacy

**Combined match:**
Skills triggered by EITHER text OR file path matching are loaded.
A skill only needs ONE matching signal to be loaded.

### Step 3 — Resolve conflicts
If two skills from the same tier both match:
- See `conflict-resolver.md` for the resolution protocol
- Default: load both skills, but flag the overlap to the agent

### Step 4 — Load the matched skills
For each matched skill (in tier priority order: Project → Org → Core):
1. Read the full SKILL.md content
2. Check compatibility: does `min_mindforge_version` in frontmatter satisfy current version?
   If not: warn but still load (do not block execution on version mismatch)
3. Inject the skill content into the agent's context package (per `context-injector.md`)
4. Log which skills were loaded in the task's `task_started` AUDIT entry

### Step 5 — Post-load verification
After loading:
- Report to the agent: "Skills loaded for this task: [list]"
- If zero skills were loaded for a complex task: consider whether any manual skill
  loading is appropriate. Some tasks genuinely need no skills (simple refactors, etc.)
- If more than 3 skills are loaded simultaneously: warn that context budget may be tight.
  Summarise the less-relevant skills rather than injecting their full content.

## Context budget management for skills

Each SKILL.md file costs tokens when injected. Track the budget:

| Skills loaded | Estimated cost | Status |
|---|---|---|
| 1 skill | ~3-5K tokens | ✅ Comfortable |
| 2 skills | ~6-10K tokens | ✅ Fine |
| 3 skills | ~9-15K tokens | ⚠️ Monitor total context |
| 4+ skills | 12K+ tokens | 🔴 Summarise lower-priority skills |

When injecting 4+ skills: summarise skills ranked 4th and below to their
trigger keywords, mandatory actions list, and output format only.
Do not inject the full content. Full content goes to the top 3 most relevant skills.

## Skills loading report format

After loading, write to the task's AUDIT `task_started` entry:
```json
{
  "skills_loaded": [
    { "name": "security-review", "version": "1.0.0", "tier": 1, "trigger": "auth" },
    { "name": "api-design", "version": "1.0.0", "tier": 1, "trigger": "/api/" }
  ],
  "skills_summarised": [],
  "total_skill_tokens_est": 8500
}
```
```

---

### `.mindforge/engine/skills/versioning.md`

```markdown
# MindForge Skills Engine — Versioning

## Purpose
Define how skill versions work, what constitutes a breaking change, and how
agents handle version mismatches between what is installed and what is needed.

## Versioning scheme
Skills use Semantic Versioning (semver.org): MAJOR.MINOR.PATCH

| Increment | When | Example |
|---|---|---|
| MAJOR | Breaking change to skill interface (removed triggers, changed output format, changed mandatory actions) | 1.0.0 → 2.0.0 |
| MINOR | New trigger keywords, new optional sections, new examples | 1.0.0 → 1.1.0 |
| PATCH | Clarifications, typo fixes, improved examples with no behaviour change | 1.0.0 → 1.0.1 |

## Frontmatter version fields

Every SKILL.md must have these frontmatter fields:

```yaml
---
name: security-review
version: 1.2.0
min_mindforge_version: 0.1.0
status: stable
deprecated_at:         # ISO-8601 date if deprecated, empty if not
replacement:           # skill name if deprecated, empty if not
breaking_changes:
  - "2.0.0: removed 'xss' as standalone trigger (now part of 'injection' trigger)"
changelog:
  - "1.2.0: added supply chain security check"
  - "1.1.0: expanded OWASP checklist to include A08-A10"
  - "1.0.0: initial stable release"
---
```

## Compatibility check protocol

Before loading any skill, verify compatibility:

### Check 1 — MindForge version compatibility
Read `min_mindforge_version` from the skill's frontmatter.
Compare against the current MindForge version (from `package.json`).

If skill's `min_mindforge_version` > current MindForge version:
- Log a warning: "Skill [name] v[X] requires MindForge v[min] but current is v[current]."
- Load the skill anyway (do not block execution)
- Add to AUDIT entry: `"compatibility_warning": "skill requires newer MindForge"`

### Check 2 — Deprecation check
If the skill's `deprecated_at` field is set:
- Warn: "Skill [name] was deprecated on [date]. Use [replacement] instead."
- Load the replacement skill (if available) in addition to the deprecated one
- Add to AUDIT entry: `"deprecated_skill_loaded": true`

### Check 3 — Breaking change awareness
If the skill has a MAJOR version bump since it was last used in this project:
- List the breaking changes from the `breaking_changes` field
- Alert: "Skill [name] has breaking changes since your last usage.
  Review these before continuing: [list changes]"

## Skill upgrade protocol

When `/mindforge:skills update [skill-name]` is run:

1. Check current version from MANIFEST.md
2. Compare against the latest version in the MindForge repository
3. If a newer version exists:
   a. Show the diff in behaviour (changelog entries)
   b. If MINOR or PATCH: auto-update, no confirmation needed
   c. If MAJOR: show breaking changes, require explicit confirmation
4. After update: re-validate all PLAN files that reference this skill
   (check if any `<context>` fields would be affected by the breaking changes)
5. Update MANIFEST.md with new version
6. Commit: `chore(skills): upgrade [name] v[old] → v[new]`
```

---

### `.mindforge/engine/skills/conflict-resolver.md`

```markdown
# MindForge Skills Engine — Conflict Resolver

## Purpose
Resolve cases where two or more skills at the same tier have overlapping trigger
keywords. Define clear, deterministic resolution rules.

## Types of conflicts

### Type 1 — Same trigger keyword, different skills, same tier
Example: Both `security-review` and `api-design` have `endpoint` as a trigger.
A task with "create an authenticated endpoint" would match both.

**Resolution: Load both.**
Multiple skills addressing the same task from different angles is additive,
not conflicting. The agent benefits from both security review AND API design guidance.
Inject both skill contents (subject to context budget in `loader.md`).

### Type 2 — Same trigger keyword, same skill name, different tiers
Example: Org has a custom `security-review` v2.0 and Core has `security-review` v1.2.
Both trigger on "auth".

**Resolution: Higher tier wins.**
Project (T3) > Org (T2) > Core (T1).
Load the higher-tier version. Do not load both. Org skills intentionally override Core.

### Type 3 — Trigger subset (one skill's triggers are a subset of another's)
Example: `database-patterns` triggers on "query", `api-design` triggers on "query, endpoint".
A task about "database query optimisation" matches both.

**Resolution: Load the more specific skill as primary, secondary as supporting.**
If one skill's triggers are a strict subset of the task's matching keywords:
that skill is more specifically targeted and should be the primary (first in context order).

### Type 4 — Mutual exclusion (skills define themselves as mutually exclusive)
Some skills may define `mutually_exclusive_with` in their frontmatter.
Example: A project has both a `rest-api` and `graphql-api` skill. Loading both
would give contradictory guidance.

```yaml
mutually_exclusive_with: graphql-api
```

**Resolution: Load the skill whose triggers had the most keyword matches.
If tied: load the higher-tier skill. If still tied: ask the user.**

## Conflict log
When any conflict resolution occurs, write to the AUDIT log:
```json
{
  "event": "skill_conflict_resolved",
  "conflict_type": "same_trigger_different_skills",
  "resolution": "loaded_both",
  "skills": ["security-review", "api-design"],
  "trigger": "endpoint"
}
```

## Developer guide: avoiding conflicts
When authoring skills:
- Make trigger keywords as specific as possible
- Avoid generic words like "data", "create", "update" as triggers
- Use domain-specific terms: "argon2" not "hash", "WCAG" not "accessibility" (if you can)
- If your skill should override a core skill: declare it in the same name as the core
  skill and place it in a higher tier — the tier priority system handles the rest
```

**Commit:**
```bash
git add .mindforge/engine/skills/
git commit -m "feat(skills-engine): implement registry, loader, versioning, conflict resolver"
```

---

## TASK 3 — Write the 5 new core skill packs

---

### `.mindforge/skills/performance/SKILL.md`

```markdown
---
name: performance
version: 1.0.0
min_mindforge_version: 0.3.0
status: stable
triggers: performance, latency, throughput, cache, caching, slow, optimise, optimize,
          bottleneck, profil, load time, bundle size, memory, CPU, N+1, query time,
          response time, timeout, rate limit, debounce, throttle, memoize, lazy load,
          code split, tree shake, LCP, CLS, FID, INP, Core Web Vitals, lighthouse
---

# Skill — Performance Engineering

## When this skill activates
Any task involving response time, resource usage, bundle size, database query
performance, or user-perceived load time metrics.

## Mandatory actions when this skill is active

### Before writing any code
1. Identify what is being measured. Never optimise without a baseline.
2. Read the relevant metric from REQUIREMENTS.md (NFRs):
   - API response time target (e.g., p95 < 200ms)
   - Page load time target (e.g., LCP < 2.5s)
   - Bundle size budget (e.g., < 200KB gzipped initial JS)
3. If no NFR is defined: ask the user to define one before optimising.
   "Optimisation without a target is premature optimisation."

### Backend performance standards

**Database queries:**
- Every query must use indexes for its WHERE, JOIN, and ORDER BY columns
- Detect N+1 queries: if fetching a list then querying per item, use JOIN or batch fetch
- Pagination: always paginate list endpoints (default page size: 20, max: 100)
- Avoid `SELECT *` — select only the columns needed
- Use `EXPLAIN ANALYZE` (PostgreSQL) or `EXPLAIN` (MySQL) to verify query plans
- Cache repeated identical queries: Redis with appropriate TTL

**API response time:**
- Target: p50 < 100ms, p95 < 500ms, p99 < 2000ms for most endpoints
- Slow endpoints (> 500ms): must be async (return immediately, use webhooks or polling)
- Database connection pooling: always use a connection pool (never open/close per request)
- Avoid synchronous I/O in request handlers

**Caching strategy:**
| Data type | Recommended cache | TTL |
|---|---|---|
| User session data | Redis | 24 hours |
| Computed aggregates | Redis | 1–5 minutes |
| Static reference data | Redis | 1 hour |
| User-specific data | Redis with user key | 15 minutes |
| API responses | HTTP Cache-Control | depends on freshness needs |

### Frontend performance standards

**Bundle size budgets:**
| Asset | Budget (gzipped) |
|---|---|
| Initial JavaScript | < 200KB |
| Initial CSS | < 50KB |
| Per-route chunk | < 100KB |
| Images (hero) | < 200KB WebP |
| Fonts | < 50KB per weight |

**Core Web Vitals targets (Google's thresholds):**
| Metric | Good | Needs improvement | Poor |
|---|---|---|---|
| LCP (Largest Contentful Paint) | < 2.5s | 2.5–4s | > 4s |
| INP (Interaction to Next Paint) | < 200ms | 200–500ms | > 500ms |
| CLS (Cumulative Layout Shift) | < 0.1 | 0.1–0.25 | > 0.25 |

**Implementation patterns:**
- Route-based code splitting: every route is its own chunk
- Lazy load non-critical components: `React.lazy()` + `Suspense`
- Image optimisation: use `next/image` or equivalent. Always specify `width`/`height`.
- Font loading: `font-display: swap`. Preload critical fonts.
- Avoid layout thrashing: batch DOM reads before DOM writes
- Debounce user input handlers (search: 300ms, resize: 100ms)
- Memoize expensive computations: `useMemo` / `useCallback` where measured

### Performance measurement commands

```bash
# Backend: measure API response time
curl -w "@curl-format.txt" -o /dev/null -s https://api.example.com/endpoint

# Frontend: Lighthouse CI
npx lighthouse https://example.com --output json --output-path ./lighthouse.json

# Bundle analysis
npx bundle-analyzer stats.json

# Node.js profiling
node --prof app.js
node --prof-process isolate-*.log > profile.txt

# Database: explain query
EXPLAIN ANALYZE SELECT * FROM users WHERE email = 'test@example.com';
```

## Performance review checklist
Before marking any task done that involves a query or endpoint:
- [ ] Query uses appropriate indexes (verified with EXPLAIN)
- [ ] No N+1 queries in list endpoints
- [ ] Response time verified locally (curl with timing)
- [ ] No `SELECT *` in production queries
- [ ] Caching applied where data is read-heavy and tolerance allows staleness

## Output
Write performance notes to SUMMARY.md:
- Baseline metric (before)
- Achieved metric (after)
- What optimisation was applied
- Whether the NFR target was met ✅ or still needs work ⚠️
```

---

### `.mindforge/skills/accessibility/SKILL.md`

```markdown
---
name: accessibility
version: 1.0.0
min_mindforge_version: 0.3.0
status: stable
triggers: accessibility, a11y, aria, ARIA, wcag, WCAG, screen reader, keyboard,
          focus, tab order, colour contrast, color contrast, alt text, semantic HTML,
          form label, button, interactive, disabled, skip link, heading hierarchy,
          landmark, live region, modal, dialog, tooltip, dropdown, combobox
---

# Skill — Accessibility Engineering

## When this skill activates
Any task involving UI components, forms, interactive elements, or user-facing HTML.
Load this skill for ALL frontend work — accessibility is not optional.

## Mandatory standard
WCAG 2.1 Level AA is the minimum. This is the legal requirement in most jurisdictions.
Level AAA elements (where achievable without design compromise) are recommended.

## Mandatory actions when this skill is active

### Before writing any UI component
1. Identify the semantic HTML element that best represents the component.
   Use native HTML before ARIA. A `<button>` is always better than a `<div role="button">`.
2. Map all interactive states: default, hover, focus, active, disabled, error, loading.
3. Confirm colour contrast meets WCAG AA:
   - Normal text: contrast ratio ≥ 4.5:1
   - Large text (≥ 18pt or ≥ 14pt bold): contrast ratio ≥ 3:1
   - UI components and graphics: contrast ratio ≥ 3:1

### HTML semantics checklist (apply to every component)

**Structure:**
- [ ] One `<h1>` per page. Heading hierarchy is sequential (h1 → h2 → h3, never skip levels)
- [ ] Landmark roles present: `<main>`, `<nav>`, `<header>`, `<footer>`, `<aside>`
- [ ] Skip navigation link as the first focusable element on every page

**Forms:**
- [ ] Every input has a visible `<label>` (not just placeholder text)
- [ ] Label is programmatically associated: `<label for="id">` or `aria-labelledby`
- [ ] Required fields marked: `required` attribute + visual indicator + aria description
- [ ] Error messages: `role="alert"` or `aria-live="polite"`, associated with field via `aria-describedby`
- [ ] Validation errors describe the problem AND the fix, not just "Invalid input"

**Interactive components:**
- [ ] All interactive elements reachable by Tab key
- [ ] Focus visible: never `outline: none` without a custom visible focus style
- [ ] Keyboard shortcuts documented and not conflicting with browser/OS shortcuts
- [ ] Custom widgets implement the correct ARIA pattern (see ARIA Authoring Practices Guide)

**Images and media:**
- [ ] Decorative images: `alt=""` (empty string, not omitted)
- [ ] Informative images: `alt` describes the information conveyed
- [ ] Complex images (charts, diagrams): `aria-describedby` pointing to a full text description
- [ ] Videos: captions required. Audio descriptions for visual-only information.

**Dynamic content:**
- [ ] Content that updates dynamically: `aria-live="polite"` (non-critical) or `aria-live="assertive"` (critical)
- [ ] Modals/dialogs: focus moves to modal on open, returns to trigger on close, `aria-modal="true"`
- [ ] Loading states: `aria-busy="true"` on the container being updated

### ARIA usage rules
- Use ARIA only when no native HTML element conveys the role
- ARIA roles override native semantics — applying a role to `<button>` changes it
- Required ARIA properties: never use a role without its required properties
  (e.g., `role="checkbox"` requires `aria-checked`)
- Never use `aria-hidden="true"` on focusable elements

### Testing protocol
```bash
# Automated testing (catches ~30-40% of issues)
npx axe-cli https://localhost:3000

# Keyboard testing (manual — must be done for every interactive component)
# 1. Tab through every interactive element — order must be logical
# 2. Activate every control with Enter/Space — must work
# 3. Navigate dropdowns/menus with arrow keys
# 4. Escape dismisses modals and dropdowns

# Screen reader testing (minimum: test with NVDA + Chrome on Windows OR
#                                     VoiceOver + Safari on macOS)
# Key checks:
# - Every interactive element announced with role, name, and state
# - Dynamic updates announced appropriately
# - Images described correctly

# Contrast checking
# Install: axe DevTools browser extension or Colour Contrast Analyser
```

## Self-check before task completion
- [ ] Ran `axe-cli` — zero violations
- [ ] Keyboard navigation tested manually
- [ ] All interactive elements have accessible names
- [ ] Colour contrast meets 4.5:1 for text
- [ ] Focus management correct for modals and dynamic content
- [ ] No `aria-hidden` on focusable elements
```

---

### `.mindforge/skills/data-privacy/SKILL.md`

```markdown
---
name: data-privacy
version: 1.0.0
min_mindforge_version: 0.3.0
status: stable
triggers: GDPR, CCPA, privacy, PII, personal data, personal information, consent,
          data retention, right to erasure, right to access, data portability,
          data subject, anonymise, anonymize, pseudonymise, pseudonymize,
          data minimisation, data minimization, lawful basis, cookie, tracking,
          analytics, marketing, third party, data transfer, cross-border
---

# Skill — Data Privacy Engineering

## When this skill activates
Any task touching personal data collection, storage, processing, or transfer.
Also activates for consent management, analytics, cookie handling, and any
feature where user data flows to third parties.

## Regulatory coverage
This skill covers: GDPR (EU/UK), CCPA/CPRA (California), PIPEDA (Canada),
PDPA (Thailand/Singapore variants), LGPD (Brazil). Requirements often overlap —
implementing GDPR correctly satisfies most other frameworks.

## Mandatory actions when this skill is active

### Data audit — before touching any data feature
Answer these questions before writing code:
1. **What personal data is collected?** (Name, email, IP, device ID, location, behaviour)
2. **What is the lawful basis for processing?** (Consent / Contract / Legitimate interest / Legal obligation)
3. **How long is it retained?** (Must have a defined retention period — not "indefinitely")
4. **Who does it flow to?** (Internal systems only / third-party processors / international transfer)
5. **Can users access, export, and delete their data?**

If you cannot answer all 5: stop. Write the answers in ARCHITECTURE.md under
"Data Privacy" before implementing anything.

### PII handling standards

**Collection:**
- Collect the minimum data required for the stated purpose (data minimisation)
- Obtain consent before collecting non-essential data (analytics, marketing)
- Consent must be: specific, informed, freely given, unambiguous, and withdrawable
- Never pre-tick consent checkboxes. Never bundle consent for different purposes.

**Storage:**
- PII fields in the database must be identified (document in ARCHITECTURE.md)
- Encrypt sensitive PII at rest: financial data, health data, government IDs
- Pseudonymisation: where possible, store a user ID reference rather than PII inline
- Never store PII in: logs, AUDIT.jsonl, git commits, error messages, URL parameters

**Transfer:**
- Third-party processors: must have a Data Processing Agreement (DPA)
- International transfer (out of EU): requires Standard Contractual Clauses or adequacy decision
- Document all third-party data flows in ARCHITECTURE.md

**Retention and deletion:**
- Define retention period for every PII field in the data model
- Implement automated deletion or anonymisation when retention period expires
- Implement "right to erasure": a complete user delete must remove or anonymise ALL their PII
- Implement "right to access": export of all user data in a portable format (JSON/CSV)
- Test deletion: verify that deleted user data does not appear in any API response

### Cookie and tracking standards
```javascript
// Required: granular consent per category
const consentCategories = {
  necessary: true,      // Always true — no consent needed
  functional: false,    // Requires consent
  analytics: false,     // Requires consent
  marketing: false,     // Requires consent — highest bar
};

// Required: record consent with timestamp and version
await recordConsent({
  userId: user.id,
  categories: consentCategories,
  timestamp: new Date().toISOString(),
  policyVersion: '2026-01',
  ipHash: hash(userIp), // Store hash not raw IP for GDPR compliance
});

// Required: honour opt-out immediately
// If analytics: false — stop sending analytics events NOW, not on next page load
```

### Code patterns that are FORBIDDEN under data privacy
```
// ❌ NEVER: Log PII
console.log(`User ${user.email} logged in`) // email in logs = GDPR violation
logger.info({ user }) // entire user object = PII in logs

// ✅ ALWAYS: Log identifiers, never PII
logger.info({ userId: user.id, event: 'login' })

// ❌ NEVER: PII in error messages
throw new Error(`Could not find user ${user.email}`) // exposed in stack traces

// ✅ ALWAYS: identifiers in errors
throw new Error(`Could not find user [id:${user.id}]`)

// ❌ NEVER: PII in URL parameters
GET /api/users?email=john@example.com // logged by web servers, CDNs, browsers

// ✅ ALWAYS: POST body or path parameter by ID
GET /api/users/{id}
```

## Privacy review checklist
Before marking any data-related task done:
- [ ] Lawful basis identified for every data point collected
- [ ] PII never appears in logs, error messages, or URL parameters
- [ ] Retention period defined for every new PII field
- [ ] Third-party data flows documented in ARCHITECTURE.md
- [ ] User delete removes or anonymises ALL PII ✅ / not yet implemented ⚠️
- [ ] Consent UI does not use dark patterns (pre-ticked, bundled, misleading)
```

---

### `.mindforge/skills/incident-response/SKILL.md`

```markdown
---
name: incident-response
version: 1.0.0
min_mindforge_version: 0.3.0
status: stable
triggers: incident, outage, downtime, alert, pagerduty, oncall, on-call, postmortem,
          post-mortem, runbook, degraded, unavailable, error rate, p0, P0, p1, P1,
          rollback, hotfix, revert, emergency, spike, anomaly, SLA, SLO, SLI
---

# Skill — Incident Response Engineering

## When this skill activates
Any task involving incident runbooks, monitoring setup, alerting configuration,
hotfixes, rollbacks, or post-incident review documentation.

## Incident severity classification

| Level | Definition | Response time | Examples |
|---|---|---|---|
| P0 (Critical) | Complete service outage affecting all users | Immediate (24/7) | Site down, database unreachable, payment processing failed |
| P1 (High) | Major feature broken for all/most users | < 15 minutes | Login broken, core feature unavailable |
| P2 (Medium) | Feature degraded, workaround exists | < 2 hours | Slow API, intermittent errors for subset of users |
| P3 (Low) | Minor issue, cosmetic or edge case | Next business day | UI glitch, non-critical feature broken |

## Runbook template (write one for every critical path)

File: `docs/runbooks/[service-name]-[issue-type].md`

```markdown
# Runbook: [Service/Feature] — [Issue Type]

## Overview
**Service:** [name]
**Symptom:** [what the monitoring alert describes]
**Impact:** [who is affected and how]
**Severity:** P[0-3]

## Detection
**Alert:** [alert name and source — PagerDuty, Datadog, etc.]
**Metrics to check:**
- [metric 1]: normal range [X-Y], alert threshold [Z]
- [metric 2]: normal range [X-Y], alert threshold [Z]

## Immediate actions (first 5 minutes)
1. Acknowledge the alert in [alerting tool]
2. Check [dashboard URL] for current status
3. [Specific first diagnostic step]
4. [Specific second diagnostic step]
5. If confirmed P0/P1: page the on-call lead

## Diagnosis steps
1. Check [log location] for errors: `grep -E "ERROR|FATAL" [log file] | tail -50`
2. Check database connectivity: `[connection test command]`
3. Check external dependencies: `curl -I [dependency health URL]`
4. Check recent deployments: `git log --oneline -5`

## Mitigation options (in order of preference)
1. **Restart the service:** `[restart command]` — use if: [condition]
2. **Scale horizontally:** `[scale command]` — use if: [condition]
3. **Rollback deployment:** `[rollback command]` — use if: [condition]
4. **Failover to backup:** `[failover steps]` — use if: [condition]
5. **Feature flag off:** `[flag command]` — use if: [condition]

## Communication template
**Internal Slack:** "@oncall [P0] [service] is [symptom]. Investigating. ETA: [X] min"
**Status page:** "[Service] is currently experiencing [symptom]. We are investigating."
**Customer email:** [only for P0 lasting > 30 minutes]

## Post-incident (after mitigation)
1. Update status page: "Resolved. [Brief cause]."
2. Write postmortem within 48 hours (see template below)
3. Create follow-up tickets for permanent fix

## Escalation path
L1 On-call → L2 Senior engineer → L3 Engineering lead → L4 CTO
Escalate when: unable to mitigate within [X] minutes or if [condition]
```

## Postmortem template (blameless — always)

File: `docs/postmortems/[YYYY-MM-DD]-[short-title].md`

```markdown
# Postmortem: [Title]
**Date of incident:** [ISO-8601]
**Duration:** [start] → [end] ([X] minutes)
**Severity:** P[0-3]
**Author:** [who wrote this]
**Reviewed by:** [who reviewed]

## Summary
[2-3 sentences: what happened, what the impact was, what resolved it]

## Timeline (UTC)
| Time | Event |
|---|---|
| HH:MM | [Alert fired / Issue observed] |
| HH:MM | [First responder acknowledged] |
| HH:MM | [Root cause identified] |
| HH:MM | [Mitigation applied] |
| HH:MM | [Incident resolved] |

## Root cause
[One paragraph describing the technical root cause. Factual, no blame.]

## Impact
- Users affected: [number or percentage]
- Duration: [X] minutes
- Data loss: Yes / No (if yes: what data, how much)
- Revenue impact: [estimate if known]
- SLA breach: Yes / No

## What went well
- [Thing 1 that helped: good alert, good runbook, fast diagnosis]
- [Thing 2]

## What went poorly
- [Thing 1 that slowed resolution: no runbook, missed alert, unclear owner]
- [Thing 2]

## Action items
| Action | Owner | Due date | Priority |
|---|---|---|---|
| [Preventive action 1] | [name] | [date] | P[1-3] |
| [Detection improvement] | [name] | [date] | P[1-3] |

## Lessons learned
[What systemic changes does this incident motivate?]
```

## Monitoring standards (write monitoring alongside every feature)

Every new feature must ship with:
1. **Health check endpoint:** `GET /health` returns 200 when service is operational
2. **Key metrics instrumented:** request count, error rate, p95 latency, queue depth
3. **Alerts defined:** at minimum:
   - Error rate > 1% for 5 minutes → P1 alert
   - p95 latency > [NFR threshold] for 5 minutes → P2 alert
   - Zero requests for 5 minutes (if expected traffic) → P1 alert
4. **Runbook linked in alert:** every alert description links to its runbook

## Hotfix protocol

When a production issue requires an immediate code fix:

```bash
# 1. Create hotfix branch from production tag
git checkout -b hotfix/[description] v[last-release-tag]

# 2. Apply the minimal fix — do not add anything else
# 3. Write or update the test that catches this bug
# 4. Verify the fix
npm test

# 5. PR to main AND to the release branch
# 6. Deploy to production immediately after approval
# 7. Tag the hotfix release
git tag -a v[X.Y.Z+1] -m "Hotfix: [description]"
```
```

---

### `.mindforge/skills/database-patterns/SKILL.md`

```markdown
---
name: database-patterns
version: 1.0.0
min_mindforge_version: 0.3.0
status: stable
triggers: database, DB, SQL, query, migration, schema, index, indexing, N+1,
          transaction, ACID, foreign key, join, aggregate, pagination, cursor,
          connection pool, ORM, Prisma, SQLAlchemy, Drizzle, Sequelize,
          PostgreSQL, MySQL, SQLite, MongoDB, Redis, Elasticsearch
---

# Skill — Database Patterns

## When this skill activates
Any task involving database schema design, query writing, migrations, or
ORM configuration.

## Mandatory actions when this skill is active

### Schema design standards

**Naming conventions (PostgreSQL default):**
```sql
-- Tables: snake_case, plural
CREATE TABLE user_profiles (...);
CREATE TABLE order_items (...);

-- Columns: snake_case
user_id, created_at, updated_at, deleted_at

-- Primary keys: always id (UUID preferred over auto-increment)
id UUID PRIMARY KEY DEFAULT gen_random_uuid()

-- Foreign keys: {referenced_table_singular}_id
user_id UUID REFERENCES users(id) ON DELETE CASCADE
order_id UUID REFERENCES orders(id) ON DELETE SET NULL

-- Indexes: idx_{table}_{column(s)}
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_orders_user_id_created_at ON orders(user_id, created_at DESC);
```

**Standard columns every table should have:**
```sql
id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
-- For soft delete (preferred over hard delete):
deleted_at  TIMESTAMPTZ  -- NULL = active, timestamp = deleted
```

**Soft delete implementation:**
Use soft delete (setting `deleted_at`) instead of hard delete for:
- User records (GDPR right to erasure exception: anonymise, don't delete)
- Financial records (audit requirements)
- Any record that might be referenced by other records

For hard delete: cascade must be configured. Document the cascade in ARCHITECTURE.md.

### Query standards

**N+1 query detection and prevention:**
```typescript
// ❌ N+1 pattern: 1 query for users + N queries for their orders
const users = await db.users.findMany()
for (const user of users) {
  user.orders = await db.orders.findMany({ where: { userId: user.id } })
}

// ✅ Single query with JOIN or include
const users = await db.users.findMany({
  include: { orders: true }  // Prisma generates a single JOIN query
})

// ✅ Or batch load with WHERE IN
const userIds = users.map(u => u.id)
const orders = await db.orders.findMany({ where: { userId: { in: userIds } } })
const ordersByUser = groupBy(orders, 'userId')
```

**Pagination patterns:**
```typescript
// ❌ OFFSET pagination (slow on large datasets — scans all previous rows)
SELECT * FROM posts ORDER BY created_at DESC LIMIT 20 OFFSET 10000;

// ✅ CURSOR pagination (consistent performance regardless of position)
SELECT * FROM posts
WHERE created_at < :cursor
ORDER BY created_at DESC
LIMIT 20;

// Always return a cursor for the next page:
{
  "data": [...],
  "nextCursor": "2026-01-15T10:30:00Z",  // last item's created_at
  "hasMore": true
}
```

**Transaction usage:**
```typescript
// Use transactions whenever multiple writes must succeed or fail together
await db.$transaction(async (tx) => {
  const order = await tx.orders.create({ data: orderData })
  await tx.orderItems.createMany({ data: items.map(i => ({...i, orderId: order.id})) })
  await tx.inventory.updateMany({ /* deduct stock */ })
  // All three succeed or all three roll back
})
```

### Index strategy

**Always index:**
- All foreign key columns (ORM does not always do this automatically)
- Columns used in WHERE clauses on large tables
- Columns used in ORDER BY on large tables
- Columns used in JOIN conditions

**Composite indexes:**
- Order columns from most selective (highest cardinality) to least
- A composite index on (a, b) is used for queries filtering on a alone,
  or on both a and b. Not for b alone.
- Example: index on (user_id, created_at DESC) for "get user's recent items"

**Never index:**
- Boolean columns on large tables (index selectivity too low to help)
- Columns that change very frequently (index maintenance overhead)
- Tables with fewer than 10,000 rows (full scan is faster)

### Migration standards

```bash
# Every schema change must have a migration file
# Naming: [timestamp]_[descriptive-name].sql or per ORM convention

# Migration must be:
# 1. Idempotent: safe to run multiple times
# 2. Reversible: has both UP and DOWN migration
# 3. Non-blocking: avoid full table locks in production migrations

# Non-blocking pattern for adding a column (PostgreSQL):
# Step 1: Add column with default as NULL (instant)
ALTER TABLE users ADD COLUMN phone_verified BOOLEAN;

# Step 2: Backfill in batches (separate deployment)
UPDATE users SET phone_verified = false
WHERE id IN (SELECT id FROM users WHERE phone_verified IS NULL LIMIT 1000);

# Step 3: Add NOT NULL constraint + default (after backfill completes)
ALTER TABLE users ALTER COLUMN phone_verified SET NOT NULL;
ALTER TABLE users ALTER COLUMN phone_verified SET DEFAULT false;
```

## Query performance checklist
Before committing any query-writing task:
- [ ] Ran EXPLAIN ANALYZE on all non-trivial queries
- [ ] All WHERE/JOIN/ORDER BY columns have indexes
- [ ] No N+1 queries in list-fetching code
- [ ] Large queries paginated (cursor-based for > 1K rows)
- [ ] Transactions used for multi-write operations
- [ ] Connection pooling configured (not creating connections per request)
```

**Commit:**
```bash
git add .mindforge/skills/performance/ .mindforge/skills/accessibility/ \
        .mindforge/skills/data-privacy/ .mindforge/skills/incident-response/ \
        .mindforge/skills/database-patterns/
git commit -m "feat(skills): add 5 new core skill packs (performance, a11y, privacy, incident, db)"
```

---

## TASK 4 — Update MANIFEST.md with all 10 skills

Write `.mindforge/org/skills/MANIFEST.md` with all 10 skills registered:

```markdown
# MindForge Skills Manifest
# Schema version: 1.0.0
# MindForge compatibility: >=0.1.0
# Last updated: [ISO-8601 date when you create this file]

## Core Skills — Tier 1 (maintained by MindForge)

| Name | Version | Status | Min MindForge | Path |
|---|---|---|---|---|
| security-review | 1.0.0 | stable | 0.1.0 | .mindforge/skills/security-review/SKILL.md |
| code-quality | 1.0.0 | stable | 0.1.0 | .mindforge/skills/code-quality/SKILL.md |
| api-design | 1.0.0 | stable | 0.1.0 | .mindforge/skills/api-design/SKILL.md |
| testing-standards | 1.0.0 | stable | 0.1.0 | .mindforge/skills/testing-standards/SKILL.md |
| documentation | 1.0.0 | stable | 0.1.0 | .mindforge/skills/documentation/SKILL.md |
| performance | 1.0.0 | stable | 0.3.0 | .mindforge/skills/performance/SKILL.md |
| accessibility | 1.0.0 | stable | 0.3.0 | .mindforge/skills/accessibility/SKILL.md |
| data-privacy | 1.0.0 | stable | 0.3.0 | .mindforge/skills/data-privacy/SKILL.md |
| incident-response | 1.0.0 | stable | 0.3.0 | .mindforge/skills/incident-response/SKILL.md |
| database-patterns | 1.0.0 | stable | 0.3.0 | .mindforge/skills/database-patterns/SKILL.md |

## Org Skills — Tier 2 (add your organisation's custom skills here)

| Name | Version | Status | Min MindForge | Path |
|---|---|---|---|---|
| (none yet — see docs/skills-authoring-guide.md to add org skills) | | | | |

## Project Skills — Tier 3 (add project-specific skills here)

| Name | Version | Status | Min MindForge | Path |
|---|---|---|---|---|
| (none yet — see docs/skills-authoring-guide.md to add project skills) | | | | |

## Conflict overrides (explicit conflict resolution rules)
(none — add entries here when two skills clash on the same trigger keyword)

## Changelog
- 0.3.0: Added performance, accessibility, data-privacy, incident-response, database-patterns
- 0.1.0: Initial manifest with 5 core skills
```

**Commit:**
```bash
git add .mindforge/org/skills/MANIFEST.md
git commit -m "feat(skills): register all 10 core skills in MANIFEST.md"
```

---

## TASK 5 — Write the Persona Customisation System

### `.mindforge/personas/overrides/README.md`

```markdown
# MindForge Persona Customisation System

## Purpose
Override default persona behaviour for specific projects or phases without
modifying the core persona files (which are versioned and shared).

## How overrides work

1. Create a file in `.mindforge/personas/overrides/` named after the persona:
   `developer.md`, `security-reviewer.md`, etc.

2. The override file uses an additive format — it extends, not replaces:

```markdown
# Developer Persona Override — [Project Name]
# This file ADDS to or MODIFIES developer.md. It does not replace it.

## Additional coding standards (project-specific)
- This project uses the Repository pattern. All database access via repositories.
- All API responses use the ApiResponse<T> wrapper type (see src/types/api.ts)
- Business logic belongs in src/services/ — never in src/routes/ or src/repositories/

## Modified conventions (overrides developer.md)
# Override: "Functions ≤ 40 lines" → this project permits up to 60 lines
# for service methods that handle complex orchestration.
MAX_FUNCTION_LINES: 60

## Additional forbidden patterns (project-specific)
- Never import from src/routes/ into src/services/ (one-way dependency rule)
- Never use moment.js — this project uses date-fns exclusively
- Never throw raw Error objects — use the AppError class (src/errors/AppError.ts)
```

3. At task execution time, the loader merges: `base persona` + `override file`.
   Additive sections stack. Override sections replace.

## Override resolution rules

| Override directive | Behaviour |
|---|---|
| `## Additional [section]` | Appended to the base persona's equivalent section |
| `## Modified [section]` | Replaces the base persona's equivalent section |
| `## Removed [section]` | Removes that section from the merged persona |
| `MAX_FUNCTION_LINES: 60` | Key-value style — overrides a specific parameter |

## Phase-level overrides

To override a persona for a specific phase only:
Create: `.planning/phases/[N]/persona-overrides/developer.md`

Phase-level overrides take priority over project-level overrides:
Phase override > Project override > Core persona

## When to use overrides vs. creating a new persona

Use an **override** when:
- You want to add project-specific coding conventions
- You want to adjust one or two rules (not rebuild the whole persona)
- The change is specific to this project and would not apply to others

Create a **new persona** when:
- You need a wholly different cognitive mode (e.g., "ML Engineer" persona)
- The persona would be useful across multiple projects (make it an Org persona)
- The change is so extensive it is easier to write from scratch than to override

## Override file template

```markdown
# [Persona Name] Override — [Project or Phase Name]
# Scope: project | phase-[N]
# Author: [who created this override]
# Created: [ISO-8601]

## Additional [conventions/standards/forbidden patterns/etc.]
[Add to the base persona without replacing]

## Modified [section name from base persona]
[Replace a specific section]

## Project-specific context
[Facts about this project the persona should always know]

## Project-specific forbidden patterns
[Anti-patterns specific to this codebase]
```
```

**Commit:**
```bash
git add .mindforge/personas/overrides/
git commit -m "feat(personas): implement persona customisation override system"
```

---

## TASK 6 — Write `/mindforge:skills` command

### `.claude/commands/mindforge/skills.md`

```markdown
# MindForge — Skills Command
# Usage: /mindforge:skills [subcommand] [args]
# Subcommands: list | add | update | validate | info | search

## Subcommand: list
`/mindforge:skills list`

Read MANIFEST.md. Display all registered skills in a formatted table:

```
MindForge Skills Registry
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  Tier 1 — Core Skills (10 installed)
  ────────────────────────────────────────────────────────────
  ✅  security-review     v1.0.0   stable
  ✅  code-quality        v1.0.0   stable
  ✅  api-design          v1.0.0   stable
  ✅  testing-standards   v1.0.0   stable
  ✅  documentation       v1.0.0   stable
  ✅  performance         v1.0.0   stable
  ✅  accessibility       v1.0.0   stable
  ✅  data-privacy        v1.0.0   stable
  ✅  incident-response   v1.0.0   stable
  ✅  database-patterns   v1.0.0   stable

  Tier 2 — Org Skills (0 installed)
  ────────────────────────────────────────────────────────────
  (none — run /mindforge:skills add to add org skills)

  Tier 3 — Project Skills (0 installed)
  ────────────────────────────────────────────────────────────
  (none)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Total: 10 skills   |   Run /mindforge:skills validate to check health
```

## Subcommand: info
`/mindforge:skills info [skill-name]`

Display detailed information about a specific skill:

```
Skill: security-review
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Version      : 1.0.0
  Status       : stable
  Tier         : 1 (Core)
  Min MindForge: 0.1.0
  Path         : .mindforge/skills/security-review/SKILL.md

  Triggers (25):
  auth, authentication, authorisation, authorization, login,
  logout, password, token, JWT, session, cookie, OAuth,
  payment, billing, stripe, PII, GDPR, personal data,
  upload, file upload, credentials, API key, secret, env,
  environment variable, encryption, hashing, bcrypt, argon2

  Changelog:
  1.0.0 — Initial stable release
```

## Subcommand: search
`/mindforge:skills search [keyword]`

Find which skills would activate for a given keyword:

```
/mindforge:skills search "database query"

  Matching skills for "database query":
  ────────────────────────────────────────────────────────────
  database-patterns  v1.0.0  [tier 1]  trigger: "database", "query"
  performance        v1.0.0  [tier 1]  trigger: "query time"

  These 2 skills would be automatically loaded for a task
  containing "database query" in its description.
```

## Subcommand: validate
`/mindforge:skills validate`

Run a health check on all installed skills:

```
Validating skills...

  ✅  security-review     — frontmatter valid, file readable, triggers: 29
  ✅  code-quality        — frontmatter valid, file readable, triggers: 14
  ✅  performance         — frontmatter valid, file readable, triggers: 31
  ⚠️  [org-skill-name]   — frontmatter valid but missing 'version' field
  ❌  [missing-skill]    — listed in MANIFEST.md but file not found

  Issues found: 2
  Run /mindforge:skills add to fix missing skills.
  Fix frontmatter issues manually in the SKILL.md file.
```

Validation checks:
1. Every manifest entry has a corresponding SKILL.md file
2. Every SKILL.md has: `name`, `version`, `status`, `triggers` in frontmatter
3. All versions are valid semver strings
4. No two skills at the same tier share the same trigger keyword (flag as ⚠️)
5. Every skill file is readable (not empty, not corrupted)

## Subcommand: add
`/mindforge:skills add [path-to-skill-dir]`

Register a new skill in the manifest:

1. Read the SKILL.md in the provided path
2. Validate the frontmatter (all required fields present)
3. Check for trigger keyword conflicts with existing skills
4. Ask the user: "Which tier should this skill be registered as? (2=Org / 3=Project)"
5. Add the entry to MANIFEST.md in the correct section
6. Run `/mindforge:skills validate` to confirm registration is clean
7. Commit: `feat(skills): register [skill-name] v[version] as tier [N] skill`

## Subcommand: update
`/mindforge:skills update [skill-name]`

Update a skill to a newer version:

1. Read current version from MANIFEST.md
2. Check the skill's changelog in SKILL.md for available updates
3. If MAJOR version change: show breaking changes, require confirmation
4. If MINOR or PATCH: update automatically
5. Update MANIFEST.md version entry
6. Run `/mindforge:skills validate` after update
7. Commit: `chore(skills): update [name] v[old] → v[new]`

## Error handling
- If MANIFEST.md does not exist: offer to create it with current skills
- If a skill name is not found: suggest similar names (fuzzy match)
- If validation finds critical errors: block any phase execution until fixed
  (A skills validation failure is a BLOCKING issue)
```

**Commit:**
```bash
cp .claude/commands/mindforge/skills.md .agent/mindforge/skills.md
git add .claude/commands/mindforge/skills.md .agent/mindforge/skills.md
git commit -m "feat(commands): add /mindforge:skills full CLI command"
```

---

## TASK 7 — Write `/mindforge:review` command

### `.claude/commands/mindforge/review.md`

```markdown
# MindForge — Review Command
# Usage: /mindforge:review [path|phase N|--staged|--last-commit]
# Performs a comprehensive code review using code-quality and security skills.

## Review targets
- `/mindforge:review` (no args) → review all uncommitted changes (`git diff`)
- `/mindforge:review --staged` → review staged changes (`git diff --cached`)
- `/mindforge:review --last-commit` → review the last commit (`git diff HEAD~1`)
- `/mindforge:review phase [N]` → review all commits in phase N
- `/mindforge:review [file-path]` → review a specific file
- `/mindforge:review [dir-path]` → review all files in a directory

## Step 1 — Establish review scope

Based on the target argument, build the file list to review:
```bash
# Uncommitted changes
git diff --name-only

# Staged changes
git diff --cached --name-only

# Last commit
git diff HEAD~1 --name-only

# Phase N (all commits between phase start and phase end tags)
git log --oneline --name-only [phase-start-sha]..[phase-end-sha]
```

Display the file list to the user before reviewing:
"Reviewing [N] files: [list]"

## Step 2 — Load review personas and skills

Activate TWO personas simultaneously for a comprehensive review:

**Primary:** `code-quality.md` — structural quality, conventions, complexity
**Secondary:** `security-reviewer.md` — security issues, data exposure, auth

Load these skills:
- `code-quality/SKILL.md` — always
- `security-review/SKILL.md` — always
- Contextual skills based on file types detected in the diff:
  - `.ts`/`.tsx` → also load `api-design/SKILL.md` (if routes present)
  - Database migration files → also load `database-patterns/SKILL.md`
  - UI component files → also load `accessibility/SKILL.md`

## Step 3 — Review each file

For each file in the review scope:

**Read the full file content** (not just the diff — context matters).
**Read the diff for this file** to understand what changed.

Apply ALL of the following checks:

### Code quality checks
- [ ] Functions within length limits (CONVENTIONS.md standard)
- [ ] Cyclomatic complexity ≤ 10 (count if/else/switch/catch/ternary branches)
- [ ] No magic numbers (named constants used instead)
- [ ] No commented-out code
- [ ] No `TODO` or `FIXME` left uncommitted
- [ ] Error handling is explicit (no empty catch blocks)
- [ ] Naming is precise and unambiguous (no `data`, `info`, `temp`)
- [ ] Every exported function has a JSDoc/docstring
- [ ] DRY: no logic duplicated 3+ times
- [ ] No dead code (imports/variables defined but never used)

### Convention checks (from CONVENTIONS.md)
- [ ] File naming follows convention
- [ ] Import order follows the defined order
- [ ] All forbidden patterns are absent
- [ ] Architecture boundaries respected (services don't import routes, etc.)

### Security checks (from security-review SKILL)
- [ ] No hardcoded credentials or secrets
- [ ] User input validated at boundaries
- [ ] SQL queries parameterised
- [ ] Sensitive data not in logs or error messages
- [ ] New dependencies CVE-scanned

### Type safety (TypeScript projects)
- [ ] No `any` types without justification comment
- [ ] No `as unknown as X` casting without justification
- [ ] All function parameters typed (no implicit any)
- [ ] Return types explicitly declared on public functions

## Step 4 — Write the review report

Create `.planning/phases/[current-phase]/CODE-REVIEW-[timestamp].md`
or `.planning/quick/review-[timestamp].md` for ad-hoc reviews:

```markdown
# Code Review Report
**Date:** [ISO-8601]
**Reviewer:** MindForge (code-quality + security-reviewer)
**Scope:** [what was reviewed]
**Files reviewed:** [N]

## Summary
[2-3 sentences: overall quality, major themes, recommendation]

## Findings

### 🔴 Blocking (must fix before merge)
| # | File | Line | Issue | Recommendation |
|---|---|---|---|---|
| 1 | src/auth/login.ts | 47 | Parameterised query not used | Use `db.query('SELECT * FROM users WHERE id = $1', [id])` |

### 🟠 Major (should fix in this PR)
| # | File | Line | Issue | Recommendation |
|---|---|---|---|---|
| 1 | src/api/users.ts | 23 | Function is 67 lines (limit: 40) | Extract `validateUserInput` to separate function |

### 🟡 Minor (fix in follow-up)
| # | File | Line | Issue | Recommendation |
|---|---|---|---|---|
| 1 | src/models/order.ts | 8 | Missing JSDoc on exported function | Add `@param`, `@returns`, `@throws` |

### 💡 Suggestions (optional improvements)
| # | File | Line | Suggestion |
|---|---|---|---|
| 1 | src/services/email.ts | 15 | Consider memoising the template compilation |

## Metrics
- Files reviewed: [N]
- Lines reviewed: [N]  
- Blocking findings: [N]
- Major findings: [N]
- Minor findings: [N]
- Suggestions: [N]

## Verdict
✅ APPROVED — No blocking or major findings
⚠️  APPROVED WITH CONDITIONS — Fix [N] major findings
❌ CHANGES REQUIRED — [N] blocking findings must be fixed
```

## Step 5 — Write AUDIT entry

```json
{
  "event": "code_review_completed",
  "scope": "[what was reviewed]",
  "files_reviewed": [N],
  "blocking_findings": [N],
  "major_findings": [N],
  "verdict": "approved | changes_required",
  "report_path": ".planning/.../CODE-REVIEW-[timestamp].md"
}
```

## Step 6 — Report to user

Display a summary of findings.
If blocking findings exist: do not allow merge.
Tell the user: "Fix the [N] blocking issues, then run /mindforge:review again to re-check."
```

**Commit:**
```bash
cp .claude/commands/mindforge/review.md .agent/mindforge/review.md
git add .claude/commands/mindforge/review.md .agent/mindforge/review.md
git commit -m "feat(commands): add /mindforge:review comprehensive code review command"
```

---

## TASK 8 — Write `/mindforge:security-scan` command

### `.claude/commands/mindforge/security-scan.md`

```markdown
# MindForge — Security Scan Command
# Usage: /mindforge:security-scan [path] [--deep] [--deps] [--secrets]
# Standalone security scan. Can be run independently of the phase lifecycle.

## Scan modes
- Default: OWASP Top 10 review on the changed files or specified path
- `--deep`: Extended scan including all files, not just changed
- `--deps`: Dependency audit (CVE scan of package.json / requirements.txt)
- `--secrets`: Secret detection scan only (fast, suitable for pre-commit hook)
- Flags composable: `--deps --secrets` runs both dependency audit and secret detection

## Step 1 — Activate Security Reviewer persona

Load `security-reviewer.md` persona immediately and completely.
This command runs entirely in security mode. Do not switch personas.

## Step 2 — Build scan scope

```bash
# Default: staged + unstaged changes
git diff HEAD --name-only

# With path argument
find [path] -name "*.ts" -o -name "*.js" -o -name "*.py"

# --deep: all source files
find src/ -type f \( -name "*.ts" -o -name "*.js" -o -name "*.py" \)
```

## Step 3 — OWASP Top 10 scan (always runs unless --secrets only)

For each file in scope, check all 10 OWASP categories:

### A01 — Broken Access Control
- Scan for: missing auth middleware, direct object references, path traversal
- Patterns to flag:
  ```
  req.params.userId         # Direct user ID from request — verify ownership check
  fs.readFile(userInput)    # Path traversal risk
  WHERE id = ${id}          # Direct injection without parameterisation
  ```

### A02 — Cryptographic Failures
- Scan for: weak algorithms, insecure transport, unencrypted sensitive data
- Patterns to flag:
  ```
  md5(, sha1(, sha256(password  # Weak password hashing
  http://   # Non-HTTPS URLs in API calls
  Math.random()  # Cryptographically insecure random
  ```

### A03 — Injection
- Scan for: SQL, NoSQL, OS, LDAP injection
- Patterns to flag:
  ```
  `SELECT * FROM users WHERE email = '${  # SQL injection
  exec(, execSync(, child_process         # OS command injection
  eval(userInput                          # Code injection
  ```

### A04 — Insecure Design
- Scan for: missing rate limiting, no input validation, trust boundary issues
- Patterns to flag: endpoints without validation middleware, no rate limit decorators

### A05 — Security Misconfiguration
- Scan for: debug mode in production, default credentials, verbose errors
- Patterns to flag:
  ```
  console.error(err)        # Exposes stack traces to clients
  NODE_ENV !== 'production' # Debug code paths
  ALLOW_ALL, *, cors({origin: '*'})  # Overly permissive CORS
  ```

### A06 — Vulnerable Components
- Run: `npm audit --audit-level=moderate` or `pip-audit`
- Flag any HIGH or CRITICAL CVEs

### A07 — Authentication Failures
- Scan for: missing password complexity, no brute force protection, weak sessions
- Patterns to flag:
  ```
  bcrypt.hashSync(pass, 1)  # Cost factor too low
  jwt.verify(token, '', {   # Empty secret
  session.destroy(          # Verify redirect after destroy
  ```

### A08 — Software and Data Integrity Failures
- Check: no package-lock.json means no integrity guarantee
- Check: any `curl | sh` or `wget | bash` patterns

### A09 — Security Logging Failures
- Scan for: no logging on auth failures, admin actions not logged, PII in logs
- Patterns to flag:
  ```
  user.email in any log statement
  password in any log statement
  catch(e) {}  # Silent failure = no security log
  ```

### A10 — SSRF
- Scan for: server-side requests to user-controlled URLs
- Patterns to flag:
  ```
  fetch(req.body.url,       # SSRF via user input
  axios.get(params.webhook, # SSRF via user input
  ```

## Step 4 — Secret detection (--secrets or always as part of default scan)

Pattern-based scan across all files in scope:

```bash
# High confidence patterns (always flag as CRITICAL)
grep -rn -E "(sk-[a-zA-Z0-9]{20,}|AKIA[A-Z0-9]{16}|ghp_[a-zA-Z0-9]{36})" .

# Credential assignment patterns (flag as HIGH)
grep -rn -E "(password|passwd|secret|api_key|apikey|access_token)\s*=\s*['\"][^'\"]{8,}" .

# PEM/Certificate content
grep -rn "-----BEGIN (RSA |EC |OPENSSH )?PRIVATE KEY-----" .

# Database URLs with credentials
grep -rn -E "postgres://[^:]+:[^@]+@|mysql://[^:]+:[^@]+@" .
```

Report each finding with:
- File and line number
- The matched pattern (redact the actual secret value: show first 4 chars + ***)
- Severity: CRITICAL if a real credential pattern, HIGH if credential-shaped pattern

## Step 5 — Dependency audit (--deps flag)

```bash
# Node.js projects
npm audit --json 2>/dev/null | node -e "
  const data = JSON.parse(require('fs').readFileSync('/dev/stdin', 'utf8'));
  const vulns = data.vulnerabilities || {};
  Object.entries(vulns).forEach(([name, v]) => {
    if (['high','critical'].includes(v.severity)) {
      console.log(v.severity.toUpperCase() + ': ' + name + ' — ' + v.via[0]?.title);
    }
  });
"

# Python projects
pip-audit --format json 2>/dev/null
```

## Step 6 — Write security scan report

`.planning/SECURITY-SCAN-[timestamp].md`:

```markdown
# Security Scan Report
**Date:** [ISO-8601]
**Scope:** [what was scanned]
**Scanner:** MindForge Security Reviewer

## Executive Summary
[1-2 sentences: overall security posture, number of findings by severity]

## Critical Findings (fix immediately — block all merges)
[OWASP category] | [File:Line] | [Description] | [Remediation]

## High Findings (fix before next release)
...

## Medium Findings (fix in next sprint)
...

## Low Findings (backlog)
...

## Dependency Audit
| Package | Version | Severity | CVE | Fixed in |
|---|---|---|---|---|

## Secret Detection
| File | Pattern | Severity | Action |
|---|---|---|---|

## Verdict
✅ CLEAN — No critical or high findings
⚠️  ISSUES — [N] critical, [N] high findings require attention
```

## Step 7 — Write AUDIT entry

```json
{
  "event": "security_scan_completed",
  "scope": "[path or 'staged changes']",
  "flags": ["--deps", "--secrets"],
  "critical_findings": [N],
  "high_findings": [N],
  "secrets_detected": [N],
  "vulnerable_deps": [N],
  "report_path": ".planning/SECURITY-SCAN-[timestamp].md"
}
```

## Automatic blocking behaviour
If CRITICAL findings are detected: print a prominent warning:
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔴 CRITICAL SECURITY FINDINGS DETECTED

  [N] critical issues must be fixed before any code is merged.
  See: .planning/SECURITY-SCAN-[timestamp].md

  Do NOT commit or deploy until these are resolved.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```
```

**Commit:**
```bash
cp .claude/commands/mindforge/security-scan.md .agent/mindforge/security-scan.md
git add .claude/commands/mindforge/security-scan.md .agent/mindforge/security-scan.md
git commit -m "feat(commands): add /mindforge:security-scan standalone security command"
```

---

## TASK 9 — Write `/mindforge:map-codebase` command

### `.claude/commands/mindforge/map-codebase.md`

```markdown
# MindForge — Map Codebase Command
# Usage: /mindforge:map-codebase [area]
# Onboards MindForge to an existing (brownfield) codebase.
# Run this INSTEAD of /mindforge:init-project when joining an existing project.

## When to use this command
- Joining an existing project that has no MindForge context files
- Adding MindForge to a team that already has a codebase
- Onboarding to a new-to-you repository
- Re-mapping after major architectural changes

## What it produces
- `.planning/ARCHITECTURE.md` — system architecture discovered from code
- `.planning/PROJECT.md` — project identity inferred from codebase + user confirmation
- `.mindforge/org/CONVENTIONS.md` — actual conventions found in the code
- `.planning/STATE.md` — current position (MindForge onboarded, ready to plan)
- `.planning/decisions/ADR-NNN-[title].md` — key architectural decisions found

## Step 1 — Codebase inventory

Spawn FOUR parallel subagents. Each focuses on one analysis area.
Each subagent writes its findings to a temporary file.

### Subagent A — Technology Stack Analyst
Context: minimal (CONVENTIONS.md template + task description)
Persona: architect.md
Task:
```
Analyse this repository's technology stack. Read:
- package.json / requirements.txt / Cargo.toml / go.mod (root and workspaces)
- Dockerfile, docker-compose.yml (if present)
- CI/CD configuration: .github/workflows/, .gitlab-ci.yml, .circleci/
- Infrastructure files: terraform/, pulumi/, k8s/, helm/

Write to: .planning/map-temp/STACK.md
Include:
- Runtime/language and version
- Framework(s) and versions
- Database(s) used
- Cache and queue systems
- Testing framework(s)
- Build and bundling tools
- Deployment target (AWS/GCP/Azure/bare metal/etc.)
- External services integrated (payment, email, auth, etc.)
```

### Subagent B — Architecture Analyst
Context: minimal
Persona: architect.md
Task:
```
Analyse this repository's architecture. Read:
- All files in src/ (or equivalent) — structure, not content
- README.md and any docs/ directory
- Any architecture diagrams (look for .png, .svg, .drawio in docs/)
- Entry points: index.ts, main.py, app.go, server.ts (root-level)

Write to: .planning/map-temp/ARCHITECTURE-RAW.md
Include:
- Architectural pattern: MVC / Clean Architecture / Hexagonal / Modular Monolith / Microservices
- Domain model: what are the core entities? (infer from models/, entities/, types/)
- API surface: public endpoints found in routes/, controllers/, handlers/
- Module structure: how is the code organised? Feature-based / Layer-based?
- Key design patterns in use: Repository, Service, Factory, Observer, etc.
```

### Subagent C — Conventions Analyst
Context: minimal
Persona: developer.md
Task:
```
Analyse the actual coding conventions used in this repository.
Read 5-10 representative source files from different areas of the codebase.

Write to: .planning/map-temp/CONVENTIONS-RAW.md
Infer and document:
- Naming conventions: variables, functions, classes, files, database columns
- Import order and grouping style
- Error handling patterns: how are errors thrown and caught?
- TypeScript patterns: preferred type patterns, generic usage
- Comment style: JSDoc, inline, etc.
- Test file naming and location pattern
- Async patterns: callbacks / promises / async-await
- State management (frontend): if applicable
- Any recurring patterns that appear across multiple files

Important: document what IS there, not what should be there.
This is a description of reality, not a prescription.
```

### Subagent D — Quality Baseline Analyst
Context: minimal
Persona: qa-engineer.md
Task:
```
Assess the current quality baseline of this repository.

Write to: .planning/map-temp/QUALITY-BASELINE.md
Check:
- Test coverage: does a test suite exist? What framework? Run: [test command] --coverage
- Linting: is a linter configured? (.eslintrc, .pylintrc, ruff.toml, etc.)
- Type checking: TypeScript config? Strict mode enabled?
- CI/CD: does it run tests on PRs?
- Security: any security scanning in CI?
- Known issues: open GitHub/GitLab issues, TODO count in source

Note: do not fix anything. Only document what exists.
```

## Step 2 — Synthesise findings

Read all four temp files. Synthesise into the permanent context files.

### Write `.planning/ARCHITECTURE.md`

Use ARCHITECTURE-RAW.md as input. Write a clean, structured architecture document:

```markdown
# [Project Name] — Architecture

## System overview
[2-3 sentences from the subagent's findings]

## Technology stack
[From STACK.md — organised by layer]

## Architectural pattern
[From ARCHITECTURE-RAW.md]

## Domain model
[Core entities and their relationships]

## API surface
[Key endpoints / GraphQL operations / gRPC services found]

## Module structure
[How the codebase is organised]

## External integrations
[Third-party services found]

## Known architectural decisions
[Any ADRs, architecture docs, or README decisions found]

## Quality baseline
[From QUALITY-BASELINE.md — honest assessment]

## MindForge onboarding notes
[What was inferred vs. confirmed, what needs human review]
```

### Write `.mindforge/org/CONVENTIONS.md`

Use CONVENTIONS-RAW.md as input. Write the conventions file in the standard format,
but clearly mark inferred conventions:

```markdown
# Coding Conventions — [Project Name]
# Source: Inferred from codebase analysis by MindForge
# Status: DRAFT — confirm with team before treating as authoritative

## IMPORTANT
These conventions were inferred from code analysis. Review each section
and mark as [CONFIRMED] or [NEEDS REVIEW] before running /mindforge:plan-phase.

## Naming conventions [NEEDS REVIEW]
[What was found]
```

## Step 3 — Present findings for confirmation

Present a summary to the user. Ask for confirmation and corrections:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
MindForge Codebase Analysis Complete

  Stack:
    Runtime   : Node.js 20 (inferred from .nvmrc)
    Framework : Next.js 14 (inferred from package.json)
    Database  : PostgreSQL via Prisma (inferred from prisma/schema.prisma)
    Auth      : NextAuth.js (inferred from package.json)

  Architecture:
    Pattern   : Feature-based modular (inferred from src/ structure)
    Entities  : User, Organization, Project, Task (inferred from Prisma schema)
    API       : REST API in src/app/api/ (24 route files found)

  Quality baseline:
    Tests     : Vitest, ~340 test files, ~67% coverage (inferred from coverage report)
    Linting   : ESLint configured, strict TypeScript
    CI/CD     : GitHub Actions (4 workflows)

  Conventions: see .mindforge/org/CONVENTIONS.md (DRAFT — needs review)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Does this look correct? (yes / correct [field]: [value] / no)
```

Wait for user confirmation. Apply any corrections the user provides.

## Step 4 — Write PROJECT.md and STATE.md

After confirmation, write:

`.planning/PROJECT.md` — populated with confirmed findings
`.planning/STATE.md` — status: "Codebase mapped. Ready to plan first phase."
`.planning/HANDOFF.json` — updated with onboarding completion

## Step 5 — Clean up and report

```bash
rm -rf .planning/map-temp/
```

Report to user:
"✅ Codebase mapped.

  Files created:
    .planning/ARCHITECTURE.md
    .planning/PROJECT.md
    .mindforge/org/CONVENTIONS.md (DRAFT — please review)
    .planning/STATE.md

  Review .mindforge/org/CONVENTIONS.md and mark each section as [CONFIRMED].
  Then run /mindforge:plan-phase 1 to begin your first phase."

Write AUDIT entry:
```json
{
  "event": "codebase_mapped",
  "files_analysed": [N],
  "entities_found": [N],
  "api_routes_found": [N],
  "conventions_confidence": "medium",
  "requires_human_review": [".mindforge/org/CONVENTIONS.md"]
}
```
```

**Commit:**
```bash
cp .claude/commands/mindforge/map-codebase.md .agent/mindforge/map-codebase.md
git add .claude/commands/mindforge/map-codebase.md .agent/mindforge/map-codebase.md
git commit -m "feat(commands): add /mindforge:map-codebase brownfield onboarding command"
```

---

## TASK 10 — Write `/mindforge:discuss-phase` command

### `.claude/commands/mindforge/discuss-phase.md`

```markdown
# MindForge — Discuss Phase Command
# Usage: /mindforge:discuss-phase [N] [--batch] [--auto]
# Captures implementation decisions before planning begins.
# Run this BEFORE /mindforge:plan-phase for complex phases.

## Purpose
Planning without discussion produces generic plans.
Discussion captures YOUR decisions — layout preferences, library choices,
UX specifics, edge cases you've already thought through — so the planner
builds what you actually want, not what seems reasonable.

## When to use
- Any phase with UI/UX components (visual decisions need capturing)
- Any phase with multiple valid implementation approaches
- Any phase where you already have opinions on the approach
- Any phase touching external services (your preferences on APIs matter)
- Skip for trivial phases (e.g., "add one field to an existing form")

## Step 1 — Analyse the phase scope

Read:
- ROADMAP.md for the phase description
- REQUIREMENTS.md for the requirements in this phase
- ARCHITECTURE.md for relevant architectural context

Identify the phase's primary domain:
- **Visual/UI** → ask about layout, interactions, states, empty states, animations
- **API/Backend** → ask about response format, error handling, auth approach, versioning
- **Data/Database** → ask about schema design, migration strategy, data volume expectations
- **Integration** → ask about third-party API choices, error recovery, retry strategy
- **Infrastructure** → ask about deployment strategy, scaling approach, observability

## Step 2 — Structured discussion

Ask questions ONE AT A TIME. Wait for the full answer before asking the next.
Do not batch questions (unless `--batch` flag is provided).

### Visual/UI phases — ask about:
1. "Walk me through what a user sees on this screen from top to bottom."
2. "What does the empty state look like? (nothing loaded yet / no results / error)"
3. "Any animations or transitions you're picturing? Or keep it static?"
4. "On mobile — stacks vertically or anything different?"
5. "Any edge cases? (very long text, images that fail to load, loading states)"

### API/Backend phases — ask about:
1. "What's the intended consumer? Internal frontend / external developers / both?"
2. "For errors — do you want detailed error objects with field-level info or simple messages?"
3. "Rate limiting needed on any of these endpoints?"
4. "Any background processing involved, or all synchronous?"
5. "Versioning approach? /v1/ prefix or header-based?"

### Data/Database phases — ask about:
1. "What's the expected data volume? Thousands / millions / billions of rows?"
2. "Any fields that need full-text search vs. exact match?"
3. "Soft delete or hard delete for user-facing records?"
4. "Any fields that change frequently vs. infrequently? (affects indexing strategy)"
5. "Data retention requirements? When can records be deleted?"

### Integration phases — ask about:
1. "Have you already chosen the third-party service / API? If so, which?"
2. "What should happen if the third-party service is down? Queue / fail / fallback?"
3. "Webhooks or polling for receiving updates?"
4. "Any rate limits you know about on their end?"
5. "Testing approach? Do they have a sandbox environment?"

## --batch mode
If `--batch` flag is provided: group related questions and present them together.
Appropriate when the user wants faster intake and is familiar with MindForge.

Example batch:
```
Visual decisions for Phase 2:
  1. Layout: card grid / table / list?
  2. Empty state: illustration / simple message / hide section?
  3. Loading: skeleton / spinner / none?
  4. Mobile: same layout / stacked / hidden?
Answer 1-4:
```

## --auto mode
If `--auto` flag is provided: skip the discussion entirely.
The planner will make reasonable defaults for all decisions.
Use when: the phase is straightforward and you trust the planner's judgment.
Warn: "Skipping discussion. Planner will make implementation decisions.
       Results may not match your vision exactly."

## Step 3 — Write CONTEXT.md

After discussion, write `.planning/phases/[N]/CONTEXT.md`:

```markdown
# Phase [N] Implementation Context
# Captured: [ISO-8601]
# Discussion mode: [interactive / batch / auto]

## Phase description
[From ROADMAP.md]

## Implementation decisions (captured from discussion)

### [Domain: Visual / API / Data / Integration / etc.]

**Decision:** [What was decided]
**Rationale:** [Why — from user's words]
**Implications for planning:**
  - [What the planner should do because of this decision]
  - [Specific library or pattern to use]
  - [What to avoid]

[Repeat for each significant decision]

## Open questions (unresolved during discussion)
- [Question 1]: [Status — decide during planning / decide during execution]

## User's explicit preferences
[Verbatim or near-verbatim quotes from the discussion that capture specific intent]

## Defaults accepted (decisions the user deferred to the planner)
- [Area]: planner's choice
```

## Step 4 — Confirm and guide

Show the user a summary of what was captured:

"✅ Phase [N] discussion complete. [N] decisions captured.

  Key decisions:
  - [Decision 1 summary]
  - [Decision 2 summary]
  - [Decision 3 summary]

  See full context: .planning/phases/[N]/CONTEXT.md

  Next step: Run /mindforge:plan-phase [N] to create implementation plans
  using these decisions."
```

**Commit:**
```bash
cp .claude/commands/mindforge/discuss-phase.md .agent/mindforge/discuss-phase.md
git add .claude/commands/mindforge/discuss-phase.md .agent/mindforge/discuss-phase.md
git commit -m "feat(commands): add /mindforge:discuss-phase pre-planning discussion command"
```

---

## TASK 11 — Update CLAUDE.md for Day 3 capabilities

Add the following sections to `.claude/CLAUDE.md` (and mirror to `.agent/CLAUDE.md`):

```markdown
---

## SKILLS PLATFORM (Day 3)

### Skills loading is now multi-tier
The skills engine has three tiers: Core (Tier 1) → Org (Tier 2) → Project (Tier 3).
Higher tiers override lower tiers when skill names conflict.
Load skills using the full protocol in `.mindforge/engine/skills/loader.md`.

### Skills registry
All installed skills are registered in `.mindforge/org/skills/MANIFEST.md`.
Run `/mindforge:skills validate` if you suspect a skill is misconfigured.

### Context budget with multiple skills
If more than 3 skills are loaded simultaneously:
Inject the full content of the top 3 most relevant skills.
Summarise skills 4+ to: trigger keywords + mandatory actions list + output format.
Never silently exceed the 30K token context budget for skills.

### Persona overrides
Before loading any persona, check:
`.mindforge/personas/overrides/[persona-name].md` (project override)
`.planning/phases/[N]/persona-overrides/[persona-name].md` (phase override)
Merge override with base persona: additive sections stack, override sections replace.

### New commands available
- `/mindforge:skills` — manage the skills registry
- `/mindforge:review` — code review using code-quality + security skills
- `/mindforge:security-scan` — standalone security scan
- `/mindforge:map-codebase` — brownfield codebase onboarding
- `/mindforge:discuss-phase` — pre-planning implementation discussion

### Pre-planning discussion
For complex phases: run `/mindforge:discuss-phase [N]` before `/mindforge:plan-phase [N]`.
The CONTEXT.md it produces makes plans dramatically more accurate.
Skip for trivial phases. Use `--auto` when in a hurry.

---
```

**Commit:**
```bash
git add .claude/CLAUDE.md .agent/CLAUDE.md
git commit -m "feat(core): update CLAUDE.md with Day 3 skills platform and commands"
```

---

## TASK 12 — Write Day 3 test suite and authoring guide

### `tests/skills-platform.test.js`

```javascript
/**
 * MindForge Skills Platform Tests
 * Run: node tests/skills-platform.test.js
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

// ── Skill frontmatter parser ──────────────────────────────────────────────────
function parseSkillFrontmatter(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  if (!content.startsWith('---')) {
    throw new Error(`${filePath}: missing frontmatter (must start with ---)`);
  }
  const end = content.indexOf('---', 3);
  if (end === -1) throw new Error(`${filePath}: unclosed frontmatter`);
  const fm = content.slice(3, end).trim();

  const result = {};
  fm.split('\n').forEach(line => {
    const colon = line.indexOf(':');
    if (colon === -1) return;
    const key = line.slice(0, colon).trim();
    const val = line.slice(colon + 1).trim();
    result[key] = val;
  });
  return result;
}

// ── Semver validator ──────────────────────────────────────────────────────────
function isValidSemver(version) {
  return /^\d+\.\d+\.\d+$/.test(version);
}

// ── Skills directory scanner ──────────────────────────────────────────────────
function getAllSkillPaths() {
  const skillsDir = '.mindforge/skills';
  if (!fs.existsSync(skillsDir)) return [];
  return fs.readdirSync(skillsDir)
    .map(dir => path.join(skillsDir, dir, 'SKILL.md'))
    .filter(p => fs.existsSync(p));
}

// ── Manifest parser ───────────────────────────────────────────────────────────
function parseManifest() {
  const manifestPath = '.mindforge/org/skills/MANIFEST.md';
  if (!fs.existsSync(manifestPath)) return { skills: [] };
  const content = fs.readFileSync(manifestPath, 'utf8');
  const rows = content.match(/\|\s+(\S+)\s+\|\s+(\d+\.\d+\.\d+)\s+\|\s+(\w+)\s+\|\s+(\d+\.\d+\.\d+)\s+\|/g) || [];
  return {
    skills: rows.map(row => {
      const parts = row.split('|').map(p => p.trim()).filter(Boolean);
      return { name: parts[0], version: parts[1], status: parts[2] };
    })
  };
}

// ── Tests ─────────────────────────────────────────────────────────────────────

console.log('\nMindForge Day 3 — Skills Platform Tests\n');

console.log('Skills directory structure:');

test('skills directory exists', () => {
  assert.ok(fs.existsSync('.mindforge/skills'), 'Missing .mindforge/skills/');
});

test('all 10 skill directories exist', () => {
  const required = [
    'security-review', 'code-quality', 'api-design', 'testing-standards',
    'documentation', 'performance', 'accessibility', 'data-privacy',
    'incident-response', 'database-patterns'
  ];
  required.forEach(skill => {
    const p = `.mindforge/skills/${skill}/SKILL.md`;
    assert.ok(fs.existsSync(p), `Missing: ${p}`);
  });
});

test('engine skills directory has all 4 engine files', () => {
  const required = ['registry.md', 'loader.md', 'versioning.md', 'conflict-resolver.md'];
  required.forEach(f => {
    const p = `.mindforge/engine/skills/${f}`;
    assert.ok(fs.existsSync(p), `Missing: ${p}`);
  });
});

console.log('\nSkill frontmatter validation:');

const skillPaths = getAllSkillPaths();
test(`found ${skillPaths.length} skill files to validate`, () => {
  assert.ok(skillPaths.length >= 10, `Expected >= 10 skill files, found ${skillPaths.length}`);
});

skillPaths.forEach(skillPath => {
  const skillName = skillPath.split('/').slice(-2)[0];

  test(`${skillName}: has valid frontmatter`, () => {
    const fm = parseSkillFrontmatter(skillPath);
    assert.ok(fm.name, 'Missing name field');
    assert.ok(fm.version, 'Missing version field');
    assert.ok(fm.status, 'Missing status field');
    assert.ok(fm.triggers, 'Missing triggers field');
  });

  test(`${skillName}: name matches directory`, () => {
    const fm = parseSkillFrontmatter(skillPath);
    assert.strictEqual(fm.name, skillName, `Skill name "${fm.name}" doesn't match directory "${skillName}"`);
  });

  test(`${skillName}: version is valid semver`, () => {
    const fm = parseSkillFrontmatter(skillPath);
    assert.ok(isValidSemver(fm.version), `Invalid semver: "${fm.version}"`);
  });

  test(`${skillName}: has at least 5 trigger keywords`, () => {
    const fm = parseSkillFrontmatter(skillPath);
    const triggers = fm.triggers.split(',').map(t => t.trim()).filter(Boolean);
    assert.ok(triggers.length >= 5, `Too few triggers: ${triggers.length} (min 5)`);
  });

  test(`${skillName}: status is a valid value`, () => {
    const fm = parseSkillFrontmatter(skillPath);
    const validStatuses = ['stable', 'beta', 'alpha', 'deprecated'];
    assert.ok(validStatuses.includes(fm.status), `Invalid status: "${fm.status}"`);
  });

  test(`${skillName}: has mandatory actions section`, () => {
    const content = fs.readFileSync(skillPath, 'utf8');
    assert.ok(
      content.includes('## Mandatory actions') || content.includes('mandatory actions'),
      'Missing mandatory actions section'
    );
  });

  test(`${skillName}: has self-check or checklist section`, () => {
    const content = fs.readFileSync(skillPath, 'utf8');
    assert.ok(
      content.includes('checklist') || content.includes('self-check') || content.includes('- [ ]'),
      'Missing checklist or self-check section'
    );
  });
});

console.log('\nManifest validation:');

test('MANIFEST.md exists', () => {
  assert.ok(fs.existsSync('.mindforge/org/skills/MANIFEST.md'), 'Missing MANIFEST.md');
});

test('MANIFEST.md registers all 10 core skills', () => {
  const content = fs.readFileSync('.mindforge/org/skills/MANIFEST.md', 'utf8');
  const requiredSkills = [
    'security-review', 'code-quality', 'api-design', 'testing-standards',
    'documentation', 'performance', 'accessibility', 'data-privacy',
    'incident-response', 'database-patterns'
  ];
  requiredSkills.forEach(skill => {
    assert.ok(content.includes(skill), `MANIFEST.md missing skill: ${skill}`);
  });
});

test('MANIFEST.md has schema version header', () => {
  const content = fs.readFileSync('.mindforge/org/skills/MANIFEST.md', 'utf8');
  assert.ok(content.includes('Schema version') || content.includes('schema version:'), 'Missing schema version');
});

console.log('\nTrigger keyword uniqueness (within Tier 1):');

test('no duplicate triggers between Tier 1 skills at exact match', () => {
  const triggerMap = {};
  const conflicts = [];

  getAllSkillPaths().forEach(skillPath => {
    const fm = parseSkillFrontmatter(skillPath);
    const skillName = fm.name;
    const triggers = fm.triggers.split(',').map(t => t.trim().toLowerCase()).filter(Boolean);

    triggers.forEach(trigger => {
      if (triggerMap[trigger] && triggerMap[trigger] !== skillName) {
        conflicts.push(`"${trigger}": ${triggerMap[trigger]} vs ${skillName}`);
      } else {
        triggerMap[trigger] = skillName;
      }
    });
  });

  // Conflicts are allowed (Type 1 in conflict-resolver.md) but should be minimal
  // Flag if more than 5 conflicts exist (suggests poor trigger hygiene)
  assert.ok(
    conflicts.length <= 5,
    `Too many trigger conflicts (${conflicts.length} > 5): ${conflicts.slice(0, 3).join(', ')}`
  );
});

console.log('\nPersona override system:');

test('personas/overrides directory exists', () => {
  assert.ok(fs.existsSync('.mindforge/personas/overrides'), 'Missing personas/overrides directory');
});

test('personas/overrides/README.md exists and has content', () => {
  const p = '.mindforge/personas/overrides/README.md';
  assert.ok(fs.existsSync(p), 'Missing overrides README.md');
  const content = fs.readFileSync(p, 'utf8');
  assert.ok(content.length > 200, 'README.md too short');
  assert.ok(content.includes('override'), 'README.md should explain overrides');
});

console.log('\nNew commands (15 total):');

const allCommands = [
  'help', 'init-project', 'plan-phase', 'execute-phase', 'verify-phase', 'ship',  // Day 1
  'next', 'quick', 'status', 'debug',                                               // Day 2
  'skills', 'review', 'security-scan', 'map-codebase', 'discuss-phase'             // Day 3
];

test('all 15 commands exist in .claude/commands/mindforge/', () => {
  allCommands.forEach(cmd => {
    const p = `.claude/commands/mindforge/${cmd}.md`;
    assert.ok(fs.existsSync(p), `Missing command: ${p}`);
  });
});

test('all 15 commands mirrored to .agent/mindforge/', () => {
  allCommands.forEach(cmd => {
    const p = `.agent/mindforge/${cmd}.md`;
    assert.ok(fs.existsSync(p), `Missing mirrored command: ${p}`);
  });
});

test('command files are not empty', () => {
  allCommands.forEach(cmd => {
    const p = `.claude/commands/mindforge/${cmd}.md`;
    if (fs.existsSync(p)) {
      const size = fs.statSync(p).size;
      assert.ok(size > 200, `Command file too small (${size} bytes): ${cmd}.md`);
    }
  });
});

// ── Results ───────────────────────────────────────────────────────────────────
console.log(`\n${'─'.repeat(50)}`);
console.log(`Results: ${passed} passed, ${failed} failed`);

if (failed > 0) {
  console.error(`\n❌ ${failed} test(s) failed.\n`);
  process.exit(1);
} else {
  console.log(`\n✅ All skills platform tests passed.\n`);
}
```

---

### `docs/skills-authoring-guide.md`

```markdown
# MindForge Skills Authoring Guide

## What is a skill?
A skill is a self-contained folder containing a `SKILL.md` file that gives
the MindForge agent domain-specific expertise for a specific type of task.

Skills are loaded just-in-time: the agent discovers them by matching trigger
keywords against the task description. They inject the right knowledge at the
right moment without cluttering the context with irrelevant information.

## When to write a skill
Write a new skill when:
- A specific domain requires knowledge beyond the agent's defaults
- The same guidance needs to be applied consistently across many tasks
- Your team has standards that aren't captured in CONVENTIONS.md
- An existing core skill doesn't match your organisation's approach

## Skill file structure

```
.mindforge/skills/[skill-name]/
    SKILL.md          ← required
    examples/         ← optional: sample inputs and outputs
    resources/        ← optional: reference documents the skill uses
    scripts/          ← optional: helper scripts the skill can run
```

## SKILL.md template

```markdown
---
name: [skill-name-in-kebab-case]
version: 1.0.0
min_mindforge_version: 0.1.0
status: stable | beta | alpha
triggers: [comma-separated list of trigger keywords]
mutually_exclusive_with:   # optional: skill names that conflict with this one
breaking_changes:
  # Record breaking changes here when bumping MAJOR version
changelog:
  - "1.0.0: Initial release"
---

# Skill — [Human-readable skill name]

## When this skill activates
[One paragraph: what task types trigger this skill, and why it helps]

## Mandatory actions when this skill is active

### Before writing any code / Before starting any task
[Steps the agent MUST take before beginning — written as an ordered list]

### During [implementation / review / analysis]
[Standards and patterns the agent must follow — be specific]

### After [implementation / review / analysis]
[Verification steps, output requirements — be specific]

## [Domain-specific section 1]
[Detailed guidance, code examples, patterns]

## [Domain-specific section 2]
[Detailed guidance, code examples, patterns]

## Self-check before task completion
- [ ] [Checkable item 1]
- [ ] [Checkable item 2]
- [ ] [Checkable item 3]

## Output
[What files or artifacts this skill produces, with exact paths]
```

## Writing good trigger keywords
- Specific beats generic: `argon2` beats `hash`
- Include common misspellings and abbreviations: `optimise, optimize`
- Include acronyms and their expansions: `a11y, accessibility, WCAG, wcag`
- Include library names: `Prisma, Drizzle, SQLAlchemy` for database-patterns
- Aim for 10-30 triggers per skill
- Avoid single-letter words and extremely common words (the, be, is, to)

## Registering your skill
After creating SKILL.md:
```bash
/mindforge:skills add .mindforge/skills/[your-skill-name]
# Choose tier: 2 (org) or 3 (project)
# Commit the manifest update
```

## Tier guidance

| Tier | Use when | Location |
|---|---|---|
| 1 (Core) | Universal best practices — all projects | `.mindforge/skills/` |
| 2 (Org) | Your org's standards — all projects | `.mindforge/org/skills/` or separate repo |
| 3 (Project) | This project specifically | `.mindforge/skills/project/` |

## Version your skill
Every change to mandatory actions or trigger keywords = MINOR version bump.
Every removal of triggers or outputs = MAJOR version bump.
Typo fixes = PATCH version bump.

Update both the SKILL.md frontmatter AND the MANIFEST.md entry.
```

**Commit:**
```bash
git add tests/skills-platform.test.js docs/skills-authoring-guide.md \
        docs/persona-customisation.md
git commit -m "test(day3): add skills platform test suite and authoring documentation"
```

---

## TASK 13 — Run all tests and verify Day 3 is complete

```bash
# Full test battery — all must pass
node tests/install.test.js     && echo "✅ install"
node tests/wave-engine.test.js && echo "✅ wave-engine"
node tests/audit.test.js       && echo "✅ audit"
node tests/compaction.test.js  && echo "✅ compaction"
node tests/skills-platform.test.js && echo "✅ skills-platform"
```

**Final Day 3 commit:**
```bash
git add .
git commit -m "feat(day3): complete Day 3 MindForge skills platform — all components built"
git push origin feat/mindforge-skills-platform
```

---

## DAY 3 VERIFY — complete before pushing

```bash
# 1. All 10 skill packs exist with SKILL.md
ls .mindforge/skills/ | wc -l                    # Expected: 10
find .mindforge/skills -name "SKILL.md" | wc -l  # Expected: 10

# 2. All 4 engine files present
ls .mindforge/engine/skills/                     # Expected: 4 files

# 3. All 15 commands in both runtimes
ls .claude/commands/mindforge/ | wc -l           # Expected: 15
ls .agent/mindforge/ | wc -l                     # Expected: 15
diff <(ls .claude/commands/mindforge/ | sort) <(ls .agent/mindforge/ | sort)
# Expected: no output

# 4. MANIFEST.md has all 10 skills
grep -c "stable" .mindforge/org/skills/MANIFEST.md  # Expected: >= 10

# 5. All tests pass
node tests/skills-platform.test.js

# 6. No secrets
grep -rE "(password|api_key|secret)\s*=\s*['\"][^'\"]{8,}" \
  --include="*.md" --include="*.js" --include="*.json" \
  --exclude-dir=node_modules --exclude-dir=.git . 2>/dev/null \
  | grep -v "placeholder\|example\|template"
# Expected: no output

# 7. Git log clean
git log --oneline | head -20
# Expected: 13 clean commits from Day 3
```

---

**Branch:** `feat/mindforge-skills-platform`
**Day 3 implementation complete. Proceed to DAY3-REVIEW.md.**
