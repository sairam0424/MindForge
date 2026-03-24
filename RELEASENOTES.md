# MindForge v2.1.1 — Core Migration & Persona Expansion

## Top Summary

MindForge v2.1.1 is a major structural update that finalizes the migration of the GSD framework into the MindForge ecosystem. This release establishes a unified `.agent/` asset structure, expands the persona count from 8 to 32+, and hardens the 4-pillar workflow (`plan`, `execute`, `verify`, `ship`) for enterprise-scale AI orchestration.

## Highlights

- **Unified .agent/ Structure**: 120+ framework assets consolidated for maximum compatibility across Claude Code, Antigravity, and Cursor.
- **32-Persona Expansion**: Integrated advanced personas including `advisor-researcher`, `nyquist-auditor`, and `ui-auditor`.
- **Zero-Watermark Integrity**: 100% removal of legacy rebranding fragments across the entire core and documentation.
- **Enterprise Manifest**: Single source of truth via `file-manifest.json` for multi-project codebase intelligence.
- **Hardened Governance**: Unified settings and non-bypassable quality gates across all runtimes.

## Developer Experience

- **Consolidated Documentation**: Modernized guides for Skills Authoring, Architecture, and Persona-based engineering.
- **Enhanced Hooks**: New lifecycle hooks for better context monitoring and real-time status reporting.
- **Command Parity**: Full support for `/mindforge:browse`, `/mindforge:remember`, and `/mindforge:costs`.

## Quality & Stability

- **Grep-Audit Verified**: Verified zero residual branding through recursive deep scanning.
- **Path-Aligned Workflows**: All 60+ workflows now strictly follow the v2.1.1 directory standards.
- **Cross-IDE Tested**: Core features validated across multiple AI-native IDE runtimes.

## Getting Started

- Install: `npx mindforge-cc@latest --claude --local`
- Verify Health: `/mindforge:health`
- Docs Entry: `README.md`

## Upgrade Notes

- Projects on v1.0.0 or v2.0.0 should run `/mindforge:migrate` to align with the new path standards.
- Residual custom skills in legacy folders may need manual relocation to `.agent/skills/`.

## Breaking Changes

- Legacy `.agent/workflows` (without YAML frontmatter) is no longer automatically registered in Antigravity mode.
- See `docs/upgrade.md` for detailed migration paths.
