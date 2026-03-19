## Finding 1 — BLOCKING: Cursor pagination uses non-unique created_at only

**File:** .mindforge/skills/database-patterns/SKILL.md
**Category:** Data correctness
**Severity:** BLOCKING

**Issue:**
Cursor pagination example uses `created_at` only. This is ambiguous when multiple
records share the same timestamp, causing missing or duplicate rows.

**Recommendation:**
Use compound cursor `(created_at, id)` and document cursor encoding. See review
prompt for exact SQL replacement.

---
## Finding 2 — MAJOR: MindForge version not bumped for Day 3 skills

**File:** package.json
**Category:** Compatibility
**Severity:** MAJOR

**Issue:**
`package.json` is still `0.1.0` while Day 3 skills require `min_mindforge_version: 0.3.0`.
This causes compatibility warnings on every task.

**Recommendation:**
Bump `package.json` version to `0.3.0`.

---
## Finding 3 — MAJOR: Skills loader missing file-name matching and word-boundary rules

**File:** .mindforge/engine/skills/loader.md
**Category:** Skills Loader
**Severity:** MAJOR

**Issue:**
File path matching checks directory names only and does not check file names
(`login.ts`, `auth.ts`). Word-boundary matching for triggers is not explicit.

**Recommendation:**
Add file NAME matching rules and clarify word-boundary matching.

---
## Finding 4 — MAJOR: Skills summarisation lacks strict budget and priority rules

**File:** .mindforge/engine/skills/loader.md
**Category:** Context Budget
**Severity:** MAJOR

**Issue:**
Summarisation guidance lacks maximum length and priority ordering.

**Recommendation:**
Add explicit 150-word cap per summarised skill and priority ordering (tier +
match count). Never summarise security-review.

---
## Finding 5 — MAJOR: Conflict resolver can block on user input during wave execution

**File:** .mindforge/engine/skills/conflict-resolver.md
**Category:** Skills Loader
**Severity:** MAJOR

**Issue:**
Type 4 conflicts instruct "ask the user", which is impossible for subagents
in wave execution.

**Recommendation:**
If conflict cannot be resolved without user input during execution, load neither
skill, log to AUDIT, and defer to next interactive session.

---
## Finding 6 — MAJOR: Registry lacks parsing guidance and missing-manifest behavior

**File:** .mindforge/engine/skills/registry.md
**Category:** Registry
**Severity:** MAJOR

**Issue:**
Registry specifies table contents but does not describe table parsing. It also
omits a path for when MANIFEST.md does not yet exist.

**Recommendation:**
Add explicit table parsing rules and an auto-create path for first install.

---
## Finding 7 — MAJOR: Skills command missing safety and validation steps

**File:** .claude/commands/mindforge/skills.md
**Category:** Commands
**Severity:** MAJOR

**Issue:**
`list` does not show path; `validate` does not enforce self-check section;
`add` lacks confirmation of manifest entry; `update` does not run tests.

**Recommendation:**
Add path (or --verbose), enforce self-check, add confirmation preview, and run
skills-platform tests after update.

---
## Finding 8 — MAJOR: Security scan patterns and redaction incomplete

**File:** .claude/commands/mindforge/security-scan.md
**Category:** Security
**Severity:** MAJOR

**Issue:**
SSRF detection only covers `req.body.url`; secret patterns miss Azure/GCP; and
redaction scope is unclear for reports.

**Recommendation:**
Expand SSRF patterns, add Azure/GCP secret patterns, and explicitly redact in
console AND report output.

---
## Finding 9 — MAJOR: Map-codebase scalability and DRAFT convention handling

**File:** .claude/commands/mindforge/map-codebase.md
**Category:** Commands
**Severity:** MAJOR

**Issue:**
Architecture subagent reads all files in large codebases; DRAFT conventions are
not warned in STATE.md; temp directory cleanup only at end.

**Recommendation:**
Add sampling for large repos, add DRAFT warning in STATE.md, clean temp at start.

---
## Finding 10 — MAJOR: Discuss-phase lacks multi-domain support and strong auto warning

**Files:** .claude/commands/mindforge/discuss-phase.md, .claude/commands/mindforge/plan-phase.md
**Category:** Commands
**Severity:** MAJOR

**Issue:**
Discuss-phase only covers primary domain; --auto warning too mild; plan-phase does
not resolve CONTEXT.md open questions.

**Recommendation:**
Support multi-domain question sets, strengthen auto warning, and update plan-phase
 to read CONTEXT.md and resolve open questions before planning.

---
## Finding 11 — MAJOR: Performance skill missing key guidance and caveats

**File:** .mindforge/skills/performance/SKILL.md
**Category:** Skill Content
**Severity:** MAJOR

**Issue:**
Missing DB result caching, pool sizing, SSR/SSG guidance. Latency targets and
cache TTLs are presented as universal instead of defaults.

**Recommendation:**
Add caveats and missing guidance.

---
## Finding 12 — MAJOR: Accessibility skill missing WCAG 2.2, focus order, reduced motion

**File:** .mindforge/skills/accessibility/SKILL.md
**Category:** Skill Content
**Severity:** MAJOR

**Issue:**
Missing WCAG 2.2 AA criteria, DOM vs visual focus order, ARIA required props
examples, and reduced-motion guidance.

**Recommendation:**
Add these sections and notes.

---
## Finding 13 — MAJOR: Data-privacy skill missing consent withdrawal and retention guidance

**File:** .mindforge/skills/data-privacy/SKILL.md
**Category:** Skill Content
**Severity:** MAJOR

**Issue:**
Missing consent withdrawal requirement, retention examples, erasure vs
anonymisation distinction, and language-agnostic note.

**Recommendation:**
Add these clarifications.

---
## Finding 14 — MAJOR: Incident-response skill missing author ownership and human approval

**File:** .mindforge/skills/incident-response/SKILL.md
**Category:** Skill Content
**Severity:** MAJOR

**Issue:**
Postmortem author ownership is unclear for AI draft; missing explicit human
approval for automated mitigations; monitoring section lacks instrumentation
placement.

**Recommendation:**
Clarify author ownership, require human approval for P0 automation, and
specify service-boundary instrumentation.

---
## Finding 15 — MAJOR: Database-patterns missing UUIDv7 guidance and SQL example

**File:** .mindforge/skills/database-patterns/SKILL.md
**Category:** Skill Content
**Severity:** MAJOR

**Issue:**
Missing UUIDv7/ULID guidance, no framework-agnostic SQL N+1 example, and no
transaction isolation guidance for financial operations.

**Recommendation:**
Add UUIDv7 guidance, SQL example, and SERIALIZABLE note.

---
## Finding 16 — MAJOR: Tests missing stronger validations

**File:** tests/skills-platform.test.js
**Category:** Tests
**Severity:** MAJOR

**Issue:**
Trigger minimum too low, missing command content smoke tests, missing manifest
path validation, and missing loader ordering checks.

**Recommendation:**
Raise trigger minimum to 10, add content marker checks, add manifest path
resolution test, and add a loader ordering/priority check.

---
## Review Status
**NOT APPROVED** — fix BLOCKING and MAJOR findings above.
