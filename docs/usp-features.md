# MindForge — Key Features

This page used to describe MindForge as a "Sovereign Agentic OS" with 16 "Pillars of Celestial
Intelligence," CADIA, PQAS, and hardware-attested biometric gates. None of that is real —
`SwarmController`, `PersonaFactory`, and `WaveExecutor` are role names in markdown specs, not
importable code; the "Post-Quantum Agentic Security" and "Sovereign Reason Enclave" modules are
explicitly self-labeled SIMULATED in their own source (`bin/governance/quantum-crypto.js`,
`bin/governance/ztai-manager.js`), gated off the live trust path by default; and no biometric or
HSM-backed gate exists anywhere in `bin/`. See *What is actually enforced* in the root
[README](../README.md) for the same honesty pass applied to the whole project.

What follows is what's actually shipped, in the same "measured, not asserted" spirit.

## Governance you can verify

- **File-driven behavior.** Commands, skills, and personas are markdown the model reads and acts
  on — advisory by design, auditable like any other file in the repo.
- **A real, tamper-evident audit log.** `.planning/AUDIT.jsonl` is a SHA-256 hash chain -- not a Merkle tree (no hash tree, no inclusion proof; that terminology has been retired),
  verifiable with `node bin/verify-audit.js`.
  It detects mutation and mid-file deletion; it does not detect tail truncation, and it is not
  rotated (an earlier rotation mechanism broke the chain and was removed — the file grows
  unbounded by design).
- **Hooks that can actually block a tool call, on Claude Code.** See *What is actually enforced*
  in the README for the exact current state per install channel.
- **Real Ed25519 signing** for the parts of the trust chain that are live (`ztai-manager.js`).
  Post-quantum signing is an explicitly-simulated, opt-in demo, not a production security
  boundary.

## Execution

- **Slash-command lifecycle**: `/mindforge:init-project` → `/mindforge:plan-phase` →
  `/mindforge:execute-phase` → `/mindforge:verify-phase` → `/mindforge:ship`. Each step is a
  markdown prompt the assistant follows using its own tools against `.planning/` state files.
- **35 dynamic multi-agent workflows** (`.mindforge/dynamic-workflows/`), invoked via the
  `wf-*` slash commands or `node bin/mindforge-cli.js workflow run <name>` — these are real,
  executable Node scripts, not prose.
- **A council command** (`/mindforge:council`) that runs a real 4-voice (architect/skeptic/
  pragmatist/critic) model debate via `bin/engine/council-runtime.js`.

## Memory

- **A local-first knowledge store and graph** (`bin/memory/`) with TF-IDF/BM25 retrieval and a
  unified SQLite store (`sql.js`, zero native deps) for traces, skills, and remediations.
- **`mindforge-sdk`** exposes a standalone, dependency-free client for reading project state and
  the knowledge graph (`MindForgeClient`, `MindForgeMemory`) — see
  [docs/References/sdk-api.md](References/sdk-api.md).

## Observability

- **A local dashboard** (`node bin/dashboard/server.js`, `127.0.0.1:7339`) — bearer-token
  auth, rate-limited, CSP-hardened — showing audit stream, cost/token usage, and project health.

## What's experimental or not wired up yet

Being direct about this rather than silent: the autonomous wave-execution engine
(`bin/autonomous/`), the FinOps/multi-cloud arbitrage layer, RBAC/ZTAI-archiver, and a few other
subsystems are fully built and unit-tested but not yet constructed from any live command path —
`/mindforge:auto` today is an LLM-interpreted markdown spec, not a call into that engine. If you
need one of these to be load-bearing, check `bin/` and the test suite before relying on it, or
open an issue.
