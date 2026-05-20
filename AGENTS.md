# Repository Guidelines

## Project Structure & Module Organization

MindForge is an agentic intelligence framework distributed as the `mindforge-cc` npm package. It has two package roots:

- **Root (`/`)** — The CLI + framework. Entry point: `bin/install.js`. Runtime scripts live under `bin/` (CLI, sharding, governance, autonomous engine, SRE, dashboard, etc.).
- **`sdk/`** — A TypeScript SDK (`@mindforge/sdk`) with its own `tsconfig.json` and build step. Compiled output goes to `sdk/dist/`.

Key directories:
- `agents/` — Specialist agent personas (reviewer, planner, executor, researcher, memory, tool), each with identity protocols.
- `.mindforge/` — Framework internals: intelligence mesh, skills, personas, governance, dashboard, audit, engine configs.
- `.planning/` — Project state management (STATE.md, phase plans, audit trails).
- `.agent/` — Agent orchestration layer: hooks (SessionStart, BeforeTool, AfterTool), workflows, skills, forge tools, and session settings.

## Build, Test, and Development Commands

```bash
# Root package
npm install          # Install dependencies (Node >= 18 required)
npm test             # Run core install/structural tests (pre-commit hook)
npm run lint         # ESLint across root

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
```

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
```

A PR template (`.github/pull_request_template.md`) requires: Goal, Proposed Changes (grouped by component/persona), Verification checklist (`npm test`, manual verification, persona consistency check), and Brain Context links.
