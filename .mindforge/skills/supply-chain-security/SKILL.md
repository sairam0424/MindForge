---
name: supply-chain-security
version: 1.0.0
min_mindforge_version: 0.1.0
status: stable
triggers: supply chain security, dependency audit strategy, lockfile integrity verification, provenance verification, SBOM generation, sigstore signing, reproducible build, dependency scanning pipeline, package integrity check, npm audit strategy, supply chain attack prevention, software composition analysis
---

# Skill — Supply Chain Security

## When this skill activates
Any task involving dependency management, package auditing, build integrity,
software bill of materials, or defending against supply chain attacks.

## Mandatory actions when this skill is active

### Before making changes
1. Verify lockfile is committed and checksums match.
2. Run dependency audit (`npm audit`, `pip audit`, or equivalent).
3. Check for known malicious packages in the dependency tree.

### During implementation
- Pin all dependencies to exact versions in lockfiles.
- Pin CI actions to full SHA (not tags): `actions/checkout@abc123def`.
- Generate SBOM on every release build.
- Verify package provenance when available.
- Use minimal base images for containers (distroless/alpine).

### After implementation
- Confirm no new critical/high vulnerabilities introduced.
- Verify the build is reproducible (same source → same artifact).
- Ensure SBOM is attached to release artifacts.

## Core practices

### Lockfile Integrity
```bash
# Verify lockfile hasn't been tampered with
npm ci  # Uses lockfile exactly (fails if lockfile/package.json mismatch)

# Alert on unexpected lockfile changes in CI
git diff --name-only | grep -q "package-lock.json" && echo "LOCKFILE CHANGED"
```
- Always commit lockfiles (`package-lock.json`, `yarn.lock`, `pnpm-lock.yaml`).
- Use `npm ci` (not `npm install`) in CI — it respects the lockfile exactly.
- Review lockfile diffs in PRs (look for unexpected new packages or registry changes).

### Dependency Auditing
```bash
# Node.js
npm audit --audit-level=high
npx socket-security/cli scan

# Python
pip-audit
safety check

# Go
govulncheck ./...
```
- Run in CI on every PR (block on critical/high).
- Schedule weekly full audits for transitive dependency updates.
- Use Socket.dev or Snyk for behavioral analysis (detect install scripts, network access).

### SBOM Generation
```bash
# CycloneDX format (preferred for security)
npx @cyclonedx/cyclonedx-npm --output-file sbom.json

# SPDX format (preferred for compliance)
syft . -o spdx-json > sbom.spdx.json
```
- Generate on every release (attach to GitHub release, container image).
- Include direct AND transitive dependencies.
- Choose format: CycloneDX for security analysis, SPDX for license compliance.

### Provenance Verification
```bash
# npm provenance (verify publisher identity)
npm publish --provenance
npm audit signatures  # Verify all installed packages

# Container image provenance
cosign verify --certificate-identity=... --certificate-oidc-issuer=... image:tag
```
- Enable npm provenance on all published packages.
- Verify signatures of consumed packages in CI.
- Use Sigstore for keyless signing of artifacts.

### Reproducible Builds
- Pin ALL dependencies (including transitive) via lockfile.
- Pin build tool versions (Node.js via `.nvmrc`, Go via `go.mod`).
- Use deterministic build flags (no timestamps in artifacts).
- Verify: build twice from same source → compare artifact hashes.

### CI/CD Hardening
```yaml
# Pin actions to SHA, not tag
- uses: actions/checkout@8ade135a41bc03ea155e62e844d188df1ea18608  # v4.1.0

# Minimal permissions
permissions:
  contents: read
  packages: write

# Restrict network in build steps
# Use dependency caching to reduce fetch surface
```

## Threat vectors to defend against

| Attack | Defense |
|--------|---------|
| Typosquatting | Verify package name carefully, use scoped packages |
| Dependency confusion | Configure `.npmrc` with registry scoping |
| Compromised maintainer | Pin versions, verify provenance, review changelogs |
| Malicious install scripts | Use `--ignore-scripts` where possible, audit scripts |
| Hijacked CI action | Pin to SHA, fork critical actions |
| Registry compromise | Verify signatures, use multiple registries |

## Dependency confusion prevention
```ini
# .npmrc — scope internal packages to private registry
@mycompany:registry=https://npm.internal.company.com/
# Everything else falls through to public npm
```

## Anti-patterns to avoid
- Using `latest` or `^` in production lockfiles without CI audit gates.
- Pinning CI actions to tags (`v4`) instead of SHAs (tags can be force-pushed).
- Running `npm install` instead of `npm ci` in CI.
- Ignoring audit warnings because "it's a dev dependency" (devDeps run in CI).
- No SBOM generation (you can't defend what you can't inventory).
- Allowing arbitrary install scripts without review.

## Self-check before task completion

Before marking a task done when this skill was active:

- [ ] Lockfile committed and CI uses `npm ci` (or equivalent)?
- [ ] Dependency audit passes with no critical/high findings?
- [ ] CI actions pinned to full SHA?
- [ ] SBOM generated and attached to release?
- [ ] No new dependencies added without justification?
- [ ] Provenance verification enabled for published packages?
