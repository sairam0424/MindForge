# README claims from the 423df3a8 batch: which ones have no drift guard

**Date:** 2026-09-22. **Scope:** the five README.md claims named in the request (audit-chain
badge, cross-review/council row, Temporal-rollback diagram, install-speed number, GitHub topics
list) — all added or changed by commit `423df3a8` ("docs: implement README + docs upgrade plan
(10-angle research synthesis)", merged PR #281, `git log --oneline -1 -- README.md`). Every
finding below is either (a) something I read directly in the current checkout — line numbers are
given and were re-checked after writing, or (b) a live external call I made in this session
(`gh api`, timestamped). I ran `node tests/doc-count-claims.test.js` myself; I did not take any
prior summary's word for what it checks.

## 1. What `tests/doc-count-claims.test.js` currently checks

Read in full (`tests/doc-count-claims.test.js:1-489`). Two shapes of coverage exist today:

**A. Fifteen numeric claims in a `CLAIMS` array** (`tests/doc-count-claims.test.js:95-115`), each a
`{file, what, re, expect}` tuple: a regex locates a stated number in prose, a `MEASURED.*`
function computes the true count from the filesystem/git/JSON, and the test asserts equality.
Covered files: `AGENTS.md` (version, test-file count, hook-script count, registered-hook count,
workflow count, engine-skill count), `README.md` (**only** the `files[]` entry count —
`tests/doc-count-claims.test.js:102`), `docs/faq.md` (test-file/pass/skip counts, coverage floor),
`CLAUDE.md` (test-file/pass/skip counts), and `subagents/.claude-plugin/marketplace.json`
(subagent count).

**B. Six structural/behavioral gates**, not tied to a specific number: no shipped doc names a
`/mindforge:` command that doesn't exist (`:140-193`); every printed CLI invocation names a verb
the router dispatches (`:236-322`); no doc tells a user to `npx` a package this project doesn't
own (`:324-374`); no doc advertises the dead `@mindforge <verb>` form (`:376-406`); the root
marketplace description's three counts match the plugin tree (`:424-439`); every `MEASURED.*`
function returns a plausible non-zero value, so a broken glob can't silently make every claim
above vacuously pass (`:443-461`); and `docs/faq.md` no longer states an unverifiable coverage
percentage (`:463-474`).

I ran it: `node tests/doc-count-claims.test.js` → **22 passed, 0 failed** on the current checkout.
So everything this file *does* claim to guard is currently true. The question is what it doesn't
reach.

## 2. The five named claims, checked one at a time

### 2.1 Audit-chain badge — `README.md:5`

> `[![audit chain: verified](...)](#what-is-actually-enforced)`

Not a number, so it was never a candidate for the `CLAIMS` regex pattern. It's a mechanism claim
("this is independently verifiable"), and the mechanism is real: I ran `node bin/verify-audit.js`
myself and got `✅ audit chain valid: 6053 entries`, exit 0, against the live
`.planning/AUDIT.jsonl` (2,596,492 bytes on disk right now). Separately, `tests/audit-integrity.test.js`
and `tests/ci-gates-wired.test.js` exercise the hashing/verification code paths on synthetic
chains. **Verdict: true today, and the two things that back it (the verifier script, the code
paths) are each independently tested already** — just not the badge text itself, which links to a
prose section rather than stating a number a regex could pin.

### 2.2 Cross-review / decision-council row — `README.md:44`

> `**Multi-model cross-review + decision council** | Two-model adversarial PR review
> (\`/mindforge:pr-review\`) and a 4-voice consensus council (\`/mindforge:council\`) —
> \`bin/review/\`, \`bin/engine/council-runtime.js\``

Four sub-claims, each checked directly:
- `/mindforge:pr-review` exists: `.claude/commands/mindforge/pr-review.md` — yes.
- `/mindforge:council` exists: `.claude/commands/mindforge/council.md` — yes.
- `bin/review/` exists and is non-trivial: contains `ads-engine.js`, `ads-synthesizer.js`,
  `cross-review-engine.js`, `finding-synthesizer.js`, `review-report-writer.js` — yes.
- `bin/engine/council-runtime.js` exists — yes.

**Coverage that already exists, indirectly:** the shipped-doc phantom-command gate
(`tests/doc-count-claims.test.js:140-193`) scans every shipped `.md`/`.js` file (via
`npm pack --dry-run --json`) for `/mindforge:<name>` references and fails if the command doesn't
exist under `.claude/commands/mindforge/` or `.agent/mindforge/`. `README.md` is one of the 52
`files[]` entries, and I confirmed it's actually present in the tarball (`npm pack --dry-run
--json` → its `files[].path` list includes `README.md`), so this
row's two slash-command references are already under that gate's protection — if `pr-review.md` or
`council.md` were ever deleted, this existing test would fail. What it does *not* check: the
"4-voice" and "Two-model" adjectives, or that `bin/review/`/`council-runtime.js` still contain what
the row implies. Those are prose-quality claims, not path-existence ones — lower priority, see §3.

### 2.3 Temporal-rollback diagram — `README.md:294-299`

```
   Verification (build / typecheck / lint / test / security / diff)
                     pass    |    fail
              +--------------+--------------+
              v                             v
   Handoff (.planning/HANDOFF.json    Temporal rollback -> awaiting_regeneration
              + AUDIT.jsonl)              -> re-trigger (back to Skill Loader)
```

This is the finding I'd flag as the most substantive gap, so I verified it the most carefully.

The diagram draws the `fail` branch as a box structurally symmetric with the `pass` branch's
`Handoff` box — both sit one arrow below `Verification`, implying (to a reader skimming the shape,
not just the words) that a failed verification *automatically* continues into rollback and
re-triggering, the same way a passed verification automatically continues into Handoff.

I traced the actual call graph for the rollback step, `HindsightInjector.inject(auditId,
fixDescription)` (`bin/hindsight-injector.js:17`):

```
grep -rn "HindsightInjector" bin/   # every requirer of the module
```
returns exactly `bin/installer-core.js` (packaging metadata only), `bin/dashboard/temporal-api.js`,
`bin/engine/temporal-hub.js` (the module `HindsightInjector` itself calls), and
`bin/engine/temporal-cli.js`. Then, of those, the actual **call sites** of `.inject(`:

- `bin/dashboard/temporal-api.js:74` — inside an Express HTTP handler. Reached only when a human
  (or an agent driving the dashboard's browser UI) submits the Temporal tab's rollback form, per
  the `.claude/CLAUDE.md` "Temporal Vision Loop" protocol (§5): *"Invoke the MindForge Dashboard...
  Use the Temporal Slider... Inject a Hindsight Steering Vector via the dashboard."*
- `bin/engine/temporal-cli.js:88` — inside the `mindforge temporal inject <auditId> <fix
  description>` CLI subcommand. Requires a human/agent to already know which `auditId` to roll
  back to and to type the command.

I then checked whether anything in the *automatic* execution path — `bin/autonomous/auto-runner.js`
(the wave executor), `bin/autonomous/stuck-monitor.js`, or `bin/engine/verification-runner.js`
(the module the diagram's own "Verification" box names) — calls `HindsightInjector` or transitions
`auto-state.json` to `awaiting_regeneration` on its own:

```
grep -n "hindsight\|awaiting_regeneration\|rollback" bin/autonomous/stuck-monitor.js   # no matches
grep -n "hindsight\|awaiting_regeneration\|rollback" bin/engine/verification-runner.js  # no matches
grep -n "hindsight\|awaiting_regeneration" bin/autonomous/auto-runner.js
  # bin/autonomous/auto-runner.js:719 — 'hindsight_injected' appears only inside a list of
  # STATE_CHANGING_EVENTS the runner *reacts to generically*; it is never the caller that produces
  # that event.
```

So: **there is no code path from "verification failed" to "rollback triggered" that runs without a
human or agent explicitly invoking the dashboard endpoint or the CLI subcommand with a specific
`auditId`.** `tests/temporal-integrity.test.js`, the test whose name is closest to this diagram,
confirms this scope itself in its own header comment (`tests/temporal-integrity.test.js:17-20`):
*"this is a CORRECTNESS suite, not an authenticity one"* — it pins `_verifyMetadata`/`rollbackTo`
HMAC-comparison bugs (a UTF-16-vs-byte-length mismatch, CRYPTO-01), not whether the rollback is
ever reached automatically. Nothing else in `tests/` asserts a call-site relationship between
verification failure and `HindsightInjector`.

**This is not a claim that the diagram is false** — MindForge's own `.claude/CLAUDE.md` describes
this exact loop as a protocol a human/agent *follows*, not an automated engine behavior, and the
diagram doesn't literally say "automatic." But the *visual shape* (two parallel boxes under one
verification step) reads as symmetric automation to a skimming reader, and nothing in the repo
would catch it if a future edit changed the wording to imply the fail branch runs on its own —
because nothing currently pins what the fail branch's trigger condition actually is.

### 2.4 Install-speed number — `README.md:112-113`

> "finishes in well under 10 seconds (measured: ~5.4s locally) — reproduce with `time npx
> mindforge-cc@latest --claude --local`"

No test category for this exists at all: `ls tests/ | grep -i "perf\|bench\|speed\|timing"` returns
nothing, and no `process.hrtime`/timing-assertion pattern appears in any `tests/*.js` file. The
claim is self-reproducing (it prints the exact command to re-time it) and hedged with "well under
10 seconds," which is the actual load-bearing claim — "~5.4s" is a specific data point inside that
hedge, not the assertion itself. I did not re-run the timing command in this session (it would
install into a scratch directory and is a live-network operation outside this investigation's
scope), so I'm not verifying or disputing the number itself — only confirming that no automated
guard exists for either the specific figure or the "well under 10 seconds" envelope.

### 2.5 GitHub topics list — not a README claim; not in README.md at all

The commit message (`git show 423df3a8`) describes changing the *repository's* GitHub topics
(removing `compliance-gates`, `autonomous-execution`; adding `claude`, `subagents`, `multi-agent`,
`npm`), but this is GitHub repository metadata, not content in `README.md` or any tracked file —
`grep -rn "compliance-gates\|autonomous-execution" .github/` and a repo-wide grep for `topics:`
both return nothing. I fetched the live value directly rather than trusting the commit message:

```
$ gh api repos/sairam0424/MindForge --jq '.topics'
["agent-orchestration","agent-skills","agentic-workflows","ai-agents","anthropic","antigravity",
 "automation","claude","claude-code","claude-code-plugin","cli","developer-tools","governance",
 "llm","mcp","model-context-protocol","multi-agent","npm","software-engineering","subagents"]
```
(fetched 2026-09-22, `https://api.github.com/repos/sairam0424/MindForge`) — confirms `claude`,
`subagents`, `multi-agent`, `npm` are present and `compliance-gates`/`autonomous-execution` are
absent, matching the commit message. **This claim is currently true**, but it is structurally
different from the other four: there is no repo file to regex, so `npm test` cannot guard it at
all without a new network+auth-dependent CI job that calls the GitHub API — a materially bigger
addition than a `doc-count-claims.test.js` entry, and one that would need its own credential/rate-
limit handling. I'm flagging it as out of scope for the two recommendations below, not silently
dropping it.

## 3. Recommendation: which 1-2 to guard, and what the test would assert

Ranked by (a) how likely the claim is to drift silently, using this project's own documented
history of drift as the base rate, and (b) how cheap the fix is given infrastructure that already
exists.

### Pick #1 (highest value): the hero-line count string — `README.md:28`

> `221 commands · 355 skills · 216 personas · 164 subagents · 35 workflows`

This is structurally the *exact* failure class `doc-count-claims.test.js` was written to close —
its own header names "~130 workflows → actual 221" and "~200 skills → actual 232" as the drifts
that motivated the file (`tests/doc-count-claims.test.js:10-19`). This line aggregates five
independently-changing counts into one string, sits immediately under the hero tagline (the first
thing any reader sees), and today has **zero** dedicated regex — none of the 15 `CLAIMS` entries
touch it. I independently re-measured all five numbers this session and every one currently
matches:

| Stated | Measured | How |
|---|---|---|
| 221 commands | 221 | `git ls-files '.claude/commands/mindforge/*.md' \| wc -l` |
| 355 skills | 355 (232+123) | `.mindforge/skills/*/SKILL.md` (232) + `.agent/skills/*/SKILL.md` (123) |
| 216 personas | 216 | `.mindforge/personas/*.md` (217) minus `overrides/README.md` (1) |
| 164 subagents | 164 | `subagents/categories/**/*.md` minus `README.md` files |
| 35 workflows | 35 | `.mindforge/dynamic-workflows/scripts/*.js` at depth 1 |

So nothing is wrong *today* — the risk is future drift, exactly like the AGENTS.md examples the
file already cites. Concretely, add one `CLAIMS` entry (or five, one per number, all anchored to
the same line so a partial edit can't slip through) following the file's existing pattern:

```js
{ file: 'README.md', what: 'hero-line command count', re: /(\d+) commands · \d+ skills/, expect: () => MEASURED.commands() },
{ file: 'README.md', what: 'hero-line skill count',    re: /\d+ commands · (\d+) skills/, expect: () => MEASURED.engineSkills() + MEASURED.extendedSkills() },
{ file: 'README.md', what: 'hero-line persona count',   re: /· (\d+) personas/, expect: () => MEASURED.personas() },
{ file: 'README.md', what: 'hero-line subagent count',  re: /· (\d+) subagents/, expect: () => MEASURED.subagents() },  // MEASURED.subagents already exists, :82
{ file: 'README.md', what: 'hero-line workflow count',  re: /· (\d+) workflows/, expect: () => MEASURED.dynamicWorkflows() },
```

`MEASURED.subagents` already exists (`tests/doc-count-claims.test.js:82`); `MEASURED.commands`,
`MEASURED.personas`, `MEASURED.extendedSkills`, and `MEASURED.dynamicWorkflows` would be four new
one-line functions using the exact `trackedCount()`/glob pattern the file already uses for
everything else (§ shown above, all confirmed against `git ls-files`). This is the cheapest of the
two picks to add and reuses 100% of the file's existing machinery.

### Pick #2 (highest signal, different shape): the Temporal-rollback diagram's fail-branch trigger

Because this is a *behavioral* claim ("the fail branch runs after verification fails"), not a
number, it cannot be a `CLAIMS`-array regex-vs-count entry — it needs the same shape as the file's
other structural gates (§1.B), asserting a **relationship in the source**, not a count. Concretely:

```js
test('README "Temporal rollback" diagram does not overstate automation: rollback still has ' +
     'exactly its two known manual entry points, and no automatic caller has been added', () => {
  const dashboardCallers = trackedCount(...); // or a direct grep, see below
  const injectCallSites = [];
  for (const rel of ['bin/dashboard/temporal-api.js', 'bin/engine/temporal-cli.js']) {
    if (read(rel).includes('HindsightInjector.inject(')) injectCallSites.push(rel);
  }
  // 1. The two known, human/agent-triggered entry points must still exist —
  //    if either is deleted, the README's fail-branch claim becomes unreachable, not just unproven.
  assert.deepStrictEqual(injectCallSites.sort(),
    ['bin/dashboard/temporal-api.js', 'bin/engine/temporal-cli.js']);

  // 2. No AUTOMATIC caller may exist without a matching README correction. If auto-runner.js,
  //    stuck-monitor.js, or verification-runner.js ever start calling HindsightInjector directly,
  //    that is a real behavior change the README's diagram should then describe accurately as
  //    automatic — this assertion exists to force that conversation, not to forbid the change.
  for (const rel of ['bin/autonomous/auto-runner.js', 'bin/autonomous/stuck-monitor.js',
                      'bin/engine/verification-runner.js']) {
    assert.ok(!read(rel).includes('HindsightInjector'),
      `${rel} now calls HindsightInjector directly — the README "How it fits together" diagram's ` +
      'fail branch (Temporal rollback -> awaiting_regeneration -> re-trigger) is drawn symmetrically ' +
      'with the automatic pass branch; if this became true, the diagram would be accidentally right ' +
      'and this test should be updated to confirm it — but today it flags a real behavior change ' +
      'instead of a silent one.');
  }
});
```

This test does not fail today (I confirmed both properties hold), and its purpose is different
from Pick #1's: it doesn't guard a number, it guards an *architectural assumption* the README's
diagram currently rests on — one this project's own `.claude/CLAUDE.md` independently corroborates
by describing the Temporal loop as something an agent *does* via the dashboard, not something the
engine does to itself. If that assumption ever silently flips (a future PR wires the rollback into
the automatic verification-failure path, or removes one of the two manual entry points), this is
the only mechanism that would catch it before a reader's mental model of the diagram goes stale.

## 4. What I did not do

- Did not add either test — this document is investigation-and-recommendation only, per the task.
- Did not re-time the install command (§2.4) — flagged as untested infrastructure, not verified or
  disputed as a number.
- Did not evaluate the audit-chain badge's or cross-review row's *adjectives* ("verified",
  "4-voice", "Two-model") beyond confirming the paths/commands they cite exist and the underlying
  mechanisms run — a deeper semantic audit of those adjectives against `bin/engine/council-runtime.js`'s
  actual voice count, for instance, was out of scope for a coverage-gap survey and would need its
  own pass.
- Did not propose changing any README wording. Every number I independently measured in §2 and §3
  currently matches what's stated; nothing here is a correction, only a gap in what would catch a
  future one.
