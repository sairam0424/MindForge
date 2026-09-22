# MindForge Architecture Overview

MindForge (current package version 11.9.8) is a Node.js runtime under `bin/` that reads
declarative specs under `.mindforge/` and `.claude/`/`.agent/`, and writes state under
`.planning/`. This file is a codemap of what's actually there — for the full task lifecycle,
config hierarchy, and the two single-sources-of-truth this repo enforces, see the root
[`CLAUDE.md`](../../CLAUDE.md), which this file links to rather than duplicates.

Historical "Pillar" numbering (FIM/CADIA/PAR/ZTS/ZTAI/ADS) that used to appear here referred to
development-era milestones, not live subsystems with that shape today. See
[*What is actually enforced*](../../README.md#what-is-actually-enforced) in the root README for
the measured, per-feature status of what's simulated versus real.

---

## Four layers

1. **Interface** (`.claude/`, `.agent/`) — the 221 `/mindforge:*` slash commands
   (`.claude/commands/mindforge/*.md`) and the two hook configs (`.claude/settings.json` for real
   Claude Code events, `.agent/settings.json` for the Gemini-CLI/Antigravity mirror). These two
   configs must be kept in sync.
2. **Engine specs** (`.mindforge/`) — declarative content published in the npm package:
   `engine/` (spec docs), `skills/` (232 engine-tier `SKILL.md`), `personas/` (216),
   `config.json` (runtime knobs). Edit behavior here, not in code, where possible.
3. **Execution** (`bin/`, ~32K raw / ~25K stripped-of-comments LOC) — the Node runtime that
   actually runs. See the domain breakdown below.
4. **Persistence** (`.planning/`) — `STATE.md`, `HANDOFF.json` (resumable), `AUDIT.jsonl`
   (tamper-evident, gitignored), `history/` snapshots.

---

## `bin/` domain breakdown

| Domain | What lives there |
| :--- | :--- |
| `autonomous/` | Wave executor, `auto-runner.js` (the `/mindforge:auto` engine), stuck-detection, repair, Temporal snapshot capture/rollback (`hindsight-injector.js`) |
| `engine/` | `council-runtime.js` (4-voice decision council), `nexus-tracer.js`, `verification-runner.js`, `temporal-hindsight.js`, `otel-exporter.js` |
| `memory/` | Knowledge graph, vector hub, RRF fusion, embedding, instinct capture |
| `governance/` | `policy-engine.js`, `audit-hash.js` / `audit-verifier.js` (the audit hash-chain), `rbac-manager.js`, `quantum-crypto.js` (simulated), `ztai-manager.js` |
| `models/` | Provider clients (Anthropic/OpenAI/Gemini/Bedrock/Ollama) and `pricing-registry.js` |
| `dashboard/` | Express + SSE server, port 7339, `frontend/` |
| `security/` | `trust-boundaries.js`, `trust-gate-hook.js` |
| `browser/` | Playwright-backed QA daemon (loopback-only) |
| `eval/` | Retrieval/golden-set evaluation harness |
| `review/` | `cross-review-engine.js` (two-model adversarial PR review) |
| `installer/`, `wizard/` | The `npx` install flow, hook registration, interactive setup wizard |
| `revops/`, `learning/`, `research/`, `updater/`, `workflows/`, `worktree/`, `sre/`, `migrations/`, `skills-builder/`, `hooks/`, `utils/` | Narrower, single-purpose domains — see each directory's own files for detail |

**Two single-sources-of-truth, do not bypass:**
- **Audit hash-chain:** `bin/governance/audit-hash.js` is the only canonical SHA-256 hasher; both
  the writer (`bin/autonomous/audit-writer.js`) and verifier (`bin/governance/audit-verifier.js`)
  use it. `.planning/AUDIT.jsonl` links entries via `previous_hash` — a hash chain, not a Merkle
  tree (no hash tree, no inclusion proof).
- **Pricing:** `bin/models/pricing-registry.js`; every provider calls `priceCall()`. No provider
  hardcodes a per-model price.

---

## Task lifecycle (the core control flow)

command/plan → pre-flight → skill loader (trigger-match → tier-prioritize Project > Org > Core →
resolve `compose:` deps) → context injector (≤60K tokens) → cost router (difficulty →
Haiku/Sonnet/Opus/Gemini tier) → fresh-context subagent (implement → self-verify → commit) →
verification (build/typecheck/lint/test/security/diff) → stuck detection → instinct capture →
handoff (`HANDOFF.json` + `AUDIT.jsonl`).

---

## Decision records

- **ADR Index**: [decision-records-index.md](./decision-records-index.md)
