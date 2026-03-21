# MindForge v1.0.0 — First Stable Public Release

## Top Summary
MindForge v1.0.0 is the first stable, production-ready release of the agentic delivery framework.
This release hardens installation, upgrades, and migrations for real-world team usage.
It adds a first-class plugin system, token optimization workflows, and a full public doc set.
Quality gates, security posture, and release readiness are documented for enterprise adoption.

## Highlights
- Production-grade installer with full install/update/uninstall/CI flows.
- Self-update system with changelog diffing and scope-preserving patches.
- Migration engine for schema evolution with safety backups and CI-safe behavior.
- First-class plugin system with schema, loader, and registry guidance.
- Token usage optimizer with measurement, baselining, and reduction playbooks.
- Complete public documentation hierarchy (reference, architecture, contributing, security).

## Developer Experience
- New user guide and end-to-end tutorial (install to advanced workflows).
- CI quickstart for real pipelines and troubleshooting for common issues.
- Upgrade guide, FAQ, and release checklist guide for release managers.
- Example starter project with MindForge structure ready for onboarding teams.

## Quality & Stability
- Day 7 production, migration, and e2e test suites added.
- Full 12-suite regression loop validated across prior-day coverage.
- Triple-run stability verification completed with all tests passing.
- Threat model and penetration test results documented.

## Getting Started
- Install: `npx mindforge-cc@latest --claude --local`
- Quick verify: `node tests/install.test.js`
- Docs entry point: `README.md`

## Upgrade Notes
- v1.0.0 formalizes the stable interface contract.
- Migration engine handles prior schema versions automatically.
- See: `docs/upgrade.md` and `.mindforge/production/migration-engine.md`.

## Breaking Changes
- None intended for users following the documented upgrade paths.
- If you are on pre-0.6.0 custom forks, review `docs/upgrade.md` before upgrading.
