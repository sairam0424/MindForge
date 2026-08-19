# Harness Adapter Compliance Matrix

> Generated/validated by `bin/installer/harness-adapter-compliance.js`. The
> matrix block below is rendered from `ADAPTER_RECORDS` — do NOT hand-edit it.
> Run `node bin/installer/harness-adapter-compliance.js --check` (wired into CI)
> to verify this doc has not drifted from the records. Regenerate with
> `node bin/installer/harness-adapter-compliance.js > /tmp/m && ` paste the block.
>
> `--check` only compares this doc against `ADAPTER_RECORDS`. It cannot tell you
> whether a record is TRUE. `tests/harness-emitted-tree.test.js` does that: it
> installs all six harnesses into confined temp dirs and asserts each record's
> `install_claims` against the tree the installer really writes.

## Compliance States

| State | Meaning |
| --- | --- |
| Native | MindForge can install or verify the surface directly for this harness. |
| Adapter-backed | MindForge has a thin adapter/transform surface, but parity differs by harness. |
| Instruction-backed | MindForge can provide guidance and files, but the harness does not expose the runtime hook/slash surface MindForge needs for enforcement. |
| Reference-only | Useful as design pressure or external runtime, but MindForge does not ship a direct installer/adapter for it. |

## Support Matrix

<!-- harness-adapter-compliance:matrix-start -->
| Harness or runtime | State | Supported assets | Unsupported or different surfaces | Install or onramp | Verification command | Risk notes |
| --- | --- | --- | --- | --- | --- | --- |
| Claude Code | Native | skills; commands (slash); hooks (scripts + registered settings.json); subagents; personas; docs references and templates; memory and plugin specs | Claude-native hooks do not imply parity in other harnesses; No MCP config: the installer writes no .mcp.json and no mcpServers key for ANY harness — the only mcpServers strings in an emitted tree are inside two content files (.mindforge/schemas/plugin.schema.json and .claude/agents/scientific-literature-researcher.md); The three .agent/forge commands overwrite their same-named .agent/mindforge counterparts, so the flat command dir holds 221 files rather than 224 | `npx mindforge-cc@latest --claude --local`; Claude plugin install | `node bin/harness-audit.js`; `node tests/harness-emitted-tree.test.js` | Do not load every skill by default; keep hooks opt-in and inspectable. |
| Antigravity (Gemini) | Adapter-backed | skills; commands (namespace:prefix, .agents/workflows/); hooks (scripts only, unregistered); personas; docs references and templates; memory and plugin specs; subagents via the shared .claude/ mirror | Command naming uses mindforge: namespace prefix; hook parity differs from Claude; No .agents/settings.json is written, so the 11 copied hook scripts are inert — REG-01 registers claude + local only (bin/installer/hook-registration.js); No .agents/rules directory and no MCP config are emitted | `npx mindforge-cc@latest --antigravity --local` | `node bin/harness-audit.js`; `node tests/harness-emitted-tree.test.js` | Keep the .agent settings mirror in sync with .claude (Gemini mirror is live, not dead). |
| OpenCode | Adapter-backed | skills; commands (slash); hooks (scripts only, unregistered); personas; docs references and templates; memory and plugin specs; subagents via the shared .claude/ mirror | Event names and command dispatch differ from Claude Code; No .opencode/settings.json is written, so the 11 copied hook scripts are inert — REG-01 registers claude + local only; No MCP config and no OpenCode-shaped event-adapter files are emitted; the copied hooks are the unmodified Claude scripts | `npx mindforge-cc@latest --opencode --local` | `node bin/harness-audit.js`; `node tests/harness-emitted-tree.test.js` | Keep hook logic in shared scripts; adapt only event shape at the edge. |
| Gemini CLI | Instruction-backed | project-local instructions (GEMINI.md); skills; commands (slash); hooks (scripts only, unregistered); personas; docs references and templates; memory and plugin specs; subagents via the shared .claude/ mirror | No full hook parity; ports must document drift; No .gemini/settings.json is written, so the 11 copied hook scripts are inert — REG-01 registers claude + local only; No .gemini/rules directory and no MCP config are emitted | `npx mindforge-cc@latest --gemini --local` | `node bin/harness-audit.js`; `node tests/harness-emitted-tree.test.js` | Treat Gemini ports as ecosystem adapters until validated end-to-end inside Gemini CLI. |
| Cursor | Instruction-backed | Cursor rules (commands rendered into .cursor/rules/); project-local skills; instruction entry file (.cursorrules); hooks (scripts only, unregistered); personas; docs references and templates; memory and plugin specs; subagents via the shared .claude/ mirror | No slash-command surface (supportsSlash:false); hook events differ from Claude; No .cursor/settings.json is written, so the 11 copied hook scripts are inert — REG-01 registers claude + local only; No MCP config is emitted | `npx mindforge-cc@latest --cursor --local` | `node bin/harness-audit.js`; `node tests/harness-emitted-tree.test.js` | Cursor adapters must preserve existing project rules and avoid silent overwrite. |
| GitHub Copilot | Instruction-backed | copilot-instructions.md entry (project root and .github/); commands as instruction files (.github/copilot-instructions/mindforge/); shared .mindforge/ framework tree (identical for every harness); subagents and command copies via the shared .claude/ mirror | No slash-command surface (supportsSlash:false); no native hook enforcement; Receives NO harness-surface skills, hooks, personas, docs, memory or plugin assets: the copilot RUNTIMES entry (bin/installer-core.js:89-96) declares no skillsSubdir/hooksSubdir/personasSubdir/docsSubdir/memorySubdir/pluginsSubdir, and bin/installer-core.js:614-616 copies an asset only when its subdir key is set; No .github/settings.json and no MCP config | `npx mindforge-cc@latest --copilot --local` | `node bin/harness-audit.js`; `node tests/harness-emitted-tree.test.js` | Copilot has no runtime hook surface AND receives no hook files at all; do not add a Copilot contract for skills or hooks without evidence of a layout Copilot reads, or the install fails open again. |
| Terminal-only | Native | skills; rules; commands; bin/ scripts; harness audit | No external UI; no automatic session control unless scripts run explicitly; .planning/AUDIT.jsonl is gitignored and absent from a fresh clone — it is created by the first audited run, not shipped | Clone repo; run bin/ commands directly; use --local for project installs | `node bin/harness-audit.js`; `node tests/run-all.js` | This is the fallback contract; every higher-level adapter should degrade to it. |
<!-- harness-adapter-compliance:matrix-end -->

