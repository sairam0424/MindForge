# MindForge CI Quickstart (v10.0.1)

This page shows how to run MindForge in real pipelines with non-interactive
behavior and reliable outputs.

## 1. Basic CI run (GitHub Actions)

```yaml
name: MindForge CI
on:
  pull_request:
  push:
    branches: [main]

jobs:
  mindforge:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        node-version: [18, 20, 22]
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: ${{ matrix.node-version }}

      - name: Install dependencies
        run: npm ci

      - name: Run MindForge suite
        run: npx c8 node tests/install.test.js
```

> **Note:** Use `npm ci` (not `npm install`) in CI for deterministic, lockfile-based installs. No native build tools are needed — sql.js is pure WASM.

## 2. CI mode behavior
Set `CI=true` to enable non-interactive operation.

MindForge in CI:
- Skips interactive prompts
- Emits structured output (if configured)
- Blocks Tier 3 changes
- Logs all gate results

## 3. Recommended env settings
```bash
CI=true
MINDFORGE_CI=true
```

## 4. Test matrix and coverage

MindForge v10 uses **c8** for native V8 coverage collection:

```bash
SUITES=(install wave-engine audit compaction skills-platform \
        integrations governance intelligence metrics \
        distribution ci-mode sdk production migration e2e)

for SUITE in "${SUITES[@]}"; do
  npx c8 node tests/${SUITE}.test.js
done
```

The Node version matrix (18, 20, 22) ensures compatibility across all supported LTS releases.

## 5. Reporting
If you want JSON output in CI, set in `MINDFORGE.md`:
```
CI_OUTPUT_FORMAT=json
```

## 6. Dependabot and npm provenance

MindForge v10 ships with:

- **Dependabot** enabled for automated dependency updates (security and version patches)
- **npm provenance** on publish — every published package includes a signed provenance attestation linking the tarball to the specific CI run and source commit

## 7. Common CI pitfalls
- Missing Node 18+ — use the matrix strategy to test across 18, 20, and 22
- CI failing on Tier 3 changes — approvals required in `.planning/approvals/`
- Missing `.planning/` in CI — run `/mindforge:init-project` or `map-codebase`
- Using `npm install` instead of `npm ci` — causes non-deterministic installs

## 8. GitLab CI example
```yaml
stages: [test]

mindforge:
  stage: test
  image: node:20
  script:
    - npm ci
    - npx c8 node tests/install.test.js
```
