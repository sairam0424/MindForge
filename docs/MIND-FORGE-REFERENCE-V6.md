# MindForge Reference Guide — superseded

This page (titled "v6.2.0-alpha") predates the current v11.9.x line and its "How to Test"
instructions no longer match real behavior (e.g. `/mindforge:status` does not report
"Sovereign: Manifested"; the PQAS/quantum-crypto "test" invokes a module that
self-labels as SIMULATED and gated off the live trust path by default; `node
bin/spawn-agent.js identity` is a documented stub, not a working command). Rather than maintain
a second, drifting copy of the command/persona/skill/hook reference, use the maintained sources:

- **Commands**: [docs/commands-reference.md](commands-reference.md)
- **Personas**: [docs/PERSONAS.md](PERSONAS.md)
- **Skills**: [docs/References/skills-api.md](References/skills-api.md)
- **Hooks**: what's actually enforced, per install channel — see the root
  [README](../README.md#what-is-actually-enforced)
- **Workflows**: [docs/workflow-atlas.md](workflow-atlas.md)