## The shared `.claude/` mirror is deliberate

Every **non-claude** local install also writes a `.claude/` tree into the project.
It is not a leak and not a duplicate of the Claude install: it is a deliberate
cross-IDE mirror of exactly two asset kinds, added at
`bin/installer-core.js:584-591` (commands — "Mirror to .claude/commands for
cross-IDE compatibility (Cursor/Windsurf/Claude Code)") and
`bin/installer-core.js:650-653` (subagents — "Mirrored to .claude/agents/ for
non-claude local runtimes"). Both blocks are gated on
`scope === 'local' && runtime !== 'claude' && !selfInstall`.

Because it is copied from the same sources by the same code for every harness, it
is **byte-identical** across all five non-claude runtimes — verified by comparing
the SHA-256 of the sorted per-file digest list, not by comparing counts.

<!-- harness-adapter-compliance:mirror-start -->
Measured on a `git clone --no-hardlinks` of the tree at commit `963902d`, one
`node bin/install.js --<runtime> --local` per harness into a fresh `mktemp -d`
with `HOME` confined to a second fresh `mktemp -d`:

- shared `.claude/` mirror: **388 files / 1542917 bytes**, identical for
  antigravity, cursor, opencode, gemini and copilot.
- it contains **only** `commands/` (224: 221 from `.agent/mindforge` plus 3
  namespaced under `commands/forge`) and `agents/` (164 subagents).
- it contains **no** `skills/`, `hooks/`, `personas/`, `docs/`, `memory/`,
  `plugins/` or `settings.json` — so a Copilot install, whose own `.github/` tree
  gets none of those either, receives **zero skills on any surface Copilot itself
  reads**: `.github/skills/` and `.claude/skills/` are both empty.
- that is NOT the same as receiving no skills. Measured on the same install, the
  shared `.mindforge/` tree carries **232 `SKILL.md` files (322 files) under
  `.mindforge/skills/`** and **218 files under `.mindforge/personas/`**, and it is
  copied identically to every harness. Those are read by the MindForge runtime in
  `bin/`, not by Copilot. An earlier draft of this document said Copilot "receives
  zero skills in total", which was false in the direction that matters: it would
  have sent someone to deliver assets that are already there, instead of to the
  real gap, which is that no Copilot-readable surface is populated.
- the Claude install's own `.claude/` is a different, larger tree, and it alone
  holds `settings.json`. No absolute file count is quoted for it on purpose: the
  installer's own memory loader can create gitignored files under the source
  `.mindforge/memory/` (`pattern-library.jsonl`, `sync-manifest.json`), which then
  get copied on, so a Claude install measures 973 files from a clean clone and 975
  from a checkout somebody has already installed from. The gate therefore asserts
  the relationship — larger than the mirror, different fingerprint, has a
  `settings.json` — rather than a number that is not reproducible in CI.
<!-- harness-adapter-compliance:mirror-end -->

The byte figure moves whenever a command or subagent file changes, because the mirror is a copy
of `commands/` and `agents/`. It dropped from 1542924 to 1542917 when the audit-chain wording sweep
edited seven `.claude/commands/mindforge/*.md` files — a net 7 bytes. That is the gate working: a
document stating a MEASURED size goes stale the moment content changes, and the test catches it
rather than letting the number rot.

The **mirror size** in that block — `388 files / 1542917 bytes` — is asserted
against a real install by `tests/harness-emitted-tree.test.js`, so editing either
the doc or the installer without the other turns the suite red. The 973/975
figures in the last bullet are explanatory only and deliberately unasserted; they
are the reason no claude count is pinned.
