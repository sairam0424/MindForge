# README honesty section vs. competitors — followup after PR #281

Researched 2026-09-22, against MindForge `README.md` as it stands on disk right now (424
lines), read directly from this repo's own git history (`git log --oneline -- README.md`,
`git show 423df3a8`; see "What actually changed" below for the exact commit). This is a
**followup** to the existing `scratch-pad/research/mindforge-competitive-landscape.md` (dated
2026-09-20, gitignored so it isn't shipped or linkable from a tracked path — readers without
that local scratch directory won't have access to it) — that report is re-cited below, not
repeated, and this document only adds what has changed or wasn't yet checkable as of 2026-09-20.

## Method note (primary sources only)

- **MindForge claims**: read directly from the live files in this repo —
  `README.md` (full file), `docs/usp-features.md`, `bin/review/cross-review-engine.js`,
  `bin/engine/council-runtime.js`, `bin/council-cli.js`, `plugins/mindforge/hooks/hooks.json`,
  `bin/installer/hook-registration.js`, and `git log --oneline -- README.md` /
  `git show 423df3a8` for the change history. Nothing below is taken from a prior summary.
- **External claims**: each competitor's README was fetched fresh today via
  `gh api repos/<owner>/<repo>/readme` (raw content, base64-decoded), not a cached copy, not a
  blog writeup. Star counts came from `gh repo view <owner>/<repo> --json stargazerCount` run
  today. URLs are given inline for every external claim.

---

## 1. What actually changed in the README, verified against git history

`git log --oneline -- README.md` (10 most recent) shows the section move and the new table row
came from a single commit:

```
423df3a8 docs: implement README + docs upgrade plan (10-angle research synthesis) (#281)
```

Reading that commit's message and diffing it against the current file confirms, independently
of the commit message's own claims:

- **Position**: `## What is actually enforced` now starts at **line 54 of 424** (~13% down the
  file), immediately after `## What you get` (line 34) and before `## Install` (line 108). The
  commit message states the section was previously at "~52% down the file" — plausible and
  consistent with the section's current placement being a large, deliberate move, though I have
  no earlier revision of this file on disk to diff byte-for-byte and confirm the exact prior
  percentage myself, so that specific number is carried from the commit message rather than
  independently re-derived here.
- **Badge**: a new badge, `[audit chain: verified]`, was added to the primary (large,
  `for-the-badge`-styled) badge row and links to `#what-is-actually-enforced` (`README.md:5`).
- **Nav**: the "Jump to" bar (`README.md:30`) lists 13 anchors, with "What is actually enforced"
  third, right after "What you get".
- **New table row**: `README.md:44` — `🔍 Multi-model cross-review + decision council` — is new
  in this commit, citing `/mindforge:pr-review`, `/mindforge:council`, `bin/review/`, and
  `bin/engine/council-runtime.js`.

I independently re-verified the two code claims behind that new row rather than trusting the
commit message:

- `bin/review/cross-review-engine.js` (`runCrossReview`) makes two real, separate model calls
  (`ModelClient.complete`) — one with a "senior codebase architect" system prompt
  (`PRIMARY_PROMPT`), one with a "paranoid security auditor" adversarial prompt
  (`ADVERSARIAL_PROMPT`) — then synthesizes both into a report via `synthesizeFindings` and
  writes it to disk. This is a real two-model pipeline, not a single call relabeled.
- `bin/engine/council-runtime.js` (`runCouncil`) requires an **injectable** `opts.model`
  function and has no default LLM wiring of its own — by itself it is pure orchestration logic
  (position collection, weighted consensus, dissent capture). The real wiring lives in
  `bin/council-cli.js`, which supplies `councilModel()`, a real `ModelClient.complete` call per
  voice, for the 4 named voices (architect/skeptic/pragmatist/critic) the README's table row
  says. So the "4-voice consensus council" claim is accurate and code-backed, but only once you
  follow the injection one file further than the README cites.

**Conclusion for this section**: the placement move and the new row are both real, both
verifiable in the current tree, and the new row's underlying claim held up under independent
code inspection (I did not just trust the commit message's own "verified before adding" note).

---

## 2. Fresh competitor re-check (2026-09-22) — do any of the three have anything comparable?

Fetched live today via `gh api repos/<owner>/<repo>/readme`:

| Repo | Stars today (2026-09-22) | Stars per prior research (2026-09-20) | Δ |
|---|---|---|---|
| `ruvnet/ruflo` | 73,036 | 72,898 | +138 |
| `bmad-code-org/BMAD-METHOD` | 53,325 | 53,266 | +59 |
| `SuperClaude-Org/SuperClaude_Framework` | 23,904 | 23,902 | +2 |

Movement over two days is noise-level for all three; nothing here changes the competitive
picture the prior research already established. More importantly, **README structure and
content are materially unchanged** for all three since the 2026-09-20 snapshot — same
sections, same framing, same absence of anything resembling MindForge's honesty section. Read
in full today (not sampled):

- **`ruvnet/ruflo`** (422 lines, fetched
  `https://raw.githubusercontent.com/ruvnet/ruflo/main/README.md` via the GitHub API): no
  limitations/honesty section anywhere in the file. What it *does* do, which is a more specific
  and more useful comparison than "no honesty section exists": several **individual rows inside
  its own "What You Get" table cite a verification source in the same row as the claim**, e.g.
  the Vector Memory row — *"HNSW-indexed AgentDB — measured ~1.9x faster at N=20k, ~3.2x–4.7x at
  N=5k vs brute force (recall@10 ~0.99); ANN wins above the crossover, ties/loses at small N. See
  [audit](docs/reviews/intelligence-system-audit-2026-05-29.md) +
  [`scripts/benchmark-intelligence.mjs`](scripts/benchmark-intelligence.mjs)"* — this is a
  claim, a specific number, an explicit boundary condition (ties/loses at small N), and a link to
  the reproducible source, all in one table cell, with no separate section required. Its
  benchmarks doc (linked from the README, `docs/STATUS.md` / the Benchmarks row) is likewise
  headlined "is-it-fast" framing with reproduction instructions. This is a *lighter-weight*
  honesty pattern than MindForge's dedicated section — verification-inline-with-the-claim
  instead of verification-in-a-separate-section — and it does not require the reader to leave
  the pitch table at all.
- **`SuperClaude-Org/SuperClaude_Framework`** (647 lines,
  `https://raw.githubusercontent.com/SuperClaude-Org/SuperClaude_Framework/main/README.md`): no
  enforcement/limitations section. It does disclose incompleteness, but only for
  **unreleased/roadmap** features, e.g. *"IMPORTANT: The TypeScript plugin system described in
  older documentation is not yet available (planned for v5.0)"* and, under that feature,
  *"This feature is not yet available... Status: In development. No ETA has been set."* That is
  a "not built yet" disclosure, not a "built but not enforced the way it sounds" disclosure —
  a different kind of honesty than MindForge's (MindForge's is about *shipped* code that doesn't
  do what its own instructions imply; SuperClaude's is about *unshipped* code that's clearly
  labeled unshipped). The rest of the README is otherwise unqualified capability marketing
  ("Security engineer catches real vulnerabilities," "PM Agent ensures continuous learning
  through systematic documentation") with no citation to a file, test, or measurement backing
  either sentence.
- **`bmad-code-org/BMAD-METHOD`** (114 lines,
  `https://raw.githubusercontent.com/bmad-code-org/BMAD-METHOD/main/README.md`): the shortest of
  the three by a wide margin, no stats tables, no enforcement claims to begin with, so nothing to
  caveat. Its closest analog is an ethos line — *"BMad keeps you in control while its agents and
  workflows make the important decisions explicit"* — but this is a design-philosophy statement,
  not a "here is exactly what does and doesn't block a command" audit.

**Net finding**: the prior research's conclusion (§7 of the 2026-09-20 report — no competitor
has a documented equivalent to MindForge's honesty section) still holds after a fresh read
today, and I found no material content drift in any of the three READMEs that would change it.
The one refinement worth adding: "no equivalent" is true at the *section* level, but not
uniformly true at the *row* level — ruflo already does inline, in-table citation for its
highest-risk quantitative claims (the same technique MindForge's own audit-chain row uses: `🔒
Tamper-evident audit chain | ... verify independently with node bin/verify-audit.js`).

---

## 3. Does the new placement/framing read as more compelling, or does it still get lost?

**More prominent: yes, verified.** ~13% down the file, third in the nav bar, one of only three
badges in the large primary badge row. By any positional measure this is a real, substantial
improvement over "~52% down," and it now sits *before* Install, which is the correct place for a
disclosure someone should read before running anything.

**Fully "not lost" any more: not quite — for two separate, specific reasons found by reading
the current file, not by assumption:**

1. **A badge/anchor content mismatch that this same commit introduced.** The new badge's visible
   text is `audit chain: verified` (`README.md:5`), and it is the *only* scannable element that
   points a reader at `#what-is-actually-enforced`. But the section that anchor lands on opens
   with hook-enforcement framing first — its first sentence is *"Read this before you rely on
   anything below blocking a bad command"* (`README.md:56`), the whole per-channel table
   (`README.md:63-69`) is about hooks, and the `[!WARNING]` blockquote (`README.md:86-91`) is
   about hooks too. The audit chain itself gets exactly one clause, near the very end of the
   section: *"The audit chain is verifiable today (`node bin/verify-audit.js`)"*
   (`README.md:103-104`). A reader who clicks a badge promising "audit chain: verified" lands in
   roughly 45 lines of hook-registration nuance before reaching the sentence that badge actually
   promised. This is a real, present mismatch between the one scannable trust-signal pointing at
   the section and that section's actual emphasis — not a hypothetical risk.
2. **The "What you get" table — the one artifact structurally equivalent to every competitor's
   pitch table, and the only thing a skimmer trained by ruflo/SuperClaude/BMAD-style READMEs is
   likely to actually read closely — never states the hooks-enforcement capability itself.**
   I re-read all 10 rows of that table (`README.md:36-47`) line by line: commands, skills,
   personas, subagents, workflows, audit chain, cross-review+council, cost routing, knowledge
   graph, dashboard. There is no row for "hooks that can block a tool call." The single most
   differentiated, most rigorously measured claim in the whole README — *8 hooks registered, 3
   deny-class hooks independently verified returning exit 2 on a confined install* — is
   introduced only defensively, inside prose in the caveat section, never pitched positively in
   the table where first impressions form. Every *other* row in that table is an unqualified,
   confident capability statement; the one capability MindForge can prove is actually enforced
   isn't stated as a capability at all.

Put together: the section didn't "get lost" by position — it got a strong position and still
isn't doing its full job, because (a) the one badge advertising it promises something narrower
than what it mostly delivers, and (b) the pitch surface most readers actually skim (the table)
still doesn't carry the claim the honesty section exists to support.

---

## 4. The cross-review/council row, held to the same "measured, not asserted" bar

The row itself (`README.md:44`) is, on inspection, **better evidenced than any comparable claim
in the three competitor READMEs fetched today**:

- Ruflo has no equivalent adversarial/cross-model review feature described anywhere in its
  README — its closest analog, "Swarm Coordination... with consensus," is about agent
  coordination generally, not a two-model review-and-synthesize pipeline.
- SuperClaude's closest analog, "Business Panel → Multi-expert strategic analysis" (its modes
  table), names no command's implementation path and cites no file.
- BMAD's closest analog, "Guided collaboration — structured workflows and multiple-agent
  discussions," is prose with no named command and no cited file.

MindForge's row names two real commands, two real files, and (per §1 above) both hold up under
direct code inspection. On the specific axis of "does the README's claim match a real,
independently-checkable implementation," this row is currently the strongest of the four
projects compared.

**But it breaks a pattern the README otherwise keeps consistently.** Every other verifiable
claim in this README gives the reader a way to check it for free, without spending model-call
money: the audit chain row says "verify independently with `node bin/verify-audit.js`"; the
install-speed claim says "reproduce with `time npx mindforge-cc@latest --claude --local`"; the
Verify section points at `/mindforge:health`. The cross-review/council row is the one row in
the "What you get" table that names an implementation but offers no zero-cost way to confirm it
runs as described — running it for real costs two model calls (cross-review) or four
(council, one per voice, per `bin/council-cli.js`). This isn't a claim I can call inaccurate —
it's accurate, per §1 — but it's the one place in the table where the project's own established
"verify it yourself, free" pattern is absent.

---

## 5. Concrete next edit — respecting this project's own stated boundary

**Constraint found and worth stating explicitly before recommending anything**: `README.md:337`
links to `docs/usp-features.md` and describes it as *"the same 'measured, not asserted' honesty
pass applied to what's actually shipped — **no competitor comparison**."* I read
`docs/usp-features.md` directly and it opens the same way, framing itself as the "measured, not
asserted" companion to the README's honesty section, again with no named-competitor content.
This is a deliberate, already-stated positioning choice for this project. It rules out the most
obvious move available (ruflo has a "Claude Code: With vs Without Ruflo" table; the obvious
copy would be "MindForge vs. X/Y/Z") — adding one would contradict a boundary the project has
already set for itself in its own shipped docs, so I am not recommending it.

**What I am recommending instead, scoped to fixes that use patterns this README already
established for itself:**

1. **Add one row to the "What you get" table for enforced hooks**, using the exact
   self-qualifying pattern the audit-chain row already uses (state the capability, then
   immediately scope it in the same cell):

   ```
   | 🚫 | **Enforced hooks (Claude Code)** | PreToolUse/PostToolUse deny-class hooks that can actually block a tool call — 3/3 verified returning exit 2 on a confined install; advisory-only on every other runtime, see [What is actually enforced](#what-is-actually-enforced) |
   ```

   This adds no new claim — every word is already stated and already verified elsewhere in this
   same file (`README.md:76-79`) — it just moves the single most differentiated, most-measured
   claim into the surface a skimming reader (trained by every competitor's README in this
   comparison) is most likely to actually read.

2. **Fix the badge/anchor mismatch from §3.1**, by the smallest available means: either reword
   the badge text so it matches the section's actual majority content (e.g. two badges — one
   scoped to the audit chain, one scoped to hooks/enforcement — instead of one badge whose text
   describes a fifth of what it links to), or move the one audit-chain sentence
   (`README.md:103-104`) up to lead the section instead of trailing it, so the badge's promise is
   the first thing a clicking reader sees. Given this project's own demonstrated preference for
   small, surgical diffs over rewrites (visible across every entry in the "Latest release" /
   CHANGELOG history read for this task), the badge-text fix is the lower-risk of the two.

3. **Lower priority, optional**: apply this same README's own established `<details>`
   progressive-disclosure pattern (already used three times in this file — "Earlier releases,"
   "Execution modes," "Plugin system") to the enforcement section's dense middle paragraphs
   (`README.md:73-84`), so the table + warning stay visible by default and the two
   "measured on a confined install" prose paragraphs collapse behind a summary. This is the
   least certain of the three recommendations — it's a scannability judgment call, not something
   I can verify as "more compelling" the way I verified the other two against actual file
   content, so I'm flagging it as optional rather than a finding with the same confidence as #1
   and #2.

---

## 6. Explicit confidence notes (measured, not asserted, applied to this document itself)

- Everything in §1 and §4 about MindForge's own code (`cross-review-engine.js`,
  `council-runtime.js`, `council-cli.js`, `hooks.json`, the README's own line numbers) was
  read directly from the files in this checkout today and is high-confidence.
- Everything about the three external READMEs (§2, §4) was fetched fresh today via the GitHub
  API (raw file content, not a rendered page, not a cached/prior summary) and is high-confidence
  for "what the README currently says." It is not a claim about those projects' actual code
  behavior — I did not clone or run ruflo, SuperClaude, or BMAD-METHOD, so "ruflo's HNSW claim is
  measured" describes what its README asserts and links to, not independent verification of the
  linked benchmark script's output.
- The one number I could not independently re-derive is the prior "~52% down the file" figure
  for the honesty section's old position (§1) — I have no earlier revision of `README.md` on
  disk in this checkout to diff against, so that figure is carried from the PR #281 commit
  message rather than freshly measured. Everything else positional (13%, line 54 of 424, third
  in the nav, third badge) was counted directly against the current file.
- §5's recommendations are edits I have not made — this document is investigation-only, per the
  task. The exact wording in the suggested new table row is a proposal, not a claim about what
  the README currently says.
