# MindForge Publishing Guide

This guide outlines the standard procedure for publishing a new version of `mindforge-cc` and its associated SDK to npm. Following this process ensures stability, correct versioning, and structural integrity.

## Prerequisites

1. **NPM Permissions**: You must have publish access to the `mindforge-cc` and `@mindforge/sdk` packages.
2. **Clean State**: Ensure all changes are committed and your working directory is clean.
3. **Authentication**: Run `npm whoami` to verify you are logged into the correct account.

## Step-by-Step Workflow

### 1. Versioning Strategy

MindForge follows [Semantic Versioning (SemVer)](https://semver.org/).

- **Major (X.0.0)**: Breaking changes or significant architecture shifts.
- **Minor (0.X.0)**: New features, non-breaking.
- **Patch (0.0.X)**: Bug fixes, performance improvements.
- **Prereleases**: Append `-alpha.N`, `-beta.N`, or `-rc.N` (e.g., `2.0.0-alpha.4`).

### 2. Pre-Publish Verification

Always run the integrity suite before publishing:

```bash
npm test
```

This verifies that:
- All required directories and files exist.
- Commands are mirrored between `.claude/` and `.agent/`.
- `package.json` metadata is valid.
- No secrets are leaked.

### 3. Dry Run

Validate the package contents:

```bash
npm pack --dry-run
```

Review the file list in the output to ensure no internal config or temporary files are included.

### 4. Publishing

#### Stable Releases
For stable versions (e.g., `2.0.0`), use a standard publish:

```bash
npm publish --access public
```

#### Prereleases (Alpha/Beta/RC)
For prerelease versions, you **MUST** specify a tag to avoid them being installed as `@latest`:

```bash
npm publish --tag [alpha|beta|rc] --access public
```

### 5. Git Tagging

After a successful publish, tag the commit in Git:

```bash
git tag v[version]
git push origin v[version]
```

## Troubleshooting

- **403 Forbidden**: Usually means the version already exists on npm or you don't have permissions.
- **Tag Required**: If you get an error about specifying a tag, it's because you are publishing a version with a hyphen (prerelease) without the `--tag` flag.
- **Integrity Failure**: Fix the structural issues reported by `npm test` before retrying.

---
*Last Updated: 2026-03-22*
