---
description: Publish a new version of MindForge to npm
---

# MindForge Publishing Workflow

This workflow automates the pre-verification and publishing of MindForge.

## Pre-Flight Checks

1. Verify structural integrity
// turbo
npm test

2. Check package contents
// turbo
npm pack --dry-run

3. Confirm the second package builds — it publishes from the same workflow run
// turbo
cd mcp-server && npm install && npm run build

## Publish Execution

**Publishing is done by pushing a tag. Do not run `npm publish` by hand.**

`.github/workflows/mindforge-release.yml` triggers on `push: tags: 'v*'`, runs the suite, and
publishes `mindforge-cc` and `mindforge-mcp-server` with `--provenance`.

4. Tag and push — this is what publishes
```bash
git tag "v$(node -p "require('./package.json').version")"
git push origin "v$(node -p "require('./package.json').version")"
```

Push the specific tag, not `--tags`: the latter pushes every local tag, which can trigger release
runs for unrelated versions.

5. Verify from outside the repo
```bash
npm view mindforge-cc@$(node -p "require('./package.json').version") dist --json  # attestations present
npm view mindforge-cc dist-tags                                                   # latest, not alpha
```

### ⚠️ Why not `npm publish`

A manual publish is irreversible and self-defeating. Without `--provenance` the version uploads
with no attestation, and npm forbids republishing a version — so it cannot be corrected. Worse,
the workflow skips its own provenanced publish when it finds the version already on npm
(`mindforge-release.yml:48-60`, `if: … already_published != 'true'`), so publishing by hand turns
the provenanced path into a no-op. `--tag alpha` additionally leaves `npm install mindforge-cc`
resolving to the previous version. pnpm consumers reject a package that loses its attestation
between versions.

For a genuine prerelease, tag it as one (`v1.2.3-alpha.1`) and let the workflow handle the
dist-tag; do not hand-publish to move a stable version onto `alpha`.
