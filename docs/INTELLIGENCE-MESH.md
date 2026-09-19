# MindForge Memory Federation

Earlier versions of this page described a "Federated Intelligence Mesh" with hardware-attested
(HSM) mesh operations, quantum-safe signatures protecting "future cryptographic threats," and
peer agents that "proactively home in" to heal each other's reasoning drift. Most of that is
either simulated or was itself found to be fabricated in the code it describes — see the caveats
below.

## What's real

- **`bin/memory/federated-sync.js`** — a real client for syncing local knowledge with a
  configurable "Enterprise Intelligence Service" endpoint (`eis-client.js`), with a circuit
  breaker and a similarity-tiered conflict resolver. No-ops when no endpoint is configured.
- **`bin/memory/vector-hub.js`** — the real, unified `sql.js` (WASM SQLite) store backing traces,
  skills, and remediations. Zero native dependencies. This is what "Unified Persistence" refers
  to in practice.
- **`bin/engine/skill-evolver.js`** — a real, tested module that mines traces for candidate
  skills. As of this writing it has zero production callers — it's not wired into any live
  command path yet.
- **Identity signing on the parts of the chain that are live** uses real Ed25519
  (`bin/governance/ztai-manager.js`), not post-quantum crypto.

## What's simulated or was found to be fabricated

- **"Hardware Attestation" / HSM-gated mesh operations**: no HSM or hardware-attestation code
  exists anywhere in `bin/`. Treat as aspirational.
- **"Quantum-Safe Trust" / lattice-based mesh signatures**: `bin/governance/quantum-crypto.js`
  self-labels this SIMULATED and off the live trust path by default.
- **Mesh self-healing "peer agents proactively home in"**: `bin/autonomous/mesh-self-healer.js`'s
  own code comments disclose that an earlier version of this module *fabricated* a hardcoded
  multi-peer consensus (canned `confidence: 94`, a logged "100% agreement") when no real peer
  mesh existed. It has since been fixed to degrade honestly to a single-source, null-confidence
  advisory when there's no live peer to consult — which, in a single-node setup, is effectively
  always. If you're relying on "proactive mesh healing" as a real distributed capability, verify
  you actually have multiple registered peers first.

If you need real cross-team memory federation today, `federated-sync.js` + a real EIS endpoint is
the honest starting point — everything past that is either not yet wired or explicitly a
simulation.
