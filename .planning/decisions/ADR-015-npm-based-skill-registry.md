# ADR-015: npm as the MindForge Skills Registry

**Status:** Accepted
**Date:** 2026-03-21

## Context
MindForge needs a way to distribute community and organisation skills.
Options: custom registry server, GitHub releases, npm registry.

## Decision
Use the standard npm registry with `mindforge-skill-` package naming convention.

## Rationale
npm is the world's largest package registry with existing infrastructure for:
versioning, authentication, access control, search, and deprecation.
Building a custom registry duplicates all of this at significant cost.
The npm ecosystem's supply chain security tooling (npm audit, Dependabot,
Snyk) works natively. Private registries (Verdaccio, Artifactory, GitHub Packages)
are npm-compatible — organisations with private skills don't need separate tooling.

## Consequences
- Skill names follow npm conventions (lowercase, hyphens)
- Version management follows npm semver conventions
- Private skills require a compatible private npm registry
- The injection guard and validation pipeline are the primary
  supply chain security controls (npm audit is insufficient alone for SKILL.md content)
