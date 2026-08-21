# MindForge Publishing Guide

This guide outlines the standard procedure for publishing a new version of `mindforge-cc` and its associated SDK to npm. Following this process ensures stability, correct versioning, and structural integrity.

## Prerequisites

1. **NPM Permissions**: You must have publish access to the `mindforge-cc` and `mindforge-sdk` packages.
2. **Clean State**: Ensure all changes are committed and your working directory is clean.
3. **Authentication**: Run `npm whoami` to verify you are logged into the correct account.

## Step-by-Step Workflow

### 1. Pre-Flight Verification & Adversarial Review
Before any release, ensure the following is completed:

- **Structural Integrity**: Run `npm test` to verify layout and command mirroring.
- **Security Check**: Run `/mindforge:security-scan` to ensure no keys or CVEs are present.
- **Mult-Model Review**: Run `/mindforge:cross-review` to have multiple models (Claude, GPT, Gemini) audit the new features for edge cases.

### 2. Versioning Strategy
MindForge follows SemVer. Update `package.json`, create `changelogs/vX.Y.Z.md`, and prepend the entry to `CHANGELOG.md`'s rolling window first.

### 3. Tag — this is the ONLY supported publish path

Pushing a `v*` tag is what publishes. `.github/workflows/mindforge-release.yml` triggers on
`push: tags: 'v*'`, runs the suite, and publishes both packages with `--provenance`.

```bash
git tag v[version]
git push origin v[version]     # this publishes
```

Then verify from outside the repo:

```bash
npm view mindforge-cc@[version] dist --json    # attestations.provenance must be present
npm dist-tag ls mindforge-cc                   # latest must be [version], NOT alpha;
                                               # stable must also be [version] — the release
                                               # workflow moves it as its last step. Use
                                               # `dist-tag ls`, not `npm view`: the latter reads
                                               # the CDN-cached packument (max-age=300) and can
                                               # show the pre-release value right after a publish.
```

> **Do not publish manually.** See the warning below — it is not a style preference, it is an
> irreversible failure mode. The pre-flight checklist for the tag lives in
> `.agent/workflows/publish-release.md` (there is no `/publish-release` slash command).

### 4. ⚠️ Manual publishing strips provenance, permanently

A manual `npm publish` **cannot be undone**, and it silently disables the provenanced publish
that would have followed:

1. A manual publish without `--provenance` uploads the version with no attestation. npm forbids
   republishing a version that already exists, so this is not recoverable — the only remedy is
   burning a version number.
2. The release workflow checks npm for the version first
   (`mindforge-release.yml:48-60`) and skips its publish step when the version is already there
   (`if: steps.npm_check.outputs.already_published != 'true'`). So a manual publish makes the
   provenanced publish a no-op rather than a correction.
3. `npm publish --tag alpha` additionally parks the release on the `alpha` dist-tag, so
   `npm install mindforge-cc` keeps resolving to the previous version.

Provenance is not cosmetic: pnpm consumers reject a package whose attestation disappears
between versions, so an unprovenanced release is a broken release for them.

If you must publish outside CI — accepting that you lose CI's verification — the flags are
non-negotiable, and you tag **first** so the workflow's idempotency check is the thing that
skips, not your only provenanced attempt:

```bash
git tag v[version] && git push origin v[version]   # let CI try first
# ONLY if the workflow itself is unavailable:
npm publish --access public --provenance
```

### 5. If the tag run fails

Do **not** fall back to a manual publish. Diagnose and re-tag:

- **401 / E403 on npm** — the `NPM_TOKEN` repository secret is expired or lacks publish rights.
  Rotate it, delete the tag (`git push origin :v[version]`), and re-push the tag.
- **Suite failure** — nothing was published; the publish step runs after `npm test`. Fix and re-tag.
- **`mcp-server` build failure** — see the ordering note in the workflow; `mindforge-cc` must not
  publish before the second package has been proven buildable.

---
*Last Updated: 2026-08-16*
