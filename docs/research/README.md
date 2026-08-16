# Research — codebase index and v12 upgrade study

Multi-agent research conducted 2026-08-15/16 against `f7b9e180` (v11.9.1). Two workflows,
57 agents, 0 errors. Every internal claim is anchored to `path:line` and was verified on that
checkout; external claims carry a source URL.

## Tracked here (reviewable deliverables)

| File | What it is |
|---|---|
| `2026-08-codebase-index.md` | Definitive index of the codebase: architecture, 20-subsystem reference, execution model, data/state inventory, extension points, security posture, ranked findings, navigation map. From 17 subsystem readers + 6 adversarially-verified cross-cutting themes + 2 completeness critiques (644 files read). |
| `2026-08-v12-upgrade-report.md` | Upgrade study: what changed in the ecosystem, ship-blockers, 62 scored proposals (impact/effort/risk/breaking/depends-on), an adopt-native list, an honesty ledger, a what-to-delete list, and an explicit **do-not-do** list. From 9 external research axes (208 findings, 160 searches) + 5 internal miners + 5 adversarial critiques of 80 raw proposals. |
| `2026-08-v12-upgrade-plan.md` | The approved phased implementation plan: v11.9.2 patch → v12.0 enforcement+honesty → v13.0 engines+structure+data, with locked product decisions, guardrails, and reuse notes. |
| `../architecture/mindforge-architecture.excalidraw.clipboard.json` | Excalidraw clipboard payload of the verified architecture. Paste into an existing canvas: `Esc` → press `1` (Selection tool) → click empty canvas → `Cmd+V`. Re-copy with `cat <file> \| pbcopy`. |

**Not published to npm.** `package.json` `files[]` enumerates only six specific `docs/*.md`
files plus `docs/References/` and `docs/Templates/`, so nothing in `docs/research/` ships.

## Not tracked (raw agent output)

Under `scratch-pad/research/` — inside the repo, but gitignored (`.gitignore:2`) because it is
~1.2 MB of intermediate agent output, not reviewable prose:

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
- **The diagram is not currently regenerable.** The generator script that produced the
  Excalidraw payload was lost to a `/tmp` clean; the payload itself is intact and pasteable.
- **Unresolved and flagged rather than papered over:** PreToolUse hook timeout fail-open vs
  fail-closed semantics (two probes on build 2.1.233 disagree), and whether `SubagentStart`
  fires for workflow-spawned agents.
