# MindForge CI Quickstart (v1.0.0)

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
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20

      - name: Install MindForge
        run: npx mindforge-cc@latest --claude --local

      - name: Run MindForge suite
        run: node tests/install.test.js
```

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

## 4. Add full test battery (v1.0.0)
```bash
SUITES=(install wave-engine audit compaction skills-platform \
        integrations governance intelligence metrics \
        distribution ci-mode sdk production migration e2e)

for SUITE in "${SUITES[@]}"; do
  node tests/${SUITE}.test.js
done
```

## 5. Reporting
If you want JSON output in CI, set in `MINDFORGE.md`:
```
CI_OUTPUT_FORMAT=json
```

## 6. Common CI pitfalls
- Missing Node 18+ → install newer Node
- CI failing on Tier 3 changes → approvals required
- Missing `.planning/` in CI → run `/mindforge:init-project` or `map-codebase`

## 7. GitLab CI example
```yaml
stages: [test]

mindforge:
  stage: test
  image: node:20
  script:
    - npx mindforge-cc@latest --claude --local
    - node tests/install.test.js
```
