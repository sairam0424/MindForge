# SDK Integration Example

Demonstrates basic usage of the `@mindforge/sdk` package.

## Prerequisites

- Node.js >= 18
- A MindForge-initialized project (with `MINDFORGE.md` at the root)

## Running

```bash
# From the repository root, build the SDK first
cd sdk && npm run build && cd ..

# Run the example (uses the repo root as the project)
node examples/sdk-integration/index.js
```

## What it does

1. Reads project state from `.planning/STATE.md`
2. Validates `MINDFORGE.md` configuration against required fields
3. Reads the audit log from `.planning/AUDIT.jsonl`
