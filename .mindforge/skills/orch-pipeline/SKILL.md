---
name: orch-pipeline
version: 1.0.0
min_mindforge_version: 11.4.0
status: stable
triggers: orchestration, multi-agent build, feature pipeline, size classification, blast radius, orch-add-feature, orch-fix-defect, orch-change-feature, orch-refine-code, orch-build-mvp, gated pipeline, research-plan-tdd-review-commit
origin: ECC (ported and adapted to MindForge)
---

# Skill — Orchestrator Pipeline (shared engine)

The `orch-*` commands are thin wrappers. They do not re-implement any work — they
classify the request, choose which phases of *this* pipeline run, and delegate
each phase to an existing MindForge skill, command, persona, or subagent. This
file is that pipeline.

> Invoke an operation command (`/mindforge:orch-add-feature`,
> `/mindforge:orch-fix-defect`, …) rather than this engine directly. This file is
> the reference they point at.

## When this skill activates

- Loaded indirectly whenever an `orch-*` operation command runs.
- Activates on the triggers above: orchestration, multi-agent build, feature
  pipeline, size classification, blast radius.
- Read directly only when adding a new operation to the family or tuning the
  shared phases, gates, agent map, or the size classifier.

## Mandatory actions when this skill is active

1. Run **Step 0 — the SIZE CLASSIFIER** first; ceremony scales to blast radius.
   Never skip it — emitting the size + plan is the contract.
2. Drive the work through the phases (research → plan → execute → verify →
   review → commit) using the MindForge XML plan format.
3. Honor **both gates**: the plan-approval gate and GATE 2 (commit + AUDIT.jsonl
   with conventional commits).
4. Route work through the remapped MindForge agent/capability map — never invoke
   the original ECC agent names.
5. Respect the security auto-trigger and Tier-3 governance; the GAN inner loop is
   descoped to `WaveExecutor` / the swarm-execution protocol.

## The operation family

| Command | Operation | Trigger | First move |
|---------|-----------|---------|------------|
| `/mindforge:orch-add-feature` | feature | capability does not exist yet | research + plan a new slice |
| `/mindforge:orch-change-feature` | tweak | works, but desired behavior differs | amend existing behavior *and its tests* |
| `/mindforge:orch-fix-defect` | fix | broken; behavior is wrong | reproduce as a failing test, then fix |
| `/mindforge:orch-refine-code` | refactor | behavior stays, structure improves | restructure while keeping tests green |
| `/mindforge:orch-build-mvp` | mvp | bootstrap from a design/spec doc | ingest doc → vertical slices |

> These wrappers **compose** existing MindForge capabilities rather than replace
> them: the `writing-plans` skill + `/mindforge:plan-write`, the
> `mindforge-tdd_extended` protocol, `/mindforge:cross-review` + `/mindforge:review`,
> the `04-quality-security` reviewer subagents, and the `quick.md` security
> auto-trigger. The orch-* family adds the shared **size classifier** and the
> **two human gates** on top of them, so one umbrella covers all five operations
> consistently.

---

## Step 0 — SIZE CLASSIFIER (right-sizing) — the novel control

> **This is the whole point of the port. Ceremony scales to blast radius.** Do
> not skip it. Always run Step 0 first and always state the result in one line so
> the user can override.

Score the request on three signals, take the **highest** tier any signal
reaches, and emit one line:

```
[orch] size: <tier> — phases <mask> — rationale: <one clause>  (override with: size=<tier>)
```

| Tier | Files touched | New dependency / contract | Design ambiguity | Phases that run |
|------|---------------|---------------------------|------------------|-----------------|
| **tiny** | 1, a few lines | none | none — the change is obvious | 4 → 5 → 6 |
| **small** | 1 file / 1 function | none | clear once you read the code | (1 light) → 4 → 5 → 6 |
| **medium** | 2–5 files | maybe a new internal module | one real choice to make | 1 → 2 → 4 → 5 → 6 |
| **large** | many / cross-cutting | new external dep, public API, or a spec doc | multiple open questions | 1 → 2 → (3) → 4 → 5 → 6 |

Phase 0 (Intake) always runs and is omitted from the mask column above.

**Tie-breakers (force a floor regardless of file count):**
- Anything touching a **security trigger** (see below) is **at least medium**.
- Anything touching a **public API / contract / spec doc** is **at least medium**.
- Anything classified **Tier 3** under the MindForge security policy (see
  `.claude/CLAUDE.md` → CRITICAL SECURITY & AUTO-TRIGGER) is **at least large**
  and requires manual overhead before Gate 1.
- If the swarm controller (`.mindforge/engine/swarm-controller.md`) would trigger
  on this task (`compositeScore >= AUTO_SWARM_THRESHOLD`, or a multi-disciplinary
  marker like `UI + API` / `Auth + Database`), treat the tier as **large** and
  run the Implement phase via the swarm-execution protocol (see Phase 4).

