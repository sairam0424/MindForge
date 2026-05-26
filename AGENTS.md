# Repository Guidelines

## Project Structure & Module Organization

MindForge v10.0.3 ("Council Awakens") is an agentic intelligence framework distributed as the `mindforge-cc` npm package. It has two package roots:

- **Root (`/`)** — The CLI + framework. Two bin entries: `mindforge-cc` (installer via `bin/install.js`) and `mindforge` (CLI via `bin/mindforge-cli.js`). Runtime scripts live under `bin/` (CLI, sharding, governance, autonomous engine, SRE, dashboard, etc.).
- **`sdk/`** — A TypeScript SDK (`@mindforge/sdk`) with its own `tsconfig.json` and build step. Compiled output goes to `sdk/dist/`. Has its own test suite (`cd sdk && npm test`).

Key directories:
- `agents/` — Specialist agent personas (reviewer, planner, executor, researcher, memory, tool), each with identity protocols.
- `bin/utils/` — Shared utilities layer (errors, file-io, paths) used across all bin scripts.
- `.mindforge/` — Framework internals: intelligence mesh, skills, personas, governance, dashboard, audit, engine configs.
- `.planning/` — Project state management (STATE.md, phase plans, audit trails).
- `.agent/` — Agent orchestration layer: hooks (SessionStart, BeforeTool, AfterTool), workflows, skills, forge tools, and session settings.
- `docs/` — Architecture docs, ADRs, reference guides, security guidelines, and project templates.
- `examples/` — Starter projects and SDK integration examples for onboarding.

## Build, Test, and Development Commands

```bash
# Root package
npm install          # Install dependencies (Node >= 18 required)
npm test             # Unified test runner (tests/run-all.js) — pre-commit hook
npm run lint         # ESLint across root
npm run coverage     # c8 coverage via unified runner
npm run prepare      # Set up Husky git hooks (runs automatically on install)

# SDK (run from sdk/)
cd sdk && npm install
npm run build        # TypeScript compile (tsc) -> sdk/dist/
npm test             # SDK-specific tests
npm run lint         # ESLint across SDK
```

Run a single test file directly:
```bash
node tests/install.test.js        # Core tests
node tests/sharding.test.js       # Specific subsystem
node tests/sdk.test.js            # SDK tests
node tests/run-all.js             # Full unified runner
```

### Database Layer

The project uses **sql.js** (WebAssembly SQLite) for persistence — zero native dependencies, no compilation required. This replaced `better-sqlite3` in v10 for cross-platform portability.

## Coding Style & Naming Conventions

ESLint 9 flat config (`eslint.config.mjs`) enforces:
- **Single quotes** (`'error'`), **semicolons required** (`'error'`)
- `no-unused-vars`: warn, `no-console`: off
- ES2021+ globals, Node.js environment, `sourceType: 'module'`

The SDK additionally uses `typescript-eslint` with **strict mode** TypeScript (`tsconfig.json`: `"strict": true`, target ES2020, CommonJS output).

## Testing Guidelines

Tests use Node.js built-in `assert` module with a custom lightweight harness — no Jest or Mocha. Each test file is self-contained and runnable via `node <file>`.

The pre-commit hook (Husky) runs `npm test` before every commit. All tests must pass to commit.

## Commit & Pull Request Guidelines

Commits follow **Conventional Commits** via Commitizen (`npm run commit`):
```
feat(scope): add new capability
fix(scope): correct behavior
chore(scope): maintenance task
docs(scope): documentation update
security: address security concern
```

A PR template (`.github/pull_request_template.md`) requires: Goal, Proposed Changes (grouped by component/persona), Verification checklist (`npm test`, manual verification, persona consistency check), and Brain Context links.
