# Research — codebase index and v12 upgrade study

Multi-agent research conducted 2026-08-15/16 against `f7b9e180` (v11.9.1). Two workflows,
57 agents, 0 errors. Every internal claim is anchored to `path:line` and was verified on that
checkout; external claims carry a source URL.

## STATUS OF THIS SNAPSHOT — updated 2026-08-16

**These are dated snapshots of `f7b9e180`. They have not been rewritten.** Work has since
landed on branch `fix/v11.9.2-ship-blockers` (base `f7b9e180`, head `0174432`), so six
findings are superseded. Each of the three documents carries its own `STATUS OF THIS
SNAPSHOT` block naming the superseded claim, every `file:line` inside that document where it
appears, and the commit that fixed it. Read that block before acting on anything in the
body.

Four conventions were applied, and only these four:

| Class | Treatment |
|---|---|
| A superseded **finding** | named in that document's status block with its fixing sha; body text left intact |
| An **instruction** (Navigation Map rows, the plan's `Verification` blocks) | corrected in place — a status block cannot stop a contributor running a wrong command |
| An **error that was wrong when written** | corrected in place and marked `[corrected 2026-08-16]` |
| A **dangling `path:line` citation** | corrected in place — the citation is this corpus's own verification contract |

### Superseded across the corpus

| Finding | Fixed by |
|---|---|
| `RevOpsAPI` required but never mounted; `/api/revops` 404; even mounted it threw on the `{entries,total,limit,offset}` wrapper | `fe9390b` |
| Hindsight injection committed a hash-chained audit entry and flipped `auto-state.json` even when the rollback threw | `4b09f19` |
| CLI `defaultArgs` replaced rather than prepended | `37392d5` |
| `tests/run-all.js` discovery was a flat `readdirSync`; subdirectories invisible | `5177225` + `a9bdb0f` |
| Three state-destroying orphan suites reachable by one rename | `5177225` (deleted) |
| Live npm publish token in the working-tree `.npmrc` | `0174432` (revoked; scanning enforced) |

### Measured as of

`.planning/AUDIT.jsonl`, `.mindforge/celestial.db` and `.mindforge/metrics/*.jsonl` are
gitignored, append-only **local machine state**, so every count taken from them is a
timestamp and not a constant. That is why the index says **1907** audit entries (independent
Python re-derivation, 2026-08-15) while the report and plan say **1934**
(`node bin/verify-audit.js`, 2026-08-16). Neither is wrong; the log grew between the two
workflows. Re-measured 2026-08-16 on `0174432`: **`✅ audit chain valid: 2067 entries`**.
`celestial.db` is now **4,231,168 bytes** (the index's 64,933,888 was correct on 08-15;
1,381 `Synthesized Skill%` rows were purged locally since). `npm pack --dry-run --json
--ignore-scripts` -> `entryCount 1968`, unchanged. Full suite: **95 passed, 0 failed,
2 skipped, 97 total, 17,286 ms**.

## Tracked here (reviewable deliverables)

| File | What it is |
|---|---|
| `2026-08-codebase-index.md` | Definitive index of the codebase: architecture, 20-subsystem reference, execution model, data/state inventory, extension points, security posture, ranked findings, navigation map. From 17 subsystem readers + 6 adversarially-verified cross-cutting themes + 2 completeness critiques (644 files read). |
| `2026-08-v12-upgrade-report.md` | Upgrade study: what changed in the ecosystem, ship-blockers, 62 scored proposals (impact/effort/risk/breaking/depends-on), an adopt-native list, an honesty ledger, a what-to-delete list, and an explicit **do-not-do** list. From 9 external research axes (208 findings, 160 searches) + 5 internal miners + 5 adversarial critiques of 80 raw proposals. |
| `2026-08-v12-upgrade-plan.md` | The approved phased implementation plan: v11.9.2 patch → v12.0 enforcement+honesty → v13.0 engines+structure+data, with locked product decisions, guardrails, and reuse notes. |

### UNTRACKED — recommend committing

`../architecture/mindforge-architecture.excalidraw.clipboard.json` (45,741 bytes) is the
Excalidraw clipboard payload of the verified architecture. Paste it into an existing canvas:
`Esc` → press `1` (Selection tool) → click empty canvas → `Cmd+V`. Re-copy with
`cat <file> \| pbcopy`.

**It is NOT tracked.** `git status --porcelain docs/architecture/` reports `??` for it and
`git ls-files docs/architecture/` omits it, so the row above previously listed it under
"Tracked here" incorrectly. `[corrected 2026-08-16]`

**Recommendation: `git add` it.** Not because it is prose worth reviewing, but because it
cannot be reproduced — the generator script was lost to a `/tmp` clean (see *Known
limitations*), so this 45 KB blob is the only copy and one `git clean -xdf` destroys it
permanently. It does not enter the tarball: `package.json` `files[]` enumerates six named
`docs/*.md` files plus `docs/References/` and `docs/Templates/`, and `docs/architecture/` is
not among the 47 entries.

**Not published to npm.** `package.json` `files[]` enumerates only six specific `docs/*.md`
files plus `docs/References/` and `docs/Templates/`, so nothing in `docs/research/` ships.

## Not tracked (raw agent output)

Under `scratch-pad/research/` — inside the repo, but gitignored (`.gitignore:2`) because it is
1.7 MB of intermediate agent output (measured 2026-08-16, `du -sh scratch-pad/research`;
the earlier "~1.2 MB" was wrong and disagreed with `81aa95e`'s own commit message)
`[corrected 2026-08-16]`, not reviewable prose:

```
scratch-pad/research/
  2026-08-codebase-index/
    subsystem-maps-17.json                    17 structured subsystem maps
    completeness-critique-1.md                tree-coverage critic
    completeness-critique-2.md                contradiction-resolution critic
    theme-analyses-and-verifications.md       6 themes + 6 adversarial verifications
  2026-08-v12-upgrade/
    external-research-208-findings.json       9 axes, 208 findings, every one with a source URL
    proposals-raw-80.json                     all 80 pre-critique proposals (62 survived)
    internal-miners-5.md                      5 internal opportunity miners
```

These are the audit trail. Read them when you want to know *why* a conclusion in the tracked
documents survived, or what a critique rejected and on what evidence.

## Reading order

1. **`2026-08-v12-upgrade-plan.md`** — what to do, in what order. Start here.
2. **`2026-08-v12-upgrade-report.md`** §3 ship-blockers and §9 do-not-do — the highest-value
   sections. §9 exists because six reasonable-sounding modernisations were found to break
   things silently.
3. **`2026-08-codebase-index.md`** — the reference. Section 10 is a "if you want to change X,
   go to Y" table.

## Known limitations

- **No user telemetry was available.** Nothing here is grounded in what consumers actually
  use. Assume someone depends on current buggy behaviour.
- **Two claims in the index were later corrected** by the external research and are noted in
  the upgrade report's honesty ledger: `mindforge-mcp-server` and `mindforge-sdk` *are*
  published to npm, and MindForge does *not* advertise "HNSW: Enabled".
- **The npm token claim in the report and plan is stale, and any wording suggesting a public
  leak is wrong.** A live publish token existed only in the **gitignored, never-committed**
  working-tree `.npmrc`. Git history only ever held the `${NPM_TOKEN}` placeholder —
  independently re-verified 2026-08-16: `git log --all -p | grep -cE 'npm_[A-Za-z0-9]{36}'`
  = **0** across all **3,244** reachable commits. The token has been **revoked**, `.npmrc` is
  restored to the env-var form its own comments prescribed, and secret scanning is now
  enforced at three layers (`.gitleaks.toml`, `.husky/pre-commit`,
  `.github/workflows/secret-scan.yml`, self-tested by `scripts/ci/verify-secret-scan.sh`) —
  `0174432`. SEC-00 residue: adopt trusted publishing, add the post-publish provenance gate.
- **The diagram is not currently regenerable, and is untracked.** Commit it (see *UNTRACKED*
  above); it is the only copy. The generator script that produced the
  Excalidraw payload was lost to a `/tmp` clean; the payload itself is intact and pasteable.
- **Unresolved and flagged rather than papered over:** PreToolUse hook timeout fail-open vs
  fail-closed semantics (two probes on build 2.1.233 disagree), and whether `SubagentStart`
  fires for workflow-spawned agents.