Per-operation default floors (the wrappers pass these in):
- `orch-fix-defect` → floor **small** (often **tiny**).
- `orch-change-feature` → floor **small**.
- `orch-refine-code` → floor **medium** (restructures touch multiple files).
- `orch-build-mvp` → floor **large**, full pipeline incl. Scaffold (Phase 3).
- `orch-add-feature` → no floor; classify on the three signals.

---

## The phases

Each phase delegates — it does not do the work inline.

- **0. Intake** — restate the request in one line. For `orch-build-mvp`, read the
  spec/design doc and extract scope, locked decisions, and a feature list.
- **1. Research & Reuse** — Search-Before-Building (Builder Ethos): `gh search
  repos` / `gh search code`, then Context7 / vendor docs, then package registries,
  then Exa / web search. Prefer adopting a proven implementation over net-new
  code. Use `/mindforge:research` for a focused research subagent when the task
  involves unfamiliar libraries.
- **2. Plan** — delegate to the `writing-plans` skill via `/mindforge:plan-write`.
  Output a MindForge **XML plan** (format below), ordered as thin vertical
  slices, written under `.planning/`. → **GATE 1.**
- **3. Scaffold** — `orch-build-mvp` only: stand up the first end-to-end slice.
- **4. Implement (TDD)** — drive each task through the `mindforge-tdd_extended`
  protocol (Red → Green → Refactor). Honor the operation's first-move rule. For
  **large**/swarm-triggered tasks, delegate the implement wave to
  `WaveExecutor` / the `mindforge-swarm-execution` protocol
  (`.mindforge/engine/wave-executor.md`) instead of a single-threaded loop.
- **5. Review** — `/mindforge:review` (code-quality + security), escalating to
  `/mindforge:cross-review` (multi-model consensus) for **large** tiers. Pull in
  the matching `04-quality-security` reviewer subagent for the repo's language
  (`typescript-reviewer`, `python-reviewer`, `rust-reviewer`, `go-reviewer`, …)
  and `security-auditor` / `penetration-tester` whenever the diff touches a
  security trigger.
- **6. Commit** — conventional commits (`feat:` / `fix:` / `refactor:` / …), one
  per logical chunk, **+ a Merkle-linked AUDIT.jsonl entry per commit**. → **GATE 2.**

---

## The MindForge XML plan format (Phase 2 output)

Plans are MindForge XML, written under `.planning/` — **never** ECC
`.claude/PRPs/` paths. For orch-* work the planning home is
`.planning/quick/[NNN]-[slug]/PLAN.md` (sequential numbering, per `quick.md`) for
tiny/small/medium, or `.planning/phases/[phase]/PLAN.md` when a phase is active.

```xml
<task type="orch-[operation]">
  <n>[task name]</n>
  <size>[tiny|small|medium|large]</size>
  <persona>[appropriate persona — security-reviewer if a trigger is touched]</persona>
  <files>[files to touch]</files>
  <context>[why this work exists; cited file:line patterns from EXPLORE]</context>
  <action>[ordered, no-placeholder vertical slices — the task_list]</action>
  <verify>[exact verification command + expected output]</verify>
  <done>[definition of done — incl. tests + coverage ≥ 80%]</done>
</task>
```

The `writing-plans` skill's EXPLORE protocol and "No Prior Knowledge" gate apply:
every convention the plan references must be cited from the actual codebase.

---

## The two gates

This family is **gated, not autonomous**:

1. **GATE 1 — after Plan.** Present the XML `<action>` task_list; do not write
   implementation code until the user approves. For **Tier 3** security-classified
   work, the manual security overhead is completed here before approval.
2. **GATE 2 — before Commit.** Present the diff summary and proposed conventional
   commit messages; do not commit until the user confirms. Each confirmed commit
   writes a Merkle-linked AUDIT.jsonl entry (below).

Everything between the gates flows without stopping.

---

## Agent / capability map (remapped to MindForge)

| Phase | Primary (MindForge) | Fallback / escalation |
|-------|---------------------|-----------------------|
| Intake / understand | `/mindforge:map-codebase` / `/mindforge:code-tour` | trace existing paths before a tweak, fix, or refactor |
| Research | `/mindforge:research` | Context7 / vendor docs / package registries / Exa |
| Plan | `writing-plans` skill via `/mindforge:plan-write` | `/mindforge:system-design`, `/mindforge:rfc` for structural calls |
| Implement | `mindforge-tdd_extended` protocol (Red-Green-Refactor) | `/mindforge:debug` on build/test breaks |
| Implement (large/swarm) | `WaveExecutor` / `mindforge-swarm-execution` protocol | `SwarmController` cluster selection (`.mindforge/engine/swarm-controller.md`) |
| Review | `/mindforge:review` (code-quality + security) | `/mindforge:cross-review` (multi-model) for large tiers |
| Language review | `04-quality-security/<lang>-reviewer.md` subagent | match the reviewer to the repo (see its `CLAUDE.md`) |
| Security | `quick.md` security auto-trigger → `security-reviewer.md` persona + `security-auditor` / `penetration-tester` subagents | `/mindforge:security-scan` PRE-COMMIT |

Match the language reviewer to the repo. The `04-quality-security` subagents live
under `subagents/categories/04-quality-security/`.

---

## Security-review trigger (the quick.md auto-trigger)

Reuse the `quick.md` **security auto-trigger**: scan the task description and the
files in scope for security keywords —
`auth, authentication, login, password, token, JWT, session, payment, PII, upload,
credential, secret, key` — and for changes to authorization, user-input handling,
database queries, file-system paths, external API calls, or cryptography.

If any match:
1. Load `security-review/SKILL.md` and activate the `security-reviewer.md` persona
   for the Implement and Review phases (required even for tiny/small tiers).
2. Pull in the `security-auditor` (+ `penetration-tester` for large) subagents
   from `04-quality-security/` during Phase 5.
3. Run `/mindforge:security-scan` PRE-COMMIT. **Fail the gate if any Medium+
   findings are unaddressed** (per `.claude/CLAUDE.md`).
4. Treat the task as **at least medium** in Step 0 (Tier 3 → at least large, with
   manual overhead before Gate 1).

---

## Handoff artifacts

The pipeline carries no hidden state — the planning docs *are* the handoff:

- The XML `<action>` task_list (from Plan) drives the Implement loop.
- Larger work may also emit PRD / architecture / system_design under `.planning/`
  (via `/mindforge:system-design`, `/mindforge:product-spec`, `/mindforge:rfc`).
- Review findings (Blocking / CRITICAL / HIGH) must be resolved before Gate 2.

---

## GATE 2 — commit + AUDIT.jsonl (Phase 6)

On user confirmation at Gate 2, for **each** logical commit:

1. Commit with a **conventional** message scoped to one logical change:
   `feat(<scope>): …` / `fix(<scope>): …` / `refactor(<scope>): …` / etc.
2. Append a **Merkle-linked** AUDIT.jsonl entry to `.planning/AUDIT.jsonl`. Each
   entry sets `previous_hash` to the prior entry's `_hash` and computes its own
   `_hash` (per `.mindforge/audit/AUDIT-SCHEMA.md`):

```json
{
  "id": "uuid",
  "timestamp": "ISO-8601",
  "event": "orch_commit",
  "agent": "orch-pipeline",
  "operation": "add-feature | fix-defect | change-feature | refine-code | build-mvp",
  "size_tier": "tiny | small | medium | large",
  "phase": null,
  "task_name": "[task name]",
  "commit_sha": "abc1234",
  "commit_type": "feat | fix | refactor",
  "files_changed": ["src/..."],
  "security_trigger": false,
  "review_verdict": "approved | approved_with_conditions",
  "gates_honored": ["gate1_plan", "gate2_commit"],
  "previous_hash": "<prior _hash>",
  "_hash": "<sha256 of this entry>"
}
```

---

## Verification (self-check before task completion)

- [ ] **Step 0 size tier was stated in one line** and matched the work.
- [ ] **Gate 1 (plan)** and **Gate 2 (commit)** were both honored.
- [ ] The plan was MindForge XML written under `.planning/` (never ECC `PRPs/`).
- [ ] The `quick.md` security auto-trigger ran; `security-reviewer` engaged iff a
      security trigger was touched; `/mindforge:security-scan` passed PRE-COMMIT
      with no unaddressed Medium+ findings.
- [ ] Commits are conventional and scoped to one logical change.
- [ ] Each commit wrote a Merkle-linked AUDIT.jsonl entry (`previous_hash`/`_hash`).
- [ ] New / changed behavior has tests; coverage ≥ 80%.

---

## Note — GAN inner loop is DESCOPED

The ECC original drove `orch-build-mvp`'s inner build loop through a **GAN
generate/evaluate harness** (`/gan-build`, `gan-generator` → `gan-evaluator`,
`gan-harness/spec.md` + `eval-rubric.md`). **That GAN harness is not ported.** In
MindForge, `orch-build-mvp`'s build loop instead **delegates each vertical slice
to `WaveExecutor` / the `mindforge-swarm-execution` protocol**
(`.mindforge/engine/wave-executor.md`), with `SwarmController`
(`.mindforge/engine/swarm-controller.md`) selecting the cluster. The adversarial
quality bar is provided by the existing `mindforge-tdd_extended` (Red-Green) loop
plus `/mindforge:cross-review`, not by a GAN evaluator.

> **Deferred:** porting the GAN generate/evaluate harness (and its spec /
> eval-rubric artifacts) into MindForge is out of scope for v1.0.0 of this engine.
